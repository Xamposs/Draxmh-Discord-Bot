import { Client, GatewayIntentBits, Collection, PermissionsBitField, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { PermissionFlagsBits } from 'discord-api-types/v10';
import { toggleCommand, isCommandEnabled } from './utils/commandManager.js';
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

patchXrplClient();

dotenv.config({ path: './.env' });

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Set up restart mechanism
const RESTART_INTERVAL = 48 * 60 * 60 * 1000; // 48 hours in milliseconds

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
    // Uncomment the following lines if you want to restart on unhandled rejections
    // setTimeout(() => {
    //     console.log('Restarting after unhandled rejection...');
    //     process.exit(1);
    // }, 1000);
});

function scheduleRestart() {
    setTimeout(() => {
        console.log('Scheduled restart initiated...');
        
        // Save any state if needed before restart
        
        // Force exit with error code to trigger restart
        process.exit(1);
    }, RESTART_INTERVAL);
}// Discord client ready event
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    scheduleRestart();
    // Rest of your initialization code...
});

// Login with your Discord token
client.login(process.env.DISCORD_TOKEN);

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

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    scheduleRestart();
    try {
        await withDNSRetry('xrplcluster.com', async () => {
            await whaleMonitor.start();
            console.log('Whale Monitor started successfully');
        });

        startScamAlerts(client);
        console.log('Scam Alert System initialized - Channel: 1307095704858005545');

        const priceTracker = new PriceTracker(client);
        try {
            await priceTracker.start();
            console.log('Price tracking started successfully');
        } catch (error) {
            console.log('Retrying price tracker initialization...');
            setTimeout(() => priceTracker.start(), 5000);
        }

        const dexAnalytics = new XRPLDexAnalytics(client, '1307799407000944720');
        await dexAnalytics.startAutomatedUpdates();
        console.log('DEX Analytics started - Channel: 1307799407000944720');

        const pathAnalyzer = new SmartPathAnalyzer(client, '1308928972033359993');
        await pathAnalyzer.startAutomatedUpdates();
        console.log('Smart Path Analysis started - Channel: 1308928972033359993');

        const marketAnalyzer = new XRPMarketPsychologyAnalyzer(client, '1325196609012895805');
        await marketAnalyzer.startAutomatedUpdates();
        console.log('Market Psychology Analysis started - Channel: 1325196609012895805');

    } catch (error) {
        console.error('Service initialization error:', error);
    }
});

import { logAction } from './utils/logging.js';
import { handleSpamDetection } from './utils/security/spamManager.js';
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
import { backupCmd } from './commands/backup.js';  // Add it here
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

// Set up commands
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
commands.forEach(cmd => {
    client.commands.set(cmd.name, cmd);
});

