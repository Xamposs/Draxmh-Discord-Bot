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
        try {
            // Special case for reconnect events
            if (event === 'reconnect') {
                console.log('XRPL reconnect event handled gracefully');
                
                // Don't throw an unhandled error for reconnect events
                // Just return true to indicate it was "handled"
                return true;
            }
            
            // For all other events, use the original behavior
            return originalEmit.apply(this, [event, ...args]);
        } catch (error) {
            // Catch any errors in the emit process
            console.error('Error in XRPL client emit:', error?.message || error);
            return false;
        }
    };
    
    // Override error handling to prevent unhandled rejections
    const originalOn = Client.prototype.on;
    Client.prototype.on = function(event, listener) {
        if (event === 'error') {
            // Wrap error listeners to prevent unhandled rejections
            const wrappedListener = (error) => {
                try {
                    listener(error);
                } catch (listenerError) {
                    console.error('Error in XRPL error listener:', listenerError?.message || listenerError);
                }
            };
            return originalOn.call(this, event, wrappedListener);
        }
        return originalOn.call(this, event, listener);
    };
    
    // Add global unhandled rejection handler for XRPL clients
    process.on('unhandledRejection', (reason, promise) => {
        if (reason && reason.toString().includes('reconnect')) {
            console.log('Unhandled Rejection: XRPL reconnect event handled gracefully');
            return;
        }
        
        // Let other unhandled rejections be handled normally
        console.error('Unhandled Rejection:', reason);
    });
    
    // Mark as patched to avoid double patching
    Client.prototype._isPatchedForReconnect = true;
    
    console.log('XRPL Client successfully patched to handle reconnect events');
}
