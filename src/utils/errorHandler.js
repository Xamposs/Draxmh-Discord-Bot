import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ErrorHandler {
    constructor() {
        this.errorCounts = new Map();
        this.circuitBreakers = new Map();
        this.isShuttingDown = false;
        this.services = new Set();
        this.cleanupInterval = null;
        this.maxErrorEntries = 1000; // Limit error count entries
        this.setupGlobalHandlers();
        this.startCleanup();
    }

    startCleanup() {
        // Clean up old error counts every 5 minutes
        this.cleanupInterval = setInterval(() => {
            const now = Date.now();
            const oneHourAgo = now - (60 * 60 * 1000); // 1 hour
            
            // Clean up old circuit breakers
            for (const [service, blockedUntil] of this.circuitBreakers.entries()) {
                if (now > blockedUntil) {
                    this.circuitBreakers.delete(service);
                }
            }
            
            // Limit error counts size
            if (this.errorCounts.size > this.maxErrorEntries) {
                // Convert to array, sort by count, keep only top entries
                const sortedErrors = Array.from(this.errorCounts.entries())
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, Math.floor(this.maxErrorEntries * 0.8)); // Keep 80%
                
                this.errorCounts.clear();
                sortedErrors.forEach(([key, count]) => {
                    this.errorCounts.set(key, count);
                });
                
                console.log(`Error handler cleanup: reduced to ${this.errorCounts.size} entries`);
            }
        }, 5 * 60 * 1000); // 5 minutes
    }

    setupGlobalHandlers() {
        // Handle uncaught exceptions
        process.on('uncaughtException', async (error) => {
            await this.logError('UNCAUGHT_EXCEPTION', error);
            console.error('Uncaught Exception:', error);
            
            // Give time for cleanup
            setTimeout(() => {
                if (!this.isShuttingDown) {
                    this.gracefulShutdown(1);
                }
            }, 1000);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', async (reason, promise) => {
            const error = reason instanceof Error ? reason : new Error(String(reason));
            await this.logError('UNHANDLED_REJECTION', error, { promise: promise.toString() });
            
            // Don't restart for XRPL reconnect events - just log them
            if (error.message && error.message.includes('reconnect')) {
                console.log('XRPL reconnect event handled gracefully');
                return;
            }
            
            console.error('Unhandled Rejection:', reason);
        });

        // Handle SIGTERM and SIGINT for graceful shutdown
        process.on('SIGTERM', () => this.gracefulShutdown(0));
        process.on('SIGINT', () => this.gracefulShutdown(0));
    }

    async logError(type, error, context = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            type,
            message: error.message,
            stack: error.stack,
            context
        };

        // Log to console
        console.error(`[${timestamp}] ${type}:`, error.message);

        // Log to file (with size limit)
        try {
            const logPath = path.join(__dirname, '../../crash.log');
            const logLine = `${timestamp} - ${type}: ${error.message}\n${error.stack}\n\n`;
            
            // Check file size and rotate if needed
            try {
                const stats = await fs.stat(logPath);
                if (stats.size > 10 * 1024 * 1024) { // 10MB limit
                    const backupPath = path.join(__dirname, '../../crash.log.old');
                    await fs.rename(logPath, backupPath);
                    console.log('Log file rotated due to size limit');
                }
            } catch (statError) {
                // File doesn't exist yet, that's fine
            }
            
            await fs.appendFile(logPath, logLine);
        } catch (fileError) {
            console.error('Failed to write to log file:', fileError);
        }
    }

    registerService(service) {
        this.services.add(service);
    }

    unregisterService(service) {
        this.services.delete(service);
    }

    async gracefulShutdown(exitCode = 0) {
        if (this.isShuttingDown) return;
        this.isShuttingDown = true;

        console.log('Initiating graceful shutdown...');

        // Stop cleanup interval
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }

        // Stop all registered services
        const shutdownPromises = Array.from(this.services).map(async (service) => {
            try {
                if (typeof service.stop === 'function') {
                    await service.stop();
                }
            } catch (error) {
                console.error('Error stopping service:', error);
            }
        });

        // Wait for all services to stop (with timeout)
        try {
            await Promise.race([
                Promise.all(shutdownPromises),
                new Promise(resolve => setTimeout(resolve, 10000)) // 10 second timeout
            ]);
        } catch (error) {
            console.error('Error during shutdown:', error);
        }

        // Clear all maps to free memory
        this.errorCounts.clear();
        this.circuitBreakers.clear();
        this.services.clear();

        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }

        console.log('Graceful shutdown completed');
        process.exit(exitCode);
    }

    handleServiceError(serviceName, error) {
        const errorMessage = error?.message || error?.toString() || 'Unknown error';
        const key = `${serviceName}:${errorMessage}`;
        const count = (this.errorCounts.get(key) || 0) + 1;
        this.errorCounts.set(key, count);

        // Circuit breaker logic
        if (count >= 5) {
            console.warn(`Circuit breaker triggered for ${serviceName}`);
            this.circuitBreakers.set(serviceName, Date.now() + 300000); // 5 minute cooldown
        }

        this.logError(`SERVICE_ERROR_${serviceName}`, error);
    }

    isServiceBlocked(serviceName) {
        const blockedUntil = this.circuitBreakers.get(serviceName);
        return blockedUntil && Date.now() < blockedUntil;
    }

    getStats() {
        return {
            errorCounts: this.errorCounts.size,
            circuitBreakers: this.circuitBreakers.size,
            services: this.services.size,
            isShuttingDown: this.isShuttingDown
        };
    }

    // Method to manually clear old errors
    clearOldErrors() {
        this.errorCounts.clear();
        this.circuitBreakers.clear();
        console.log('Error handler data cleared');
    }
}

export const errorHandler = new ErrorHandler();
export { ErrorHandler };