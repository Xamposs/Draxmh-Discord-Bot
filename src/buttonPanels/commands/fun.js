import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const fun = {
    name: 'fun',
    description: 'Display fun commands panel',
    async execute(message) {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('moon_check')
                    .setLabel('🌙 Moon')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('draxmh_check')
                    .setLabel('🔥 DRAXMH')
                    .setStyle(ButtonStyle.Success)
            );

        const embed = new EmbedBuilder()
            .setTitle('🎉 Fun Commands')
            .setColor('#ffff00')
            .setDescription('Click the buttons below to access fun features!')
            .addFields(
                { name: '🌙 Moon', value: 'Check moon phase and predictions' },
                { name: '🔥 DRAXMH', value: 'Get DRAXMH information' }
            );

        await message.channel.send({
            embeds: [embed],
            components: [row]
        });
    }
};
