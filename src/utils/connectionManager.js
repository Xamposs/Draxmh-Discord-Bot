import WebSocket from 'ws';
import { EventEmitter } from 'events';

export class ConnectionManager extends EventEmitter {
    constructor() {
        super();
        this.connections = new Map();
        this.retryAttempts = new Map();
        this.maxRetries = 5;
        this.retryDelay = 5000;
        
        this.nodes = [
            'wss://xrplcluster.com',
            'wss://s1.ripple.com',
            'wss://s2.ripple.com'
        ];
    }

    connect(serviceId) {
        let nodeIndex = 0;
        
        const tryConnect = () => {
            const ws = new WebSocket(this.nodes[nodeIndex], {
                handshakeTimeout: 30000,
                maxPayload: 5 * 1024 * 1024
            });

            ws.on('open', () => {
                this.connections.set(serviceId, ws);
                this.retryAttempts.set(serviceId, 0);
                this.emit('connected', serviceId);
            });

            ws.on('error', this.handleError.bind(this, serviceId, tryConnect));
            ws.on('close', this.handleClose.bind(this, serviceId, tryConnect));
        };

        tryConnect();
    }

    handleError(serviceId, reconnect, error) {
        const attempts = this.retryAttempts.get(serviceId) || 0;
        
        if (attempts < this.maxRetries) {
            setTimeout(() => {
                this.retryAttempts.set(serviceId, attempts + 1);
                reconnect();
            }, this.retryDelay * (attempts + 1));
        }
    }

    handleClose(serviceId, reconnect) {
        this.connections.delete(serviceId);
        this.handleError(serviceId, reconnect);
    }
}

// Single export of the connection manager instance
export const connectionManager = new ConnectionManager();