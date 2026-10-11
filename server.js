const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let currentPrice = 10000.00;
const volatility = 0.0008;
let history = []; // Menyimpan sejarah data

function generateTick() {
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    
    currentPrice = currentPrice + (currentPrice * volatility * num);
    return currentPrice;
}

// Jana 100 data terawal supaya graf tidak kosong bila dibuka
let currentTime = Math.floor(Date.now() / 1000) - 100;
for (let i = 0; i < 100; i++) {
    history.push({ time: currentTime + i, value: generateTick() });
}
currentTime = currentTime + 100;

io.on('connection', (socket) => {
    // Hantar lambakan sejarah 100 data ke skrin pengguna serta-merta
    socket.emit('history', history);
});

setInterval(() => {
    currentTime = Math.floor(Date.now() / 1000);
    const newPrice = generateTick();
    const tickData = { time: currentTime, value: newPrice };
    
    history.push(tickData);
    if(history.length > 500) history.shift(); // Buang data terlalu lama supaya memori tak penuh

    io.emit('tick', tickData);
}, 1000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Enjin berjalan di port ${PORT}`));
