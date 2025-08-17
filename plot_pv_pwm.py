import subprocess
import threading
import matplotlib.pyplot as plt
import numpy as np
from collections import defaultdict
import re

class PIDDataCollector:
    def __init__(self):
        self.data = defaultdict(lambda: {'current': [], 'target': [], 'pwm': [], 'time': []})
        self.current_step = None
        self.step_time = 0
        self.step_start_value = {}
        
    def parse_line(self, line):
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
            
            self.data[self.current_step]['current'].append(normalized_current)
            self.data[self.current_step]['target'].append(normalized_target)
            self.data[self.current_step]['pwm'].append(pwm)
            self.data[self.current_step]['time'].append(self.step_time)
            self.step_time += 1

def read_stream(stream, label, collector):
    for line in stream:
        print(f"{label}: {line.strip()}")
        collector.parse_line(line.strip())

def plot_pid_data(collector):
    fig, axes = plt.subplots(2, 2, figsize=(15, 10))
    fig.suptitle('PID Control Performance', fontsize=16)
    
    steps = list(collector.data.keys())
    colors = ['blue', 'green', 'red', 'orange']
    
    for i, step in enumerate(steps):
        if i >= 4:  # Limit to 4 subplots
            break
            
        ax = axes[i//2, i%2]
        data = collector.data[step]
        
        if not data['time']:
            continue
            
        # Plot PV and setpoint
        ax.plot(data['time'], data['current'], 'b-', label='PV', linewidth=2)
        ax.plot(data['time'], data['target'], 'r--', label='Setpoint', linewidth=2)
        
        # Create secondary y-axis for PWM
        ax2 = ax.twinx()
        ax2.plot(data['time'], data['pwm'], alpha=0.8, linewidth=1.5, label='PWM')

        
        ax.set_xlabel('Time Steps')
        ax.set_ylabel('Delta Value', color='black')
        ax2.set_ylabel('PWM Value', color='green')
        ax.set_title(f'{step.capitalize()} Control')
        ax.grid(True, alpha=0.3)
        
        # Legends
        lines1, labels1 = ax.get_legend_handles_labels()
        lines2, labels2 = ax2.get_legend_handles_labels()
        ax.legend(lines1 + lines2, labels1 + labels2, loc='upper right')
        
        ax2.tick_params(axis='y', labelcolor='green')
    
    plt.tight_layout()
    plt.show()

# Initialize collector
collector = PIDDataCollector()

# Run subprocess with data collection
process = subprocess.Popen(
    ["./rpi5-sensor-actuator/bin/test_bab4"],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True
)

threading.Thread(target=read_stream, args=(process.stdout, "STDOUT", collector), daemon=True).start()
threading.Thread(target=read_stream, args=(process.stderr, "STDERR", collector), daemon=True).start()

process.wait()

# Plot collected data
plot_pid_data(collector)

# import subprocess
# import threading
# import matplotlib.pyplot as plt
# import numpy as np
# from collections import defaultdict
# import re

# class PIDDataCollector:
#     def __init__(self):
#         self.data = defaultdict(lambda: {'current': [], 'target': [], 'pwm': [], 'time': []})
#         self.current_step = None
#         self.step_time = 0
#         self.step_start_value = {}
        
#     def parse_line(self, line):
#         # Parse step changes
#         step_match = re.search(r'step:(\w+)', line)
#         if step_match:
#             self.current_step = step_match.group(1)
#             self.step_time = 0
#             self.step_start_value[self.current_step] = None
#             return
            
#         # Parse PID data
#         pid_match = re.search(r'Current:\s*([\d.]+)\s+Target:\s*([\d.]+)\s+PWM:\s*(\d+)', line)
#         if pid_match and self.current_step:
#             current = float(pid_match.group(1))
#             target = float(pid_match.group(2))
#             pwm = int(pid_match.group(3))
            
#             # Set starting value for this step
#             if self.step_start_value[self.current_step] is None:
#                 self.step_start_value[self.current_step] = current
            
#             # Normalize current value to start from 0
#             normalized_current = current - self.step_start_value[self.current_step]
#             normalized_target = target - self.step_start_value[self.current_step]
            
#             self.data[self.current_step]['current'].append(normalized_current)
#             self.data[self.current_step]['target'].append(normalized_target)
#             self.data[self.current_step]['pwm'].append(pwm)
#             self.data[self.current_step]['time'].append(self.step_time)
#             self.step_time += 1

# def read_stream(stream, label, collector):
#     for line in stream:
#         print(f"{label}: {line.strip()}")
#         collector.parse_line(line.strip())

# def plot_pid_data(collector):
#     steps = list(collector.data.keys())
#     colors = ['blue', 'green', 'red', 'orange']

#     figs = []
#     for i, step in enumerate(steps):
#         data = collector.data[step]
#         if not data['time']:
#             continue

#         fig, ax = plt.subplots(figsize=(8, 5))
#         figs.append(fig)
#         fig.suptitle('Performa Kontroler Proporsional', fontsize=14)

#         # Plot PV and setpoint
#         ax.plot(data['time'], data['current'], 'b-', label='PV', linewidth=2)
#         ax.plot(data['time'], data['target'], 'r--', label='Setpoint', linewidth=2)

#         # Create secondary y-axis for PWM as a line
#         ax2 = ax.twinx()
#         ax2.plot(data['time'], data['pwm'], color='green', label='PWM', linewidth=2)

#         ax.set_xlabel('Waktu')
#         ax.set_ylabel('Gram', color='black')
#         ax2.set_ylabel('PWM', color='green')
#         ax.grid(True, alpha=0.3)

#         # Legends
#         lines1, labels1 = ax.get_legend_handles_labels()
#         lines2, labels2 = ax2.get_legend_handles_labels()
#         ax.legend(lines1 + lines2, labels1 + labels2, loc='lower left')

#         ax2.tick_params(axis='y', labelcolor='green')

#         plt.tight_layout()

#     # Show all figures at once
#     plt.show()

# # Initialize collector
# collector = PIDDataCollector()

# # Run subprocess with data collection
# process = subprocess.Popen(
#     ["./rpi5-sensor-actuator/bin/test_bab4"],
#     stdout=subprocess.PIPE,
#     stderr=subprocess.PIPE,
#     text=True
# )

# threading.Thread(target=read_stream, args=(process.stdout, "STDOUT", collector), daemon=True).start()
# threading.Thread(target=read_stream, args=(process.stderr, "STDERR", collector), daemon=True).start()

# process.wait()

# # Plot collected data
# plot_pid_data(collector)