class SignalAggregator {
    constructor() {
        this.weights = {
            technical: 0.4,
            pattern: 0.3,
            sentiment: 0.3
        };
    }

    async aggregate(technical, pattern, sentiment) {
        const technicalScore = this.calculateTechnicalScore(technical);
        const patternScore = this.calculatePatternScore(pattern);
        const sentimentScore = sentiment.overall.score;

        const totalScore = (
            technicalScore * this.weights.technical +
            patternScore * this.weights.pattern +
            sentimentScore * this.weights.sentiment
        );

        return {
            score: totalScore,
            signal: this.getSignalType(totalScore),
            confidence: this.calculateConfidence(technical, pattern, sentiment),
            components: {
                technical: technicalScore,
                pattern: patternScore,
                sentiment: sentimentScore
            }
        };
    }

    calculateTechnicalScore(technical) {
        return (technical.rsi + technical.macd.histogram + technical.bb.middle) / 3;
    }

    calculatePatternScore(pattern) {
        return pattern.trendStrength.confidence * (pattern.trendStrength.direction === 'Upward' ? 1 : -1);
    }

    getSignalType(score) {
        if (score > 0.7) return 'Strong Buy';
        if (score > 0.3) return 'Buy';
        if (score < -0.7) return 'Strong Sell';
        if (score < -0.3) return 'Sell';
        return 'Neutral';
    }

    calculateConfidence(technical, pattern, sentiment) {
        return (technical.confidence + pattern.trendStrength.confidence + sentiment.overall.confidence) / 3;
    }
}

module.exports = { SignalAggregator };
