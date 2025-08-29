import WebSocket from 'ws';
import { EmbedBuilder } from 'discord.js';
import { withRetry } from '../utils/networkRetry.js';

class WhaleMonitor {
    constructor(discordClient) {
        this.discordClient = discordClient;
        this.channelId = '1307089076498993265';
        this.minAmount = 100000;
        this.endpoints = [
            'wss://xrplcluster.com',
            'wss://s2.ripple.com',
            'wss://s1.ripple.com'
        ];
        this.currentEndpoint = 0;
        this.ws = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 5000;
        this.heartbeatInterval = null; // Store heartbeat interval reference
        this.reconnectTimer = null; // Store reconnect timer reference
        this.setupRetryConfig();
    }

    setupRetryConfig() {
        this.retryConfig = {
            maxAttempts: 3,
            initialDelay: 1000,
            maxDelay: 10000,
            backoffFactor: 2
        };
    }

    async start() {
        await this.connect();
        this.setupHeartbeat();
    }

    async connect() {
        if (this.ws) {
            this.cleanup();
        }

        this.ws = new WebSocket(this.endpoints[this.currentEndpoint], {
            handshakeTimeout: 10000,
            timeout: 10000
        });

        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.ws.on('open', () => {
            this.connected = true;
            this.reconnectAttempts = 0;
            console.log(`Connected to ${this.endpoints[this.currentEndpoint]}`);
            this.subscribe();
        });

        this.ws.on('close', () => {
            this.handleDisconnect('Connection closed');
        });

        this.ws.on('error', (error) => {
            this.handleDisconnect(`Connection error: ${error.message}`);
        });

        this.ws.on('message', (data) => {
            this.handleMessage(data);
        });
    }

    setupHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.connected && this.ws.readyState === WebSocket.OPEN) {
                this.ws.ping();
            }
        }, 30000);
    }

    handleDisconnect(reason) {
        this.connected = false;
        this.reconnectAttempts++;

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.rotateEndpoint();
            this.reconnectAttempts = 0;
        }

        this.reconnectTimer = setTimeout(() => this.connect(), this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1));
    }

    rotateEndpoint() {
        this.currentEndpoint = (this.currentEndpoint + 1) % this.endpoints.length;
        console.log(`Rotating to endpoint: ${this.endpoints[this.currentEndpoint]}`);
    }

    subscribe() {
        if (this.connected) {
            const message = {
                command: 'subscribe',
                streams: ['transactions']
            };
            this.ws.send(JSON.stringify(message));
        }
    }

    cleanup() {
        if (this.ws) {
            this.ws.removeAllListeners();
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.close();
            }
        }
    }

    handleMessage(data) {
        try {
            const message = JSON.parse(data.toString());
            if (message.type === 'transaction') {
                this.handleTransaction(message);
            }
        } catch (error) {
            console.log('Message parsing error:', error.message);
        }
    }

    handleTransaction(message) {
        const tx = message.transaction;
        if (this.isValidTransaction(tx)) {
            this.processTransaction(tx);
        }
    }

    isValidTransaction(tx) {
        return tx?.TransactionType === 'Payment' && 
               tx?.Amount && 
               this.getTransactionAmount(tx) >= this.minAmount;
    }

    getTransactionAmount(tx) {
        const amount = tx.Amount;
        return typeof amount === 'string' ? 
            Number(amount) / 1000000 : 
            Number(amount.value || 0);
    }

    async processTransaction(tx) {
        try {
            const amount = this.getTransactionAmount(tx);
            
            const embed = new EmbedBuilder()
                .setTitle('🐋 Whale Transaction Detected')
                .setColor('#ff9900')
                .addFields(
                    { name: '💰 Amount', value: `${amount.toLocaleString()} XRP`, inline: true },
                    { name: '📤 From', value: `\`${tx.Account}\``, inline: true },
                    { name: '📥 To', value: `\`${tx.Destination}\``, inline: true },
                    { name: '🔍 Transaction Details', value: `[View on XRPSCAN](https://xrpscan.com/tx/${tx.hash})` }
                )
                .setTimestamp();

            const channel = this.discordClient.channels.cache.get(this.channelId);
            if (channel) {
                await channel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.log('Transaction processing error:', error.message);
        }
    }

    async stop() {
        console.log('Stopping Whale Monitor...');
        
        // Clear heartbeat interval
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        
        // Clear reconnect timer
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        
        // Close WebSocket
        if (this.ws) {
            this.ws.close();
        }
        
        console.log('Whale Monitor stopped');
    }
}

export { WhaleMonitor };
