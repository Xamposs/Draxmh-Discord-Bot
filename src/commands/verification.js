import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { toggleVerification, getVerificationStatus, setVerificationLevel } from '../utils/security/verificationManager.js';

export const verificationCmd = {
    name: 'verification',
    description: 'Manage verification system',
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('You do not have permission to use this command.');
        }

        if (!args.length) {
            return message.reply('Usage: !verification <on/off/config/level>');
        }

        const action = args[0].toLowerCase();

        switch(action) {
            case 'on':
            case 'off':
                toggleVerification(message.guild.id, action === 'on');
                message.reply(`Verification system ${action === 'on' ? 'enabled' : 'disabled'}`);
                break;
            
            case 'level':
                const level = parseInt(args[1]);
                if (isNaN(level) || level < 1 || level > 3) {
                    return message.reply('Please specify a level between 1-3');
                }
                setVerificationLevel(message.guild.id, level);
                message.reply(`Verification level set to ${level}`);
                break;

            case 'config':
                const status = getVerificationStatus(message.guild.id);
                const embed = new EmbedBuilder()
                    .setTitle('Verification System Configuration')
                    .setColor('#00ff00')
                    .addFields(
                        { name: 'Status', value: status.enabled ? 'Enabled' : 'Disabled', inline: true },
                        { name: 'Level', value: status.level.toString(), inline: true },
                        { name: 'Verified Role', value: status.role || 'Not set', inline: true }
                    );
                message.reply({ embeds: [embed] });
                break;
        }
    }
};
