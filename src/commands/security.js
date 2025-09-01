import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const securityCmd = {
    name: 'security',
    description: 'Display security commands panel',
    async execute(message) {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('security_scam_alert_check')
                    .setLabel('🚨 Scam Alerts')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('security_report_check')
                    .setLabel('⚠️ Report')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('security_suggest_check')
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