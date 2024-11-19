const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'socialstats',
    description: 'Show social media stats',
    execute(message) {
        const embed = new EmbedBuilder()
            .setTitle('📊 DRX Social Media Stats')
            .setColor('#00ff00')
            .addFields(
                { name: 'Discord Members', value: message.guild.memberCount.toString(), inline: true },
                { name: 'Twitter Followers', value: '1,000+', inline: true },
                { name: 'Telegram Members', value: '500+', inline: true }
            )
            .setFooter({ text: 'DRX Social Statistics' });

        message.reply({ embeds: [embed] });
    }
};
