import { Client } from 'xrpl';
import EventEmitter from 'events';

class XRPLClientManager extends EventEmitter {
    constructor() {
        super();
        this.clients = new Map(); // Store multiple clients by purpose
        this.connectionStatus = {};
        this.reconnectTimers = {};
        this.servers = [
            'wss://xrplcluster.com',
            'wss://s1.ripple.com',
            'wss://s2.ripple.com'
        ];
        
        // Connection settings
        this.connectionSettings = {
            timeout: 20000,
            connectionTimeout: 20000,
            maxRetries: 3
        };
        
        // Rate limiting settings
        this.requestsPerMinute = 50; // Adjust based on XRPL public limits
        this.requestCounts = {};
        this.requestTimestamps = {};
    }

    /**
     * Get or create a client for a specific purpose
     * @param {string} purpose - Unique identifier for this client (e.g., 'pathfinder', 'monitor')
     * @returns {Promise<Client>} - XRPL client
     */
    async getClient(purpose = 'default') {
        // If we already have a connected client for this purpose, return it
        if (this.clients.has(purpose) && this.connectionStatus[purpose] === 'connected') {
            return this.clients.get(purpose);
        }

        // If we have a client that's connecting, wait for it
        if (this.clients.has(purpose) && this.connectionStatus[purpose] === 'connecting') {
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    this.removeListener(`${purpose}-connected`, onConnect);
                    this.removeListener(`${purpose}-error`, onError);
                    reject(new Error('Connection timeout'));
                }, 30000);

                const onConnect = (client) => {
                    clearTimeout(timeout);
                    this.removeListener(`${purpose}-error`, onError);
                    resolve(client);
                };

                const onError = (error) => {
                    clearTimeout(timeout);
                    this.removeListener(`${purpose}-connected`, onConnect);
                    reject(error);
                };

