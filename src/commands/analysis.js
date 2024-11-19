const { PermissionFlagsBits } = require('discord.js');

module.exports = {
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
        const response = analysis.toggle(state);
        message.reply(response);
    }
};
