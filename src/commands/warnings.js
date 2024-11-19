const { EmbedBuilder } = require('discord.js');
const { getUserCases } = require('../utils/moderationLog');

module.exports = {
    name: 'warnings',
    description: 'Check user warnings',
    execute(message, args) {
        const user = message.mentions.users.first() || message.author;
        const cases = getUserCases(user.id).filter(c => c.type === 'warning');

        const embed = new EmbedBuilder()
            .setTitle(`⚠️ Warnings for ${user.tag}`)
            .setColor('#ffa500')
            .setDescription(cases.length ? 
                cases.map(c => 
                    `**Case ${c.id}**\n` +
                    `• Moderator: ${c.moderator}\n` +
                    `• Reason: ${c.reason}\n` +
                    `• Date: ${c.timestamp.toLocaleDateString()}`
                ).join('\n\n')
                : 'No warnings found.'
            )
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};
