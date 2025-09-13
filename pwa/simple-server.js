import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PWA_PORT || 3001;

// CORS configuration
app.use(cors({
    origin: ['http://localhost:3001', 'http://127.0.0.1:3001'],
    credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic API routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/price', (req, res) => {
    res.json({
        price: 0.000001,
        currency: 'XRP',
        source: 'Mock data',
        timestamp: Date.now(),
        change24h: 2.5
    });
});

// Serve static PWA files
app.use(express.static(path.join(__dirname)));

// Catch all route for PWA
app.get('/*path', (req, res) => {
    if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(__dirname, 'index.html'));
    } else {
        res.status(404).json({ error: 'API endpoint not found' });
    }
});

app.listen(port, () => {
    console.log(`🌐 PWA Server running on http://localhost:${port}`);
});

process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down PWA server...');
    process.exit(0);
});