import { EmbedBuilder } from 'discord.js';
import { TechnicalAnalysis } from './technicalAnalysis.js';
import { PatternRecognition } from './patternRecognition.js';
import { SentimentAnalyzer } from './sentimentAnalysis.js';
import { SignalAggregator } from './signalAggregator.js';
import { withRetry } from '../utils/networkRetry.js';

class AutomatedAnalysis {
    constructor(client) {
        this.client = client;
        this.xrpChannel = process.env.XRP_ANALYSIS_CHANNEL_ID;
        // DELETE THIS LINE:
        // this.drxChannel = process.env.DRX_ANALYSIS_CHANNEL_ID;
        this.isEnabled = true;
        this.xrpInterval = 5 * 60 * 1000; // 5 minutes in milliseconds
        this.drxInterval = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        
        this.technical = new TechnicalAnalysis();
        this.patterns = new PatternRecognition();
        this.sentiment = new SentimentAnalyzer();
        this.aggregator = new SignalAggregator();
    }

    start() {
        // Start XRP analysis every 5 minutes
        this.runXRPAnalysis();
        setInterval(() => {
            this.runXRPAnalysis();
        }, this.xrpInterval);

        // DELETE THIS ENTIRE BLOCK:
        // Start DRX analysis every 24 hours
        // this.runDRXAnalysis();
        // setInterval(() => {
        //     this.runDRXAnalysis();
        // }, this.drxInterval);
    }

    // DELETE THIS ENTIRE METHOD:
    // async runDRXAnalysis() {
    //     if (!this.isEnabled) return;
    //     const drxChannel = this.client.channels.cache.get(this.drxChannel);
    //     if (drxChannel) {
    //         const drxEmbed = await this.createAnalysisEmbed('DRX');
    //         await drxChannel.send({ embeds: [drxEmbed] });
    //     }
    // }
    async runXRPAnalysis() {
        if (!this.isEnabled) return;
        
        try {
            const xrpChannel = this.client.channels.cache.get(this.xrpChannel);
            if (xrpChannel) {
                const xrpEmbed = await this.createAnalysisEmbed('XRP');
                if (xrpEmbed) {
                    await xrpChannel.send({ embeds: [xrpEmbed] });
                }
            }
        } catch (error) {
            console.error('XRP Analysis error:', error.message);
        }
    }

    async runDRXAnalysis() {
        if (!this.isEnabled) return;
        const drxChannel = this.client.channels.cache.get(this.drxChannel);
        if (drxChannel) {
            const drxEmbed = await this.createAnalysisEmbed('DRX');
            await drxChannel.send({ embeds: [drxEmbed] });
        }
    }

    async createAnalysisEmbed(token) {
        const embed = new EmbedBuilder()
            .setTitle(`🔎 ${token} Market Analysis Report`)
            .setColor(token === 'XRP' ? '#0099ff' : '#00ff00')
            .setDescription(`In-depth analysis for ${token}`)
            .setTimestamp();

        const data = await this.getTokenData(token);

        embed.addFields([
            { name: '📊 Technical Analysis', value: this.formatTechnicalSignals(data.technical, token), inline: false },
            { name: '📈 Pattern Recognition', value: this.formatPatternSignals(data.patterns, token), inline: false },
            { name: '💭 Market Sentiment', value: this.formatSentimentSignals(data.sentiment, token), inline: false },
            { name: '🎯 Summary', value: `**${token} Signal:** ${data.recommendation}`, inline: false }
        ]);

        return embed;
    }

    formatTechnicalSignals(technical, token) {
        if (!technical) return 'No technical data available';
        return `**${token} Technical Indicators:**\n` +
            `• RSI (14): ${technical.rsi || 'N/A'}\n` +
            `• MACD Signal: ${technical.macd?.signal || 'N/A'}\n` +
            `• BB Position: ${technical.bb?.position || 'N/A'}\n` +
            `• Trend: ${technical.signal?.strength || 'N/A'}`;
    }

    formatPatternSignals(patterns, token) {
        if (!patterns) return 'No pattern data available';
        return `**${token} Chart Patterns:**\n` +
            `• Trend Direction: ${patterns.patterns?.trend?.direction || 'N/A'}\n` +
            `• Trend Strength: ${patterns.trendStrength?.strength || 'N/A'}\n` +
            `• Support Level: ${patterns.patterns?.support || 'N/A'}\n` +
            `• Resistance Level: ${patterns.patterns?.resistance || 'N/A'}`;
    }

    formatSentimentSignals(sentiment, token) {
        if (!sentiment) return 'No sentiment data available';
        return `**${token} Market Sentiment:**\n` +
            `• Overall Mood: ${sentiment.overall?.sentiment || 'N/A'}\n` +
            `• Social Score: ${sentiment.overall?.score || 'N/A'}\n` +
            `• Confidence: ${sentiment.overall?.confidence ? (sentiment.overall.confidence * 100).toFixed(2) + '%' : 'N/A'}`;
    }

    async getTokenData(token) {
        const prices = await this.getPriceData(token);
        const technical = await this.technical.analyze(prices, token);
        const patterns = await this.patterns.analyze(prices, token);
        const sentiment = await this.sentiment.analyze(token);

        return {
            technical,
            patterns,
            sentiment,
            recommendation: 'HOLD' // Default recommendation
        };
    }

    async getPriceData(token) {
        const endpoints = [
            'https://api.binance.com/api/v3/ticker/24hr?symbol=XRPUSDT',
            'https://api.kraken.com/0/public/Ticker?pair=XRPUSD',
            'https://api.huobi.pro/market/detail/merged?symbol=xrpusdt'
        ];

        for (let i = 0; i < endpoints.length; i++) {
            try {
                const response = await fetch(endpoints[i], {
                    timeout: 5000,
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                
                // Handle different API response formats
                if (endpoints[i].includes('binance')) {
                    return {
                        price: parseFloat(data.lastPrice),
                        high24h: parseFloat(data.highPrice),
                        low24h: parseFloat(data.lowPrice),
                        volume: parseFloat(data.volume)
                    };
                } else if (endpoints[i].includes('kraken')) {
                    const pair = Object.values(data.result)[0];
                    return {
                        price: parseFloat(pair.c[0]),
                        high24h: parseFloat(pair.h[0]),
                        low24h: parseFloat(pair.l[0]),
                        volume: parseFloat(pair.v[0])
                    };
                } else {
                    // Huobi format
                    return {
                        price: data.tick.close,
                        high24h: data.tick.high,
                        low24h: data.tick.low,
                        volume: data.tick.vol
                    };
                }
            } catch (error) {
                console.log(`Price fetch error from ${endpoints[i]}: ${error.message}`);
                // Continue to next endpoint if current one fails
                continue;
            }
        }

        // If all endpoints fail, return default values
        return {
            price: 0,
            high24h: 0,
            low24h: 0,
            volume: 0
        };
    }}

// At the end of automatedAnalysis.js
export { AutomatedAnalysis };

