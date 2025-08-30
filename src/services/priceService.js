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
