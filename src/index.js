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
import guildMemberAddHandler from './events/guildMemberAdd.js';
import telegramService from './services/telegramService.js';
import { config } from './config.js';
import { 
    handleTradingButtons, 
    handleInformationButtons, 
    handleSecurityButtons, 
    handleFunButtons 
} from './buttonPanels/handlers/buttonHandler.js';
import { exec } from 'child_process';
import fs from 'fs';
import { Client as XrplClient } from 'xrpl';
import { SmartPathAnalyzer } from './services/smartPathAnalyzer.js';
import { PWAServer } from '../pwa/server.js';

// Add whale watching service imports - Fixed to match export patterns
import { WhaleDiscoveryService } from './services/whaleDiscoveryService.js';  // Named export
import WhaleSocialFeedService from './services/whaleSocialFeedService.js';     // Default export
import WhaleProfileService from './services/whaleProfileService.js';           // Default export
import PortfolioAnalysisService from './services/portfolioAnalysisService.js'; // Default export
import TradingPatternRecognitionService from './services/tradingPatternRecognitionService.js'; // Default export
import { CommunityFeaturesService } from './services/communityFeaturesService.js'; // Named export

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
        
        // Add SmartPathAnalyzer initialization here
        const { SmartPathAnalyzer } = await import('./services/smartPathAnalyzer.js');
        const smartPathAnalyzer = new SmartPathAnalyzer(client, '1308928972033359993');
        await smartPathAnalyzer.start();
        restartManager.registerService(smartPathAnalyzer, 'SmartPathAnalyzer');
        console.log('Smart Path Analysis started - Channel: 1308928972033359993');

        // NEW: Initialize the three new auto channels
        // Live XRP Orderbook Service
        const { LiveOrderbookService } = await import('./services/liveOrderbookService.js');
        const liveOrderbook = new LiveOrderbookService(client, '1412857950673834115');
        await liveOrderbook.startAutomatedUpdates();
        restartManager.registerService(liveOrderbook, 'LiveOrderbookService');
        console.log('Live XRP Orderbook started - Channel: 1412857950673834115');

        // Multi-Exchange Price Comparison Service
        const { MultiExchangePriceService } = await import('./services/multiExchangePriceService.js');
        const multiExchangePrice = new MultiExchangePriceService(client, '1412858397447159869');
        await multiExchangePrice.startAutomatedUpdates();
        restartManager.registerService(multiExchangePrice, 'MultiExchangePriceService');
        console.log('Multi-Exchange Price Comparison started - Channel: 1412858397447159869');

        // Arbitrage Opportunity Alerts Service
        const { ArbitrageAlertsService } = await import('./services/arbitrageAlertsService.js');
        const arbitrageAlerts = new ArbitrageAlertsService(client, '1412858441780695244');
        await arbitrageAlerts.startAutomatedUpdates();
        restartManager.registerService(arbitrageAlerts, 'ArbitrageAlertsService');
        console.log('Arbitrage Opportunity Alerts started - Channel: 1412858441780695244');
        
        // WHALE WATCHING SOCIAL NETWORK SERVICES
        console.log('🐋 Initializing XRPL Whale Watching Social Network...');
        
        // 1. Whale Discovery & Following Service
        const whaleDiscoveryService = new WhaleDiscoveryService(client, '1413174672375156767');
        await whaleDiscoveryService.start(); // Uses start()
        restartManager.registerService(whaleDiscoveryService, 'WhaleDiscoveryService');
        console.log('🔍 Whale Discovery & Following started - Channel: 1413174672375156767');
        
        // 2. Social Feed Service
        const whaleSocialFeedService = new WhaleSocialFeedService(client, '1413174720798658622');
        await whaleSocialFeedService.initialize(); // Changed to initialize()
        restartManager.registerService(whaleSocialFeedService, 'WhaleSocialFeedService');
        console.log('📱 Whale Social Feed started - Channel: 1413174720798658622');
        
        // 3. Individual Whale Profile Service
        const whaleProfileService = new WhaleProfileService(client, '1413174757649547356');
        await whaleProfileService.initialize(); // Changed to initialize()
        restartManager.registerService(whaleProfileService, 'WhaleProfileService');
        console.log('👤 Individual Whale Profile started - Channel: 1413174757649547356');
        
        // 4. Portfolio Composition Analysis Service
        const portfolioAnalysisService = new PortfolioAnalysisService(client, '1413174804122439680');
        await portfolioAnalysisService.initialize(); // Changed to initialize()
        restartManager.registerService(portfolioAnalysisService, 'PortfolioAnalysisService');
        console.log('📊 Portfolio Composition Analysis started - Channel: 1413174804122439680');
        
        // 5. Trading Pattern Recognition Service
        const tradingPatternService = new TradingPatternRecognitionService(client, '1413174836041351219');
        await tradingPatternService.initialize(); // Changed to initialize()
        restartManager.registerService(tradingPatternService, 'TradingPatternRecognitionService');
        console.log('🧠 Trading Pattern Recognition started - Channel: 1413174836041351219');
        
        // 6. Community Features Service
        const communityFeaturesService = new CommunityFeaturesService(client, '1413174865128587355');
        await communityFeaturesService.start(); // Uses start()
        restartManager.registerService(communityFeaturesService, 'CommunityFeaturesService');
        console.log('🎮 Community Features started - Channel: 1413174865128587355');
        
        console.log('🎉 XRPL Whale Watching Social Network fully initialized!');
        
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
import { securityCmd } from './commands/security.js';

