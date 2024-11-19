const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'alert',
    description: 'Set price alerts for DRX',
    async execute(message, args) {
        const [price, condition] = args;
        if (!price || !condition) {
            return message.reply('Usage: !alert <price> <above/below>');
        }

        alerts.set(message.author.id, {
            targetPrice: parseFloat(price),
            condition: condition.toLowerCase(),
            timestamp: Date.now()
        });

        const embed = new EmbedBuilder()
            .setTitle('Price Alert Set')
            .setDescription(`You will be notified when DRX price goes ${condition} ${price} XRP`)
            .setColor('#00FF00');

        message.reply({ embeds: [embed] });
    }
};
