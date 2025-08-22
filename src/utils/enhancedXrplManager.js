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
            timeout: 30000,           // Increased from 15000
            connectionTimeout: 30000, // Increased from 15000
            maxRetries: 3,
            // Add WebSocket-specific timeout settings
            handshakeTimeout: 30000,
            pingInterval: 30000,
            pongTimeout: 10000
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
            const errorMessage = error?.message || error?.toString() || 'Unknown XRPL connection error';
            console.error(`[${purpose}] Connection failed:`, errorMessage);
            
            // Only report non-reconnect errors to error handler
            if (!this.isReconnectError(error)) {
                errorHandler.handleServiceError('XrplManager', error);
            }
            
            this.scheduleReconnect(purpose);
            throw error;
        }
    }

    setupClientEventHandlers(client, purpose, server) {
        // Override the emit method to handle reconnect events properly
        const originalEmit = client.emit.bind(client);
        client.emit = (event, ...args) => {
            if (event === 'reconnect') {
                console.log(`[${purpose}] XRPL reconnect event handled gracefully`);
                return true;
            }
            
            // Handle timeout and handshake errors
            if (event === 'error') {
                const error = args[0];
                if (error && (error.message?.includes('timeout') || error.message?.includes('handshake'))) {
                    console.log(`[${purpose}] XRPL timeout/handshake error handled:`, error.message);
                    this.scheduleReconnect(purpose);
                    return true;
                }
            }
            
            try {
                return originalEmit(event, ...args);
            } catch (emitError) {
                console.error(`[${purpose}] Error in XRPL client emit:`, emitError.message);
                return false;
            }
        };
    
        client.on('error', (error) => {
            const errorMessage = error?.message || error?.toString() || 'Unknown error';
            
            // Handle timeout and handshake errors gracefully
            if (errorMessage.includes('timeout') || errorMessage.includes('handshake')) {
                console.log(`[${purpose}] XRPL connection timeout, scheduling reconnect:`, errorMessage);
                this.connectionStatus.set(purpose, 'error');
                this.stopHeartbeat(purpose);
                this.scheduleReconnect(purpose);
                return;
            }
            
            console.error(`[${purpose}] XRPL client error:`, errorMessage);
            this.connectionStatus.set(purpose, 'error');
            this.stopHeartbeat(purpose);
            
            if (!this.isReconnectError(error)) {
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
                const errorMessage = error?.message || error?.toString() || 'Unknown connection error';
                if (!this.isReconnectError(error)) {
                    console.error(`[${purpose}] Connection error:`, errorMessage);
                }
            });
        }

        // Add unhandled error protection
        client.on('unhandledRejection', (reason, promise) => {
            console.error(`[${purpose}] Unhandled rejection in XRPL client:`, reason);
        });

        // Catch any other events that might cause issues
        client.setMaxListeners(20); // Increase listener limit to prevent warnings
    }

    isReconnectError(error) {
        if (!error) return false;
        
        const errorStr = error.toString().toLowerCase();
        const messageStr = (error.message || '').toLowerCase();
        
        return errorStr.includes('reconnect') || 
               messageStr.includes('reconnect') ||
               errorStr.includes('websocket') ||
               messageStr.includes('websocket') ||
               error.code === 'ERR_UNHANDLED_ERROR';
    }

    startHeartbeat(purpose, client) {
        this.stopHeartbeat(purpose); // Clear any existing heartbeat
        
        const interval = setInterval(async () => {
            try {
                if (client && client.isConnected()) {
                    // Send a lightweight request to check connection
                    await client.request({ command: 'server_info' });
                } else {
                    console.log(`[${purpose}] Client disconnected during heartbeat`);
                    this.stopHeartbeat(purpose);
                    this.scheduleReconnect(purpose);
                }
            } catch (error) {
                console.log(`[${purpose}] Heartbeat failed - connection may be stale`);
                this.stopHeartbeat(purpose);
                this.scheduleReconnect(purpose);
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
        // Prevent multiple reconnect attempts
        if (this.reconnectTimers.has(purpose)) {
            return;
        }
        
        const delay = 5000 + Math.random() * 5000; // 5-10 second delay
        console.log(`[${purpose}] Scheduling reconnect in ${Math.round(delay/1000)}s`);
        
        const timer = setTimeout(async () => {
            this.reconnectTimers.delete(purpose);
            try {
                console.log(`[${purpose}] Attempting reconnection...`);
                await this.createClient(purpose);
            } catch (error) {
                const errorMessage = error?.message || error?.toString() || 'Unknown reconnection error';
                console.error(`[${purpose}] Reconnection failed:`, errorMessage);
                // Don't schedule another reconnect immediately to prevent spam
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
                    await Promise.race([
                        client.disconnect(),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Disconnect timeout')), 5000))
                    ]);
                }
            } catch (error) {
                // Ignore cleanup errors
                console.log(`[${purpose}] Cleanup error (ignored):`, error?.message || 'Unknown');
            }
            
            this.clients.delete(purpose);
        }
        
        // Clear timers
        const timer = this.reconnectTimers.get(purpose);
        if (timer) {
            clearTimeout(timer);
            this.reconnectTimers.delete(purpose);
        }
        
        this.connectionStatus.delete(purpose);
    }

    getConnectionStatus(purpose = 'default') {
        return this.connectionStatus.get(purpose) || 'disconnected';
    }

    getAllConnections() {
        const connections = {};
        for (const [purpose, status] of this.connectionStatus.entries()) {
            connections[purpose] = {
                status,
                hasClient: this.clients.has(purpose),
                isConnected: this.clients.get(purpose)?.isConnected() || false
            };
        }
        return connections;
    }

    async stop() {
        console.log('Stopping XRPL Manager...');
        
        // Clean up all clients
        const cleanupPromises = Array.from(this.clients.keys()).map(purpose => 
            this.cleanupClient(purpose)
        );
        
        await Promise.allSettled(cleanupPromises);
        
        // Clear all timers
        this.reconnectTimers.forEach(timer => clearTimeout(timer));
        this.heartbeatIntervals.forEach(interval => clearInterval(interval));
        
        this.reconnectTimers.clear();
        this.heartbeatIntervals.clear();
        this.connectionStatus.clear();
        this.clients.clear();
        
        console.log('XRPL Manager stopped');
    }
}

export const xrplManager = new EnhancedXrplManager();