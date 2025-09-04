import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import axios from 'axios';

class MultiExchangePriceService {
    constructor(client, channelId) {
        this.discordClient = client;
        this.channelId = channelId;
        this.updateInterval = 10 * 60 * 1000; // 10 minutes
        this.intervalId = null;
        
        // Exchange configuration
        this.exchanges = [
            { name: 'Binance', symbol: 'XRPUSDT', api: 'binance' },
            { name: 'Coinbase', symbol: 'XRP-USD', api: 'coinbase' },
            { name: 'Kraken', symbol: 'XRPUSD', api: 'kraken' },
            { name: 'Bitstamp', symbol: 'xrpusd', api: 'bitstamp' },
            { name: 'KuCoin', symbol: 'XRP-USDT', api: 'kucoin' }
        ];
        
        this.priceHistory = [];
    }

    async startAutomatedUpdates() {
        try {
            console.log('🔗 Starting Multi-Exchange Price Comparison Service');
            
            // Send initial update
            await this.sendUpdate();
            
            // Start periodic updates
            this.intervalId = setInterval(async () => {
                try {
                    await this.sendUpdate();
                    console.log(`💱 Multi-Exchange Price update sent at ${new Date().toISOString()}`);
                } catch (error) {
                    console.error('❌ Error in Multi-Exchange Price update:', error);
                }
            }, this.updateInterval);
            
            console.log('💱 Multi-Exchange Price Comparison Service started successfully');
        } catch (error) {
            console.error('❌ Failed to start Multi-Exchange Price Comparison Service:', error);
        }
    }

    async sendUpdate() {
        try {
            const channel = this.discordClient.channels.cache.get(this.channelId);
            if (!channel) {
                console.error('❌ Multi-Exchange Price channel not found:', this.channelId);
                return;
            }

            const [priceEmbed, analysisEmbed] = await Promise.all([
                this.createPriceComparisonEmbed(),
                this.createPriceAnalysisEmbed()
            ]);

            const messageOptions = { embeds: [priceEmbed, analysisEmbed] };

            await channel.send(messageOptions);
        } catch (error) {
            console.error('❌ Error sending Multi-Exchange Price update:', error);
        }
    }

    async createPriceComparisonEmbed() {
        try {
            const exchangePrices = await this.fetchAllExchangePrices();
            
            const embed = new EmbedBuilder()
                .setTitle('💱 Multi-Exchange XRP Price Comparison')
                .setColor('#ffa500')
                .setTimestamp()
                .setFooter({ text: 'Multi-Exchange Comparison • Updates every 10 minutes' });

            // Sort exchanges by price
            const sortedPrices = exchangePrices
                .filter(ex => ex.price > 0)
                .sort((a, b) => b.price - a.price);

            if (sortedPrices.length === 0) {
                embed.setDescription('❌ Unable to fetch price data from exchanges');
                return embed;
            }

            const highestPrice = sortedPrices[0].price;
            const lowestPrice = sortedPrices[sortedPrices.length - 1].price;
            const avgPrice = sortedPrices.reduce((sum, ex) => sum + ex.price, 0) / sortedPrices.length;
            const priceSpread = ((highestPrice - lowestPrice) / avgPrice * 100).toFixed(2);

            let priceText = '';
            sortedPrices.forEach((exchange, index) => {
                const priceIcon = index === 0 ? '🟢' : index === sortedPrices.length - 1 ? '🔴' : '🟡';
                const volumeBar = '█'.repeat(Math.floor(exchange.volume / 1000000));
                const changeIcon = exchange.change >= 0 ? '📈' : '📉';
                
                priceText += `${priceIcon} **${exchange.name}**\n`;
                priceText += `\`$${exchange.price.toFixed(4)}\` ${changeIcon} ${exchange.change >= 0 ? '+' : ''}${exchange.change.toFixed(2)}%\n`;
                priceText += `Vol: ${exchange.volume.toLocaleString()} ${volumeBar}\n\n`;
            });

            embed.addFields(
                { 
                    name: '📊 Exchange Prices (Highest to Lowest)', 
                    value: priceText, 
                    inline: false 
                },
                { 
                    name: '📈 Market Summary', 
                    value: `**Average Price:** $${avgPrice.toFixed(4)}\n**Highest:** $${highestPrice.toFixed(4)} (${sortedPrices[0].name})\n**Lowest:** $${lowestPrice.toFixed(4)} (${sortedPrices[sortedPrices.length - 1].name})\n**Price Spread:** ${priceSpread}%`, 
                    inline: false 
                }
            );

            return embed;
        } catch (error) {
            console.error('Error creating price comparison embed:', error);
            return this.createErrorEmbed('Failed to fetch exchange price data');
        }
    }

