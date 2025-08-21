import subprocess
import threading
import matplotlib.pyplot as plt
import numpy as np
from collections import defaultdict
import re

class PIDDataCollector:
    def __init__(self):
        self.runs = []
        self.current_run = defaultdict(lambda: {'current': [], 'target': [], 'pwm': [], 'time': []})
        self.current_step = None
        self.step_time = 0
        self.step_start_value = {}
        self.water_complete = False
        
    def start_new_run(self):
        if any(self.current_run.values()):
            self.runs.append(dict(self.current_run))
        self.current_run = defaultdict(lambda: {'current': [], 'target': [], 'pwm': [], 'time': []})
        self.current_step = None
        self.step_time = 0
        self.step_start_value = {}
        self.water_complete = False
        
    def parse_line(self, line):
        # Check for completion signal
        if "Target reached for Water!" in line:
            self.water_complete = True
            return
            
        # Parse step changes
        step_match = re.search(r'step:(\w+)', line)
        if step_match:
            self.current_step = step_match.group(1)
            self.step_time = 0
            self.step_start_value[self.current_step] = None
            return
            
        # Parse PID data
        pid_match = re.search(r'Current:\s*([\d.]+)\s+Target:\s*([\d.]+)\s+PWM:\s*(\d+)', line)
        if pid_match and self.current_step:
            current = float(pid_match.group(1))
            target = float(pid_match.group(2))
            pwm = int(pid_match.group(3))
            
            # Set starting value for this step
            if self.step_start_value[self.current_step] is None:
                self.step_start_value[self.current_step] = current
            
            # Normalize current value to start from 0
            normalized_current = current - self.step_start_value[self.current_step]
            normalized_target = target - self.step_start_value[self.current_step]
            
            self.current_run[self.current_step]['current'].append(normalized_current)
            self.current_run[self.current_step]['target'].append(normalized_target)
            self.current_run[self.current_step]['pwm'].append(pwm)
            self.current_run[self.current_step]['time'].append(self.step_time)
            self.step_time += 1
            
    def finalize_run(self):
        if any(self.current_run.values()):
            self.runs.append(dict(self.current_run))

def run_subprocess_with_input(collector):
    process = subprocess.Popen(
        ["./rpi5-sensor-actuator/bin/test_bab4"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    # Send input
    process.stdin.write("0 0 0 120\n")
    process.stdin.close()
    
    # Read output until water completion signal
    collector.water_complete = False
    
    def read_stdout():
        for line in process.stdout:
            print(f"STDOUT: {line.strip()}")
            collector.parse_line(line.strip())
            if collector.water_complete:
                break
    
    def read_stderr():
        for line in process.stderr:
            print(f"STDERR: {line.strip()}")
    
    stdout_thread = threading.Thread(target=read_stdout, daemon=True)
    stderr_thread = threading.Thread(target=read_stderr, daemon=True)
    
    stdout_thread.start()
    stderr_thread.start()
    
    # Wait for completion signal
    stdout_thread.join()
    process.terminate()
    process.wait()

def plot_multiple_runs(collector):
    if not collector.runs:
        print("No data collected")
        return
        
    fig, axes = plt.subplots(2, 2, figsize=(15, 10))
    fig.suptitle('Performa kontrol proporsional', fontsize=16)
    
    steps = ['coffee', 'sugar', 'creamer', 'water']
    
    for i, step in enumerate(steps):
        if i >= 4:
            break
            
        ax = axes[i//2, i%2]
        ax2 = ax.twinx()
        
        # Collect all runs data for this step
        all_pv_data = []
        all_pwm_data = []
        max_time = 0
        
        # Plot individual runs with different colors for PV and PWM
        for run_idx, run_data in enumerate(collector.runs):
            if step not in run_data or not run_data[step]['time']:
                continue
                
            data = run_data[step]
            time_points = data['time']
            pv_values = data['current']
            pwm_values = data['pwm']
            
            max_time = max(max_time, max(time_points))
            
            # Plot individual PV runs (light blue)
            ax.plot(time_points, pv_values, color='lightblue', alpha=0.6, linewidth=1)
            
            # Plot individual PWM runs (light orange)  
            ax2.plot(time_points, pwm_values, color='orange', alpha=0.4, linewidth=1)
            
            # Store data for averaging
            all_pv_data.append((time_points, pv_values))
            all_pwm_data.append((time_points, pwm_values))
        
        # Calculate and plot averages
        if all_pv_data:
            # Create common time grid
            common_time = list(range(max_time + 1))
            
            # Interpolate all runs to common time grid
            pv_matrix = []
            pwm_matrix = []
            
            for time_points, values in all_pv_data:
                interpolated_pv = np.interp(common_time, time_points, values)
                pv_matrix.append(interpolated_pv)
                
            for time_points, values in all_pwm_data:
                interpolated_pwm = np.interp(common_time, time_points, values)
                pwm_matrix.append(interpolated_pwm)
            
            # Calculate averages
            avg_pv = np.mean(pv_matrix, axis=0)
            avg_pwm = np.mean(pwm_matrix, axis=0)
            
            # Plot averages with distinct colors
            ax.plot(common_time, avg_pv, 'b-', linewidth=3, label='Average PV')
            ax2.plot(common_time, avg_pwm, 'darkorange', linewidth=3, label='Average PWM')
            
            # Plot setpoint (from first run)
            if collector.runs[0][step]['target']:
                ax.plot(common_time[:len(collector.runs[0][step]['target'])], 
                       collector.runs[0][step]['target'], 'r--', linewidth=2, label='Setpoint')
        
        ax.set_xlabel('Waktu')
        ax.set_ylabel('Gram', color='black')
        ax2.set_ylabel('PWM', color='darkorange')
        ax.set_title(f'{step.capitalize()} Control')
        ax.grid(True, alpha=0.3)

        # Set y-axis to start from 0
        ax.set_ylim(bottom=0)
        ax2.set_ylim(bottom=0)
        
        # Legends
        lines1, labels1 = ax.get_legend_handles_labels()
        lines2, labels2 = ax2.get_legend_handles_labels()
        ax.legend(lines1 + lines2, labels1 + labels2, loc='lower left', fontsize=8)
        
        ax2.tick_params(axis='y', labelcolor='darkorange')
    
    plt.tight_layout()
    plt.show()

# Initialize collector
collector = PIDDataCollector()

# Run subprocess 5 times
print("Running 5 iterations...")
for i in range(5):
    print(f"\n--- Run {i+1} ---")
    collector.start_new_run()
    run_subprocess_with_input(collector)

# Finalize last run
collector.finalize_run()

print(f"\nCollected {len(collector.runs)} runs")
plot_multiple_runs(collector)