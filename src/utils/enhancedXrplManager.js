import { Client } from 'xrpl';
import EventEmitter from 'events';
import { errorHandler } from './errorHandler.js';

class EnhancedXrplManager extends EventEmitter {
    constructor() {
        super();
        this.clients = new Map();
        this.connectionStatus = new Map();
        this.reconnectTimers = new Map();
        this.heartbeatIntervals = new Map();
        
        this.servers = [
            'wss://xrplcluster.com',
            'wss://s1.ripple.com',
            'wss://s2.ripple.com',
            'wss://xrpl.ws'
        ];
        
        this.connectionSettings = {
            timeout: 15000,
            connectionTimeout: 15000,
            maxRetries: 3
        };
        
        errorHandler.registerService(this);
    }

    async getClient(purpose = 'default') {
        if (errorHandler.isServiceBlocked('XrplManager')) {
            throw new Error('XRPL Manager is temporarily blocked due to repeated errors');
        }

        const existingClient = this.clients.get(purpose);
        const status = this.connectionStatus.get(purpose);
        
        if (existingClient && status === 'connected' && existingClient.isConnected()) {
            return existingClient;
        }

        return this.createClient(purpose);
    }

    async createClient(purpose = 'default') {
        // Clean up existing client
        await this.cleanupClient(purpose);
        
        const serverIndex = Math.floor(Math.random() * this.servers.length);
        const server = this.servers[serverIndex];
        
        const client = new Client(server, this.connectionSettings);
        
        // Enhanced reconnect event handling
        this.setupClientEventHandlers(client, purpose, server);
        
        this.clients.set(purpose, client);
        this.connectionStatus.set(purpose, 'connecting');
        
        try {
            console.log(`[${purpose}] Connecting to XRPL: ${server}`);
            await client.connect();
            
            this.connectionStatus.set(purpose, 'connected');
            this.startHeartbeat(purpose, client);
            
            console.log(`[${purpose}] Successfully connected to ${server}`);
            this.emit(`${purpose}-connected`, client);
            
            return client;
        } catch (error) {
            this.connectionStatus.set(purpose, 'error');
            errorHandler.handleServiceError('XrplManager', error);
            this.scheduleReconnect(purpose);
            throw error;
        }
    }

    setupClientEventHandlers(client, purpose, server) {
        // Override the emit method to handle reconnect events properly
        const originalEmit = client.emit.bind(client);
        client.emit = (event, ...args) => {
            if (event === 'reconnect') {
                console.log(`[${purpose}] XRPL reconnect event - handling gracefully`);
                return true; // Mark as handled
            }
            return originalEmit(event, ...args);
        };

        client.on('error', (error) => {
            console.error(`[${purpose}] XRPL client error:`, error.message);
            this.connectionStatus.set(purpose, 'error');
            this.stopHeartbeat(purpose);
            
            // Don't log reconnect errors as service errors
            if (!error.message.includes('reconnect')) {
                errorHandler.handleServiceError('XrplManager', error);
            }
            
            this.scheduleReconnect(purpose);
        });

        client.on('disconnected', (code, reason) => {
            console.log(`[${purpose}] XRPL disconnected. Code: ${code}, Reason: ${reason || 'Unknown'}`);
            this.connectionStatus.set(purpose, 'disconnected');
            this.stopHeartbeat(purpose);
            this.scheduleReconnect(purpose);
        });

        // Handle connection-level events if available
        if (client.connection) {
            client.connection.on('reconnect', () => {
                console.log(`[${purpose}] Connection layer reconnecting...`);
            });
            
            client.connection.on('error', (error) => {
                if (!error.message.includes('reconnect')) {
                    console.error(`[${purpose}] Connection error:`, error.message);
                }
            });
        }
    }

    startHeartbeat(purpose, client) {
        this.stopHeartbeat(purpose); // Clear any existing heartbeat
        
        const interval = setInterval(() => {
            if (client.isConnected()) {
                // Send a lightweight request to check connection
                client.request({ command: 'server_info' }).catch(() => {
                    console.log(`[${purpose}] Heartbeat failed - connection may be stale`);
                    this.scheduleReconnect(purpose);
                });
            } else {
                this.stopHeartbeat(purpose);
            }
        }, 30000); // 30 second heartbeat
        
        this.heartbeatIntervals.set(purpose, interval);
    }

    stopHeartbeat(purpose) {
        const interval = this.heartbeatIntervals.get(purpose);
        if (interval) {
            clearInterval(interval);
            this.heartbeatIntervals.delete(purpose);
        }
    }

    scheduleReconnect(purpose) {
        // Clear existing timer
        const existingTimer = this.reconnectTimers.get(purpose);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }
        
        const delay = 5000 + Math.random() * 5000; // 5-10 second delay
        
        const timer = setTimeout(async () => {
            this.reconnectTimers.delete(purpose);
            try {
                await this.createClient(purpose);
            } catch (error) {
                console.error(`[${purpose}] Reconnection failed:`, error.message);
            }
        }, delay);
        
        this.reconnectTimers.set(purpose, timer);
    }

    async cleanupClient(purpose) {
        const client = this.clients.get(purpose);
        if (client) {
            this.stopHeartbeat(purpose);
            
            try {
                if (client.isConnected()) {
                    await client.disconnect();
                }
            } catch (error) {
                // Ignore cleanup errors
            }
            
            this.clients.delete(purpose);
        }
        
        // Clear timers
        const timer = this.reconnectTimers.get(purpose);
        if (timer) {
            clearTimeout(timer);
            this.reconnectTimers.delete(purpose);
        }
    }

    async stop() {
        console.log('Stopping XRPL Manager...');
        
        // Clean up all clients
        const cleanupPromises = Array.from(this.clients.keys()).map(purpose => 
            this.cleanupClient(purpose)
        );
        
        await Promise.all(cleanupPromises);
        
        // Clear all timers
        this.reconnectTimers.forEach(timer => clearTimeout(timer));
        this.heartbeatIntervals.forEach(interval => clearInterval(interval));
        
        this.reconnectTimers.clear();
        this.heartbeatIntervals.clear();
        this.connectionStatus.clear();
        
        console.log('XRPL Manager stopped');
    }
}

export const xrplManager = new EnhancedXrplManager();