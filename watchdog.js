import { spawn } from 'child_process';
import fs from 'fs';

// Configuration
const MAX_RESTARTS = 10;
const RESTART_DELAY = 5000; // 5 seconds
const RESET_COUNTER_AFTER = 3600000; // 1 hour

// State
let restartCount = 0;
let lastRestartTime = Date.now();
let botProcess = null;

// Log function
function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(message);
    fs.appendFileSync('watchdog.log', logMessage);
}

// Start the bot
function startBot() {
    log('Starting bot...');
    
    // Check if we need to reset the restart counter
    if (Date.now() - lastRestartTime > RESET_COUNTER_AFTER) {
        restartCount = 0;
    }
    
    // Check if we've restarted too many times
    if (restartCount >= MAX_RESTARTS) {
        log(`Too many restarts (${restartCount}). Waiting for 1 hour before trying again.`);
        setTimeout(startBot, RESET_COUNTER_AFTER);
        return;
    }
    
    // Start the bot process
    botProcess = spawn('node', ['src/index.js'], {
        stdio: 'inherit',
        detached: false
    });
    
    // Update state
    restartCount++;
    lastRestartTime = Date.now();
    
    log(`Bot started with PID: ${botProcess.pid}`);
    
    // Handle process exit
    botProcess.on('exit', (code, signal) => {
        log(`Bot process exited with code ${code} and signal ${signal}`);
        
        // Don't restart if exit was clean (code 0)
        if (code === 0) {
            log('Clean exit detected. Not restarting.');
            process.exit(0);
        } else {
            log(`Bot crashed. Restarting in ${RESTART_DELAY/1000} seconds...`);
            setTimeout(startBot, RESTART_DELAY);
        }
    });
    
    // Handle watchdog process signals
    process.on('SIGINT', () => {
        log('Watchdog received SIGINT. Shutting down bot...');
        if (botProcess) botProcess.kill('SIGINT');
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        log('Watchdog received SIGTERM. Shutting down bot...');
        if (botProcess) botProcess.kill('SIGTERM');
        process.exit(0);
    });
}

// Start the bot initially
startBot();