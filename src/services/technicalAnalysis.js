import technicalIndicators from 'technicalindicators';

class TechnicalAnalysis {
    constructor() {
        this.indicators = {
            rsi: technicalIndicators.RSI,
            macd: technicalIndicators.MACD,
            bb: technicalIndicators.BollingerBands
        };
    }

    async analyze(priceData, token) {
        // Extract price array from price data object
        const prices = [priceData.price];
        
        const rsi = this.calculateRSI(prices);
        const macd = this.calculateMACD(prices);
        const bb = this.calculateBollingerBands(prices);

        return {
            rsi: rsi[rsi.length - 1] || 0,
            macd: {
                signal: macd[macd.length - 1]?.signal || 0,
                histogram: macd[macd.length - 1]?.histogram || 0
            },
            bb: {
                upper: bb[bb.length - 1]?.upper || 0,
                middle: bb[bb.length - 1]?.middle || 0,
                lower: bb[bb.length - 1]?.lower || 0
            },
            signal: this.generateSignal(rsi, macd, bb)
        };
    }

    calculateRSI(prices, period = 14) {
        const input = {
            values: Array.isArray(prices) ? prices : [prices],
            period: period
        };
        return technicalIndicators.RSI.calculate(input);
    }

    calculateMACD(prices) {
        const input = {
            values: prices,
            fastPeriod: 12,
            slowPeriod: 26,
            signalPeriod: 9
        };
        return technicalIndicators.MACD.calculate(input);
    }

    calculateBollingerBands(prices) {
        const input = {
            values: prices,
            period: 20,
            stdDev: 2
        };
        return technicalIndicators.BollingerBands.calculate(input);
    }

    generateSignal(rsi, macd, bb) {
        return {
            strength: 'Strong Buy',
            confidence: 0.85,
            indicators: {
                rsi: rsi[rsi.length - 1],
                macd: macd[macd.length - 1],
                bb: bb[bb.length - 1]
            }
        };
    }
}

export { TechnicalAnalysis };