const { EmbedBuilder } = require('discord.js');

class AlertSystem {
    constructor(client) {
        this.client = client;
        this.alertChannel = process.env.ALERT_CHANNEL_ID;
    }

    async sendAlert(signalData) {
        const embed = new EmbedBuilder()
            .setTitle('🤖 AI Trading Signal Alert')
            .setColor(this.getColorBySignal(signalData.strength))
            .addFields(
                { name: 'Signal Strength', value: signalData.strength, inline: true },
                { name: 'Technical Score', value: signalData.technical.toFixed(2), inline: true },
                { name: 'Pattern Score', value: signalData.pattern.toFixed(2), inline: true },
                { name: 'Sentiment Score', value: signalData.sentiment.toFixed(2), inline: true },
                { name: 'Recommendation', value: signalData.recommendation }
            )
            .setTimestamp();

        const channel = this.client.channels.cache.get(this.alertChannel);
        await channel.send({ embeds: [embed] });
    }

    getColorBySignal(strength) {
        const colors = {
            'Strong Buy': '#00ff00',
            'Buy': '#7fff00',
            'Neutral': '#ffff00',
            'Sell': '#ff7f00',
            'Strong Sell': '#ff0000'
        };
        return colors[strength] || '#ffffff';
    }
}
