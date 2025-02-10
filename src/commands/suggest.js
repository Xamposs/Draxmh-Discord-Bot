import { EmbedBuilder } from 'discord.js';

const ADMIN_REVIEW_CHANNEL = '1304539451921535156';
const SUGGESTIONS_CHANNEL = '1252357439807033374';

export const suggestCmd = {
    name: 'suggest',
    description: 'Submit a suggestion',
    async execute(message, args) {
        if (message.channel.id !== SUGGESTIONS_CHANNEL) {
            return message.reply('Please use this command in the suggestions channel!');
        }

        await message.delete();

        if (!args.length) {
            return message.channel.send('Please provide a suggestion! Usage: !suggest <your suggestion>');
        }

        const suggestion = args.join(' ');
        const adminChannel = message.guild.channels.cache.get(ADMIN_REVIEW_CHANNEL);

        const suggestEmbed = new EmbedBuilder()
            .setTitle('💡 New Suggestion')
            .setColor('#00ff00')
            .addFields(
                { name: 'Suggested by', value: message.author.tag },
                { name: 'Suggestion', value: suggestion },
                { name: 'Status', value: '⏳ Under Review' }
            )
            .setTimestamp();

        if (adminChannel) {
            const adminEmbed = new EmbedBuilder()
                .setTitle('💡 New Suggestion Received')
                .setColor('#ffa500')
                .addFields(
                    { name: 'From User', value: `${message.author.tag} (${message.author.id})` },
                    { name: 'Suggestion', value: suggestion },
                    { name: 'Channel', value: `${message.channel.name}` }
                )
                .setTimestamp();

            await adminChannel.send({ embeds: [adminEmbed] });
        }

        const confirmMessage = await message.channel.send({ embeds: [suggestEmbed] });
        await confirmMessage.react('👍');
        await confirmMessage.react('👎');
    }
};
