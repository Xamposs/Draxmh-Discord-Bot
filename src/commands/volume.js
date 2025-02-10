import { EmbedBuilder } from 'discord.js';
import axios from 'axios';

export const volumeCommand = {
    name: 'volume',
    description: 'Get XRP trading volume statistics',
    async execute(message) {
        try {
            const response = await axios.get('https://api.binance.com/api/v3/ticker/24hr?symbol=XRPUSDT');
            const data = response.data;
            
            const embed = new EmbedBuilder()
                .setTitle('📊 XRP Trading Volume')
                .setColor('#0099ff')
                .addFields(
                    { name: '24h Volume', value: `${Number(data.volume).toLocaleString()} XRP`, inline: true },
                    { name: 'Volume in USDT', value: `${Number(data.quoteVolume).toLocaleString()}`, inline: true },
                    { name: 'Number of Trades', value: data.count.toLocaleString(), inline: true },
                    { name: 'Highest Price 24h', value: `${Number(data.highPrice).toFixed(4)}`, inline: true },
                    { name: 'Lowest Price 24h', value: `${Number(data.lowPrice).toFixed(4)}`, inline: true },
                    { name: 'Price Change', value: `${Number(data.priceChangePercent).toFixed(2)}%`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Data from Binance' });

            return message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Volume fetch error:', error);
            return message.reply('Error fetching volume data. Please try again.');
        }
    }
};
