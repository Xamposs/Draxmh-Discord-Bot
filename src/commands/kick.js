import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const kickCommand = {
    name: 'kick',
    description: 'Kick a user from the server',
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            return message.reply('You do not have permission to kick members.');
        }

        const user = message.mentions.users.first();
        if (!user) {
            return message.reply('Please mention a user to kick.');
        }

        const reason = args.slice(1).join(' ') || 'No reason provided';

        try {
            const member = message.guild.members.cache.get(user.id);
            await member.kick(reason);
            
            const embed = new EmbedBuilder()
                .setTitle('👢 User Kicked')
                .setColor('#ffa500')
                .addFields(
                    { name: 'Kicked User', value: user.tag, inline: true },
                    { name: 'Kicked By', value: message.author.tag, inline: true },
                    { name: 'Reason', value: reason }
                )
                .setTimestamp();

            message.reply({ embeds: [embed] });
        } catch (error) {
            message.reply('Failed to kick the user.');
        }
    }
};
