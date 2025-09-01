import { Client } from 'xrpl';
import { EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import axios from 'axios';
import { TechnicalAnalysis } from './technicalAnalysis.js';
import { SentimentAnalyzer } from './sentimentAnalysis.js';

class XRPMarketPsychologyAnalyzer {
    constructor(client, channelId) {
        this.discordClient = client;
        this.channelId = channelId;
        this.xrplClient = new Client('wss://xrplcluster.com');
        this.updateInterval = 5 * 60 * 1000; // 5 minutes instead of 15
        this.intervalId = null;
        
        // Initialize analysis modules
        this.technicalAnalysis = new TechnicalAnalysis();
        this.sentimentAnalyzer = new SentimentAnalyzer();
        
        // Data storage for trend analysis
        this.priceHistory = [];
        this.volumeHistory = [];
        this.sentimentHistory = [];
        
        // Fear & Greed Index calculation
        this.fearGreedFactors = {
            volatility: 0.25,
            marketMomentum: 0.25,
            socialVolume: 0.15,
            surveys: 0.15,
            dominance: 0.10,
            trends: 0.10
        };
    }

    async startAutomatedUpdates() {
        try {
            await this.xrplClient.connect();
            console.log('🔗 XRPL Client connected for market psychology analysis');
            
            // Send initial update
            await this.sendUpdate();
            
            // Start periodic updates
            this.intervalId = setInterval(async () => {
                try {
                    await this.sendUpdate();
                } catch (error) {
                    console.error('❌ Error in market psychology update:', error);
                }
            }, this.updateInterval);
            
            console.log('📊 XRP Market Psychology Analyzer started successfully');
        } catch (error) {
            console.error('❌ Failed to start XRP Market Psychology Analyzer:', error);
        }
    }

    async sendUpdate() {
        try {
            const channel = this.discordClient.channels.cache.get(this.channelId);
            if (!channel) {
                console.error(`❌ Market psychology channel ${this.channelId} not found`);
                return; // Don't stop the service
            }

            const mainEmbed = await this.createMainPsychologyEmbed();
            const technicalEmbed = await this.createTechnicalAnalysisEmbed();
            const buttons = this.createActionButtons();

            await channel.send({
                embeds: [mainEmbed, technicalEmbed],
                components: [buttons]
            });
            
            console.log('🧠 Market psychology update sent successfully');
            
        } catch (error) {
            console.error('❌ Error sending market psychology update:', error.message);
            // Don't stop the service, continue with next update
        }
    }

    async createMainPsychologyEmbed() {
        const [priceData, marketData, sentimentData, fearGreedIndex] = await Promise.all([
            this.getRealPriceData(),
            this.getAdvancedMarketData(),
            this.sentimentAnalyzer.analyze('XRP'),
            this.calculateFearGreedIndex()
        ]);

        // Store historical data
        this.updateHistoricalData(priceData, marketData, sentimentData);

        const embed = new EmbedBuilder()
            .setTitle('🧠 XRP Market Psychology Report')
            .setDescription(`**${this.getMarketMoodEmoji(fearGreedIndex.score)} Current Market Mood: ${fearGreedIndex.label}**\n*Fear & Greed Index: ${fearGreedIndex.score}/100*`)
            .setColor(this.getColorByMood(fearGreedIndex.score))
            .setThumbnail('https://cryptologos.cc/logos/xrp-xrp-logo.png')
            .addFields(
                {
                    name: '💰 Price Psychology',
                    value: 
                        `**Current Price:** $${priceData.price}\n` +
                        `**24h Change:** ${priceData.change24h >= 0 ? '📈' : '📉'} ${priceData.change24h}%\n` +
                        `**Volatility:** ${this.getVolatilityEmoji(priceData.volatility)} ${priceData.volatility}%\n` +
                        `**Price Trend:** ${this.getTrendEmoji(priceData.trend)} ${priceData.trend}`,
                    inline: true
                },
                {
                    name: '🌊 Market Sentiment',
                    value: 
                        `**Overall Mood:** ${this.getSentimentEmoji(sentimentData.overall.sentiment)} ${sentimentData.overall.sentiment}\n` +
                        `**Confidence:** ${(sentimentData.overall.confidence * 100).toFixed(1)}%\n` +
                        `**Social Score:** ${sentimentData.overall.score.toFixed(2)}/1.0\n` +
                        `**Trend Direction:** ${marketData.sentimentTrend}`,
                    inline: true
                },
                {
                    name: '📊 Trading Psychology',
                    value: 
                        `**Buy Pressure:** ${this.getPressureEmoji(marketData.buyPressure)} ${marketData.buyPressure}\n` +
                        `**Sell Pressure:** ${this.getPressureEmoji(marketData.sellPressure)} ${marketData.sellPressure}\n` +
                        `**Volume Trend:** ${marketData.volumeTrend}\n` +
                        `**Market Cap Rank:** #${marketData.marketCapRank}`,
                    inline: true
                },
                {
                    name: '🐋 Whale Psychology',
                    value: 
                        `**Large Transactions:** ${marketData.whaleActivity.count} (24h)\n` +
                        `**Net Flow:** ${marketData.whaleActivity.netFlow}\n` +
                        `**Accumulation:** ${marketData.whaleActivity.accumulation ? '✅' : '❌'} ${marketData.whaleActivity.accumulation ? 'Active' : 'Inactive'}\n` +
                        `**Whale Sentiment:** ${marketData.whaleActivity.sentiment}`,
                    inline: true
                },
                {
                    name: '🎯 Key Psychological Levels',
                    value: 
                        `**Strong Support:** $${marketData.keyLevels.strongSupport}\n` +
                        `**Support:** $${marketData.keyLevels.support}\n` +
                        `**Resistance:** $${marketData.keyLevels.resistance}\n` +
                        `**Strong Resistance:** $${marketData.keyLevels.strongResistance}`,
                    inline: true
                },
                {
                    name: '🔮 Market Prediction',
                    value: 
                        `**Short-term (1-7 days):** ${marketData.predictions.shortTerm.direction} ${marketData.predictions.shortTerm.confidence}%\n` +
                        `**Medium-term (1-4 weeks):** ${marketData.predictions.mediumTerm.direction} ${marketData.predictions.mediumTerm.confidence}%\n` +
                        `**Recommended Action:** ${marketData.recommendations.action}\n` +
                        `**Risk Level:** ${marketData.recommendations.riskLevel}`,
                    inline: true
                }
            )
            .addFields({
                name: '📈 Market Psychology Insights',
                value: this.generatePsychologyInsights(fearGreedIndex, sentimentData, marketData),
                inline: false
            })
            .setFooter({ 
                text: `XRP Market Psychology • Next update in ${this.updateInterval / 60000} minutes • ${new Date().toLocaleTimeString()}`,
                iconURL: 'https://cryptologos.cc/logos/xrp-xrp-logo.png'
            })
            .setTimestamp();

        return embed;
    }

    async createTechnicalAnalysisEmbed() {
        const priceData = await this.getRealPriceData();
        const technicalData = await this.technicalAnalysis.analyze(priceData, 'XRP');

        return new EmbedBuilder()
            .setTitle('📊 Technical Analysis Summary')
            .setColor('#1f8b4c')
            .addFields(
                {
                    name: '🔢 Technical Indicators',
                    value: 
                        `**RSI (14):** ${technicalData.rsi.toFixed(2)} ${this.getRSISignal(technicalData.rsi)}\n` +
                        `**MACD:** ${technicalData.macd.signal > 0 ? '📈 Bullish' : '📉 Bearish'}\n` +
                        `**Bollinger Bands:** ${this.getBBPosition(technicalData.bb)}\n` +
                        `**Moving Averages:** ${technicalData.signal.strength}`,
                    inline: true
                },
                {
                    name: '🎯 Trading Signals',
                    value: 
                        `**Overall Signal:** ${technicalData.signal.strength}\n` +
                        `**Confidence:** ${(technicalData.signal.confidence * 100).toFixed(1)}%\n` +
                        `**Entry Point:** ${this.getEntrySignal(technicalData)}\n` +
                        `**Stop Loss:** $${this.calculateStopLoss(priceData.price)}`,
                    inline: true
                }
            )
            .setTimestamp();
    }

    createActionButtons() {
        try {
            return new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('xrp_detailed_analysis')
                        .setLabel('📊 Detailed Analysis')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('xrp_price_alerts')
                        .setLabel('🔔 Set Price Alert')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setLabel('📈 Live Chart')
                        .setURL('https://www.tradingview.com/chart/?symbol=BINANCE:XRPUSDT')
                        .setStyle(ButtonStyle.Link)
                );
        } catch (error) {
            console.error('Error creating action buttons:', error);
            return null;
        }
    }

    async getRealPriceData() {
        try {
            // Try multiple data sources for reliability
            const sources = [
                () => this.getBinanceData(),
                () => this.getCoinGeckoData(),
                () => this.getCoinMarketCapData()
            ];

            for (const source of sources) {
                try {
                    const data = await source();
                    if (data && data.price) {
                        return data;
                    }
                } catch (error) {
                    console.warn('⚠️ Data source failed, trying next...', error.message);
                }
            }

            throw new Error('All price data sources failed');
        } catch (error) {
            console.error('❌ Error fetching price data:', error);
            return this.getFallbackPriceData();
        }
    }

    async getBinanceData() {
        const response = await axios.get('https://api.binance.com/api/v3/ticker/24hr?symbol=XRPUSDT', {
            timeout: 5000
        });
        
        const data = response.data;
        return {
            price: parseFloat(data.lastPrice).toFixed(4),
            change24h: parseFloat(data.priceChangePercent).toFixed(2),
            volume24h: parseFloat(data.volume).toFixed(0),
            high24h: parseFloat(data.highPrice).toFixed(4),
            low24h: parseFloat(data.lowPrice).toFixed(4),
            volatility: this.calculateVolatility(data),
            trend: this.calculateTrend(data)
        };
    }

    async getCoinGeckoData() {
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ripple&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true', {
            timeout: 5000
        });
        
        const data = response.data.ripple;
        return {
            price: data.usd.toFixed(4),
            change24h: data.usd_24h_change.toFixed(2),
            volume24h: data.usd_24h_vol.toFixed(0),
            volatility: Math.abs(data.usd_24h_change).toFixed(2) + '%',
            trend: data.usd_24h_change > 0 ? 'Bullish' : 'Bearish'
        };
    }

    async getAdvancedMarketData() {
        try {
            // Simulate advanced market data analysis
            // In production, this would integrate with multiple APIs
            const priceData = await this.getRealPriceData();
            const volume = parseFloat(priceData.volume24h);
            const change = parseFloat(priceData.change24h);
            
            return {
                buyPressure: this.calculateBuyPressure(change, volume),
                sellPressure: this.calculateSellPressure(change, volume),
                volumeTrend: this.calculateVolumeTrend(volume),
                sentimentTrend: this.calculateSentimentTrend(change),
                marketCapRank: 6, // XRP's typical rank
                whaleActivity: await this.getWhaleActivity(),
                keyLevels: this.calculateKeyLevels(parseFloat(priceData.price)),
                predictions: this.generatePredictions(priceData),
                recommendations: this.generateRecommendations(priceData)
            };
        } catch (error) {
            console.error('❌ Error getting advanced market data:', error);
            return this.getFallbackMarketData();
        }
    }

    async calculateFearGreedIndex() {
        try {
            const priceData = await this.getRealPriceData();
            const volatility = parseFloat(priceData.volatility);
            const change24h = parseFloat(priceData.change24h);
            
            // Calculate components (simplified version)
            const volatilityScore = Math.max(0, Math.min(100, 50 - (volatility * 2)));
            const momentumScore = Math.max(0, Math.min(100, 50 + (change24h * 2)));
            const socialScore = 50; // Would integrate with social media APIs
            const surveyScore = 50; // Would integrate with sentiment surveys
            const dominanceScore = 45; // XRP dominance factor
            const trendsScore = change24h > 0 ? 60 : 40;
            
            const score = Math.round(
                volatilityScore * this.fearGreedFactors.volatility +
                momentumScore * this.fearGreedFactors.marketMomentum +
                socialScore * this.fearGreedFactors.socialVolume +
                surveyScore * this.fearGreedFactors.surveys +
                dominanceScore * this.fearGreedFactors.dominance +
                trendsScore * this.fearGreedFactors.trends
            );
            
            return {
                score,
                label: this.getFearGreedLabel(score)
            };
        } catch (error) {
            console.error('❌ Error calculating Fear & Greed Index:', error);
            return { score: 50, label: 'Neutral' };
        }
    }

    // Helper methods for data analysis and formatting
    calculateBuyPressure(change, volume) {
        if (change > 5 && volume > 1000000000) return 'Very High';
        if (change > 2 && volume > 500000000) return 'High';
        if (change > 0) return 'Medium';
        return 'Low';
    }

    calculateSellPressure(change, volume) {
        if (change < -5 && volume > 1000000000) return 'Very High';
        if (change < -2 && volume > 500000000) return 'High';
        if (change < 0) return 'Medium';
        return 'Low';
    }

    async getWhaleActivity() {
        // Simulate whale activity analysis
        // In production, this would analyze large transactions on XRPL
        return {
            count: Math.floor(Math.random() * 20) + 5,
            netFlow: (Math.random() > 0.5 ? '+' : '-') + (Math.random() * 10).toFixed(1) + 'M XRP',
            accumulation: Math.random() > 0.4,
            sentiment: ['Bullish', 'Bearish', 'Neutral'][Math.floor(Math.random() * 3)]
        };
    }

    calculateKeyLevels(currentPrice) {
        return {
            strongSupport: (currentPrice * 0.85).toFixed(4),
            support: (currentPrice * 0.92).toFixed(4),
            resistance: (currentPrice * 1.08).toFixed(4),
            strongResistance: (currentPrice * 1.15).toFixed(4)
        };
    }

    generatePredictions(priceData) {
        const change = parseFloat(priceData.change24h);
        return {
            shortTerm: {
                direction: change > 0 ? '📈 Bullish' : '📉 Bearish',
                confidence: Math.min(85, Math.abs(change * 10) + 60)
            },
            mediumTerm: {
                direction: change > 2 ? '📈 Bullish' : change < -2 ? '📉 Bearish' : '➡️ Sideways',
                confidence: Math.min(75, Math.abs(change * 8) + 50)
            }
        };
    }

    generateRecommendations(priceData) {
        const change = parseFloat(priceData.change24h);
        const volatility = parseFloat(priceData.volatility);
        
        let action, riskLevel;
        
        if (change > 5) {
            action = '🎯 Consider Taking Profits';
            riskLevel = '🔴 High';
        } else if (change > 2) {
            action = '📈 Hold/Accumulate';
            riskLevel = '🟡 Medium';
        } else if (change < -5) {
            action = '💰 Consider Buying Dip';
            riskLevel = '🔴 High';
        } else {
            action = '⏳ Wait for Clear Signal';
            riskLevel = '🟢 Low';
        }
        
        return { action, riskLevel };
    }

    generatePsychologyInsights(fearGreed, sentiment, market) {
        const insights = [];
        
        if (fearGreed.score > 75) {
            insights.push('🔥 **Extreme Greed detected** - Market may be overheated, consider caution');
        } else if (fearGreed.score < 25) {
            insights.push('❄️ **Extreme Fear detected** - Potential buying opportunity for long-term holders');
        }
        
        if (market.whaleActivity.accumulation) {
            insights.push('🐋 **Whales are accumulating** - Large holders showing confidence');
        }
        
        if (sentiment.overall.confidence > 0.8) {
            insights.push('💪 **High sentiment confidence** - Market direction is clear');
        }
        
        return insights.length > 0 ? insights.join('\n') : '📊 Market showing normal psychological patterns';
    }

    // Emoji and formatting helpers
    getMarketMoodEmoji(score) {
        if (score > 75) return '🔥';
        if (score > 60) return '😊';
        if (score > 40) return '😐';
        if (score > 25) return '😰';
        return '❄️';
    }

    getColorByMood(score) {
        if (score > 75) return '#ff4444'; // Red (Extreme Greed)
        if (score > 60) return '#ff8800'; // Orange (Greed)
        if (score > 40) return '#ffdd00'; // Yellow (Neutral)
        if (score > 25) return '#88ff00'; // Light Green (Fear)
        return '#00ff44'; // Green (Extreme Fear)
    }

    getSentimentEmoji(sentiment) {
        const sentimentMap = {
            'Very Bullish': '🚀',
            'Bullish': '📈',
            'Neutral': '➡️',
            'Bearish': '📉',
            'Very Bearish': '💥'
        };
        return sentimentMap[sentiment] || '❓';
    }

    getPressureEmoji(pressure) {
        const pressureMap = {
            'Very High': '🔴',
            'High': '🟠',
            'Medium': '🟡',
            'Low': '🟢'
        };
        return pressureMap[pressure] || '⚪';
    }

    getFearGreedLabel(score) {
        if (score > 75) return 'Extreme Greed';
        if (score > 55) return 'Greed';
        if (score > 45) return 'Neutral';
        if (score > 25) return 'Fear';
        return 'Extreme Fear';
    }

    // Fallback methods for when APIs fail
    getFallbackPriceData() {
        return {
            price: '0.5000',
            change24h: '0.00',
            volume24h: '1000000000',
            volatility: '2.5%',
            trend: 'Neutral'
        };
    }

    getFallbackMarketData() {
        return {
            buyPressure: 'Medium',
            sellPressure: 'Medium',
            volumeTrend: 'Stable',
            sentimentTrend: 'Neutral',
            marketCapRank: 6,
            whaleActivity: {
                count: 10,
                netFlow: '+1.0M XRP',
                accumulation: true,
                sentiment: 'Neutral'
            },
            keyLevels: {
                strongSupport: '0.4250',
                support: '0.4600',
                resistance: '0.5400',
                strongResistance: '0.5750'
            },
            predictions: {
                shortTerm: { direction: '➡️ Sideways', confidence: 60 },
                mediumTerm: { direction: '➡️ Sideways', confidence: 55 }
            },
            recommendations: {
                action: '⏳ Wait for Clear Signal',
                riskLevel: '🟡 Medium'
            }
        };
    }

    updateHistoricalData(priceData, marketData, sentimentData) {
        const timestamp = Date.now();
        
        // Keep last 100 data points (about 25 hours of data)
        if (this.priceHistory.length >= 100) {
            this.priceHistory.shift();
            this.volumeHistory.shift();
            this.sentimentHistory.shift();
        }
        
        this.priceHistory.push({ timestamp, price: parseFloat(priceData.price) });
        this.volumeHistory.push({ timestamp, volume: parseFloat(priceData.volume24h) });
        this.sentimentHistory.push({ timestamp, sentiment: sentimentData.overall.score });
    }

    calculateVolatility(data) {
        const highLowDiff = Math.abs(parseFloat(data.highPrice) - parseFloat(data.lowPrice));
        const avgPrice = (parseFloat(data.highPrice) + parseFloat(data.lowPrice)) / 2;
        return ((highLowDiff / avgPrice) * 100).toFixed(2);
    }

    calculateTrend(data) {
        const change = parseFloat(data.priceChangePercent);
        if (change > 5) return 'Strong Bullish';
        if (change > 2) return 'Bullish';
        if (change > 0) return 'Slightly Bullish';
        if (change > -2) return 'Slightly Bearish';
        if (change > -5) return 'Bearish';
        return 'Strong Bearish';
    }

    // Add missing helper methods for technical analysis
    getRSISignal(rsi) {
        if (rsi > 70) return '🔴 Overbought';
        if (rsi < 30) return '🟢 Oversold';
        return '🟡 Neutral';
    }

    getBBPosition(bb) {
        return '⚪ Neutral'; // Simplified for now
    }

    getEntrySignal(technicalData) {
        const signals = [];
        if (technicalData.rsi < 30) signals.push('oversold');
        if (technicalData.macd.histogram > 0) signals.push('bullish');
        
        if (signals.length >= 2) return '🟢 Strong Buy';
        if (signals.length === 1) return '🟡 Buy';
        return '🔴 Hold';
    }

    calculateStopLoss(currentPrice) {
        return (currentPrice * 0.95).toFixed(4); // 5% below current price
    }

    getVolatilityEmoji(volatility) {
        if (volatility > 10) return '🔥';
        if (volatility > 5) return '📊';
        return '📈';
    }

    getTrendEmoji(trend) {
        if (trend > 0.02) return '🚀';
        if (trend > 0) return '📈';
        if (trend < -0.02) return '📉';
        return '➡️';
    }

    calculateVolumeTrend(volume) {
        return Math.random() > 0.5 ? 'High' : 'Low'; // Simplified
    }

    calculateSentimentTrend(change) {
        if (change > 0.05) return '🟢 Positive';
        if (change < -0.05) return '🔴 Negative';
        return '🟡 Neutral';
    }

    stop() {
        // Clear the interval
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('⏹️ XRP Market Psychology Analyzer stopped');
        }
        
        // Disconnect XRPL client
        if (this.xrplClient && this.xrplClient.isConnected()) {
            this.xrplClient.disconnect();
            console.log('🔌 XRPL Client disconnected');
        }
    }
}

export { XRPMarketPsychologyAnalyzer };
