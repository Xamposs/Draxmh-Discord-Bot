import { EmbedBuilder } from 'discord.js';
import axios from 'axios';

const CHART_CHANNEL_ID = '1252356323853734110';
const UPDATE_INTERVAL = 60000;

export const startChartService = async (client) => {
    const channel = client.channels.cache.get(CHART_CHANNEL_ID);
    
    async function updateChart() {
        try {
            const { price, priceChange } = await getBinancePrice();
            
            const embed = new EmbedBuilder()
                .setTitle('XRP/USDT Live Price')
                .setColor(parseFloat(priceChange) >= 0 ? '#00ff00' : '#ff0000')
                .addFields(
                    { name: 'Current Price', value: `${price}`, inline: true },
                    { name: '24h Change', value: `${priceChange}%`, inline: true },
                    { name: 'Last Update', value: `<t:${Math.floor(Date.now()/1000)}:R>`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Data from Binance' });

            await channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Chart update error:', error);
        }
    }

    await updateChart();
    setInterval(updateChart, UPDATE_INTERVAL);
};

async function getBinancePrice() {
    const response = await axios.get('https://api.binance.com/api/v3/ticker/24hr?symbol=XRPUSDT');
    return {
        price: parseFloat(response.data.lastPrice).toFixed(4),
        priceChange: parseFloat(response.data.priceChangePercent).toFixed(2)
    };
}
