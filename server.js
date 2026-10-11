const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let currentPrice = 10000.00;
const volatility = 0.0008;
let history = [];
// Mula 100 saat ke belakang
let currentUnixTime = Math.floor(Date.now() / 1000) - 100;

function generateTick() {
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    
    currentPrice = currentPrice + (currentPrice * volatility * num);
    // Jadikan 2 tempat perpuluhan sahaja (contoh: 10002.50) supaya graf tak ralat
    return parseFloat(currentPrice.toFixed(2));
}

// Jana 100 data awal
for (let i = 0; i < 100; i++) {
    currentUnixTime++; // Masa wajib +1 secara berurutan
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
