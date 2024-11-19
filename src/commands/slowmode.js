const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'slowmode',
    description: 'Set channel slowmode',
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply('You do not have permission to manage channels.');
        }

        const seconds = parseInt(args[0]);
        if (isNaN(seconds)) {
            return message.reply('Please provide a valid number of seconds.');
        }

        try {
            await message.channel.setRateLimitPerUser(seconds);
            
            const embed = new EmbedBuilder()
                .setTitle('⏱️ Slowmode Updated')
                .setColor('#00ff00')
                .addFields(
                    { name: 'Channel', value: message.channel.name, inline: true },
                    { name: 'Slowmode', value: `${seconds} seconds`, inline: true },
                    { name: 'Updated By', value: message.author.tag }
                )
                .setTimestamp();

            message.reply({ embeds: [embed] });
        } catch (error) {
            message.reply('Failed to set slowmode.');
        }
    }
};
