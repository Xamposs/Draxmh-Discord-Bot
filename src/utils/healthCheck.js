import fs from 'fs/promises';
import path from 'path';

class HealthCheck {
    constructor() {
        this.startTime = Date.now();
        this.lastPing = Date.now();
        this.connectionStatus = {
            discord: false,
            xrpl: false
        };
        this.errors = [];
        this.maxErrors = 100; // Keep only the last 100 errors
        this.logPath = path.join(process.cwd(), 'logs');
    }

    updateStatus(service, status) {
        this.connectionStatus[service] = status;
        this.lastPing = Date.now();
    }

    logError(service, error) {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            service,
            message: error.message || String(error),
            stack: error.stack
        };
        
        this.errors.unshift(errorEntry);
        
        // Keep only the last maxErrors
        if (this.errors.length > this.maxErrors) {
            this.errors.pop();
        }
        
        // Also log to file
        this.logToFile(errorEntry);
    }
    
    async logToFile(errorEntry) {
        try {
            await fs.mkdir(this.logPath, { recursive: true });
            const logFile = path.join(this.logPath, `errors-${new Date().toISOString().split('T')[0]}.log`);
            const logData = JSON.stringify(errorEntry) + '\n';
            await fs.appendFile(logFile, logData);
        } catch (err) {
            console.error('Failed to write error log:', err);
        }
    }

    getStatus() {
        return {
            uptime: Math.floor((Date.now() - this.startTime) / 1000),
            lastPing: Math.floor((Date.now() - this.lastPing) / 1000),
            connectionStatus: this.connectionStatus,
            recentErrors: this.errors.slice(0, 5)
        };
    }
    
    isHealthy() {
        // Bot is considered healthy if:
        // 1. Discord connection is active
        // 2. Last ping was less than 5 minutes ago
        return (
            this.connectionStatus.discord && 
            (Date.now() - this.lastPing) < 5 * 60 * 1000
        );
    }
}

export const healthCheck = new HealthCheck();
