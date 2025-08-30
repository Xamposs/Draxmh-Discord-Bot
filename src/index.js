import { Client, GatewayIntentBits, Collection, PermissionsBitField, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } from 'discord.js';
import { PermissionFlagsBits } from 'discord-api-types/v10';
import { toggleCommand, isCommandEnabled, commandToggles } from './utils/commandManager.js';
import dotenv from 'dotenv';
// Import enhanced systems
import { errorHandler } from './utils/errorHandler.js';
import { restartManager } from './utils/restartManager.js';
import { xrplManager } from './utils/enhancedXrplManager.js';
import { patchXrplClient } from './utils/xrplPatch.js';
import { AutomatedAnalysis } from './services/automatedAnalysis.js';
import PriceTracker from './services/priceTracker.js';
import { XRPMarketPsychologyAnalyzer } from './services/xrpMarketPsychologyAnalyzer.js';
import { WhaleMonitor } from './services/whaleMonitor.js';
import { withDNSRetry } from './utils/networkRetry.js';
import { startScamAlerts } from './services/autoScamAlert.js';
import { EnhancedScamProtection } from './services/enhancedScamProtection.js';
import { startChartService } from './services/tradingViewChart.js';
import { wsManager } from './services/websocketManager.js';
import { announcePanelCmd } from './commands/announcepanel.js';
import connectCommand from './commands/connect.js';
import { 
    handleTradingButtons, 
    handleInformationButtons, 
    handleSecurityButtons, 
    handleFunButtons 
} from './buttonPanels/handlers/buttonHandler.js';
import { exec } from 'child_process';
import fs from 'fs';
import { Client as XrplClient } from 'xrpl';

// Apply XRPL client patches
patchXrplClient();

dotenv.config({ path: './.env' });

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers  // Add this for member join events
    ]
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Log the error to a file
    fs.appendFileSync('crash.log', `${new Date().toISOString()} - Uncaught Exception: ${error.stack}\n`);
    // Wait a moment for logs to flush
    setTimeout(() => {
        console.log('Restarting after uncaught exception...');
        process.exit(1); // Exit with error code so nodemon/PM2 will restart
    }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Log the error to a file
    fs.appendFileSync('crash.log', `${new Date().toISOString()} - Unhandled Rejection: ${reason}\n`);
    // For critical unhandled rejections, you might want to restart
    // setTimeout(() => {
    //     console.log('Restarting after unhandled rejection...');
    //     process.exit(1);
    // }, 1000);
});

