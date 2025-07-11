import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Configuration
const MAX_RESTARTS = 10;
const RESTART_DELAY = 5000;
const RESET_COUNTER_AFTER = 3600000; // 1 hour
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

// State
let restartCount = 0;
let lastRestartTime = Date.now();
let botProcess = null;
let healthCheckInterval = null;
let lastHealthCheck = Date.now();

// Log function
function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] WATCHDOG: ${message}\n`;
    console.log(`WATCHDOG: ${message}`);
    fs.appendFileSync('watchdog.log', logMessage);
}

// Health check function
function checkBotHealth() {
    if (!botProcess) return;
    
    // Check if process is still running
    try {
        process.kill(botProcess.pid, 0); // Signal 0 just checks if process exists
        lastHealthCheck = Date.now();
    } catch (error) {
        log('Bot process appears to be dead, restarting...');
        startBot();
    }
}

// Start the bot
function startBot() {
    // Kill existing process if any
    if (botProcess) {
        try {
            botProcess.kill('SIGTERM');
        } catch (error) {
            log(`Error killing existing process: ${error.message}`);
        }
        botProcess = null;
    }
    
    // Check restart limits
    if (Date.now() - lastRestartTime > RESET_COUNTER_AFTER) {
        restartCount = 0;
        log('Reset restart counter after 1 hour');
    }
    
    if (restartCount >= MAX_RESTARTS) {
        log(`Too many restarts (${restartCount}). Waiting 1 hour before trying again.`);
        setTimeout(startBot, RESET_COUNTER_AFTER);
        return;
    }
    
    log('Starting bot...');
    
    // Start the bot process
    botProcess = spawn('node', ['src/index.js'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false,
        env: { ...process.env, NODE_OPTIONS: '--expose-gc' } // Enable garbage collection
    });
    
    // Update state
    restartCount++;
    lastRestartTime = Date.now();
    
    log(`Bot started with PID: ${botProcess.pid} (Restart #${restartCount})`);
    
    // Pipe bot output to watchdog logs
    botProcess.stdout.on('data', (data) => {
        process.stdout.write(data);
    });
    
    botProcess.stderr.on('data', (data) => {
        process.stderr.write(data);
    });
    
    // Handle process exit
    botProcess.on('exit', (code, signal) => {
        log(`Bot process exited with code ${code} and signal ${signal}`);
        
        // Stop health checks
        if (healthCheckInterval) {
            clearInterval(healthCheckInterval);
            healthCheckInterval = null;
        }
        
        // Clean exit or manual shutdown
        if (code === 0 || signal === 'SIGTERM' || signal === 'SIGINT') {
            log('Clean exit detected. Not restarting.');
            process.exit(0);
        } else {
            log(`Bot crashed. Restarting in ${RESTART_DELAY/1000} seconds...`);
            setTimeout(startBot, RESTART_DELAY);
        }
    });
    
    // Start health monitoring
    healthCheckInterval = setInterval(checkBotHealth, HEALTH_CHECK_INTERVAL);
}

// Handle watchdog signals
process.on('SIGINT', () => {
    log('Watchdog received SIGINT. Shutting down...');
    if (healthCheckInterval) clearInterval(healthCheckInterval);
    if (botProcess) botProcess.kill('SIGINT');
    process.exit(0);
});

process.on('SIGTERM', () => {
    log('Watchdog received SIGTERM. Shutting down...');
    if (healthCheckInterval) clearInterval(healthCheckInterval);
    if (botProcess) botProcess.kill('SIGTERM');
    process.exit(0);
});

// Start the bot initially
log('Watchdog starting...');
startBot();