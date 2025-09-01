import WebSocket from 'ws';
import { EmbedBuilder } from 'discord.js';
import { withRetry } from '../utils/networkRetry.js';

class WhaleMonitor {
    constructor(discordClient) {
        this.discordClient = discordClient;
        this.channelId = '1307089076498993265';
        this.minAmount = 100000; // 100k XRP minimum
        this.maxAmount = 50000000; // 50M XRP maximum (reasonable whale limit)
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
        this.heartbeatInterval = null;
        this.reconnectTimer = null;
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
        if (!tx?.TransactionType || tx.TransactionType !== 'Payment') return false;
        if (!tx?.Amount || !tx?.Account || !tx?.Destination) return false;
        
        // Skip self-transfers
        if (tx.Account === tx.Destination) return false;
        
        const amount = this.getTransactionAmount(tx);
        
        // Validate amount is within reasonable whale range
        if (isNaN(amount) || amount < this.minAmount || amount > this.maxAmount) return false;
        
        // Skip transactions with suspicious patterns (test transactions often have repeated digits)
        const amountStr = amount.toString();
        if (this.isSuspiciousAmount(amountStr)) return false;
        
        return true;
    }

    isSuspiciousAmount(amountStr) {
        // Check for repeated patterns that indicate test transactions
        const repeatedPattern = /(\d)\1{6,}/; // 7+ repeated digits
        const ninesPattern = /9{8,}/; // 8+ consecutive 9s
        const zerosPattern = /0{8,}/; // 8+ consecutive 0s
        
        return repeatedPattern.test(amountStr) || ninesPattern.test(amountStr) || zerosPattern.test(amountStr);
    }

    getTransactionAmount(tx) {
        const amount = tx.Amount;
        if (typeof amount === 'string') {
            return Number(amount) / 1000000; // Convert drops to XRP
        } else if (amount?.value) {
            return Number(amount.value);
        }
        return 0;
    }

    async processTransaction(tx) {
        try {
            const amount = this.getTransactionAmount(tx);
            
            // Format amount with appropriate precision
            const formattedAmount = amount >= 1000000 
                ? `${(amount / 1000000).toFixed(2)}M` 
                : amount.toLocaleString(undefined, { maximumFractionDigits: 0 });
            
            const embed = new EmbedBuilder()
                .setTitle('🐋 Whale Transaction Detected')
                .setColor('#ff9900')
                .addFields(
                    { 
                        name: '💰 Amount', 
                        value: `**${formattedAmount} XRP**\n*≈ $${(amount * 0.5).toLocaleString(undefined, { maximumFractionDigits: 0 })}*`, 
                        inline: true 
                    },
                    { 
                        name: '📤 From', 
                        value: `\`${tx.Account.substring(0, 8)}...${tx.Account.substring(tx.Account.length - 8)}\``, 
                        inline: true 
                    },
                    { 
                        name: '📥 To', 
                        value: `\`${tx.Destination.substring(0, 8)}...${tx.Destination.substring(tx.Destination.length - 8)}\``, 
                        inline: true 
                    }
                )
                .addFields({
                    name: '🔍 Transaction Details', 
                    value: `[View on XRPSCAN](https://xrpscan.com/tx/${tx.hash})`,
                    inline: false
                })
                .setFooter({ 
                    text: `Whale Alert • ${amount >= 1000000 ? '🚨 MEGA WHALE' : amount >= 500000 ? '🐋 BIG WHALE' : '🐳 WHALE'}`,
                    iconURL: 'https://cryptologos.cc/logos/xrp-xrp-logo.png'
                })
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
