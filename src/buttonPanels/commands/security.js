const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'security',
    description: 'Display security commands panel',
    async execute(message) {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('scam_alert_check')
                    .setLabel('🚨 Scam Alerts')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('report_check')
                    .setLabel('⚠️ Report')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('suggest_check')
                    .setLabel('💡 Suggest')
                    .setStyle(ButtonStyle.Success)
            );

        const embed = new EmbedBuilder()
            .setTitle('🛡️ DRX Security Center')
            .setColor('#ff0000')
            .setDescription('Click the buttons below to access security features!')
            .addFields(
                { name: '🚨 Scam Alerts', value: 'View current security alerts' },
                { name: '⚠️ Report', value: 'Report suspicious activity' },
                { name: '💡 Suggest', value: 'Submit suggestions' }
            );

        await message.channel.send({
            embeds: [embed],
            components: [row]
        });
    }
};
