const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'unlock',
    description: 'Unlock a channel',
    async execute(message) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return message.reply('You do not have permission to use this command!');
        }

        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
            SendMessages: true
        });
        message.reply('🔓 Channel unlocked!');
    }
};