const commands = [
    priceCommand, stakeStatsCommand, volumeCommand,
    dappsCommand, swapCommand, commandsCmd, clearCmd,
    lockCmd, unlockCmd, infoCmd, moonCmd,
    draxmhCmd, socialstatsCmd, announceCmd, moderationCmd,
    scamAlertCmd, reportCmd, suggestCmd, banCommand,
    kickCommand, muteCommand, roleCommand, slowmodeCommand,
    warningsCommand, historyCommand, casesCommand, verificationCmd,
    phishingCmd, spamCmd, raidCmd, backupCmd, announcePanelCmd,
    alertCommand, analysisCommand, securityCmd
];

// Register commands with memory-efficient approach
commands.forEach(cmd => {
    if (cmd && cmd.name) {
        client.commands.set(cmd.name, cmd);
    }
});

client.commands.set(connectCommand.name, connectCommand);
client.commands.set(walletCommand.name, walletCommand);

// Welcome button
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
        
        // 4. Telegram Bridge - Check if message is from announcement channel
        const isAnnouncementChannel = config.discord.announcementChannelNames.includes(message.channel.name.toLowerCase()) ||
                                    config.discord.announcementChannelIds?.includes(message.channel.id);
        
        if (isAnnouncementChannel) {
            try {
                await telegramService.forwardDiscordMessage(message);
                console.log(`✅ Message forwarded to Telegram from #${message.channel.name}`);
            } catch (error) {
                console.error('❌ Failed to forward message to Telegram:', error);
            }
        }
        
        // 5. Message logging
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
        
        // Log the command usage
        await logAction('COMMAND', message.guild, {
            command: commandName,
            user: message.author,
            channel: message.channel
        });
        
        await command.execute(message, args, client);
        
        // Remove these lines from messageCreate handler:
        // Fun buttons
        // if (['moon_check', 'draxmh_check'].includes(customId)) {
        //     await handleFunButtons(interaction, client);
        // }
        
        // Welcome button
        // if (customId === 'accept_rules') {
        //     try {
        //         const VERIFIED_MEMBER_ROLE = '1252360773229875220'; // Your role ID
        //         
        //         const member = interaction.member;
        //         const verifiedRole = interaction.guild.roles.cache.get(VERIFIED_MEMBER_ROLE);
        //         
        //         // Check if user already has the verified role
        //         if (member.roles.cache.has(VERIFIED_MEMBER_ROLE)) {
        //             return await interaction.reply({
        //                 content: '✅ You have already accepted the rules and have full server access!',
        //                 ephemeral: true
        //             });
        //         }
        //         
        //         if (verifiedRole) {
        //             // Add verified member role (in case auto-assignment failed)
        //             await member.roles.add(verifiedRole);
        //             console.log(`Confirmed verified access for ${member.user.tag}`);
        //             
        //             await interaction.reply({
        //                 content: '🎉 **Welcome to the DRX Community!**\n\n✅ **Rules accepted successfully!**\n🚀 **You have full access to all server channels!**\n\nEnjoy your stay and welcome to the family!',
        //                 ephemeral: true
        //             });
        //             
        //             // Log the action
        //             await logAction('MEMBER', interaction.guild, {
        //                 action: 'Rules Accepted',
        //                 member: member.user,
        //                 details: 'Member accepted rules and confirmed verified access'
        //             });
        //         } else {
        //             await interaction.reply({
        //                 content: '❌ Verified member role not found. Please contact an administrator.',
        //                 ephemeral: true
        //             });
        //         }
        //         
        //     } catch (error) {
        //         console.error('Error handling accept_rules:', error);
        //         await interaction.reply({
        //             content: '❌ There was an error processing your request. Please contact a moderator.',
        //             ephemeral: true
        //         });
        //     }
        // }
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

