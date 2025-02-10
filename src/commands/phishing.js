import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { togglePhishing, addWhitelist, removeWhitelist, getPhishingLogs } from '../utils/security/phishingManager.js';

export const phishingCmd = {
    name: 'phishing',
    description: 'Control phishing protection',
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('You do not have permission to use this command.');
        }

        if (!args.length) {
            return message.reply('Usage: !phishing <on/off/whitelist/logs>');
        }

        const action = args[0].toLowerCase();
        switch(action) {
            case 'on':
            case 'off':
                togglePhishing(message.guild.id, action === 'on');
                message.reply(`Phishing protection ${action === 'on' ? 'enabled' : 'disabled'}`);
                break;

            case 'whitelist':
                if (!args[1] || !args[2]) return message.reply('Usage: !phishing whitelist <add/remove> <domain>');
                const subAction = args[1].toLowerCase();
                const domain = args[2];
                
                if (subAction === 'add') {
                    addWhitelist(message.guild.id, domain);
                    message.reply(`Added ${domain} to whitelist`);
                } else if (subAction === 'remove') {
                    removeWhitelist(message.guild.id, domain);
                    message.reply(`Removed ${domain} from whitelist`);
                }
                break;

            case 'logs':
                const logs = getPhishingLogs(message.guild.id);
                const embed = new EmbedBuilder()
                    .setTitle('Phishing Detection Logs')
                    .setDescription(logs.length ? logs.join('\n') : 'No phishing attempts detected')
                    .setColor('#ff0000');
                message.reply({ embeds: [embed] });
                break;
        }
    }
};
