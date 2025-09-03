import dotenv from 'dotenv';
dotenv.config();

export const config = {
    xumm: {
        apiKey: process.env.XUMM_API_KEY,
        apiSecret: process.env.XUMM_API_SECRET
    },
    telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        channelId: '-1003046663767',
        botUsername: 'draxmh_bridge_bot'
    },
    discord: {
        announcementChannelNames: ['announcements', 'announcement', 'news', 'updates'],
        announcementChannelIds: ['1252207995882831872'] // Add your specific channel ID here
    }
};