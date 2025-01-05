
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'trading',
    description: 'Display trading commands panel',
    async execute(message) {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('price_check')
                    .setLabel('💰 Price Check')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('volume_check')
                    .setLabel('📊 Volume')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('swap_tokens')
                    .setLabel('🔄 Swap')
                    .setStyle(ButtonStyle.Primary)
            );

        const embed = new EmbedBuilder()
            .setTitle('🚀 DRX Trading Commands')
            .setColor('#00ff00')
            .setDescription('Click the buttons below to access trading features!')
            .addFields(
                { name: '💰 Price Check', value: 'Check current DRX price' },
                { name: '📊 Volume', value: 'View trading volume statistics' },
                { name: '🔄 Swap', value: 'Swap tokens on Sologenic DEX' }
            );

        await message.channel.send({
            embeds: [embed],
            components: [row]
        });
    }
};
