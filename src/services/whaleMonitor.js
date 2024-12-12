const { WebSocket } = require('ws');
const { processTransaction } = require('./whaleAlert');

class WhaleMonitor {
    constructor(client) {
        this.client = client;
        this.endpoints = [
            'wss://xrplcluster.com/',
            'wss://s1.ripple.com/',
            'wss://s2.ripple.com/'
        ];
        this.currentEndpoint = 0;
        this.maxReconnectAttempts = 3;
        this.reconnectDelay = 10000;
        this.ws = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.connectionTimeout = null;
    }

    start() {
        this.connect();
        this.setupPingInterval();
    }

    getNextEndpoint() {
        this.currentEndpoint = (this.currentEndpoint + 1) % this.endpoints.length;
        return this.endpoints[this.currentEndpoint];
    }

    connect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts * this.endpoints.length) {
            console.log('All endpoints failed, waiting 60 seconds before retry...');
            this.reconnectAttempts = 0;
            setTimeout(() => this.connect(), 60000);
            return;
        }

        const endpoint = this.getNextEndpoint();
        console.log(`Attempting connection to ${endpoint}`);
        
        this.ws = new WebSocket(endpoint, {
            handshakeTimeout: 15000,
            timeout: 15000
        });

        this.connectionTimeout = setTimeout(() => {
            if (!this.isConnected) {
                this.handleDisconnect('Connection timeout');
            }
        }, 15000);

        this.ws.on('open', () => {
            clearTimeout(this.connectionTimeout);
            this.isConnected = true;
            this.reconnectAttempts = 0;
            console.log('Whale Monitor: Connected successfully');
            
            // Wait for connection to be fully established
            setTimeout(() => {
                this.subscribe();
            }, 1000);
        });

        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.ws.on('close', () => {
            this.handleDisconnect('Connection closed');
        });

        this.ws.on('error', (error) => {
            this.handleDisconnect(`Connection error: ${error.message}`);
        });

        this.ws.on('message', (data) => {
            if (this.isConnected) {
                try {
                    const message = JSON.parse(data);
                    if (message.type === 'transaction') {
                        processTransaction(this.client, message.transaction);
                    }
                } catch (error) {
                    console.log('Error processing message:', error);
                }
            }
        });
    }

    handleDisconnect(reason) {
        clearTimeout(this.connectionTimeout);
        this.isConnected = false;
        this.reconnectAttempts++;
        console.log(`${reason}. Attempt ${this.reconnectAttempts} of ${this.maxReconnectAttempts}`);
        
        if (this.ws) {
            this.ws.terminate();
        }
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => this.connect(), this.reconnectDelay);
        }
    }

    subscribe() {
        if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
            try {
                this.ws.send(JSON.stringify({
                    command: 'subscribe',
                    streams: ['transactions']
                }));
            } catch (error) {
                console.log('Subscribe error:', error);
                this.handleDisconnect('Subscribe failed');
            }
        }
    }

    setupPingInterval() {
        setInterval(() => {
            if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
                try {
                    this.ws.ping();
                } catch (error) {
                    this.handleDisconnect('Ping failed');
                }
            }
        }, 30000);
    }

    stop() {
        clearTimeout(this.connectionTimeout);
        if (this.ws) {
            this.ws.terminate();
        }
    }
}

module.exports = { WhaleMonitor };