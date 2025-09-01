
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const trading = {
    name: 'trading',
    description: 'Display trading commands panel',
    async execute(message) {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('price_check')
                    .setLabel('💰 Price')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('volume_check')
                    .setLabel('📈 Volume')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('swap_tokens')
                    .setLabel('🔄 Swap')
                    .setStyle(ButtonStyle.Secondary)
            );

        const embed = new EmbedBuilder()
            .setTitle('📊 Trading Center')
            .setColor('#00ff00')
            .setDescription('Click the buttons below to access trading features!')
            .addFields(
                { name: '💰 Price', value: 'Check current token prices' },
                { name: '📈 Volume', value: 'View trading volume' },
                { name: '🔄 Swap', value: 'Swap tokens' }
            );

        await message.channel.send({
            embeds: [embed],
            components: [row]
        });
    }
};