client.commands.set(connectCommand.name, connectCommand);  // Add here
client.commands.set(walletCommand.name, walletCommand);
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
      if (!interaction.isButton() && !interaction.isModalSubmit() && !interaction.isStringSelectMenu()) return;

      try {
          if (interaction.isButton()) {
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
              else if (interaction.customId.includes('scam_alert_check') || 
                     interaction.customId.includes('report_check') || 
                     interaction.customId.includes('suggest_check')) {
                  await handleSecurityButtons(interaction, client);
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
              else if (interaction.customId.includes('_check')) {
                  if (interaction.customId.startsWith('moon')) {
                      await handleFunButtons(interaction);
                  } else if (interaction.customId.startsWith('draxmh')) {
                      await handleFunButtons(interaction);
                  }
              }
              else if (interaction.customId.startsWith('announce_')) {
                  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                      return interaction.reply({ 
                          content: 'Only administrators can use this feature!', 
                          ephemeral: true 
                      });
                  }

                  const templateType = interaction.customId.replace('announce_', '');
                
                  const selectMenu = new StringSelectMenuBuilder()
                      .setCustomId(`template_channel_${templateType}`)
                      .setPlaceholder('Select a channel to send this template to...');
                    
                  const channelOptions = interaction.guild.channels.cache
                      .filter(channel => 
                          channel.type === 0 && 
                          channel.permissionsFor(client.user).has(PermissionsBitField.Flags.SendMessages)
                      )
                      .sort((a, b) => a.position - b.position)
                      .map(channel => 
                          new StringSelectMenuOptionBuilder()
                              .setLabel(`#${channel.name}`)
                              .setDescription(`Send to #${channel.name}`)
                              .setValue(channel.id)
                              .setEmoji('📢')
                      );
                    
                  selectMenu.addOptions(channelOptions);
                
                  const row = new ActionRowBuilder().addComponents(selectMenu);
                
                  let templateTitle = 'Announcement';
                  switch(templateType) {
                      case 'info':
                          templateTitle = 'Information Announcement';
                          break;
                      case 'alert':
                          templateTitle = 'Alert Announcement';
                          break;
                      case 'event':
                          templateTitle = 'Event Announcement';
                          break;
                  }
                
                  await interaction.reply({ 
                      content: `Select a channel to send the ${templateTitle} to:`,
                      components: [row],
                      ephemeral: true 
                  });
              }
          }
          else if (interaction.isStringSelectMenu() && interaction.customId.startsWith('announce_channel_select_')) {
              if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                  return interaction.reply({ 
                      content: 'Only administrators can use this feature!', 
                      ephemeral: true 
                  });
              }

              const selectedValue = interaction.values[0];
            
              if (selectedValue.startsWith('category_')) {
                  return interaction.reply({ 
                      content: 'Please select a channel, not a category header.', 
                      ephemeral: true 
                  });
              }

              const channelId = selectedValue.replace('channel_', '');
              const channel = interaction.guild.channels.cache.get(channelId);
            
              if (!channel) {
                  return interaction.reply({ 
                      content: 'Channel not found!', 
                      ephemeral: true 
                  });
              }

              const modal = new ModalBuilder()
                  .setCustomId(`announcement_modal_${channelId}`)
                  .setTitle(`Announcement to #${channel.name}`);

              const announcementInput = new TextInputBuilder()
                  .setCustomId('announcement_content')
                  .setLabel('Message')
                  .setStyle(TextInputStyle.Paragraph)
                  .setPlaceholder('Enter your announcement message here...')
                  .setRequired(true)
                  .setMaxLength(2000);

              const firstActionRow = new ActionRowBuilder().addComponents(announcementInput);
              modal.addComponents(firstActionRow);

              await interaction.showModal(modal);
          }
          else if (interaction.isStringSelectMenu() && interaction.customId.startsWith('template_channel_')) {
              const templateType = interaction.customId.replace('template_channel_', '');
              const channelId = interaction.values[0];
              const channel = interaction.guild.channels.cache.get(channelId);
            
              if (!channel) {
                  return interaction.reply({ 
                      content: 'Channel not found!', 
                      ephemeral: true 
                  });
              }
            
              const modal = new ModalBuilder()
                  .setCustomId(`template_modal_${templateType}_${channelId}`)
                  .setTitle(`${templateType.charAt(0).toUpperCase() + templateType.slice(1)} Template`);
                
              let placeholder = '';
              switch(templateType) {
                  case 'info':
                      placeholder = '📋 **INFORMATION ANNOUNCEMENT**\n\n• Important details: \n• Effective date: \n• Additional info: \n\nPlease read carefully and let us know if you have any questions.';
                      break;
                  case 'alert':
                      placeholder = '⚠️ **URGENT ALERT**\n\n• Issue: \n• Impact: \n• Action required: \n\nPlease respond immediately. Contact moderators if you need assistance.';
                      break;
                  case 'event':
                      placeholder = '🎉 **UPCOMING EVENT**\n\n• Event: \n• Date & Time: \n• Location: \n• Details: \n\nWe hope to see you there! React with ✅ if you plan to attend.';
                      break;
              }
            
              const templateInput = new TextInputBuilder()
                  .setCustomId('announcement_content')
                  .setLabel('Edit Template')
                  .setStyle(TextInputStyle.Paragraph)
                  .setValue(placeholder)
                  .setRequired(true)
                  .setMaxLength(2000);
                
              const firstActionRow = new ActionRowBuilder().addComponents(templateInput);
              modal.addComponents(firstActionRow);
            
              await interaction.showModal(modal);
          }
          else if (interaction.isModalSubmit()) {
              if (interaction.customId.startsWith('template_modal_')) {
                  const parts = interaction.customId.split('_');
                  const templateType = parts[2];
                  const channelId = parts[3];
                  const channel = interaction.guild.channels.cache.get(channelId);
                
                  if (!channel) {
                      return interaction.reply({ 
                          content: 'Channel not found!', 
                          ephemeral: true 
                      });
                  }
                
                  const announcementContent = interaction.fields.getTextInputValue('announcement_content');
                
                  try {
                      await channel.send(announcementContent);
                    
                      await interaction.reply({ 
                          content: `${templateType.charAt(0).toUpperCase() + templateType.slice(1)} announcement sent to ${channel} successfully! ✅`, 
                          ephemeral: true 
                      });
                  } catch (error) {
                      console.error('Error sending announcement:', error);
                      await interaction.reply({ 
                          content: `Error sending announcement: ${error.message}`, 
                          ephemeral: true 
                      });
                  }
              }
              else if (interaction.customId.startsWith('announcement_modal_')) {
                  const channelId = interaction.customId.replace('announcement_modal_', '');
                  const channel = interaction.guild.channels.cache.get(channelId);
                
                  if (!channel) {
                      return interaction.reply({ 
                          content: 'Channel not found!', 
                          ephemeral: true 
                      });
                  }

                  const announcementContent = interaction.fields.getTextInputValue('announcement_content');
                
                  try {
                      await channel.send(announcementContent);
                    
                      await interaction.reply({ 
                          content: `Announcement sent to ${channel} successfully! ✅`, 
                          ephemeral: true 
                      });
                  } catch (error) {
                      console.error('Error sending announcement:', error);
                      await interaction.reply({ 
                          content: `Error sending announcement: ${error.message}`, 
                          ephemeral: true 
                      });
                  }
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
});client.login(process.env.DISCORD_TOKEN);
