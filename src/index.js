
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { PermissionFlagsBits } = require('discord-api-types/v10');
const { toggleCommand, isCommandEnabled } = require('./utils/commandManager');
require('dotenv').config({ path: './.env' });
const { AutomatedAnalysis } = require('./services/automatedAnalysis');
const PriceTracker = require('./services/priceTracker');
const { XRPLDexAnalytics } = require('./services/xrplDexAnalytics');
const { SmartPathAnalyzer } = require('./services/smartPathAnalyzer');
const { XRPMarketPsychologyAnalyzer } = require('./services/xrpMarketPsychologyAnalyzer');
const { WhaleMonitor } = require('./services/whaleMonitor');
const { 
    handleTradingButtons, 
    handleInformationButtons, 
    handleSecurityButtons, 
    handleFunButtons 
} = require('./buttonPanels/handlers/buttonHandler');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.on('error', (error) => {
    console.log('Client error:', error);
});

client.on('reconnect', () => {
    console.log('Client reconnecting...');
});

const prefix = '!';
client.commands = new Collection();

// Add button panel commands
const tradingCmd = require('./buttonPanels/commands/trading.js');
const informationCmd = require('./buttonPanels/commands/information.js');
const securityCmd = require('./buttonPanels/commands/security.js');
const funCmd = require('./buttonPanels/commands/fun.js');

client.commands.set(tradingCmd.name, tradingCmd);
client.commands.set(informationCmd.name, informationCmd);
client.commands.set(securityCmd.name, securityCmd);
client.commands.set(funCmd.name, funCmd);

const { startScamAlerts } = require('./services/autoScamAlert.js');
const { startChartService } = require('./services/tradingViewChart.js');
const { withDNSRetry } = require('./utils/networkRetry');

client.once('ready', async () => {
    try {
        console.log(`Logged in as ${client.user.tag}!`);
        
        const whaleMonitor = new WhaleMonitor(client);
        await whaleMonitor.start();
    
        const priceTracker = new PriceTracker(client);
        priceTracker.start();
    
        startScamAlerts(client);
    
        const analysisSystem = new AutomatedAnalysis(client);
        analysisSystem.start();
    
        const dexAnalytics = new XRPLDexAnalytics(client, process.env.DEX_ANALYTICS_CHANNEL_ID);
        dexAnalytics.startAutomatedUpdates();

        const pathAnalyzer = new SmartPathAnalyzer(client, process.env.PATH_ANALYSIS_CHANNEL_ID);
        pathAnalyzer.startAutomatedUpdates();

        console.log('Starting XRP Market Psychology service...');
        const marketPsychology = new XRPMarketPsychologyAnalyzer(client, '1307089076498993265');
        await marketPsychology.startAutomatedUpdates();
        console.log('XRP Market Psychology service started successfully');

    } catch (error) {
        console.error('An error occurred during initialization:', error);
    }
});
const { logAction } = require('./utils/logging');

client.on('messageCreate', async message => {
    if (!message.author.bot) {
        await logAction('MESSAGE', message.guild, {
            user: message.author,
            channel: message.channel,
            content: message.content,
            action: 'SENT'
        });
    }

    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    if (args[0]?.toLowerCase() === 'on' || args[0]?.toLowerCase() === 'off') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('You do not have permission to toggle commands.');
        }
    
        const state = args[0].toLowerCase();
        toggleCommand(commandName, state, message.guild.id);
        const status = state === 'on' ? '✅' : '❌';
        return message.reply(`${status} Command ${commandName} has been ${state === 'on' ? 'enabled' : 'disabled'}`);
    }

    const command = client.commands.get(commandName);
    if (!command) return;

    if (!isCommandEnabled(commandName, message.guild.id)) {
        return message.reply('⚠️ This command is currently disabled.');
    }

    try {
        await command.execute(message, args, client);
        await logAction('COMMAND', message.guild, {
            user: message.author,
            command: commandName,
            channel: message.channel
        });
    } catch (error) {
        console.error(error);
        message.reply('There was an error executing that command!');
    }
});

client.login(process.env.DISCORD_TOKEN);

