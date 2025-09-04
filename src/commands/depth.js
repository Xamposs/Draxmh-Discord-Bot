const { EmbedBuilder } = require('discord.js');
const { getDRXMarketDepth } = require('../services/priceService');

// Format orders for display in Discord embed
function formatOrders(orders) {
    if (!orders || orders.length === 0) {
        return 'No orders available';
    }
    
    // Take top 5 orders
    const topOrders = orders.slice(0, 5);
    
    // Format each order
    return topOrders.map(order => {
        return `Price: ${order.price} XRP | Amount: ${order.amount.toLocaleString()} DRX | Total: ${order.total} XRP`;
    }).join('\n');
}

module.exports = {
    name: 'depth',
    description: 'Show DRX market depth',
    async execute(message) {
        const orderBook = await getDRXMarketDepth();
        
        const embed = new EmbedBuilder()
            .setTitle('DRX Market Depth')
            .addFields(
                { name: 'Top Buy Orders', value: formatOrders(orderBook.bids) },
                { name: 'Top Sell Orders', value: formatOrders(orderBook.asks) },
                { name: 'Spread', value: `${orderBook.spread} XRP (${orderBook.spreadPercentage}%)` }
            )
            .setColor('#0099ff')
            .setFooter({ text: `Data from ${orderBook.source} | Updated: ${new Date(orderBook.timestamp).toLocaleString()}` });

        message.reply({ embeds: [embed] });
    }
};
