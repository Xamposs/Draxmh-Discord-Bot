import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const information = {
    name: 'information',
    description: 'Display information commands panel',
    async execute(message) {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('info_check')
                    .setLabel('ℹ️ Info')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('dapps_check')
                    .setLabel('📱 DApps')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('stake_stats_check')
                    .setLabel('📊 Stake Stats')
                    .setStyle(ButtonStyle.Secondary)
            );

        const embed = new EmbedBuilder()
            .setTitle('ℹ️ Information Center')
            .setColor('#0099ff')
            .setDescription('Click the buttons below to access information!')
            .addFields(
                { name: 'ℹ️ Info', value: 'Get general information' },
                { name: '📱 DApps', value: 'View available DApps' },
                { name: '📊 Stake Stats', value: 'Check staking statistics' }
            );

        await message.channel.send({
            embeds: [embed],
            components: [row]
        });
    }
};
