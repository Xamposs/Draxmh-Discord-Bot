const { Client } = require('xrpl');
const { EmbedBuilder } = require('discord.js');
const axios = require('axios');

class XRPMarketPsychologyAnalyzer {
    constructor(client, channelId) {
        this.discordClient = client;
        this.channelId = channelId;
        this.xrplClient = new Client('wss://xrplcluster.com', {
            connectionTimeout: 20000,
            timeout: 20000,
            maxRetries: 3,
            failoverURIs: [
                'wss://s1.ripple.com',
                'wss://s2.ripple.com',
                'wss://xrplcluster.com'
            ]
        });
        this.updateInterval = 12 * 60 * 60 * 1000; // 12 hours
        console.log('XRP Market Psychology Analyzer initialized with channel:', channelId);
    }

    startAutomatedUpdates = async () => {
        console.log('Starting XRP Market Psychology updates...');
        await this.xrplClient.connect();
        
        this.sendUpdate(); // Initial update
        setInterval(() => this.sendUpdate(), this.updateInterval);
    }

    async sendUpdate() {
        const channel = this.discordClient.channels.cache.get(this.channelId);
        if (channel) {
            const embed = await this.createMarketPsychologyEmbed();
            await channel.send({ embeds: [embed] });
        }
    }

    async createMarketPsychologyEmbed() {
        try {
            const [priceData, marketData] = await Promise.all([
                this.getPriceData(),
                this.getMarketData()
            ]);

            return new EmbedBuilder()
                .setTitle('🧠 XRP Market Psychology Report')
                .setColor('#0099ff')
                .addFields(
                    {
                        name: '📊 Market Sentiment',
                        value: `• Buy Pressure: ${marketData.buyPressure}\n• Sell Pressure: ${marketData.sellPressure}\n• Overall: ${marketData.sentiment}`,
                        inline: false
                    },
                    {
                        name: '💹 Price Action',
                        value: `• Current: ${priceData.price}\n• 24h Change: ${priceData.change24h}%\n• Volatility: ${priceData.volatility}`,
                        inline: false
                    },
                    {
                        name: '🌊 Market Flow',
                        value: `• Volume: ${marketData.volume24h}\n• Trend: ${marketData.trend}\n• Momentum: ${marketData.momentum}`,
                        inline: false
                    },
                    {
                        name: '🐋 Whale Activity',
                        value: `• Large Transactions: ${marketData.whaleTransactions}\n• Net Flow: ${marketData.whaleNetFlow}\n• Accumulation: ${marketData.accumulation}`,
                        inline: false
                    }
                )
                .setTimestamp()
                .setFooter({ text: 'XRP Market Psychology • Updates every 12 hours' });
        } catch (error) {
            console.error('Error creating market psychology embed:', error);
            throw error;
        }
    }

    async getPriceData() {
        const response = await axios.get('https://api.binance.com/api/v3/ticker/24hr?symbol=XRPUSDT');
        return {
            price: parseFloat(response.data.lastPrice).toFixed(4),
            change24h: parseFloat(response.data.priceChangePercent).toFixed(2),
            volatility: this.calculateVolatility(response.data)
        };
    }

    async getMarketData() {
        // Simulated data for now
        return {
            buyPressure: 'High',
            sellPressure: 'Medium',
            sentiment: 'Bullish',
            volume24h: '1.2B',
            trend: 'Upward',
            momentum: 'Strong',
            whaleTransactions: '12 in last 24h',
            whaleNetFlow: '+2.5M XRP',
            accumulation: 'Yes'
        };
    }

    calculateVolatility(data) {
        const highLowDiff = Math.abs(parseFloat(data.highPrice) - parseFloat(data.lowPrice));
        const avgPrice = (parseFloat(data.highPrice) + parseFloat(data.lowPrice)) / 2;
        return ((highLowDiff / avgPrice) * 100).toFixed(2) + '%';
    }

    stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        if (this.xrplClient) {
            this.xrplClient.disconnect();
        }
    }
}

module.exports = { XRPMarketPsychologyAnalyzer };
