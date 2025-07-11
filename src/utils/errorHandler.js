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
        this.setupGlobalHandlers();
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

        // Log to file
        try {
            const logPath = path.join(__dirname, '../../crash.log');
            const logLine = `${timestamp} - ${type}: ${error.message}\n${error.stack}\n\n`;
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

        console.log('Graceful shutdown completed');
        process.exit(exitCode);
    }

    handleServiceError(serviceName, error) {
        const key = `${serviceName}:${error.message}`;
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
}

export const errorHandler = new ErrorHandler();
export { ErrorHandler };