import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config.js';

class TelegramService {
    constructor() {
        this.bot = new TelegramBot(config.telegram.botToken, { 
            polling: false,
            request: {
                agentOptions: {
                    keepAlive: true,
                    family: 4
                },
                timeout: 30000 // 30 second timeout
            }
        });
        this.channelId = config.telegram.channelId;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 30000; // 30 seconds
        this.healthCheckInterval = null;
        this.lastConnectionAttempt = null;
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Telegram service...');
        console.log(`📋 Bot Token: ${config.telegram.botToken ? 'Present' : 'Missing'}`);
        console.log(`📋 Channel ID: ${this.channelId}`);
        await this.connect();
        this.startHealthCheck();
    }

    async connect(attempt = 1) {
        this.lastConnectionAttempt = new Date();
        try {
            console.log(`🔄 Attempting to connect to Telegram (attempt ${attempt}/${this.maxReconnectAttempts})...`);
            console.log(`⏰ Connection attempt at: ${this.lastConnectionAttempt.toISOString()}`);
            
            // Set a timeout for the connection attempt
            const connectionPromise = this.bot.getMe();
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Connection timeout after 30 seconds')), 30000)
            );
            
            const botInfo = await Promise.race([connectionPromise, timeoutPromise]);
            
            console.log(`✅ Telegram Bot connected: @${botInfo.username}`);
            console.log(`📊 Bot ID: ${botInfo.id}`);
            console.log(`🔧 Can join groups: ${botInfo.can_join_groups}`);
            console.log(`💬 Can read all group messages: ${botInfo.can_read_all_group_messages}`);
            
            this.isConnected = true;
            this.reconnectAttempts = 0;
            return true;
        } catch (error) {
            console.error(`❌ Failed to connect to Telegram (attempt ${attempt}):`, error.message);
            console.error(`🔍 Error type: ${error.constructor.name}`);
            console.error(`📍 Error code: ${error.code || 'N/A'}`);
            
            this.isConnected = false;
            
            if (attempt < this.maxReconnectAttempts) {
                const delay = this.reconnectDelay * Math.pow(2, attempt - 1); // Exponential backoff
                console.log(`⏳ Retrying Telegram connection in ${delay/1000} seconds...`);
                setTimeout(() => this.connect(attempt + 1), delay);
            } else {
                console.error('💥 Max Telegram reconnection attempts reached. Will retry in 5 minutes.');
                console.error(`🕐 Next retry scheduled for: ${new Date(Date.now() + 300000).toISOString()}`);
                setTimeout(() => this.connect(1), 300000); // Retry after 5 minutes
            }
            return false;
        }
    }

    startHealthCheck() {
        console.log('💓 Starting Telegram health check (every 2 minutes)...');
        // Check connection every 2 minutes
        this.healthCheckInterval = setInterval(async () => {
            if (this.isConnected) {
                try {
                    console.log('🔍 Performing Telegram health check...');
                    await this.bot.getMe();
                    console.log('✅ Telegram health check passed');
                } catch (error) {
                    console.warn('⚠️ Telegram health check failed, attempting reconnection...');
                    console.warn(`🔍 Health check error: ${error.message}`);
                    this.isConnected = false;
                    this.connect(1);
                }
            } else {
                console.log('⚠️ Telegram not connected during health check');
                const timeSinceLastAttempt = this.lastConnectionAttempt ? 
                    Date.now() - this.lastConnectionAttempt.getTime() : 0;
                console.log(`⏰ Time since last connection attempt: ${Math.floor(timeSinceLastAttempt/1000)} seconds`);
            }
        }, 120000);
    }

    async sendMessage(text, options = {}) {
        if (!this.isConnected) {
            console.warn('⚠️ Telegram bot not connected, skipping message');
            console.warn(`📝 Message content: ${text.substring(0, 100)}...`);
            return null;
        }

        return await this.retryOperation(async () => {
            console.log('📤 Sending message to Telegram...');
            const message = await this.bot.sendMessage(this.channelId, text, {
                parse_mode: 'HTML',
                disable_web_page_preview: false,
                ...options
            });
            console.log('✅ Message sent to Telegram successfully');
            console.log(`📊 Message ID: ${message.message_id}`);
            return message;
        });
    }

    async sendPhoto(photo, caption = '', options = {}) {
        if (!this.isConnected) {
            console.warn('⚠️ Telegram bot not connected, skipping photo');
            return null;
        }

        return await this.retryOperation(async () => {
            console.log('📷 Sending photo to Telegram...');
            const message = await this.bot.sendPhoto(this.channelId, photo, {
                caption,
                parse_mode: 'HTML',
                ...options
            });
            console.log('✅ Photo sent to Telegram successfully');
            console.log(`📊 Message ID: ${message.message_id}`);
            return message;
        });
    }

    async retryOperation(operation, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 Telegram operation attempt ${attempt}/${maxRetries}`);
                return await operation();
            } catch (error) {
                console.error(`❌ Telegram operation failed (attempt ${attempt}/${maxRetries}):`, error.message);
                console.error(`🔍 Error details: ${JSON.stringify(error, null, 2)}`);
                
                // Handle specific error types
                if (error.message.includes('504') || error.message.includes('Gateway Timeout')) {
                    if (attempt < maxRetries) {
                        const delay = 5000 * attempt; // 5s, 10s, 15s delays
                        console.log(`⏳ Retrying in ${delay/1000} seconds due to gateway timeout...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }
                }
                
                // If connection-related error, trigger reconnection
                if (error.message.includes('ETELEGRAM') || error.message.includes('network') || error.message.includes('timeout')) {
                    console.warn('🔌 Connection-related error detected, triggering reconnection...');
                    this.isConnected = false;
                    this.connect(1);
                }
                
                if (attempt === maxRetries) {
                    console.error('💥 All Telegram retry attempts failed');
                    return null;
                }
            }
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
            console.log(`📨 Forwarding Discord message from #${discordMessage.channel.name}`);
            console.log(`👤 Author: ${discordMessage.author.username}`);
            console.log(`📝 Content length: ${discordMessage.content.length} characters`);
            console.log(`📎 Attachments: ${discordMessage.attachments.size}`);
            
            const formattedMessage = this.formatDiscordMessage(discordMessage);
            
            // Handle attachments (images, files)
            if (discordMessage.attachments.size > 0) {
                for (const attachment of discordMessage.attachments.values()) {
                    console.log(`📎 Processing attachment: ${attachment.name} (${attachment.contentType})`);
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
            
            console.log('✅ Discord message forwarded to Telegram successfully');
        } catch (error) {
            console.error('❌ Error forwarding Discord message to Telegram:', error);
            console.error(`🔍 Error stack: ${error.stack}`);
        }
    }

    shutdown() {
        console.log('🛑 Shutting down Telegram service...');
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            console.log('✅ Health check interval cleared');
        }
    }
}

export default new TelegramService();