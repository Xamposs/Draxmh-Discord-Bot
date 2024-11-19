const WebSocket = require('ws');
const { processTransaction } = require('./whaleAlert');

class WhaleMonitor {
    constructor(client) {
        this.client = client;
        this.wsEndpoint = 'wss://xrplcluster.com/';
        this.reconnectInterval = 5000;
        this.isConnected = false;
    }

    start() {
        this.connect();
        this.startHeartbeat();
    }

    connect() {
        this.ws = new WebSocket(this.wsEndpoint);
        
        this.ws.on('open', () => {
            console.log('Whale Monitor: WebSocket connected');
            this.isConnected = true;
            this.ws.send(JSON.stringify({
                command: 'subscribe',
                streams: ['transactions']
            }));
        });

        this.ws.on('message', (data) => {
            const message = JSON.parse(data);
            if (message.type === 'transaction') {
                processTransaction(this.client, message.transaction);
            }
        });

        this.ws.on('close', () => {
            console.log('Whale Monitor: Connection lost, reconnecting...');
            this.isConnected = false;
            setTimeout(() => this.connect(), this.reconnectInterval);
        });

        this.ws.on('error', (error) => {
            console.error('Whale Monitor: WebSocket error:', error);
            this.ws.close();
        });
    }

    startHeartbeat() {
        setInterval(() => {
            if (!this.isConnected) {
                this.connect();
            }
        }, 10000);
    }
}

function monitorWhaleTransactions(client) {
    const monitor = new WhaleMonitor(client);
    monitor.start();
}

module.exports = { monitorWhaleTransactions };