const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'clear',
    description: 'Clear messages',
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return message.reply('You do not have permission to use this command!');
        }

        const amount = parseInt(args[0]);
        if (!amount || amount < 1 || amount > 100) {
            return message.reply('Please provide a number between 1 and 100!');
        }

        try {
            // Delete command message first
            await message.delete().catch(() => null);
            
            // Fetch messages
            const messages = await message.channel.messages.fetch({ limit: amount });
            let deletedCount = 0;

            // Delete messages one by one with error handling
            for (const msg of messages.values()) {
                try {
                    await msg.delete();
                    deletedCount++;
                    // Add small delay to prevent rate limiting
                    await new Promise(resolve => setTimeout(resolve, 100));
                } catch (err) {
                    continue; // Skip failed deletions and continue
                }
            }

            const confirmMsg = await message.channel.send(`✨ Successfully cleared ${deletedCount} messages!`);
            setTimeout(() => confirmMsg.delete().catch(() => null), 3000);

        } catch (error) {
            console.error('Clear error:', error);
        }
    }
};