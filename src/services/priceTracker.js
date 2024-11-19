const axios = require('axios');
const { EmbedBuilder } = require('discord.js');

class PriceTracker {
    constructor(client) {
        this.client = client;
        this.binanceAPI = 'https://api.binance.com/api/v3';
        this.updateInterval = 30000;
        this.priceChannel = '1252356323853734110'; // Your price-charts channel ID
    }

    start() {
        this.fetchAndUpdatePrice();
        setInterval(() => this.fetchAndUpdatePrice(), this.updateInterval);
    }

    async fetchAndUpdatePrice() {
        try {
            const response = await axios.get(`${this.binanceAPI}/ticker/24hr?symbol=XRPUSDT`);
            const data = response.data;
            
            const price = {
                current: parseFloat(data.lastPrice),
                change24h: parseFloat(data.priceChangePercent),
                timestamp: new Date()
            };

            await this.broadcastPrice(price);
        } catch (error) {
            console.error('Price fetch error:', error.message);
            setTimeout(() => this.fetchAndUpdatePrice(), 5000);
        }
    }

    async broadcastPrice(price) {
        const channel = this.client.channels.cache.get(this.priceChannel);
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setTitle('XRP/USDT Live Price')
            .addFields(
                { name: 'Current Price', value: price.current.toFixed(4), inline: true },
                { name: '24h Change', value: `${price.change24h.toFixed(2)}%`, inline: true },
                { name: 'Last Update', value: 'Just now', inline: true }
            )
            .setFooter({ text: 'Data from Binance' })
            .setTimestamp();

        await channel.send({ embeds: [embed] });
    }
}

module.exports = PriceTracker;