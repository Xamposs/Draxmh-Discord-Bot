import { Client, GatewayIntentBits, Collection, PermissionsBitField, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
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
import { XRPLDexAnalytics } from './services/xrplDexAnalytics.js';
import { SmartPathAnalyzer } from './services/smartPathAnalyzer.js';
import { XRPMarketPsychologyAnalyzer } from './services/xrpMarketPsychologyAnalyzer.js';
import { WhaleMonitor } from './services/whaleMonitor.js';
import { withDNSRetry } from './utils/networkRetry.js';
import { startScamAlerts } from './services/autoScamAlert.js';
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

        const dexAnalytics = new XRPLDexAnalytics(client, '1307799407000944720');
        await dexAnalytics.startAutomatedUpdates();
        restartManager.registerService(dexAnalytics);
        console.log('DEX Analytics started - Channel: 1307799407000944720');

        const pathAnalyzer = new SmartPathAnalyzer(client, '1308928972033359993');
        await pathAnalyzer.startAutomatedUpdates();
        restartManager.registerService(pathAnalyzer);
        console.log('Smart Path Analysis started - Channel: 1308928972033359993');

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
import { toggleCmd } from './commands/toggle.js';
import { stakeStatsCommand } from './commands/stake-stats.js';
import { slowmodeCommand as slowmodeCmdHandler } from './commands/slowmode.js';
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

const commands = [
    priceCommand, toggleCmd, stakeStatsCommand, volumeCommand,
    dappsCommand, swapCommand, commandsCmd, clearCmd,
    lockCmd, unlockCmd, infoCmd, moonCmd,
    draxmhCmd, socialstatsCmd, announceCmd, moderationCmd,
    scamAlertCmd, reportCmd, suggestCmd, banCommand,
    kickCommand, muteCommand, roleCommand, slowmodeCommand,
    warningsCommand, historyCommand, casesCommand, verificationCmd,
    phishingCmd, spamCmd, raidCmd, backupCmd, announcePanelCmd
];

// Register commands with memory-efficient approach
commands.forEach(cmd => {
    if (cmd && cmd.name) {
        client.commands.set(cmd.name, cmd);
    }
});

client.commands.set(connectCommand.name, connectCommand);
client.commands.set(walletCommand.name, walletCommand);

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    
    try {
        // Handle spam detection with proper error handling
        await handleSpamDetection(message);
        
        // Handle phishing detection with proper error handling
        await handlePhishingDetection(message);
        
        // Note: handleRaidProtection is for member joins, not messages
        
        if (!message.content.startsWith(prefix)) return;
        
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        
        const command = client.commands.get(commandName);
        if (!command) return;
        
        // Check if command is enabled
        if (!isCommandEnabled(commandName)) {
            return message.reply('This command is currently disabled.');
        }
        
        await command.execute(message, args);
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

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    
    try {
        await logAction('MESSAGE_CREATE', message.guild, {
            user: message.author,
            channel: message.channel,
            content: message.content.substring(0, 100) // Limit content length to prevent memory issues
        });
    } catch (error) {
        console.error('Logging error:', error);
        errorHandler.handleServiceError('MessageLogger', error);
    }
});

import guildMemberAddHandler from './events/guildMemberAdd.js';

// Define MEMBER_ROLE globally
const MEMBER_ROLE = '1252360773229875220';

// Guild member add event
client.on('guildMemberAdd', async member => {
    try {
        console.log(`New member joined: ${member.user.tag}`);
        
        // Handle raid protection
        await handleRaidProtection(member);
        
        // Get the role
        const role = member.guild.roles.cache.get(MEMBER_ROLE);
        if (!role) {
            console.error(`Role with ID ${MEMBER_ROLE} not found`);
            return;
        }
        
        // Add the role to the member
        await member.roles.add(role);
        console.log(`Added role ${role.name} to ${member.user.tag}`);
        
        // Log the action
        await logAction('MEMBER', member.guild, {
            action: 'JOIN',
            user: member.user,
            roleAdded: role.name
        });
        
    } catch (error) {
        console.error('Error in guildMemberAdd event:', error);
        errorHandler.handleServiceError('GuildMemberAdd', error);
        try {
            await logAction('ERROR', member.guild, {
                event: 'guildMemberAdd',
                user: member.user,
                error: error.message
            });
        } catch (logError) {
            console.error('Failed to log error:', logError);
        }
    }
});

const invites = new Map();

client.on('inviteCreate', async invite => {
    try {
        const guildInvites = await invite.guild.invites.fetch();
        invites.set(invite.guild.id, guildInvites);
        
        await logAction('INVITE', invite.guild, {
            action: 'CREATE',
            code: invite.code,
            inviter: invite.inviter,
            channel: invite.channel,
            maxUses: invite.maxUses,
            expiresAt: invite.expiresAt
        });
    } catch (error) {
        console.error('Error tracking invite creation:', error);
    }
});

