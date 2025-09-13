// PWA API Server for XRPL Draxmh Discord Bot
import express from 'express';
import path from 'path';
import cors from 'cors';
import WebSocket from 'ws';
import http from 'http';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import existing services with correct export names
import { getDRXPrice, getDRXMarketDepth } from '../src/services/priceService.js';
import { EnhancedScamProtection } from '../src/services/enhancedScamProtection.js';
import { LiveOrderbookService } from '../src/services/liveOrderbookService.js';

class PWAServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.wss = new WebSocket.Server({ server: this.server });
        this.port = process.env.PWA_PORT || 3001;
        
        // Initialize services that are available
        this.scamProtection = null;
        this.orderbookService = null;
        
        // Setup middleware and routes
        this.setupMiddleware();
        this.setupWebSocket();
    }

    setupMiddleware() {
        // CORS configuration
        this.app.use(cors({
            origin: ['http://localhost:3001', 'http://127.0.0.1:3001'],
            credentials: true
        }));
        
        // Body parsing middleware
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        
        // Setup API routes FIRST
        this.setupRoutes();
        
        // Serve static PWA files
        this.app.use(express.static(path.join(__dirname)));
        
        // Catch all route for PWA (use proper syntax)
        this.app.get('/*', (req, res) => {
            // Only serve index.html for non-API routes
            if (!req.path.startsWith('/api/')) {
                res.sendFile(path.join(__dirname, 'index.html'));
            } else {
                res.status(404).json({ error: 'API endpoint not found' });
            }
        });
    }

    setupRoutes() {
        // API Routes
        this.app.get('/api/price', this.getPriceData.bind(this));
        this.app.get('/api/whale-alerts', this.getWhaleAlerts.bind(this));
        this.app.get('/api/security', this.getSecurityStatus.bind(this));
        this.app.get('/api/market', this.getMarketData.bind(this));
        this.app.get('/api/whales', this.getWhaleData.bind(this));
        this.app.get('/api/security-data', this.getSecurityData.bind(this));
        
        // Health check
        this.app.get('/api/health', (req, res) => {
            res.json({ status: 'ok', timestamp: new Date().toISOString() });
        });
    }

    async getPriceData(req, res) {
        try {
            const priceData = await getDRXPrice();
            res.json({
                success: true,
                data: {
                    price: priceData.price,
                    currency: priceData.currency,
                    change24h: priceData.change24h,
                    source: priceData.source,
                    timestamp: priceData.timestamp
                }
            });
        } catch (error) {
            console.error('Error fetching price data:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch price data'
            });
        }
    }

    async getWhaleAlerts(req, res) {
        try {
            // Mock whale alerts data since we need to refactor the whale service
            const mockAlerts = [
                {
                    id: '1',
                    amount: '150,000 XRP',
                    from: 'rN7n...abc123',
                    to: 'rDsV...def456',
                    timestamp: Date.now() - 300000,
                    type: 'transfer'
                }
            ];
            
            res.json({
                success: true,
                data: mockAlerts
            });
        } catch (error) {
            console.error('Error fetching whale alerts:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch whale alerts'
            });
        }
    }

    async getSecurityStatus(req, res) {
        try {
            res.json({
                success: true,
                data: {
                    threatLevel: 'low',
                    activeThreats: 0,
                    scamsBlocked: 42,
                    lastUpdate: Date.now()
                }
            });
        } catch (error) {
            console.error('Error fetching security status:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch security status'
            });
        }
    }

    async getMarketData(req, res) {
        try {
            const priceData = await getDRXPrice();
            const marketDepth = await getDRXMarketDepth();
            
            res.json({
                success: true,
                data: {
                    price: priceData.price,
                    volume24h: '1,234,567 XRP',
                    marketCap: 'N/A',
                    orderbook: marketDepth,
                    timestamp: Date.now()
                }
            });
        } catch (error) {
            console.error('Error fetching market data:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch market data'
            });
        }
    }

    async getWhaleData(req, res) {
        try {
            // Mock whale tracking data
            res.json({
                success: true,
                data: {
                    totalWhales: 156,
                    activeWhales: 23,
                    recentMovements: [
                        {
                            wallet: 'rN7n...abc123',
                            amount: '250,000 XRP',
                            direction: 'in',
                            timestamp: Date.now() - 180000
                        }
                    ]
                }
            });
        } catch (error) {
            console.error('Error fetching whale data:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch whale data'
            });
        }
    }

    async getSecurityData(req, res) {
        try {
            res.json({
                success: true,
                data: {
                    alerts: [
                        {
                            id: '1',
                            type: 'phishing',
                            severity: 'medium',
                            description: 'Suspicious link detected',
                            timestamp: Date.now() - 600000
                        }
                    ],
                    stats: {
                        totalScamsBlocked: 42,
                        phishingAttempts: 15,
                        suspiciousUsers: 3
                    }
                }
            });
        } catch (error) {
            console.error('Error fetching security data:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch security data'
            });
        }
    }

    setupWebSocket() {
        this.wss.on('connection', (ws) => {
            console.log('📱 PWA client connected');
            this.clients.add(ws);
            
            // Send initial data
            this.sendInitialData(ws);
            
            ws.on('close', () => {
                console.log('📱 PWA client disconnected');
                this.clients.delete(ws);
            });
        });
    }

    async sendInitialData(ws) {
        try {
            const priceData = await getDRXPrice();
            ws.send(JSON.stringify({
                type: 'initial',
                data: { price: priceData }
            }));
        } catch (error) {
            console.error('Error sending initial data:', error);
        }
    }

    setupRealTimeUpdates() {
        // Price updates every 30 seconds
        setInterval(async () => {
            try {
                const priceData = await getDRXPrice();
                this.broadcast({
                    type: 'price_update',
                    data: priceData
                });
            } catch (error) {
                console.error('Error broadcasting price update:', error);
            }
        }, 30000);
    }

    broadcast(message) {
        const messageStr = JSON.stringify(message);
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(messageStr);
            }
        });
    }

    start() {
        this.server.listen(this.port, () => {
            console.log(`🌐 PWA Server running on http://localhost:${this.port}`);
        });
    }

    stop() {
        this.server.close();
    }
}

// Export using ES modules
export { PWAServer };

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const server = new PWAServer();
    server.start();
    
    process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down PWA server...');
        server.stop();
        process.exit(0);
    });
}