import fs from 'fs/promises';
import path from 'path';
import { healthCheck } from './healthCheck.js';

class ErrorHandler {
    constructor() {
        this.errorCounts = new Map();
        this.circuitBreakers = new Map();
        this.logPath = path.join(process.cwd(), 'logs');
        this.setupGlobalHandlers();
    }

    setupGlobalHandlers() {
        // Enhanced uncaught exception handler
        process.on('uncaughtException', async (error) => {
            await this.handleCriticalError('UNCAUGHT_EXCEPTION', error);
            // Give time for cleanup before exit
            setTimeout(() => process.exit(1), 2000);
        });

        // Enhanced unhandled rejection handler
        process.on('unhandledRejection', async (reason, promise) => {
            await this.handleCriticalError('UNHANDLED_REJECTION', reason, { promise });
            // Don't exit immediately for rejections, log and continue
        });

        // Graceful shutdown handlers
        process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
    }

    async handleCriticalError(type, error, context = {}) {
        const errorInfo = {
            type,
            timestamp: new Date().toISOString(),
            message: error?.message || String(error),
            stack: error?.stack,
            context,
            pid: process.pid,
            memory: process.memoryUsage(),
            uptime: process.uptime()
        };

        // Log to console
        console.error(`[${type}] Critical Error:`, errorInfo);

        // Log to file
        await this.logToFile('critical', errorInfo);

        // Update health check
        healthCheck.logError('SYSTEM', error);

        // Notify if possible (don't await to avoid blocking)
        this.notifyAdmins(errorInfo).catch(() => {});
    }

    async handleServiceError(service, error, operation = 'unknown') {
        const errorKey = `${service}:${operation}`;
        const count = (this.errorCounts.get(errorKey) || 0) + 1;
        this.errorCounts.set(errorKey, count);

        const errorInfo = {
            service,
            operation,
            count,
            timestamp: new Date().toISOString(),
            message: error?.message || String(error),
            stack: error?.stack
        };

        // Check if we should trigger circuit breaker
        if (count >= 5) {
            this.triggerCircuitBreaker(service, operation);
        }

        await this.logToFile('service', errorInfo);
        healthCheck.logError(service, error);

        return this.shouldRetry(service, operation, count);
    }

    triggerCircuitBreaker(service, operation) {
        const key = `${service}:${operation}`;
        const breaker = {
            triggered: true,
            timestamp: Date.now(),
            resetTime: Date.now() + (5 * 60 * 1000) // 5 minutes
        };
        
        this.circuitBreakers.set(key, breaker);
        console.warn(`Circuit breaker triggered for ${key}`);
    }

    shouldRetry(service, operation, errorCount) {
        const key = `${service}:${operation}`;
        const breaker = this.circuitBreakers.get(key);
        
        if (breaker && breaker.triggered) {
            if (Date.now() > breaker.resetTime) {
                // Reset circuit breaker
                this.circuitBreakers.delete(key);
                this.errorCounts.delete(key);
                return true;
            }
            return false; // Circuit breaker is active
        }
        
        return errorCount < 10; // Allow up to 10 retries
    }

    async logToFile(type, errorInfo) {
        try {
            await fs.mkdir(this.logPath, { recursive: true });
            const date = new Date().toISOString().split('T')[0];
            const logFile = path.join(this.logPath, `${type}-errors-${date}.log`);
            const logData = JSON.stringify(errorInfo) + '\n';
            await fs.appendFile(logFile, logData);
        } catch (err) {
            console.error('Failed to write error log:', err);
        }
    }

    async notifyAdmins(errorInfo) {
        // Implementation depends on your notification system
        // Could send to Discord channel, email, etc.
    }

    async gracefulShutdown(signal) {
        console.log(`Received ${signal}, starting graceful shutdown...`);
        
        // Cleanup operations
        await this.cleanup();
        
        console.log('Graceful shutdown completed');
        process.exit(0);
    }

    async cleanup() {
        // Override this method to add specific cleanup logic
        console.log('Performing cleanup operations...');
    }

    getStats() {
        return {
            errorCounts: Object.fromEntries(this.errorCounts),
            circuitBreakers: Object.fromEntries(this.circuitBreakers),
            activeBreakers: Array.from(this.circuitBreakers.entries())
                .filter(([_, breaker]) => breaker.triggered && Date.now() < breaker.resetTime)
                .map(([key]) => key)
        };
    }
}

export const errorHandler = new ErrorHandler();
export { ErrorHandler };