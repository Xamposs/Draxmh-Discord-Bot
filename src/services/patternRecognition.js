const technicalIndicators = require('technicalindicators');

class PatternRecognition {
    constructor() {
        this.indicators = {
            sma: technicalIndicators.SMA,
            ema: technicalIndicators.EMA
        };
    }

    async analyze(priceData) {
        const prices = [priceData.price, priceData.high24h, priceData.low24h].filter(p => p);
        
        return {
            patterns: {
                trend: this.analyzeTrend(prices),
                support: this.calculateSupport(prices),
                resistance: this.calculateResistance(prices)
            },
            trendStrength: this.calculateTrendStrength(prices)
        };
    }

    calculateSupport(prices) {
        return Math.min(...prices);
    }

    calculateResistance(prices) {
        return Math.max(...prices);
    }

    analyzeTrend(prices) {
        const input = {
            values: Array.isArray(prices) ? prices : [prices],
            period: 20
        };

        const sma20 = this.indicators.sma.calculate(input);
        const lastPrice = prices[prices.length - 1];
        
        return {
            direction: lastPrice > sma20[sma20.length - 1] ? 'Upward' : 'Downward',
            strength: Math.abs(lastPrice - sma20[sma20.length - 1]) / lastPrice || 0
        };
    }

    calculateTrendStrength(prices) {
        const trend = this.analyzeTrend(prices);
        return {
            strength: trend.strength > 0.05 ? 'Strong' : 'Weak',
            direction: trend.direction,
            confidence: 0.85
        };
    }
}

module.exports = { PatternRecognition };