// Add retry mechanism for price updates
const fetchPriceWithRetry = async (attempts = 3) => {
    for(let i = 0; i < attempts; i++) {
        try {
            const price = await fetchPrice();
            return price;
        } catch(error) {
            if(i === attempts - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
};

const whaleMonitor = new WhaleMonitor(client);

// Initialize the enhanced scam protection
const scamProtection = new EnhancedScamProtection(client);

// Register the scam protection service with a name
restartManager.registerService(scamProtection, 'enhancedScamProtection');
const prefix = '!';
client.commands = new Collection();

// Main ready handler - consolidated and correct
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    
    try {
        // Initialize services
        await withDNSRetry('xrplcluster.com', async () => {
            await whaleMonitor.start();
            console.log('Whale Monitor started successfully');
        });
        
        // Register services with RestartManager for graceful shutdown
        restartManager.registerService(whaleMonitor);
        
        // Register with restart manager for cleanup
        restartManager.registerService(scamProtection);

        startScamAlerts(client);
        console.log('Scam Alert System initialized - Channel: 1307095704858005545');

        const priceTracker = new PriceTracker(client);
        try {
            await priceTracker.start();
            restartManager.registerService(priceTracker);
            console.log('Price tracking started successfully');
        } catch (error) {
            console.log('Retrying price tracker initialization...');
            setTimeout(() => priceTracker.start(), 5000);
        }

        // Uncomment and enable DEX Analytics
        const { XRPLDexAnalytics } = await import('./services/xrplDexAnalytics.js');
        const dexAnalytics = new XRPLDexAnalytics(client, '1307799407000944720');
        await dexAnalytics.startAutomatedUpdates();
        restartManager.registerService(dexAnalytics);
        console.log('DEX Analytics started - Channel: 1307799407000944720');

        const marketAnalyzer = new XRPMarketPsychologyAnalyzer(client, '1325196609012895805');
        await marketAnalyzer.startAutomatedUpdates();
        restartManager.registerService(marketAnalyzer);
        console.log('Market Psychology Analysis started - Channel: 1325196609012895805');
        
        // Register spam manager cleanup
        restartManager.registerService({
            stop: async () => {
                console.log('Stopping spam manager...');
                stopSpamManager();
            }
        });
        
        // Register Discord client for graceful shutdown
        restartManager.registerService({
            stop: async () => {
                console.log('Destroying Discord client...');
                client.destroy();
            }
        });
        
        // Register memory cleanup service
        restartManager.registerService({
            stop: async () => {
                console.log('Performing final memory cleanup...');
                
                // Clear command collections
                client.commands.clear();
                commandToggles.clear();
                
                // Force garbage collection if available
                if (global.gc) {
                    console.log('Running garbage collection...');
                    global.gc();
                }
            }
        });
        
        console.log('All services initialized and registered for graceful shutdown');

    } catch (error) {
        console.error('Service initialization error:', error);
    }
});

import { logAction } from './utils/logging.js';
import { handleSpamDetection, stopSpamManager } from './utils/security/spamManager.js';
import { handlePhishingDetection } from './utils/security/phishingManager.js';
import { handleRaidProtection } from './utils/security/raidManager.js';
import { handleVerification } from './utils/security/verificationManager.js';
import { AuditLogEvent } from 'discord.js';

// Import all commands
import { priceCommand } from './commands/price.js';
import { stakeStatsCommand } from './commands/stake-stats.js';
import { dappsCommand } from './commands/dapps.js';
import { swapCommand } from './commands/swap.js';
import { commandsCmd } from './commands/commands.js';
import { clearCmd } from './commands/clear.js';
import { lockCmd } from './commands/lock.js';
import { unlockCmd } from './commands/unlock.js';
import { infoCmd } from './commands/info.js';
import { moonCmd } from './commands/moon.js';
import { draxmhCmd } from './commands/draxmh.js';
import { socialstatsCmd } from './commands/socialstats.js';
import { announceCmd } from './commands/announce.js';
import { backupCmd } from './commands/backup.js';
import { moderationCmd } from './commands/moderation.js';
import { scamAlertCmd } from './commands/scamalert.js';
import { reportCmd } from './commands/report.js';
import { suggestCmd } from './commands/suggest.js';
import { banCommand } from './commands/ban.js';
import { kickCommand } from './commands/kick.js';
import { muteCommand } from './commands/mute.js';
import { roleCommand } from './commands/role.js';
import { slowmodeCommand } from './commands/slowmode.js';
import { warningsCommand } from './commands/warnings.js';
import { historyCommand } from './commands/history.js';
import { casesCommand } from './commands/cases.js';
import { verificationCmd } from './commands/verification.js';
import { phishingCmd } from './commands/phishing.js';
import { spamCmd } from './commands/spam.js';
import { raidCmd } from './commands/raid.js';
import { volumeCommand } from './commands/volume.js';
import walletCommand from './commands/wallet.js';
import { alertCommand } from './commands/alert.js';
import { analysisCommand } from './commands/analysis.js';

const commands = [
    priceCommand, stakeStatsCommand, volumeCommand,
    dappsCommand, swapCommand, commandsCmd, clearCmd,
    lockCmd, unlockCmd, infoCmd, moonCmd,
    draxmhCmd, socialstatsCmd, announceCmd, moderationCmd,
    scamAlertCmd, reportCmd, suggestCmd, banCommand,
    kickCommand, muteCommand, roleCommand, slowmodeCommand,
    warningsCommand, historyCommand, casesCommand, verificationCmd,
    phishingCmd, spamCmd, raidCmd, backupCmd, announcePanelCmd,
    alertCommand, analysisCommand
];

// Register commands with memory-efficient approach
commands.forEach(cmd => {
    if (cmd && cmd.name) {
        client.commands.set(cmd.name, cmd);
    }
});

client.commands.set(connectCommand.name, connectCommand);
client.commands.set(walletCommand.name, walletCommand);

// SINGLE CONSOLIDATED MESSAGE HANDLER
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    
    try {
        // 1. Enhanced scam protection
        await scamProtection.handleMessage(message);
        
        // 2. Security checks
        await handleSpamDetection(message);
        await handlePhishingDetection(message);
        
        // 3. Additional scam detection with analysis
        const scamProtectionService = restartManager.getService('enhancedScamProtection');
        if (scamProtectionService) {
            const analysis = await scamProtectionService.analyzeMessage(message);
            
            if (analysis.isScam) {
                await message.delete().catch(console.error);
                
                await scamProtectionService.quarantineUser(
                    message.author,
                    'Automatic scam detection',
                    analysis
                );
                
                const alertChannel = client.channels.cache.get('1307095704858005545');
                if (alertChannel) {
                    const embed = new EmbedBuilder()
                        .setTitle('🚨 Scam Message Detected & Removed')
                        .setColor('#ff0000')
                        .addFields(
                            { name: 'User', value: `${message.author.tag} (${message.author.id})` },
                            { name: 'Channel', value: `${message.channel}` },
                            { name: 'Confidence', value: `${(analysis.confidence * 100).toFixed(1)}%` },
                            { name: 'Risk Factors', value: analysis.reasons?.join('\n') || 'None' },
                            { name: 'Message Content', value: `\`\`\`${message.content.slice(0, 500)}\`\`\`` }
                        )
                        .setTimestamp();
                    
                    await alertChannel.send({ embeds: [embed] });
                }
                return; // Don't process commands for scam messages
            }
        }
        
        // 4. Message logging
        await logAction('MESSAGE_CREATE', message.guild, {
            user: message.author,
            channel: message.channel,
            content: message.content.substring(0, 100)
        });
        
        // 5. Command processing
        if (!message.content.startsWith(prefix)) return;
        
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        
        const command = client.commands.get(commandName);
        if (!command) return;
        
        // Check if command is enabled
        if (!isCommandEnabled(commandName)) {
            return message.reply('This command is currently disabled.');
        }
        
        await command.execute(message, args, client);
        
    } catch (error) {
        console.error('Message handling error:', error);
        errorHandler.handleServiceError('MessageHandler', error);
        try {
            message.reply('There was an error processing your message.');
        } catch (replyError) {
            console.error('Failed to send error reply:', replyError);
        }
    }
});

// Memory monitoring (add after other imports)
if (process.env.NODE_ENV === 'development') {
    setInterval(() => {
        const used = process.memoryUsage();
        const usage = Math.round(used.heapUsed / 1024 / 1024);
        if (usage > 3000) { // Alert if over 3GB
            console.warn(`⚠️ High memory usage: ${usage}MB`);
        }
        console.log(`Memory usage: ${usage}MB`);
    }, 60000); // Check every minute
}

// Login the client
client.login(process.env.DISCORD_TOKEN);