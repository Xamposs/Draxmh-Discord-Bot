import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { errorHandler } from './errorHandler.js';
import { healthCheck } from './healthCheck.js';

class EnhancedWebSocketManager extends EventEmitter {
    constructor(serviceId, endpoints, options = {}) {
        super();
        this.serviceId = serviceId;
        this.endpoints = Array.isArray(endpoints) ? endpoints : [endpoints];
        this.options = {
            reconnectInterval: 5000,
            maxReconnectAttempts: 10,
            timeout: 30000,
            heartbeatInterval: 30000,
            exponentialBackoff: true,
            maxBackoffDelay: 300000, // 5 minutes
            ...options
        };
        
        this.currentEndpointIndex = 0;
        this.reconnectAttempts = 0;
        this.ws = null;
        this.connected = false;
        this.connecting = false;
        this.heartbeatTimer = null;
        this.reconnectTimer = null;
        this.lastPong = Date.now();
        this.connectionStartTime = null;
        
        // Bind methods to preserve context
        this.handleOpen = this.handleOpen.bind(this);
        this.handleClose = this.handleClose.bind(this);
        this.handleError = this.handleError.bind(this);
        this.handleMessage = this.handleMessage.bind(this);
        this.handlePong = this.handlePong.bind(this);
    }

    async connect() {
        if (this.connecting || this.connected) {
            return;
        }

        this.connecting = true;
        this.connectionStartTime = Date.now();
        
        try {
            await this.createConnection();
        } catch (error) {
            this.connecting = false;
            await errorHandler.handleServiceError(this.serviceId, error, 'connect');
            this.scheduleReconnect();
        }
    }

    async createConnection() {
        const endpoint = this.endpoints[this.currentEndpointIndex];
        console.log(`[${this.serviceId}] Connecting to ${endpoint}...`);
        
        // Clean up existing connection
        this.cleanup();
        
        this.ws = new WebSocket(endpoint, {
            handshakeTimeout: this.options.timeout,
            maxPayload: 5 * 1024 * 1024,
            perMessageDeflate: true
        });

        // Set up event listeners
        this.ws.on('open', this.handleOpen);
        this.ws.on('close', this.handleClose);
        this.ws.on('error', this.handleError);
        this.ws.on('message', this.handleMessage);
        this.ws.on('pong', this.handlePong);

        // Set connection timeout
        const timeoutId = setTimeout(() => {
            if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
                this.ws.terminate();
                this.handleError(new Error('Connection timeout'));
            }
        }, this.options.timeout);

        this.ws.once('open', () => clearTimeout(timeoutId));
    }

    handleOpen() {
        this.connected = true;
        this.connecting = false;
        this.reconnectAttempts = 0;
        this.lastPong = Date.now();
        
        const connectionTime = Date.now() - this.connectionStartTime;
        console.log(`[${this.serviceId}] Connected successfully in ${connectionTime}ms`);
        
        healthCheck.updateStatus(this.serviceId, true);
        this.startHeartbeat();
        this.emit('connected');
    }

    handleClose(code, reason) {
        this.connected = false;
        this.connecting = false;
        
        console.log(`[${this.serviceId}] Connection closed: ${code} - ${reason}`);
        
        healthCheck.updateStatus(this.serviceId, false);
        this.stopHeartbeat();
        this.emit('disconnected', { code, reason });
        
        // Don't reconnect if it was a clean close
        if (code !== 1000) {
            this.scheduleReconnect();
        }
    }

    async handleError(error) {
        console.error(`[${this.serviceId}] WebSocket error:`, error.message);
        
        const shouldRetry = await errorHandler.handleServiceError(
            this.serviceId, 
            error, 
            'websocket'
        );
        
        this.connected = false;
        this.connecting = false;
        healthCheck.updateStatus(this.serviceId, false);
        
        this.emit('error', error);
        
        if (shouldRetry) {
            this.scheduleReconnect();
        } else {
            console.error(`[${this.serviceId}] Max retries exceeded or circuit breaker active`);
            this.emit('maxRetriesExceeded');
        }
    }

    handleMessage(data) {
        try {
            const message = JSON.parse(data.toString());
            this.emit('message', message);
        } catch (error) {
            console.error(`[${this.serviceId}] Failed to parse message:`, error);
            this.emit('parseError', error, data);
        }
    }

    handlePong() {
        this.lastPong = Date.now();
    }

    scheduleReconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        this.reconnectAttempts++;
        
        if (this.reconnectAttempts > this.options.maxReconnectAttempts) {
            console.error(`[${this.serviceId}] Max reconnection attempts reached`);
            this.emit('maxRetriesExceeded');
            return;
        }

        // Rotate to next endpoint
        this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.endpoints.length;
        
        let delay = this.options.reconnectInterval;
        
        if (this.options.exponentialBackoff) {
            delay = Math.min(
                this.options.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
                this.options.maxBackoffDelay
            );
        }
        
        // Add jitter to prevent thundering herd
        delay += Math.random() * 1000;
        
        console.log(`[${this.serviceId}] Reconnecting in ${Math.round(delay/1000)}s (attempt ${this.reconnectAttempts})`);
        
        this.reconnectTimer = setTimeout(() => {
            this.connect();
        }, delay);
    }

    startHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
        }
        
        this.heartbeatTimer = setInterval(() => {
            if (this.connected && this.ws.readyState === WebSocket.OPEN) {
                // Check if we received a pong recently
                if (Date.now() - this.lastPong > this.options.heartbeatInterval * 2) {
                    console.warn(`[${this.serviceId}] Heartbeat timeout, reconnecting...`);
                    this.ws.terminate();
                    return;
                }
                
                this.ws.ping();
            }
        }, this.options.heartbeatInterval);
    }

    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    send(data) {
        if (!this.connected || this.ws.readyState !== WebSocket.OPEN) {
            console.warn(`[${this.serviceId}] Cannot send data: not connected`);
            return false;
        }
        
        try {
            const payload = typeof data === 'string' ? data : JSON.stringify(data);
            this.ws.send(payload);
            return true;
        } catch (error) {
            console.error(`[${this.serviceId}] Failed to send data:`, error);
            return false;
        }
    }

    cleanup() {
        this.stopHeartbeat();
        
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        
        if (this.ws) {
            this.ws.removeAllListeners();
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.close(1000, 'Clean shutdown');
            } else {
                this.ws.terminate();
            }
            this.ws = null;
        }
    }

    disconnect() {
        this.connected = false;
        this.connecting = false;
        this.cleanup();
        this.emit('disconnected', { code: 1000, reason: 'Manual disconnect' });
    }

    getStatus() {
        return {
            serviceId: this.serviceId,
            connected: this.connected,
            connecting: this.connecting,
            currentEndpoint: this.endpoints[this.currentEndpointIndex],
            reconnectAttempts: this.reconnectAttempts,
            lastPong: this.lastPong,
            uptime: this.connected ? Date.now() - this.connectionStartTime : 0
        };
    }
}

export { EnhancedWebSocketManager };