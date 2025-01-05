const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'information',
    description: 'Display information commands panel',
    async execute(message) {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('info_check')
                    .setLabel('ℹ️ Token Info')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('dapps_check')
                    .setLabel('🔗 DApps')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('stake_stats_check')
                    .setLabel('🌟 Staking Stats')
                    .setStyle(ButtonStyle.Primary)
            );

        const embed = new EmbedBuilder()
            .setTitle('ℹ️ DRX Information Center')
            .setColor('#00ff00')
            .setDescription('Click the buttons below to access information!')
            .addFields(
                { name: 'ℹ️ Token Info', value: 'View DRX token information' },
                { name: '🔗 DApps', value: 'Check DRX ecosystem dApps' },
                { name: '🌟 Staking Stats', value: 'View staking statistics' }
            );

        await message.channel.send({
            embeds: [embed],
            components: [row]
        });
    }
};
