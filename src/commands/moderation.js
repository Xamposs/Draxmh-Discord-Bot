import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { isCommandEnabled } from '../utils/commandManager.js';

export const moderationCmd = {
    name: 'moderation',
    description: 'Shows all moderation commands',
    execute(message) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('You do not have permission to use this command.');
        }

        const getStatus = (cmd) => isCommandEnabled(cmd, message.guild.id) ? '✅' : '❌';

        const embed = new EmbedBuilder()
            .setTitle('🛡️ DRX Moderation Panel')
            .setColor('#2b2d31')
            .addFields(
                { 
                    name: '🔨 Moderation Commands', 
                    value: `\`\`\`${getStatus('ban')} !ban <user> <reason>\n${getStatus('kick')} !kick <user> <reason>\n${getStatus('mute')} !mute <user> <duration>\n${getStatus('unmute')} !unmute <user>\n${getStatus('warn')} !warn <user> <reason>\`\`\``,
                    inline: false 
                },
                { 
                    name: '⚙️ Management Commands', 
                    value: `\`\`\`${getStatus('clear')} !clear <amount>\n${getStatus('slowmode')} !slowmode <seconds>\n${getStatus('lock')} !lock\n${getStatus('unlock')} !unlock\n${getStatus('role')} !role <user> <role>\`\`\``,
                    inline: false 
                },
                { 
                    name: '📊 Information Commands', 
                    value: `\`\`\`${getStatus('warnings')} !warnings <user>\n${getStatus('history')} !history <user>\n${getStatus('cases')} !cases\`\`\``,
                    inline: false 
                },
                {
                    name: '🛡️ Security Commands',
                    value: `\`\`\`${getStatus('verification')} !verification <on/off>\n${getStatus('phishing')} !phishing <on/off>\n${getStatus('spam')} !spam <on/off>\n${getStatus('raid')} !raid <on/off>\n${getStatus('backup')} !backup <channel>\`\`\``,
                    inline: false
                }
            )
            .setFooter({ text: '✅ = Enabled | ❌ = Disabled' });

        message.reply({ embeds: [embed] });
    }
};