// Add guildMemberAdd event handler
client.on('guildMemberAdd', guildMemberAddHandler);

// Add role change event handlers for automatic logging
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    try {
        // Check if roles changed
        const oldRoles = oldMember.roles.cache;
        const newRoles = newMember.roles.cache;
        
        // Find added roles
        const addedRoles = newRoles.filter(role => !oldRoles.has(role.id));
        const removedRoles = oldRoles.filter(role => !newRoles.has(role.id));
        
        // Log added roles
        for (const role of addedRoles.values()) {
            await logAction('ROLE', newMember.guild, {
                action: 'Added',
                role: role,
                member: newMember.user,
                moderator: { tag: 'System/Unknown' }
            });
        }
        
        // Log removed roles
        for (const role of removedRoles.values()) {
            await logAction('ROLE', newMember.guild, {
                action: 'Removed',
                role: role,
                member: newMember.user,
                moderator: { tag: 'System/Unknown' }
            });
        }
    } catch (error) {
        console.error('Error logging role changes:', error);
    }
});

// Log role creation
client.on('roleCreate', async (role) => {
    try {
        await logAction('ROLE', role.guild, {
            action: 'Created',
            role: role,
            moderator: { tag: 'System' }
        });
    } catch (error) {
        console.error('Error logging role creation:', error);
    }
});

// Log role deletion
client.on('roleDelete', async (role) => {
    try {
        await logAction('ROLE', role.guild, {
            action: 'Deleted',
            role: role,
            moderator: { tag: 'System' }
        });
    } catch (error) {
        console.error('Error logging role deletion:', error);
    }
});

// Log role updates
client.on('roleUpdate', async (oldRole, newRole) => {
    try {
        let changes = [];
        
        if (oldRole.name !== newRole.name) {
            changes.push(`Name: ${oldRole.name} → ${newRole.name}`);
        }
        if (oldRole.color !== newRole.color) {
            changes.push(`Color: ${oldRole.hexColor} → ${newRole.hexColor}`);
        }
        if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
            changes.push('Permissions updated');
        }
        if (oldRole.hoist !== newRole.hoist) {
            changes.push(`Hoist: ${oldRole.hoist} → ${newRole.hoist}`);
        }
        if (oldRole.mentionable !== newRole.mentionable) {
            changes.push(`Mentionable: ${oldRole.mentionable} → ${newRole.mentionable}`);
        }
        
        if (changes.length > 0) {
            await logAction('ROLE', newRole.guild, {
                action: 'Updated',
                role: newRole,
                moderator: { tag: 'System' },
                changes: changes.join(', ')
            });
        }
    } catch (error) {
        console.error('Error logging role update:', error);
    }
});

// Add messageUpdate event handler for logging message edits
client.on('messageUpdate', async (oldMessage, newMessage) => {
    try {
        // Ignore bot messages and partial messages
        if (newMessage.author?.bot || newMessage.partial) return;
        
        // Only log if content actually changed
        if (oldMessage.content === newMessage.content) return;
        
        await logAction('MESSAGE', newMessage.guild, {
            action: 'Message Edited',
            user: newMessage.author,
            channel: newMessage.channel,
            content: newMessage.content.substring(0, 100),
            oldContent: oldMessage.content.substring(0, 100)
        });
    } catch (error) {
        console.error('Error logging message edit:', error);
    }
});