    async createPriceAnalysisEmbed() {
        try {
            const exchangePrices = await this.fetchAllExchangePrices();
            const validPrices = exchangePrices.filter(ex => ex.price > 0);
            
            const embed = new EmbedBuilder()
                .setTitle('📊 Price Analysis & Insights')
                .setColor('#00ff88')
                .setTimestamp();

            if (validPrices.length === 0) {
                embed.setDescription('❌ No valid price data available for analysis');
                return embed;
            }

            // Calculate statistics
            const prices = validPrices.map(ex => ex.price);
            const volumes = validPrices.map(ex => ex.volume);
            const changes = validPrices.map(ex => ex.change);
            
            const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
            const totalVolume = volumes.reduce((a, b) => a + b, 0);
            const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
            
            // Find best opportunities
            const highestVolume = validPrices.reduce((prev, current) => 
                (prev.volume > current.volume) ? prev : current
            );
            
            const bestPerformer = validPrices.reduce((prev, current) => 
                (prev.change > current.change) ? prev : current
            );

            // Market sentiment
            const positiveChanges = changes.filter(c => c > 0).length;
            const sentiment = positiveChanges > changes.length / 2 ? '🟢 Bullish' : 
                           positiveChanges < changes.length / 2 ? '🔴 Bearish' : '🟡 Neutral';

            embed.addFields(
                { 
                    name: '📊 Market Statistics', 
                    value: `**Volume-Weighted Avg:** $${avgPrice.toFixed(4)}\n**Total 24h Volume:** ${totalVolume.toLocaleString()}\n**Average 24h Change:** ${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%\n**Market Sentiment:** ${sentiment}`, 
                    inline: true 
                },
                { 
                    name: '🏆 Top Performers', 
                    value: `**Highest Volume:** ${highestVolume.name}\n${highestVolume.volume.toLocaleString()} XRP\n\n**Best 24h Performance:** ${bestPerformer.name}\n${bestPerformer.change >= 0 ? '+' : ''}${bestPerformer.change.toFixed(2)}%`, 
                    inline: true 
                },
                {
                    name: '⚠️ Trading Recommendations',
                    value: this.generateTradingRecommendations(validPrices),
                    inline: false
                }
            );

            return embed;
        } catch (error) {
            console.error('Error creating price analysis embed:', error);
            return this.createErrorEmbed('Failed to create price analysis');
        }
    }

    generateTradingRecommendations(prices) {
        const sortedByPrice = [...prices].sort((a, b) => a.price - b.price);
        const priceDiff = ((sortedByPrice[sortedByPrice.length - 1].price - sortedByPrice[0].price) / sortedByPrice[0].price * 100);
        
        if (priceDiff > 1) {
            return `🚨 **Arbitrage Opportunity Detected!**\n• Buy on: ${sortedByPrice[0].name} ($${sortedByPrice[0].price.toFixed(4)})\n• Sell on: ${sortedByPrice[sortedByPrice.length - 1].name} ($${sortedByPrice[sortedByPrice.length - 1].price.toFixed(4)})\n• Potential Profit: ${priceDiff.toFixed(2)}%`;
        } else if (priceDiff > 0.5) {
            return `⚡ **Minor Price Differences**\n• Consider fees and transfer times\n• Price spread: ${priceDiff.toFixed(2)}%`;
        } else {
            return `✅ **Prices Well Aligned**\n• No significant arbitrage opportunities\n• Choose exchange based on volume and fees`;
        }
    }

