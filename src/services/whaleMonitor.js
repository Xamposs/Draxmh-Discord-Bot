const { Client } = require('xrpl');

class WhaleMonitor {
    constructor(discordClient) {
        this.discordClient = discordClient;
        this.xrplClient = null;
        this.endpoints = [
            'wss://xrplcluster.com',
            'wss://s1.ripple.com',
            'wss://s2.ripple.com'
        ];
        this.currentEndpoint = 0;
        this.connectionAttempts = new Map();
        this.maxAttemptsPerEndpoint = 3;
        this.reconnectDelay = 10000;
        this.subscriptionRetryDelay = 5000;
        this.isConnecting = false;
        this.activeSubscriptions = new Set();
    }

    async start() {
        await this.initializeConnection();
        this.setupHealthCheck();
    }

    setupHealthCheck() {
        setInterval(() => {
            if (!this.xrplClient?.isConnected()) {
                console.log('Health check: Connection lost, reinitializing...');
                this.initializeConnection();
            }
        }, 30000);
    }

    async initializeConnection() {
        if (this.isConnecting) return;
        
        this.isConnecting = true;
        const endpoint = this.getNextEndpoint();
        
        try {
            if (this.xrplClient) {
                await this.xrplClient.disconnect();
            }

            this.xrplClient = new Client(endpoint, {
                connectionTimeout: 20000,
                maxRetries: 3
            });

            this.setupEventHandlers();
            await this.connect();
            
        } catch (error) {
            console.log(`Connection failed to ${endpoint}:`, error.message);
            this.handleConnectionFailure();
        } finally {
            this.isConnecting = false;
        }
    }

    setupEventHandlers() {
        this.xrplClient.on('connected', () => {
            console.log(`Connected successfully to ${this.endpoints[this.currentEndpoint]}`);
            this.connectionAttempts.set(this.currentEndpoint, 0);
            this.subscribe();
        });

        this.xrplClient.on('disconnected', (code, reason) => {
            console.log(`Disconnected from ${this.endpoints[this.currentEndpoint]}: ${code}`);
            this.handleConnectionFailure();
        });

        this.xrplClient.on('error', (error) => {
            console.log(`Error on ${this.endpoints[this.currentEndpoint]}:`, error.message);
            this.handleConnectionFailure();
        });
    }

    getNextEndpoint() {
        this.currentEndpoint = (this.currentEndpoint + 1) % this.endpoints.length;
        return this.endpoints[this.currentEndpoint];
    }

    async connect() {
        try {
            await this.xrplClient.connect();
        } catch (error) {
            throw new Error(`Connection failed: ${error.message}`);
        }
    }

    handleConnectionFailure() {
        const attempts = (this.connectionAttempts.get(this.currentEndpoint) || 0) + 1;
        this.connectionAttempts.set(this.currentEndpoint, attempts);

        if (attempts >= this.maxAttemptsPerEndpoint) {
            console.log(`Max attempts reached for ${this.endpoints[this.currentEndpoint]}`);
            this.connectionAttempts.set(this.currentEndpoint, 0);
        }

        setTimeout(() => {
            if (!this.isConnecting) {
                this.initializeConnection();
            }
        }, this.reconnectDelay);
    }

    async subscribe() {
        try {
            const response = await this.xrplClient.request({
                command: 'subscribe',
                streams: ['transactions']
            });
            
            if (response.status === 'success') {
                console.log('Successfully subscribed to transactions');
                this.activeSubscriptions.add('transactions');
            }
        } catch (error) {
            console.log('Subscription error:', error.message);
            setTimeout(() => this.subscribe(), this.subscriptionRetryDelay);
        }
    }

    stop() {
        if (this.xrplClient?.isConnected()) {
            this.xrplClient.disconnect();
        }
    }
}

module.exports = { WhaleMonitor };
