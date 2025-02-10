import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { toggleRaid, setThreshold, setAction } from '../utils/security/raidManager.js';

export const raidCmd = {
    name: 'raid',
    description: 'Set raid protection',
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('You do not have permission to use this command.');
        }

        if (!args.length) {
            return message.reply('Usage: !raid <on/off/threshold/action>');
        }

        const action = args[0].toLowerCase();
        switch(action) {
            case 'on':
            case 'off':
                toggleRaid(message.guild.id, action === 'on');
                message.reply(`Raid protection ${action === 'on' ? 'enabled' : 'disabled'}`);
                break;

            case 'threshold':
                if (!args[1]) return message.reply('Please specify join rate threshold');
                setThreshold(message.guild.id, parseInt(args[1]));
                message.reply(`Raid threshold set to ${args[1]} joins per minute`);
                break;

            case 'action':
                if (!args[1]) return message.reply('Please specify: lockdown/verify/alert');
                setAction(message.guild.id, args[1].toLowerCase());
                message.reply(`Raid action set to ${args[1]}`);
                break;
        }
    }
};
