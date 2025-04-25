const axios = require('axios');

async function checkNgrokTunnels() {
  try {
    const response = await axios.get('http://127.0.0.1:4040/api/tunnels');
    const tunnels = response.data.tunnels;
    if (tunnels.length > 0) {
      console.log('Active ngrok tunnels:');
      tunnels.forEach(tunnel => {
        console.log(`Public URL: ${tunnel.public_url} -> Local Address: ${tunnel.config.addr}`);
      });
    } else {
      console.log('No active ngrok tunnels found.');
    }
  } catch (error) {
    console.error('Error fetching ngrok tunnels:', error.message);
  }
}

checkNgrokTunnels();
