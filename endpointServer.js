const express = require('express');
const app = express();

app.use(express.json());

app.post('/midtrans/callback', (req, res) => {
    console.log('Received:', req.body);
    res.json({ message: 'received' });
});

app.listen(5000, () => console.log('Server running on port 5000'));
