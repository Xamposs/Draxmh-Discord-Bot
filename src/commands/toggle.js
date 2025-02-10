import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { toggleCommand, getCommandStatus } from '../utils/commandManager.js';

export const toggleCmd = {
    name: 'toggle',
    description: 'Toggle commands on/off',
    execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('🚫 Only administrators can use this command!');
        }

        if (!args.length) {
            return message.reply('ℹ️ Usage: !toggle <command> <on/off>\nExample: !toggle info off');
        }

        const commandName = args[0].replace('!', '').toLowerCase();
        const state = args[1]?.toLowerCase();

        if (!state || (state !== 'on' && state !== 'off')) {
            return message.reply('ℹ️ Please specify "on" or "off".\nExample: !toggle info off');
        }

        toggleCommand(commandName, state, message.guild.id);

        const statusEmbed = new EmbedBuilder()
            .setTitle('Command Toggle Status')
            .setColor(state === 'on' ? '#00ff00' : '#ff0000')
            .addFields(
                { name: 'Command', value: `!${commandName}`, inline: true },
                { name: 'Status', value: state.toUpperCase(), inline: true },
                { name: 'Toggled By', value: message.author.tag, inline: true }
            )
            .setTimestamp();

        message.reply({ embeds: [statusEmbed] });
    }
};
