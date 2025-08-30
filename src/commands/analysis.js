import { PermissionFlagsBits } from 'discord.js';

export const analysisCommand = {
    name: 'analysis',
    description: 'Toggle automated analysis system',
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('Only administrators can control the analysis system.');
        }

        const state = args[0]?.toLowerCase();
        if (!state || (state !== 'on' && state !== 'off')) {
            return message.reply('Usage: !analysis <on/off>');
        }

        const analysis = message.client.analysisSystem;
        if (analysis) {
            const response = analysis.toggle(state);
            message.reply(response);
        } else {
            message.reply('Analysis system not available.');
        }
    }
};
