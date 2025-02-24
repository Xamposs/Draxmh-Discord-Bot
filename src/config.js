import dotenv from 'dotenv';
dotenv.config();

export const config = {
    xumm: {
        apiKey: process.env.XUMM_API_KEY,
        apiSecret: process.env.XUMM_API_SECRET
    }
};