import WebSocket from 'ws';

class WebSocketManager {
    constructor(url, options = {}) {
        this.url = url;
        this.options = {
            reconnectInterval: 30000,  // Increased to 30 seconds
            maxReconnectAttempts: 20,  // Increased attempts
            timeout: 60000,            // Longer timeout (60 seconds)
            ...options
        };
        this.reconnectAttempts = 0;
        this.fallbackUrls = [
            'wss://s1.ripple.com/',
            'wss://s2.ripple.com/',
            'wss://xrplcluster.com'
        ];
        this.currentUrlIndex = 0;
        this.ws = null;
        this.connected = false;
        this.setupConnection();
    }

    setupConnection() {
        const currentUrl = this.fallbackUrls[this.currentUrlIndex];
        
        this.ws = new WebSocket(currentUrl, {
            handshakeTimeout: this.options.timeout,
            maxPayload: 5 * 1024 * 1024, // 5MB
            perMessageDeflate: true
        });

        this.ws.on('open', () => {
            this.reconnectAttempts = 0;
            this.connected = true;
            console.log(`Connected successfully to ${currentUrl}`);
        });

        this.ws.on('error', (error) => {
            console.log(`WebSocket error on ${currentUrl}: ${error.message}`);
            this.connected = false;
            this.handleReconnect();
        });

        this.ws.on('close', () => {
            this.connected = false;
            this.handleReconnect();
        });
    }

    handleReconnect() {
        if (this.ws) {
            this.ws.removeAllListeners();
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.close();
            }
        }

        if (this.reconnectAttempts < this.options.maxReconnectAttempts) {
            this.reconnectAttempts++;
            this.currentUrlIndex = (this.currentUrlIndex + 1) % this.fallbackUrls.length;
            
            const delay = Math.min(
                this.options.reconnectInterval * Math.pow(1.5, Math.min(this.reconnectAttempts - 1, 5)),
                300000 // Max 5 minutes
            );
            
            console.log(`Attempting reconnection ${this.reconnectAttempts} using ${this.fallbackUrls[this.currentUrlIndex]} in ${delay/1000}s`);
            
            setTimeout(() => {
                this.setupConnection();
            }, delay);
        } else {
            console.log('Max reconnection attempts reached. Giving up.');
        }
    }

    send(data) {
        if (this.connected && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(typeof data === 'string' ? data : JSON.stringify(data));
            return true;
        }
        return false;
    }

    close() {
        if (this.ws) {
            this.ws.removeAllListeners();
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.close();
            }
        }
    }
}

export { WebSocketManager };
