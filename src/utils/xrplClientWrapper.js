import { Client } from 'xrpl';

/**
 * Creates a wrapped XRPL client that properly handles reconnect events
 * @param {string} server - XRPL server URL
 * @param {Object} options - Client options
 * @returns {Client} - Wrapped XRPL client
 */
export function createXrplClient(server, options = {}) {
    // Create the client
    const client = new Client(server, options);
    
    // Add explicit handler for reconnect events to prevent unhandled errors
    client.on('reconnect', () => {
        console.log(`XRPL client reconnecting to ${server}...`);
    });
    
    return client;
}
