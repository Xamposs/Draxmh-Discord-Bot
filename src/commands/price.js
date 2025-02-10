import { EmbedBuilder } from 'discord.js';
import { getDRXPrice } from '../services/priceService.js';

export const priceCommand = {
    name: 'price',
    description: 'Get DRX token price',
    async execute(message) {
        try {
            const priceData = await getDRXPrice();
            
            const embed = new EmbedBuilder()
                .setTitle('🚀 DRX Token Price')
                .setColor('#00ff00')
                .addFields(
                    { name: '💎 Price', value: `${priceData.price.toFixed(6)} XRP`, inline: true },
                    { name: '📊 Market', value: 'Sologenic DEX', inline: true },
                    { name: '🔄 Status', value: 'Live Price', inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Real-time data from Sologenic DEX' });

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error:', error);
            message.reply('Error fetching DRX price from Sologenic DEX!');
        }
    }
};
