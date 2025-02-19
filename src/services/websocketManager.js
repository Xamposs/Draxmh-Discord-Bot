import { Client } from 'xrpl';

class WebSocketManager {
    constructor() {
        this.maxRetries = 5;
        this.retryDelay = 5000;
        this.client = new Client('wss://xrplcluster.com', {
            connectionTimeout: 20000,
            maxRetries: this.maxRetries,
            failoverURIs: [
                'wss://s1.ripple.com',
                'wss://s2.ripple.com'
            ]
        });

        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.client.on('error', this.handleError.bind(this));
        this.client.on('disconnected', this.handleDisconnect.bind(this));
        this.client.on('reconnect', this.handleReconnect.bind(this));
    }

    handleError(error) {
        console.log('WebSocket error:', error.message);
        this.attemptReconnect();
    }

    handleDisconnect() {
        console.log('WebSocket disconnected');
        this.attemptReconnect();
    }

    handleReconnect() {
        console.log('WebSocket reconnecting...');
    }

    async attemptReconnect() {
        for (let i = 0; i < this.maxRetries; i++) {
            try {
                await this.client.connect();
                console.log('Successfully reconnected to WebSocket');
                break;
            } catch (error) {
                console.log(`Reconnection attempt ${i + 1} failed`);
                if (i < this.maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                }
            }
        }
    }
}

export const wsManager = new WebSocketManager();
