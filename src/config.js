require('dotenv').config();

module.exports = {
    // ... existing config
    xumm: {
        apiKey: process.env.XUMM_API_KEY,
        apiSecret: process.env.XUMM_API_SECRET
    }
};