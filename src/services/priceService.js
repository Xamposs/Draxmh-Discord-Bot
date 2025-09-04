import axios from 'axios';

// Mock DRX price service since no real DRX API is available
export const getDRXPrice = async () => {
    try {
        // Get XRP price as base reference
        const response = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=XRPUSDT', {
            timeout: 5000
        });
        
        const xrpPrice = parseFloat(response.data.price);
        
        // Mock DRX price calculation (adjust multiplier as needed)
        const drxPriceInXRP = xrpPrice * 0.000001; // Example: DRX is much smaller denomination
        
        return {
            price: drxPriceInXRP, // This MUST be a number for toFixed() to work
            currency: 'XRP',
            source: 'Sologenic DEX (simulated)',
            timestamp: Date.now(),
            change24h: (Math.random() - 0.5) * 10 // Random change percentage
        };
    } catch (error) {
        console.log('Price fetch error:', error.message);
        
        // Fallback mock data
        return {
            price: 0.000001, // Fallback price as number
            currency: 'XRP',
            source: 'Fallback data',
            timestamp: Date.now(),
            change24h: 0
        };
    }
};

// Implement getDRXMarketDepth function to provide mock orderbook data
export const getDRXMarketDepth = async () => {
    try {
        // Get XRP price as base reference
        const response = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=XRPUSDT', {
            timeout: 5000
        });
        
        const xrpPrice = parseFloat(response.data.price);
        
        // Generate mock order book data
        const basePrice = xrpPrice * 0.000001; // Base DRX price in XRP
        
        // Generate mock bids (buy orders) - slightly below current price
        const bids = [];
        for (let i = 1; i <= 10; i++) {
            const priceOffset = (Math.random() * 0.1) * i;
            const price = basePrice * (1 - priceOffset / 100);
            const amount = Math.floor(Math.random() * 10000) + 1000;
            bids.push({
                price: price.toFixed(10),
                amount: amount,
                total: (price * amount).toFixed(8),
                account: `r${Math.random().toString(36).substring(2, 10)}`
            });
        }
        
        // Generate mock asks (sell orders) - slightly above current price
        const asks = [];
        for (let i = 1; i <= 10; i++) {
            const priceOffset = (Math.random() * 0.1) * i;
            const price = basePrice * (1 + priceOffset / 100);
            const amount = Math.floor(Math.random() * 10000) + 1000;
            asks.push({
                price: price.toFixed(10),
                amount: amount,
                total: (price * amount).toFixed(8),
                account: `r${Math.random().toString(36).substring(2, 10)}`
            });
        }
        
        // Sort bids in descending order (highest buy price first)
        bids.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
        
        // Sort asks in ascending order (lowest sell price first)
        asks.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        
        return {
            bids,
            asks,
            spread: (parseFloat(asks[0].price) - parseFloat(bids[0].price)).toFixed(10),
            spreadPercentage: ((parseFloat(asks[0].price) - parseFloat(bids[0].price)) / parseFloat(bids[0].price) * 100).toFixed(4),
            timestamp: Date.now(),
            source: 'Sologenic DEX (simulated)'
        };
    } catch (error) {
        console.log('Market depth fetch error:', error.message);
        
        // Fallback mock data with empty order book
        return {
            bids: [],
            asks: [],
            spread: '0',
            spreadPercentage: '0',
            timestamp: Date.now(),
            source: 'Fallback data'
        };
    }
};
