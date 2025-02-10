import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const muteCommand = {
    name: 'mute',
    description: 'Mute a user',
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('You do not have permission to mute members.');
        }

        const user = message.mentions.users.first();
        if (!user) {
            return message.reply('Please mention a user to mute.');
        }

        const duration = args[1] || '1h';
        const reason = args.slice(2).join(' ') || 'No reason provided';

        try {
            const member = message.guild.members.cache.get(user.id);
            await member.timeout(parseDuration(duration), reason);
            
            const embed = new EmbedBuilder()
                .setTitle('🔇 User Muted')
                .setColor('#ffa500')
                .addFields(
                    { name: 'Muted User', value: user.tag, inline: true },
                    { name: 'Muted By', value: message.author.tag, inline: true },
                    { name: 'Duration', value: duration, inline: true },
                    { name: 'Reason', value: reason }
                )
                .setTimestamp();

            message.reply({ embeds: [embed] });
        } catch (error) {
            message.reply('Failed to mute the user.');
        }
    }
};

const parseDuration = (duration) => {
    const time = parseInt(duration);
    const unit = duration.slice(-1);
    const units = { 's': 1000, 'm': 60000, 'h': 3600000, 'd': 86400000 };
    return time * (units[unit] || units['h']);
};
