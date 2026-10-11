const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));

let currentPrice = 10000.00;
const volatility = 0.0008;
let history = [];
let currentCandle = null;

function generateTick() {
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    currentPrice = currentPrice + (currentPrice * volatility * num);
    return parseFloat(currentPrice.toFixed(2));
}

// Jana 100 candle sejarah (Timeframe M1 = 60 saat/minit)
let currentMinute = Math.floor(Date.now() / 60000) * 60 - (100 * 60);
for (let i = 0; i < 100; i++) {
    let open = currentPrice;
    let close = generateTick();
    let high = Math.max(open, close) + (Math.random() * 5);
    let low = Math.min(open, close) - (Math.random() * 5);
    
    history.push({ 
        time: currentMinute, 
        open: parseFloat(open.toFixed(2)), 
        high: parseFloat(high.toFixed(2)), 
        low: parseFloat(low.toFixed(2)), 
        close: parseFloat(close.toFixed(2)) 
    });
    currentPrice = close;
    currentMinute += 60;
}

io.on('connection', (socket) => {
    socket.emit('history', history);
});

setInterval(() => {
    const tickPrice = generateTick();
    const nowMinute = Math.floor(Date.now() / 60000) * 60; // Dapatkan waktu minit tepat

    // Jika masuk minit baharu (Bina lilin baharu)
    if (!currentCandle || currentCandle.time !== nowMinute) {
        if (currentCandle) history.push(currentCandle);
        if (history.length > 500) history.shift();
        
        currentCandle = {
            time: nowMinute, open: tickPrice, high: tickPrice, low: tickPrice, close: tickPrice
        };
    } else {
        // Jika dalam minit yang sama (Kemas kini lilin sedia ada secara live)
        currentCandle.high = Math.max(currentCandle.high, tickPrice);
        currentCandle.low = Math.min(currentCandle.low, tickPrice);
        currentCandle.close = tickPrice;
    }
    
    io.emit('candle', currentCandle);
}, 1000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Berjalan di port ${PORT}`));