// Command registrations
const stakeStatsCommand = require('./commands/stake-stats.js');
const volumeCommand = require('./commands/volume.js');
const dappsCommand = require('./commands/dapps.js');
const swapCommand = require('./commands/swap.js');
const commandsCmd = require('./commands/commands.js');
const clearCmd = require('./commands/clear.js');
const lockCmd = require('./commands/lock.js');
const unlockCmd = require('./commands/unlock.js');
const infoCmd = require('./commands/info.js');
const moonCmd = require('./commands/moon.js');
const penisCmd = require('./commands/draxmh.js');
const socialstatsCmd = require('./commands/socialstats.js');
const announceCmd = require('./commands/announce.js');
const moderationCmd = require('./commands/moderation.js');
const scamAlertCmd = require('./commands/scamalert.js');
const reportCmd = require('./commands/report.js');
const suggestCmd = require('./commands/suggest.js');
const banCommand = require('./commands/ban.js');
const kickCommand = require('./commands/kick.js');
const muteCommand = require('./commands/mute.js');
const roleCommand = require('./commands/role.js');
const slowmodeCommand = require('./commands/slowmode.js');
const warningsCommand = require('./commands/warnings.js');
const historyCommand = require('./commands/history.js');
const casesCommand = require('./commands/cases.js');
const verificationCmd = require('./commands/verification.js');
const phishingCmd = require('./commands/phishing.js');
const spamCmd = require('./commands/spam.js');
const raidCmd = require('./commands/raid.js');
const backupCmd = require('./commands/backup.js');
const priceCommand = require('./commands/price.js');
const toggleCmd = require('./commands/toggle.js');

// Set all commands
client.commands.set(stakeStatsCommand.name, stakeStatsCommand);
client.commands.set(volumeCommand.name, volumeCommand);
client.commands.set(dappsCommand.name, dappsCommand);
client.commands.set(swapCommand.name, swapCommand);
client.commands.set(commandsCmd.name, commandsCmd);
client.commands.set(clearCmd.name, clearCmd);
client.commands.set(lockCmd.name, lockCmd);
client.commands.set(unlockCmd.name, unlockCmd);
client.commands.set(infoCmd.name, infoCmd);
client.commands.set(moonCmd.name, moonCmd);
client.commands.set(penisCmd.name, penisCmd);
client.commands.set(socialstatsCmd.name, socialstatsCmd);
client.commands.set(announceCmd.name, announceCmd);
client.commands.set(moderationCmd.name, moderationCmd);
client.commands.set(scamAlertCmd.name, scamAlertCmd);
client.commands.set(reportCmd.name, reportCmd);
client.commands.set(suggestCmd.name, suggestCmd);
client.commands.set(banCommand.name, banCommand);
client.commands.set(kickCommand.name, kickCommand);
client.commands.set(muteCommand.name, muteCommand);
client.commands.set(roleCommand.name, roleCommand);
client.commands.set(slowmodeCommand.name, slowmodeCommand);
client.commands.set(warningsCommand.name, warningsCommand);
client.commands.set(historyCommand.name, historyCommand);
client.commands.set(casesCommand.name, casesCommand);
client.commands.set(verificationCmd.name, verificationCmd);
client.commands.set(phishingCmd.name, phishingCmd);
client.commands.set(spamCmd.name, spamCmd);
client.commands.set(raidCmd.name, raidCmd);
client.commands.set(backupCmd.name, backupCmd);
client.commands.set(priceCommand.name, priceCommand);
client.commands.set(toggleCmd.name, toggleCmd);

const memberJoinHandler = require('./events/guildMemberAdd.js');
client.on('guildMemberAdd', memberJoinHandler);

const { handleSpamDetection } = require('./utils/security/spamManager');
const { handlePhishingDetection } = require('./utils/security/phishingManager');
const { handleRaidProtection } = require('./utils/security/raidManager');
const { handleVerification } = require('./utils/security/verificationManager');

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    await handleSpamDetection(message);
    await handlePhishingDetection(message);
});

client.on('guildMemberAdd', async member => {
    await handleRaidProtection(member);
    await handleVerification(member);
});

const invites = new Map();

