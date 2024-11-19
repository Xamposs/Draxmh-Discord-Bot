const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'ban',
    description: 'Ban a user from the server',
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return message.reply('You do not have permission to ban members.');
        }

        const user = message.mentions.users.first();
        if (!user) {
            return message.reply('Please mention a user to ban.');
        }

        const reason = args.slice(1).join(' ') || 'No reason provided';

        try {
            await message.guild.members.ban(user, { reason });
            
            const embed = new EmbedBuilder()
                .setTitle('🔨 User Banned')
                .setColor('#ff0000')
                .addFields(
                    { name: 'Banned User', value: user.tag, inline: true },
                    { name: 'Banned By', value: message.author.tag, inline: true },
                    { name: 'Reason', value: reason }
                )
                .setTimestamp();

            message.reply({ embeds: [embed] });
        } catch (error) {
            message.reply('Failed to ban the user.');
        }
    }
};
