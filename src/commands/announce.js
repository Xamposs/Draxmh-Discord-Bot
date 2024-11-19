const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'announce',
    description: 'Send an announcement or execute command in specific channel',
    async execute(message, args, client) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('Only administrators can use this command!');
        }

        if (args.length < 2) {
            return message.reply('Usage: !announce #channel <message or command>');
        }

        const channelMention = args[0];
        const channelId = channelMention.replace(/[<#>]/g, '');
        const targetChannel = message.guild.channels.cache.get(channelId);

        if (!targetChannel) {
            return message.reply('Please mention a valid channel!');
        }

        const content = args.slice(1).join(' ');
        if (content.startsWith('!')) {
            const commandArgs = content.slice(1).split(' ');
            const commandName = commandArgs[0];
            const command = client.commands.get(commandName);

            if (command) {
                // Create a modified message object for the target channel
                const modifiedMessage = {
                    ...message,
                    channel: targetChannel,
                    reply: (content) => targetChannel.send(content)
                };

                // Execute the command with the modified message object
                await command.execute(modifiedMessage, commandArgs.slice(1), client);
                message.reply(`Command ${commandName} executed in ${channelMention}!`);
            }
        } else {
            await targetChannel.send(content);
            message.reply(`Announcement sent to ${channelMention} successfully! ✅`);
        }
    }
};