client.on('ready', async () => {
    client.guilds.cache.forEach(async guild => {
        const guildInvites = await guild.invites.fetch();
        invites.set(guild.id, new Map(guildInvites.map(invite => [invite.code, invite.uses])));
    });
});

client.on('inviteCreate', async invite => {
    const guildInvites = invites.get(invite.guild.id) || new Map();
    guildInvites.set(invite.code, invite.uses);
    invites.set(invite.guild.id, guildInvites);

    await logAction('INVITE', invite.guild, {
        action: 'Created',
        inviter: invite.inviter,
        code: invite.code,
        channel: invite.channel,
        uses: invite.uses,
        maxUses: invite.maxUses,
        expiresAt: invite.expiresAt
    });
});

client.on('guildMemberAdd', async member => {
    const oldInvites = invites.get(member.guild.id) || new Map();
    const newInvites = await member.guild.invites.fetch();
    
    const usedInvite = newInvites.find(invite => oldInvites.get(invite.code) < invite.uses);
    if (usedInvite) {
        await logAction('INVITE', member.guild, {
            action: 'Used',
            inviter: usedInvite.inviter,
            user: member.user,
            code: usedInvite.code,
            channel: usedInvite.channel,
            uses: usedInvite.uses,
            maxUses: usedInvite.maxUses
        });
    }

    invites.set(member.guild.id, new Map(newInvites.map(invite => [invite.code, invite.uses])));
});

client.on('channelUpdate', async (oldChannel, newChannel) => {
    await logAction('CHANNEL', newChannel.guild, {
        action: 'Updated',
        channel: newChannel,
        moderator: await getAuditLogExecutor(newChannel.guild, 'CHANNEL_UPDATE'),
        oldName: oldChannel.name,
        newName: newChannel.name,
        oldTopic: oldChannel.topic,
        newTopic: newChannel.topic
    });
});

client.on('channelCreate', async channel => {
    await logAction('CHANNEL', channel.guild, {
        action: 'Created',
        channel: channel,
        moderator: await getAuditLogExecutor(channel.guild, 'CHANNEL_CREATE')
    });
});

client.on('channelDelete', async channel => {
    await logAction('CHANNEL', channel.guild, {
        action: 'Deleted',
        channel: channel,
        moderator: await getAuditLogExecutor(channel.guild, 'CHANNEL_DELETE')
    });
});

const { AuditLogEvent } = require('discord.js');

async function getAuditLogExecutor(guild, actionType) {
    try {
        const auditLogTypes = {
            'CHANNEL_UPDATE': AuditLogEvent.ChannelUpdate,
            'CHANNEL_CREATE': AuditLogEvent.ChannelCreate,
            'CHANNEL_DELETE': AuditLogEvent.ChannelDelete
        };

        const auditLog = await guild.fetchAuditLogs({
            type: auditLogTypes[actionType],
            limit: 1
        });
        return auditLog.entries.first()?.executor || { tag: 'Unknown' };
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        return { tag: 'Unknown' };
    }
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    try {
        if (interaction.customId.includes('price_check') || 
            interaction.customId.includes('volume_check') || 
            interaction.customId.includes('swap_tokens')) {
            await handleTradingButtons(interaction, client);
        }
        else if (interaction.customId.includes('info_check') || 
                 interaction.customId.includes('dapps_check') || 
                 interaction.customId.includes('stake_stats_check')) {
            await handleInformationButtons(interaction, client);
        }
             else if (interaction.customId.includes('moon_check') || 
                      interaction.customId.includes('draxmh_check')) {
                 await handleFunButtons(interaction, client);
             }
             else if (interaction.customId === 'accept_rules') {
                 const memberRole = interaction.guild.roles.cache.get(MEMBER_ROLE);
                 if (memberRole) {
                     await interaction.member.roles.add(memberRole);
                     await interaction.reply({ 
                         content: '✅ Welcome to the community! You now have access to all channels.',
                         ephemeral: true 
                     });
                 }
             }
         } catch (error) {
             console.error('Button interaction error:', error);
             if (!interaction.replied) {
                 await interaction.reply({ 
                     content: 'There was an error processing this button!', 
                     ephemeral: true 
                 });
             }
         }
});

// Export the client for use in other files
module.exports = client;