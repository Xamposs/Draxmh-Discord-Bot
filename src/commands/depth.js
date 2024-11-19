const { EmbedBuilder } = require('discord.js');
const { getDRXMarketDepth } = require('../services/priceService');

module.exports = {
    name: 'depth',
    description: 'Show DRX market depth',
    async execute(message) {
        const orderBook = await getDRXMarketDepth();
        
        const embed = new EmbedBuilder()
            .setTitle('DRX Market Depth')
            .addFields(
                { name: 'Top Buy Orders', value: formatOrders(orderBook.bids) },
                { name: 'Top Sell Orders', value: formatOrders(orderBook.asks) }
            )
            .setColor('#0099ff');

        message.reply({ embeds: [embed] });
    }
};
