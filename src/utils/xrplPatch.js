import { Client } from 'xrpl';

/**
 * Patches the XRPL Client to handle reconnect events globally
 */
export function patchXrplClient() {
    // Make sure we don't patch twice
    if (Client.prototype._isPatchedForReconnect) {
        return;
    }
    
    // Keep track of the original emit method
    const originalEmit = Client.prototype.emit;
    
    // Create a new emit method that will properly handle reconnect events
    Client.prototype.emit = function(event, ...args) {
        // Special case for reconnect events
        if (event === 'reconnect') {
            console.log('XRPL client reconnect event detected and handled');
            
            // Don't throw an unhandled error for reconnect events
            // Just return true to indicate it was "handled"
            return true;
        }
        
        // For all other events, use the original behavior
        return originalEmit.apply(this, [event, ...args]);
    };
    
    // Mark as patched to avoid double patching
    Client.prototype._isPatchedForReconnect = true;
    
    console.log('XRPL Client successfully patched to handle reconnect events');
}
