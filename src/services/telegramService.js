import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config.js';

class TelegramService {
    constructor() {
        this.bot = new TelegramBot(config.telegram.botToken, { polling: false });
        this.channelId = config.telegram.channelId;
        this.isConnected = false;
        this.init();
    }

    async init() {
        try {
            const botInfo = await this.bot.getMe();
            console.log(`✅ Telegram Bot connected: @${botInfo.username}`);
            this.isConnected = true;
        } catch (error) {
            console.error('❌ Failed to connect to Telegram:', error.message);
            this.isConnected = false;
        }
    }

    async sendMessage(text, options = {}) {
        if (!this.isConnected) {
            console.warn('⚠️ Telegram bot not connected, skipping message');
            return null;
        }

        try {
            const message = await this.bot.sendMessage(this.channelId, text, {
                parse_mode: 'HTML',
                disable_web_page_preview: false,
                ...options
            });
            console.log('📤 Message sent to Telegram successfully');
            return message;
        } catch (error) {
            console.error('❌ Failed to send Telegram message:', error.message);
            return null;
        }
    }

    async sendPhoto(photo, caption = '', options = {}) {
        if (!this.isConnected) {
            console.warn('⚠️ Telegram bot not connected, skipping photo');
            return null;
        }

        try {
            const message = await this.bot.sendPhoto(this.channelId, photo, {
                caption,
                parse_mode: 'HTML',
                ...options
            });
            console.log('📷 Photo sent to Telegram successfully');
            return message;
        } catch (error) {
            console.error('❌ Failed to send Telegram photo:', error.message);
            return null;
        }
    }

    formatDiscordMessage(discordMessage) {
        const author = discordMessage.author;
        const content = discordMessage.content;
        const timestamp = new Date(discordMessage.createdTimestamp).toLocaleString();
        
        // Convert Discord formatting to HTML
        let formattedContent = content
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // Bold
            .replace(/\*(.*?)\*/g, '<i>$1</i>') // Italic
            .replace(/__(.*?)__/g, '<u>$1</u>') // Underline
            .replace(/~~(.*?)~~/g, '<s>$1</s>') // Strikethrough
            .replace(/`(.*?)`/g, '<code>$1</code>') // Inline code
            .replace(/```([\s\S]*?)```/g, '<pre>$1</pre>'); // Code blocks

        return `🔔 <b>Discord Announcement</b>\n\n${formattedContent}\n\n<i>📅 ${timestamp}</i>`;
    }

    async forwardDiscordMessage(discordMessage) {
        try {
            const formattedMessage = this.formatDiscordMessage(discordMessage);
            
            // Handle attachments (images, files)
            if (discordMessage.attachments.size > 0) {
                for (const attachment of discordMessage.attachments.values()) {
                    if (attachment.contentType && attachment.contentType.startsWith('image/')) {
                        await this.sendPhoto(attachment.url, formattedMessage);
                    } else {
                        // For non-image attachments, send as text with link
                        const messageWithFile = `${formattedMessage}\n\n📎 <a href="${attachment.url}">${attachment.name}</a>`;
                        await this.sendMessage(messageWithFile);
                    }
                }
            } else {
                await this.sendMessage(formattedMessage);
            }
        } catch (error) {
            console.error('❌ Error forwarding Discord message to Telegram:', error);
        }
    }
}

export default new TelegramService();