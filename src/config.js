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
    },
    channels: {
        xrpAnalysis: '1412857950673834115',      // Orderbook visualization channel
        priceComparison: '1412858397447159869',  // Multi-exchange price comparison channel
        arbitrageAlerts: '1412858441780695244'   // Arbitrage opportunity alerts channel
    }
};