    createActionButtons() {
        try {
            return new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('price_refresh')
                        .setLabel('🔄 Refresh Prices')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('price_sort_volume')
                        .setLabel('📊 Sort by Volume')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('price_sort_change')
                        .setLabel('📈 Sort by Change')
                        .setStyle(ButtonStyle.Secondary)
                );
        } catch (error) {
            console.error('Error creating action buttons:', error);
            return null;
        }
    }

    async fetchAllExchangePrices() {
        const promises = this.exchanges.map(exchange => this.fetchExchangePrice(exchange));
        const results = await Promise.allSettled(promises);
        
        return results
            .filter(result => result.status === 'fulfilled' && result.value)
            .map(result => result.value);
    }

    async fetchExchangePrice(exchange) {
        try {
            switch (exchange.api) {
                case 'binance':
                    return await this.fetchBinancePrice(exchange);
                case 'coinbase':
                    return await this.fetchCoinbasePrice(exchange);
                case 'kraken':
                    return await this.fetchKrakenPrice(exchange);
                case 'bitstamp':
                    return await this.fetchBitstampPrice(exchange);
                case 'kucoin':
                    return await this.fetchKucoinPrice(exchange);
                default:
                    return null;
            }
        } catch (error) {
            console.error(`Error fetching ${exchange.name} price:`, error.message);
            return null;
        }
    }

    async fetchBinancePrice(exchange) {
        const response = await axios.get(`https://api.binance.com/api/v3/ticker/24hr?symbol=${exchange.symbol}`, {
            timeout: 5000
        });
        
        return {
            name: exchange.name,
            price: parseFloat(response.data.lastPrice),
            volume: parseFloat(response.data.volume),
            change: parseFloat(response.data.priceChangePercent),
            timestamp: Date.now()
        };
    }

    async fetchCoinbasePrice(exchange) {
        const response = await axios.get(`https://api.exchange.coinbase.com/products/${exchange.symbol}/ticker`, {
            timeout: 5000
        });
        
        return {
            name: exchange.name,
            price: parseFloat(response.data.price),
            volume: parseFloat(response.data.volume),
            change: 0, // Coinbase doesn't provide 24h change in this endpoint
            timestamp: Date.now()
        };
    }

    async fetchKrakenPrice(exchange) {
        const response = await axios.get(`https://api.kraken.com/0/public/Ticker?pair=${exchange.symbol}`, {
            timeout: 5000
        });
        
        const data = response.data.result[Object.keys(response.data.result)[0]];
        
        return {
            name: exchange.name,
            price: parseFloat(data.c[0]),
            volume: parseFloat(data.v[1]),
            change: ((parseFloat(data.c[0]) - parseFloat(data.o)) / parseFloat(data.o)) * 100,
            timestamp: Date.now()
        };
    }

    async fetchBitstampPrice(exchange) {
        const response = await axios.get(`https://www.bitstamp.net/api/v2/ticker/${exchange.symbol}/`, {
            timeout: 5000
        });
        
        return {
            name: exchange.name,
            price: parseFloat(response.data.last),
            volume: parseFloat(response.data.volume),
            change: parseFloat(response.data.percent_change_24h || 0),
            timestamp: Date.now()
        };
    }

    async fetchKucoinPrice(exchange) {
        const response = await axios.get(`https://api.kucoin.com/api/v1/market/stats?symbol=${exchange.symbol}`, {
            timeout: 5000
        });
        
        return {
            name: exchange.name,
            price: parseFloat(response.data.data.last),
            volume: parseFloat(response.data.data.vol),
            change: parseFloat(response.data.data.changeRate) * 100,
            timestamp: Date.now()
        };
    }

    createErrorEmbed(message) {
        return new EmbedBuilder()
            .setTitle('❌ Multi-Exchange Price Error')
            .setColor('#ff0000')
            .setDescription(message)
            .setTimestamp();
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('🛑 Multi-Exchange Price Service stopped');
        }
    }
}

export { MultiExchangePriceService };