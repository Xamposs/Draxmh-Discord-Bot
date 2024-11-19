const axios = require('axios');

const BINANCE_API = 'https://api.binance.com/api/v3';
const XRP_SYMBOL = 'XRPUSDT';

async function getXRPPrice() {
    try {
        const response = await axios.get(`${BINANCE_API}/ticker/24hr?symbol=${XRP_SYMBOL}`);
        const data = response.data;
        
        return {
            price: parseFloat(data.lastPrice),
            change24h: parseFloat(data.priceChangePercent),
            lastUpdate: new Date().toISOString()
        };
    } catch (error) {
        console.error('Price Service: Error fetching XRP price:', error);
        throw error;
    }
}

// Add retry mechanism
async function fetchWithRetry(fn, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}

module.exports = {
    getXRPPrice: () => fetchWithRetry(getXRPPrice),
};