import axios from 'axios';

export const getDRXPrice = async () => {
    const endpoints = [
        'https://api.binance.com/api/v3/ticker/price?symbol=XRPUSDT',
        'https://api.huobi.pro/market/detail/merged?symbol=xrpusdt',
        'https://api.kraken.com/0/public/Ticker?pair=XRPUSD'
    ];

    for (const endpoint of endpoints) {
        try {
            const response = await axios.get(endpoint, {
                timeout: 5000,
                retry: 3,
                retryDelay: 1000
            });
            return response.data;
        } catch (error) {
            console.log(`Price fetch error from ${endpoint}:`, error.message);
            continue;
        }
    }
    throw new Error('All price endpoints failed');
};
