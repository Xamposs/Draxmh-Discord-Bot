const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'chart',
    description: 'Control the trading chart',
    async execute(message, args) {
        if (!args.length) {
            return message.reply('Available commands: timeframe, indicator, draw');
        }

        const [command, ...params] = args;
        if (commands[command]) {
            await commands[command](message, params);
        } else {
            message.reply('Invalid chart command');
        }
    }
};
