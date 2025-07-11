import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class RestartManager {
    constructor() {
        this.restartTimer = null;
        this.isRestarting = false;
        this.services = new Set();
        this.restartInterval = 48 * 60 * 60 * 1000; // 48 hours
        this.gracefulShutdownTimeout = 30000; // 30 seconds
        this.restartStateFile = path.join(__dirname, '../../restart-state.json');
        
        this.setupSignalHandlers();
        this.loadRestartState();
    }

    async loadRestartState() {
        try {
            const stateData = await fs.readFile(this.restartStateFile, 'utf8');
            const state = JSON.parse(stateData);
            
            // Check if we should resume a scheduled restart
            if (state.scheduledRestartTime) {
                const now = Date.now();
                const scheduledTime = new Date(state.scheduledRestartTime).getTime();
                
                if (scheduledTime > now) {
                    const remainingTime = scheduledTime - now;
                    console.log(`Resuming scheduled restart in ${Math.round(remainingTime / 1000 / 60)} minutes`);
                    this.scheduleRestart(remainingTime);
                } else {
                    console.log('Scheduled restart time has passed, scheduling new restart');
                    this.scheduleRestart();
                }
            }
        } catch (error) {
            // No existing state file or invalid JSON, start fresh
            console.log('No previous restart state found, starting fresh');
            this.scheduleRestart();
        }
    }

    async saveRestartState(scheduledTime = null) {
        try {
            const state = {
                lastStartTime: new Date().toISOString(),
                scheduledRestartTime: scheduledTime ? new Date(scheduledTime).toISOString() : null,
                restartCount: await this.getRestartCount() + 1
            };
            
            await fs.writeFile(this.restartStateFile, JSON.stringify(state, null, 2));
        } catch (error) {
            console.error('Failed to save restart state:', error);
        }
    }

    async getRestartCount() {
        try {
            const stateData = await fs.readFile(this.restartStateFile, 'utf8');
            const state = JSON.parse(stateData);
            return state.restartCount || 0;
        } catch {
            return 0;
        }
    }

    scheduleRestart(customInterval = null) {
        // Clear any existing restart timer
        this.cancelScheduledRestart();
        
        const interval = customInterval || this.restartInterval;
        const restartTime = Date.now() + interval;
        
        console.log(`Scheduled restart in ${Math.round(interval / 1000 / 60 / 60)} hours (${new Date(restartTime).toISOString()})`);
        
        this.restartTimer = setTimeout(() => {
            this.initiateRestart('scheduled');
        }, interval);
        
        // Save the scheduled restart time
        this.saveRestartState(restartTime);
    }

    cancelScheduledRestart() {
        if (this.restartTimer) {
            clearTimeout(this.restartTimer);
            this.restartTimer = null;
            console.log('Cancelled scheduled restart');
        }
    }

    registerService(service) {
        this.services.add(service);
        console.log(`Registered service for graceful shutdown: ${service.constructor.name}`);
    }

    unregisterService(service) {
        this.services.delete(service);
    }

    setupSignalHandlers() {
        // Handle manual restart signals
        process.on('SIGUSR1', () => {
            console.log('Received SIGUSR1 - Manual restart requested');
            this.initiateRestart('manual');
        });

        // Handle graceful shutdown signals
        process.on('SIGTERM', () => {
            console.log('Received SIGTERM - Graceful shutdown');
            this.initiateRestart('sigterm', 0);
        });

        process.on('SIGINT', () => {
            console.log('Received SIGINT - Graceful shutdown');
            this.initiateRestart('sigint', 0);
        });
    }

    async initiateRestart(reason = 'unknown', exitCode = 1) {
        if (this.isRestarting) {
            console.log('Restart already in progress, ignoring duplicate request');
            return;
        }

        this.isRestarting = true;
        console.log(`\n=== INITIATING RESTART (Reason: ${reason}) ===`);
        
        // Cancel any pending restart
        this.cancelScheduledRestart();
        
        // Log restart info
        const restartCount = await this.getRestartCount();
        console.log(`This will be restart #${restartCount + 1}`);
        
        try {
            // Step 1: Stop all services gracefully
            await this.stopAllServices();
            
            // Step 2: Save final state
            await this.saveRestartState();
            
            // Step 3: Clean up any remaining resources
            await this.cleanup();
            
            console.log('Graceful shutdown completed successfully');
            
        } catch (error) {
            console.error('Error during graceful shutdown:', error);
        } finally {
            // Step 4: Exit the process
            console.log(`Exiting with code ${exitCode}...`);
            setTimeout(() => {
                process.exit(exitCode);
            }, 1000);
        }
    }

    async stopAllServices() {
        if (this.services.size === 0) {
            console.log('No services to stop');
            return;
        }

        console.log(`Stopping ${this.services.size} services...`);
        
        const stopPromises = Array.from(this.services).map(async (service, index) => {
            try {
                const serviceName = service.constructor.name || `Service${index}`;
                console.log(`Stopping ${serviceName}...`);
                
                if (typeof service.stop === 'function') {
                    await service.stop();
                    console.log(`✓ ${serviceName} stopped`);
                } else if (typeof service.cleanup === 'function') {
                    await service.cleanup();
                    console.log(`✓ ${serviceName} cleaned up`);
                } else {
                    console.log(`⚠ ${serviceName} has no stop/cleanup method`);
                }
            } catch (error) {
                console.error(`✗ Error stopping service:`, error.message);
            }
        });

        // Wait for all services to stop, but with a timeout
        try {
            await Promise.race([
                Promise.all(stopPromises),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Service shutdown timeout')), this.gracefulShutdownTimeout)
                )
            ]);
            console.log('All services stopped successfully');
        } catch (error) {
            console.warn('Service shutdown timeout reached, forcing exit');
        }
    }

    async cleanup() {
        try {
            // Clear any remaining timers
            if (this.restartTimer) {
                clearTimeout(this.restartTimer);
            }
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
            
            console.log('Cleanup completed');
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }

    // Method to manually trigger restart (can be called from commands)
    async manualRestart(reason = 'manual') {
        console.log(`Manual restart requested: ${reason}`);
        await this.initiateRestart(reason);
    }

    // Method to get restart status
    getStatus() {
        return {
            isRestarting: this.isRestarting,
            hasScheduledRestart: !!this.restartTimer,
            registeredServices: this.services.size,
            nextRestartTime: this.restartTimer ? new Date(Date.now() + this.restartInterval).toISOString() : null
        };
    }
}

export const restartManager = new RestartManager();