// Add messageDelete event handler for logging message deletions
client.on('messageDelete', async (message) => {
    try {
        // Ignore bot messages and partial messages
        if (message.author?.bot || message.partial) return;
        
        await logAction('MESSAGE', message.guild, {
            action: 'Message Deleted',
            user: message.author,
            channel: message.channel,
            content: message.content?.substring(0, 100) || 'No content available'
        });
    } catch (error) {
        console.error('Error logging message deletion:', error);
    }
});

// Add interactionCreate event handler for button interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;
    
    const { customId } = interaction;
    console.log(`Button interaction received: ${customId}`);
    
    try {
        // Welcome button
        if (customId === 'accept_rules') {
            const VERIFIED_MEMBER_ROLE = '1252360773229875220'; // Your role ID
            
            const member = interaction.member;
            const verifiedRole = interaction.guild.roles.cache.get(VERIFIED_MEMBER_ROLE);
            
            // Check if user already has the verified role
            if (member.roles.cache.has(VERIFIED_MEMBER_ROLE)) {
                return await interaction.reply({
                    content: '✅ You have already accepted the rules and have full server access!',
                    ephemeral: true
                });
            }
            
            if (verifiedRole) {
                // Add verified member role (in case auto-assignment failed)
                await member.roles.add(verifiedRole);
                console.log(`Confirmed verified access for ${member.user.tag}`);
                
                await interaction.reply({
                    content: '🎉 **Welcome to the DRX Community!**\n\n✅ **Rules accepted successfully!**\n🚀 **You have full access to all server channels!**\n\nEnjoy your stay and welcome to the family!',
                    ephemeral: true
                });
                
                // Log the action
                await logAction('MEMBER', interaction.guild, {
                    action: 'Rules Accepted',
                    member: member.user,
                    details: 'Member accepted rules and confirmed verified access'
                });
            } else {
                await interaction.reply({
                    content: '❌ Verified member role not found. Please contact an administrator.',
                    ephemeral: true
                });
            }
        }
        
        // Fun buttons
        if (['moon_check', 'draxmh_check'].includes(customId)) {
            console.log('Handling fun buttons');
            await handleFunButtons(interaction, client);
        }
        
        // Trading buttons - handle both prefixed and non-prefixed IDs
        if (customId.startsWith('trading_') || ['price_check', 'volume_check', 'swap_tokens'].includes(customId)) {
            console.log('Handling trading buttons');
            await handleTradingButtons(interaction, client);
        }
        
        if (customId.startsWith('info_')) {
            console.log('Handling info buttons');
            await handleInformationButtons(interaction, client);
        }
        
        // Security buttons - handle both prefixed and non-prefixed IDs
        if (customId.startsWith('security_') || ['scam_alert_check', 'report_check', 'suggest_check'].includes(customId)) {
            console.log('Routing to security buttons handler');
            await handleSecurityButtons(interaction, client);
        }
        
    } catch (error) {
        console.error('Error handling button interaction:', error);
        if (!interaction.replied && !interaction.deferred) {
            try {
                await interaction.reply({
                    content: '❌ There was an error processing your request. Please contact a moderator.',
                    ephemeral: true
                });
            } catch (replyError) {
                console.error('Failed to send error reply:', replyError);
            }
        }
    }
});

// Memory monitoring section
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

// Add this after your Discord client setup
class DraxmhBot {
    constructor() {
        this.client = client;
        this.pwaServer = null;
    }

    async start() {
        try {
            // Initialize PWA Server
            this.pwaServer = new PWAServer();
            await this.pwaServer.start();
            console.log('✅ PWA Server started successfully');
        } catch (error) {
            console.error('❌ Failed to start PWA Server:', error);
        }
    }

    async shutdown() {
        console.log('🔄 Shutting down bot services...');
        if (this.pwaServer) {
            await this.pwaServer.stop();
        }
        process.exit(0);
    }
}

const bot = new DraxmhBot();

// Start the bot services
bot.start();

process.on('SIGINT', () => {
    bot.shutdown();
});