client.on('guildMemberAdd', async member => {
    try {
        const guildInvites = await member.guild.invites.fetch();
        const oldInvites = invites.get(member.guild.id) || new Map();
        
        const usedInvite = guildInvites.find(invite => {
            const oldInvite = oldInvites.get(invite.code);
            return oldInvite && invite.uses > oldInvite.uses;
        });
        
        invites.set(member.guild.id, guildInvites);
        
        if (usedInvite) {
            await logAction('MEMBER', member.guild, {
                action: 'JOIN_INVITE',
                user: member.user,
                inviteCode: usedInvite.code,
                inviter: usedInvite.inviter
            });
        }
    } catch (error) {
        console.error('Error tracking invite usage:', error);
    }
});

client.on('channelUpdate', async (oldChannel, newChannel) => {
    try {
        await logAction('CHANNEL', newChannel.guild, {
            action: 'UPDATE',
            channel: newChannel,
            changes: {
                name: oldChannel.name !== newChannel.name ? { old: oldChannel.name, new: newChannel.name } : null,
                topic: oldChannel.topic !== newChannel.topic ? { old: oldChannel.topic, new: newChannel.topic } : null
            }
        });
    } catch (error) {
        console.error('Error logging channel update:', error);
    }
});

client.on('channelCreate', async channel => {
    try {
        await logAction('CHANNEL', channel.guild, {
            action: 'CREATE',
            channel: channel,
            type: channel.type
        });
    } catch (error) {
        console.error('Error logging channel create:', error);
    }
});

client.on('channelDelete', async channel => {
    try {
        await logAction('CHANNEL', channel.guild, {
            action: 'DELETE',
            channel: channel,
            type: channel.type
        });
    } catch (error) {
        console.error('Error logging channel delete:', error);
    }
});

async function getAuditLogExecutor(guild, actionType) {
    try {
        const auditLogs = await guild.fetchAuditLogs({
            type: actionType,
            limit: 1
        });
        
        const latestLog = auditLogs.entries.first();
        if (latestLog && Date.now() - latestLog.createdTimestamp < 5000) {
            return latestLog.executor;
        }
        
        return null;
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        return null;
    }
}

client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isButton()) {
            const buttonId = interaction.customId;
            
            // Handle different button categories
            if (buttonId.startsWith('trading_')) {
                await handleTradingButtons(interaction);
            } else if (buttonId.startsWith('info_')) {
                await handleInformationButtons(interaction);
            } else if (buttonId.startsWith('security_')) {
                await handleSecurityButtons(interaction);
            } else if (buttonId.startsWith('fun_')) {
                await handleFunButtons(interaction);
            }
        }
        
        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'announcement_modal') {
                const title = interaction.fields.getTextInputValue('announcement_title');
                const content = interaction.fields.getTextInputValue('announcement_content');
                const channelId = interaction.fields.getTextInputValue('announcement_channel');
                
                const channel = interaction.guild.channels.cache.get(channelId);
                if (!channel) {
                    return interaction.reply({ content: 'Invalid channel ID!', ephemeral: true });
                }
                
                const embed = {
                    title: title,
                    description: content,
                    color: 0x00ff00,
                    timestamp: new Date().toISOString(),
                    footer: {
                        text: `Announced by ${interaction.user.tag}`,
                        icon_url: interaction.user.displayAvatarURL()
                    }
                };
                
                await channel.send({ embeds: [embed] });
                await interaction.reply({ content: 'Announcement sent successfully!', ephemeral: true });
                
                await logAction('MOD', interaction.guild, {
                    action: 'ANNOUNCEMENT_SENT',
                    mod: interaction.user,
                    target: channel,
                    reason: title
                });
            }
        }
        
        if (interaction.isCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            
            // Check if command is enabled
            if (!isCommandEnabled(interaction.commandName)) {
                return interaction.reply({ content: 'This command is currently disabled.', ephemeral: true });
            }
            
            try {
                await command.execute(interaction);
            } catch (error) {
                console.error('Slash command execution error:', error);
                const errorMessage = 'There was an error executing this command!';
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: errorMessage, ephemeral: true });
                } else {
                    await interaction.reply({ content: errorMessage, ephemeral: true });
                }
            }
        }
    } catch (error) {
        console.error('Interaction handling error:', error);
    }
});

// Single login call at the end
client.login(process.env.DISCORD_TOKEN);

// Enhanced error handling for Discord client
client.on('error', error => {
    console.error('Discord client error:', error);
    errorHandler.handleServiceError('DiscordClient', error);
});

client.on('warn', warning => {
    console.warn('Discord client warning:', warning);
});

// Memory monitoring (optional - for debugging)
if (process.env.NODE_ENV === 'development') {
    setInterval(() => {
        const memUsage = process.memoryUsage();
        console.log('Memory Usage:', {
            rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB'
        });
    }, 60000); // Every minute in development
}

// Remove the duplicate login call: client.login(config.token);