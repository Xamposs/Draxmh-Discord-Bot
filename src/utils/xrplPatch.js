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
                return true;
            }
            
            // Handle error events to prevent uncaught exceptions
            if (event === 'error') {
                const error = args[0];
                if (error && (error.message?.includes('timeout') || error.message?.includes('handshake'))) {
                    console.log('XRPL timeout/handshake error handled gracefully:', error.message);
                    return true;
                }
            }
            
            // For all other events, use the original behavior
            return originalEmit.apply(this, [event, ...args]);
        } catch (error) {
            console.error('Error in XRPL client emit:', error?.message || error);
            return false;
        }
    };
    
    // Override error handling to prevent unhandled rejections
    const originalOn = Client.prototype.on;
    Client.prototype.on = function(event, listener) {
        if (event === 'error') {
            const wrappedListener = (error) => {
                try {
                    // Handle timeout and handshake errors gracefully
                    if (error && (error.message?.includes('timeout') || error.message?.includes('handshake'))) {
                        console.log('XRPL connection error handled:', error.message);
                        return;
                    }
                    listener(error);
                } catch (listenerError) {
                    console.error('Error in XRPL error listener:', listenerError?.message || listenerError);
                }
            };
            return originalOn.call(this, event, wrappedListener);
        }
        return originalOn.call(this, event, listener);
    };
    
    // Enhanced global unhandled rejection handler
    process.on('unhandledRejection', (reason, promise) => {
        const reasonStr = reason?.toString() || '';
        if (reasonStr.includes('reconnect') || 
            reasonStr.includes('timeout') || 
            reasonStr.includes('handshake') ||
            reasonStr.includes('XRPL')) {
            console.log('Unhandled Rejection: XRPL event handled gracefully -', reasonStr);
            return;
        }
        
        console.error('Unhandled Rejection:', reason);
    });
    
    // Add global uncaught exception handler for WebSocket timeouts
    process.on('uncaughtException', (error) => {
        if (error.message?.includes('Opening handshake has timed out') ||
            error.message?.includes('timeout') ||
            error.message?.includes('XRPL')) {
            console.log('Uncaught Exception: XRPL timeout handled gracefully -', error.message);
            return;
        }
        
        // Re-throw other uncaught exceptions
        throw error;
    });
    
    Client.prototype._isPatchedForReconnect = true;
    console.log('XRPL Client successfully patched to handle reconnect events and timeouts');
}
