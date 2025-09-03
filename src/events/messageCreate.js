import telegramService from '../services/telegramService.js';
import { config } from '../config.js';

export default {
    name: 'messageCreate',
    async execute(message) {
        // Ignore bot messages
        if (message.author.bot) return;

        // Check if message is from an announcement channel
        const isAnnouncementChannel = config.discord.announcementChannelNames.some(name => 
            message.channel.name && message.channel.name.toLowerCase().includes(name.toLowerCase())
        );

        if (isAnnouncementChannel) {
            console.log(`📢 Announcement detected in #${message.channel.name}`);
            await telegramService.forwardDiscordMessage(message);
        }
    }
};