import WebSocket from 'ws';
import EventEmitter from 'events';
import { errorHandler } from './errorHandler.js';

class EnhancedWebSocketManager extends EventEmitter {
    constructor(endpoints, options = {}) {
        super();
        this.endpoints = endpoints;
        this.currentEndpoint = 0;
        this.ws = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
        this.reconnectDelay = options.reconnectDelay || 5000;
        this.heartbeatInterval = null;
        this.connectionTimeout = null;
        this.isShuttingDown = false;
        
        this.options = {
            handshakeTimeout: 15000,
            timeout: 15000,
            ...options
        };
        
        errorHandler.registerService(this);
    }

    async connect() {
        if (this.isShuttingDown) return;
        
        this.cleanup();
        
        const endpoint = this.endpoints[this.currentEndpoint];
        console.log(`Connecting to WebSocket: ${endpoint}`);
        
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(endpoint, this.options);
            
            // Set connection timeout
            this.connectionTimeout = setTimeout(() => {
                if (this.ws.readyState === WebSocket.CONNECTING) {
                    this.ws.terminate();
                    this.handleConnectionError(new Error('Connection timeout'));
                    reject(new Error('Connection timeout'));
                }
            }, this.options.handshakeTimeout);
            
            this.ws.on('open', () => {
                clearTimeout(this.connectionTimeout);
                this.connected = true;
                this.reconnectAttempts = 0;
                console.log(`Connected to ${endpoint}`);
                this.startHeartbeat();
                this.emit('connected');
                resolve();
            });
            
            this.ws.on('close', (code, reason) => {
                clearTimeout(this.connectionTimeout);
                this.connected = false;
                this.stopHeartbeat();
                console.log(`WebSocket closed. Code: ${code}, Reason: ${reason}`);
                
                if (!this.isShuttingDown) {
                    this.handleConnectionError(new Error(`Connection closed: ${code} ${reason}`));
                }
                this.emit('disconnected', code, reason);
            });
            
            this.ws.on('error', (error) => {
                clearTimeout(this.connectionTimeout);
                console.error('WebSocket error:', error.message);
                this.handleConnectionError(error);
                reject(error);
            });
            
            this.ws.on('message', (data) => {
                this.emit('message', data);
            });
        });
    }

    startHeartbeat() {
        this.stopHeartbeat();
        
        this.heartbeatInterval = setInterval(() => {
            if (this.connected && this.ws.readyState === WebSocket.OPEN) {
                this.ws.ping();
            } else {
                this.stopHeartbeat();
            }
        }, 30000);
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    handleConnectionError(error) {
        this.connected = false;
        this.reconnectAttempts++;
        
        errorHandler.handleServiceError('WebSocketManager', error);
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.rotateEndpoint();
            this.reconnectAttempts = 0;
        }
        
        if (!this.isShuttingDown) {
            const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
            console.log(`Scheduling reconnect in ${Math.round(delay/1000)}s`);
            
            setTimeout(() => {
                if (!this.isShuttingDown) {
                    this.connect().catch(err => {
                        console.error('Reconnection failed:', err.message);
                    });
                }
            }, delay);
        }
    }

    rotateEndpoint() {
        this.currentEndpoint = (this.currentEndpoint + 1) % this.endpoints.length;
        console.log(`Rotating to endpoint: ${this.endpoints[this.currentEndpoint]}`);
    }

    send(data) {
        if (this.connected && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(data);
            return true;
        }
        return false;
    }

    cleanup() {
        this.stopHeartbeat();
        
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
        
        if (this.ws) {
            this.ws.removeAllListeners();
            if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
                this.ws.terminate();
            }
            this.ws = null;
        }
    }

    async stop() {
        console.log('Stopping WebSocket Manager...');
        this.isShuttingDown = true;
        this.cleanup();
        this.connected = false;
        console.log('WebSocket Manager stopped');
    }
}

export { EnhancedWebSocketManager };