const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Beritahu server untuk baca folder 'public'
app.use(express.static('public'));

// Enjin Algoritma Harga Sintetik
let currentPrice = 10000.00;
const volatility = 0.0008;

function generateTick() {
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    
    let priceChange = currentPrice * volatility * num;
    currentPrice = currentPrice + priceChange;
    return currentPrice;
}

// Hantar harga baharu ke carta setiap 1 saat
setInterval(() => {
    const newPrice = generateTick();
    io.emit('tick', {
        price: newPrice,
        time: Math.floor(Date.now() / 1000)
    });
}, 1000);

// Hidupkan server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Enjin Vol 80 berjalan di port ${PORT}`);
});