                this.once(`${purpose}-connected`, onConnect);
                this.once(`${purpose}-error`, onError);
            });
        }

        // Create a new client
        return this.createClient(purpose);
    }

    /**
     * Create a new XRPL client
     * @param {string} purpose - Unique identifier for this client
     * @returns {Promise<Client>} - XRPL client
     */
    async createClient(purpose = 'default') {
        // Choose a server with round-robin
        const serverIndex = Math.floor(Math.random() * this.servers.length);
        const server = this.servers[serverIndex];
        
        // Create client
        const client = new Client(server, this.connectionSettings);
        
        // Add a custom property to track if we've handled reconnect
        client._reconnectHandled = false;
        
        this.clients.set(purpose, client);
        this.connectionStatus[purpose] = 'connecting';
        
        // Set up event handlers
        this.setupClientEvents(client, purpose);
        
        try {
            console.log(`[${purpose}] Connecting to XRPL server: ${server}`);
            await client.connect();
            console.log(`[${purpose}] Connected successfully to ${server}`);
            this.connectionStatus[purpose] = 'connected';
            this.emit(`${purpose}-connected`, client);
            return client;
        } catch (error) {
            console.error(`[${purpose}] Failed to connect: ${error.message}`);
            this.connectionStatus[purpose] = 'error';
            this.emit(`${purpose}-error`, error);
            
            // Try to reconnect after a delay
            this.scheduleReconnect(purpose);
            throw error;
        }
    }

    /**
     * Set up event handlers for a client
     * @param {Client} client - XRPL client
     * @param {string} purpose - Client purpose identifier
     */
    setupClientEvents(client, purpose) {
        // Create a wrapper for the client's emit method to handle 'reconnect' events
        const originalEmit = client.emit;
        client.emit = function(event, ...args) {
            if (event === 'reconnect') {
                // If we've already handled this reconnect event, don't propagate it
                if (this._reconnectHandled) {
                    return true;
                }
                
                // Mark that we've handled this reconnect event
                this._reconnectHandled = true;
                
                console.log(`[${purpose}] XRPL client reconnecting...`);
                return true; // Indicate that the event was handled
            }
            
            // Reset the reconnect handled flag for other events
            if (event !== 'reconnect') {
                this._reconnectHandled = false;
            }
            
            // Call the original emit for all other events
            return originalEmit.call(this, event, ...args);
        };

        client.on('error', (error) => {
            console.error(`[${purpose}] XRPL client error: ${error?.message || error}`);
            this.connectionStatus[purpose] = 'error';
            
            // Only schedule reconnect if not already scheduled
            if (!this.reconnectTimers[purpose]) {
                this.scheduleReconnect(purpose);
            }
        });

        client.on('disconnected', (code, reason) => {
            console.log(`[${purpose}] XRPL connection lost. Code: ${code}, Reason: ${reason || 'Unknown'}`);
            this.connectionStatus[purpose] = 'disconnected';
            
            // Only schedule reconnect if not already scheduled
            if (!this.reconnectTimers[purpose]) {
                this.scheduleReconnect(purpose);
            }
        });
        
        // Add a direct handler for the connection's reconnect event if available
        if (client.connection) {
            client.connection.on('reconnect', () => {
                console.log(`[${purpose}] Connection reconnecting...`);
                // No need to do anything else, just acknowledge the event
            });
        }
    }

    /**
     * Schedule a reconnection attempt
     * @param {string} purpose - Client purpose identifier
     */
    scheduleReconnect(purpose) {
        // Clear any existing timer
        if (this.reconnectTimers[purpose]) {
            clearTimeout(this.reconnectTimers[purpose]);
        }
        
        // Calculate delay with exponential backoff
        const attempts = this.getReconnectAttempts(purpose);
        const delay = Math.min(30000, 5000 * Math.pow(1.5, attempts)); // Max 30 seconds
        
        console.log(`[${purpose}] Scheduling reconnect attempt in ${Math.round(delay/1000)}s`);
        
        this.reconnectTimers[purpose] = setTimeout(() => {
            this.reconnectTimers[purpose] = null;
            this.reconnect(purpose);
        }, delay);
    }

    /**
     * Get the number of reconnection attempts
     * @param {string} purpose - Client purpose identifier
     * @returns {number} - Number of attempts
     */
    getReconnectAttempts(purpose) {
        if (!this.requestCounts[purpose]) {
            this.requestCounts[purpose] = 0;
        }
        return this.requestCounts[purpose];
    }

    /**
     * Attempt to reconnect a client
     * @param {string} purpose - Client purpose identifier
     */
    async reconnect(purpose) {
        // Increment attempt counter
        if (!this.requestCounts[purpose]) {
            this.requestCounts[purpose] = 0;
        }
        this.requestCounts[purpose]++;
        
        // If too many attempts, back off for longer
        if (this.requestCounts[purpose] > 10) {
            console.log(`[${purpose}] Too many reconnect attempts, backing off for 5 minutes`);
            this.requestCounts[purpose] = 0; // Reset counter
            
            this.reconnectTimers[purpose] = setTimeout(() => {
                this.reconnectTimers[purpose] = null;
                this.reconnect(purpose);
            }, 5 * 60 * 1000); // 5 minutes
            
            return;
        }
        
        // Get the existing client
        const client = this.clients.get(purpose);
        
        // If client exists, disconnect it first
        if (client) {
            try {
                await client.disconnect();
                console.log(`[${purpose}] XRPL client disconnected`);
            } catch (error) {
                console.error(`[${purpose}] Error disconnecting XRPL client:`, error.message);
            }
        }
        
        // Create a new client
        try {
            await this.createClient(purpose);
        } catch (error) {
            // Error is already logged in createClient
            // We'll try again later via the scheduled reconnect
        }
    }

    /**
     * Execute a request with rate limiting
     * @param {string} purpose - Client purpose identifier
     * @param {Function} requestFn - Function that takes a client and executes a request
     * @returns {Promise<any>} - Request result
     */
    async executeRequest(purpose, requestFn) {
        // Initialize rate limiting counters
        if (!this.requestCounts[purpose]) {
            this.requestCounts[purpose] = 0;
            this.requestTimestamps[purpose] = [];
        }
        
        // Check if we're rate limited
        const now = Date.now();
        this.requestTimestamps[purpose] = this.requestTimestamps[purpose].filter(
            time => now - time < 60000 // Keep timestamps from last minute
        );
        
        if (this.requestTimestamps[purpose].length >= this.requestsPerMinute) {
            const oldestRequest = this.requestTimestamps[purpose][0];
            const waitTime = 60000 - (now - oldestRequest);
            
            console.log(`[${purpose}] Rate limit reached, waiting ${Math.round(waitTime/1000)}s`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        // Get a client
        const client = await this.getClient(purpose);
        
        // Execute the request
        try {
            this.requestTimestamps[purpose].push(Date.now());
            return await requestFn(client);
        } catch (error) {
            console.error(`[${purpose}] Request error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Disconnect all clients
     */
    async disconnectAll() {
        for (const [purpose, client] of this.clients.entries()) {
            try {
                await client.disconnect();
                console.log(`[${purpose}] XRPL client disconnected`);
            } catch (error) {
                console.error(`[${purpose}] Error disconnecting XRPL client:`, error.message);
            }
        }
        
        // Clear all timers
        for (const purpose in this.reconnectTimers) {
            if (this.reconnectTimers[purpose]) {
                clearTimeout(this.reconnectTimers[purpose]);
                this.reconnectTimers[purpose] = null;
            }
        }
        
        this.clients.clear();
        this.connectionStatus = {};
    }
}

// Create a singleton instance
const xrplClientManager = new XRPLClientManager();

export { xrplClientManager };
