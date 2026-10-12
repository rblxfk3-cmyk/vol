const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- TETAPAN SUPABASE ---
const supabaseUrl = 'https://zarodshtedrrusloqsud.supabase.co/rest/v1/';
const supabaseKey = 'sb_secret_JQPRW1uDy_waLG3Oh6FP1A_QJD6DhrV';
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(express.static('public'));

// --- ENJIN VOLATILITI BERSESI & BERITA (XAUUSD HYBRID) ---
let currentPrice = 10000.00;
let history = [];
let currentCandle = null;

// 1. Fungsi Kawalan Sesi (Berdasarkan Waktu Malaysia)
function getSessionVolatility() {
    const jamMalaysia = (new Date().getUTCHours() + 8) % 24;

    if (jamMalaysia >= 20 || jamMalaysia <= 1) {
        // SESI NEW YORK (8 Malam - 1 Pagi): Sangat Laju & Ganas
        return 0.0025; 
    } else if (jamMalaysia >= 14 && jamMalaysia <= 19) {
        // SESI LONDON (2 Petang - 7 Malam): Sederhana Laju
        return 0.0012; 
    } else {
        // SESI ASIA (Pagi - Tengahari): Perlahan & Sideway
        return 0.0004; 
    }
}

// 2. Fungsi Simulasi Berita (Cth: NFP / CPI)
function checkNewsImpact() {
    const d = new Date();
    const jamMalaysia = (d.getUTCHours() + 8) % 24;
    const minit = d.getUTCMinutes();
    const saat = d.getUTCSeconds();

    // SIMULASI: Tepat jam 8:30 malam (20:30) ada berita USD merah (buruk)
    // Kesan: XAUUSD / Vol 80 akan melonjak naik (Buy Spike) selama 15 saat pertama
    if (jamMalaysia === 20 && minit === 30 && saat < 15) {
        return 8.5; // Tambah $8.50 per saat secara paksa (Spike Naik)
    }
    
    // Boleh tambah simulasi berita USD kuat (Vol 80 junam) di sini nanti
    return 0; // Tiada berita (Normal)
}

// 3. Enjin Utama
function generateTick(isHistorical = false) {
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    
    // Pergerakan rawak biasa
    let randomWalk = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    
    // Dapatkan kelajuan mengikut sesi (Kecairan)
    const volSemasa = getSessionVolatility();
    
    // Semak jika ada waktu berita memacak
    const newsSpike = isHistorical ? 0 : checkNewsImpact();

    if (newsSpike !== 0) {
        // Waktu Berita: Harga dipaksa ikut arah berita + sedikit getaran rawak
        currentPrice = currentPrice + newsSpike + (randomWalk * 2);
    } else {
        // Waktu Biasa: Harga bergerak ikut sesi biasa
        currentPrice = currentPrice + (currentPrice * volSemasa * randomWalk);
    }
    
    return parseFloat(currentPrice.toFixed(2));
}

// Jana data sejarah 100 minit lepas (hanya guna pergerakan biasa)
let currentMinute = Math.floor(Date.now() / 60000) * 60 - (100 * 60);
for (let i = 0; i < 100; i++) {
    let open = currentPrice;
    let close = generateTick(true);
    let high = Math.max(open, close) + (Math.random() * 5);
    let low = Math.min(open, close) - (Math.random() * 5);
    history.push({ time: currentMinute, open: parseFloat(open.toFixed(2)), high: parseFloat(high.toFixed(2)), low: parseFloat(low.toFixed(2)), close: parseFloat(close.toFixed(2)) });
    currentPrice = close;
    currentMinute += 60;
}

// --- SAMBUNGAN WEBSOCKET & SUPABASE ---
io.on('connection', async (socket) => {
    socket.emit('history', history);
    
    // Tarik Baki dari Supabase
    const { data, error } = await supabase.from('users').select('balance').eq('id', 'admin').single();
    if (data) {
        socket.emit('sync_balance', data.balance);
    }

    // Kemas kini Baki selepas trade
    socket.on('update_balance', async (newBalance) => {
        await supabase.from('users').update({ balance: newBalance }).eq('id', 'admin');
    });
});

setInterval(() => {
    const tickPrice = generateTick(false);
    const nowMinute = Math.floor(Date.now() / 60000) * 60;

    if (!currentCandle || currentCandle.time !== nowMinute) {
        if (currentCandle) {
            history.push(currentCandle);
            if (history.length > 500) history.shift();
        }
        currentCandle = { time: nowMinute, open: tickPrice, high: tickPrice, low: tickPrice, close: tickPrice };
    } else {
        currentCandle.high = Math.max(currentCandle.high, tickPrice);
        currentCandle.low = Math.min(currentCandle.low, tickPrice);
        currentCandle.close = tickPrice;
    }
    
    io.emit('candle', currentCandle);
}, 1000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Berjalan di port ${PORT}`));
