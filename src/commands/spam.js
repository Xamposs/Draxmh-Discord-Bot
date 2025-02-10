import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { toggleSpam, setSensitivity, addExemptRole } from '../utils/security/spamManager.js';

export const spamCmd = {
    name: 'spam',
    description: 'Configure spam detection',
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('You do not have permission to use this command.');
        }

        if (!args.length) {
            return message.reply('Usage: !spam <on/off/sensitivity/exempt>');
        }

        const action = args[0].toLowerCase();
        switch(action) {
            case 'on':
            case 'off':
                toggleSpam(message.guild.id, action === 'on');
                message.reply(`Spam detection ${action === 'on' ? 'enabled' : 'disabled'}`);
                break;

            case 'sensitivity':
                if (!args[1]) return message.reply('Please specify: low/medium/high');
                setSensitivity(message.guild.id, args[1].toLowerCase());
                message.reply(`Spam sensitivity set to ${args[1]}`);
                break;

            case 'exempt':
                const role = message.mentions.roles.first();
                if (!role) return message.reply('Please mention a role to exempt');
                addExemptRole(message.guild.id, role.id);
                message.reply(`Added ${role.name} to spam detection exemptions`);
                break;
        }
    }
};
