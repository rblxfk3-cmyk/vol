const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Tambah tetapan CORS supaya isyarat tak disekat oleh Render
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(express.static('public'));

let currentPrice = 10000.00;
const volatility = 0.0008;
let history = [];
let currentUnixTime = Math.floor(Date.now() / 1000) - 100;

function generateTick() {
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    currentPrice = currentPrice + (currentPrice * volatility * num);
    return parseFloat(currentPrice.toFixed(2));
}

for (let i = 0; i < 100; i++) {
    currentUnixTime++;
    history.push({ time: currentUnixTime, value: generateTick() });
}

io.on('connection', (socket) => {
    socket.emit('history', history);
});

setInterval(() => {
    currentUnixTime++; 
    const tickData = { time: currentUnixTime, value: generateTick() };
    
    history.push(tickData);
    if(history.length > 500) history.shift();
    
    io.emit('tick', tickData);
}, 1000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Berjalan di port ${PORT}`));
