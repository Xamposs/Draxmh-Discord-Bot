const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'fun',
    description: 'Display fun commands panel',
    async execute(message) {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('moon_check')
                    .setLabel('🚀 To The Moon')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('draxmh_check')
                    .setLabel('💫 DRAXMH Power')
                    .setStyle(ButtonStyle.Success)
            );

        const embed = new EmbedBuilder()
            .setTitle('🎮 DRX Fun Zone')
            .setColor('#00ff00')
            .setDescription('Click the buttons below to have some fun!')
            .addFields(
                { name: '🚀 To The Moon', value: 'Send DRX to the moon!' },
                { name: '💫 DRAXMH Power', value: 'Show the power of DRX' }
            );

        await message.channel.send({
            embeds: [embed],
            components: [row]
        });
    }
};
