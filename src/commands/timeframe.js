const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'timeframe',
    description: 'Change chart timeframe',
    execute(message, args) {
        const validTimeframes = ['1', '5', '15', '30', '60', '240', 'D'];
        const timeframe = args[0];

        if (!validTimeframes.includes(timeframe)) {
            return message.reply('Invalid timeframe. Use: 1, 5, 15, 30, 60, 240, D');
        }

        // Update timeframe logic here
        updateChartTimeframe(timeframe);
        
        message.reply(`Chart timeframe updated to ${timeframe}`);
    }
};
