import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import axios from 'axios';

class LiveOrderbookService {
    constructor(client, channelId) {
        this.discordClient = client;
        this.channelId = channelId;
        this.updateInterval = 10 * 60 * 1000; // 10 minutes
        this.intervalId = null;
        
        // Orderbook data storage
        this.orderbookData = {
            bids: [],
            asks: [],
            spread: 0,
            lastUpdate: null
        };
    }

    async startAutomatedUpdates() {
        try {
            console.log('🔗 Starting Live Orderbook Service');
            
            // Send initial update
            await this.sendUpdate();
            
            // Start periodic updates
            this.intervalId = setInterval(async () => {
                try {
                    await this.sendUpdate();
                    console.log(`📊 Live Orderbook update sent at ${new Date().toISOString()}`);
                } catch (error) {
                    console.error('❌ Error in Live Orderbook update:', error);
                }
            }, this.updateInterval);
            
            console.log('📊 Live XRP Orderbook Service started successfully');
        } catch (error) {
            console.error('❌ Failed to start Live Orderbook Service:', error);
        }
    }

    async sendUpdate() {
        try {
            const channel = this.discordClient.channels.cache.get(this.channelId);
            if (!channel) {
                console.error('❌ Live Orderbook channel not found:', this.channelId);
                return;
            }

            const [mainEmbed, depthEmbed] = await Promise.all([
                this.createOrderbookEmbed(),
                this.createDepthChartEmbed()
            ]);

            const messageOptions = { embeds: [mainEmbed, depthEmbed] };

            await channel.send(messageOptions);
        } catch (error) {
            console.error('❌ Error sending Live Orderbook update:', error);
        }
    }

    async createOrderbookEmbed() {
        try {
            const orderbookData = await this.fetchOrderbookData();
            
            const embed = new EmbedBuilder()
                .setTitle('📊 Live XRP Orderbook')
                .setColor('#00ff88')
                .setTimestamp()
                .setFooter({ text: 'Live Orderbook • Updates every 10 minutes' });

            // Top 5 bids and asks
            const topBids = orderbookData.bids.slice(0, 5);
            const topAsks = orderbookData.asks.slice(0, 5);

            let bidsText = '';
            let asksText = '';

            topBids.forEach((bid, index) => {
                const bar = '█'.repeat(Math.floor(bid.size / 10000));
                bidsText += `\`${bid.price.toFixed(4)}\` ${bid.size.toLocaleString()} ${bar}\n`;
            });

            topAsks.forEach((ask, index) => {
                const bar = '█'.repeat(Math.floor(ask.size / 10000));
                asksText += `\`${ask.price.toFixed(4)}\` ${ask.size.toLocaleString()} ${bar}\n`;
            });

            embed.addFields(
                { 
                    name: '🟢 Top Bids (Buy Orders)', 
                    value: bidsText || 'No bid data available', 
                    inline: true 
                },
                { 
                    name: '🔴 Top Asks (Sell Orders)', 
                    value: asksText || 'No ask data available', 
                    inline: true 
                },
                { 
                    name: '📈 Market Stats', 
                    value: `**Spread:** ${orderbookData.spread.toFixed(4)} XRP\n**Best Bid:** ${orderbookData.bestBid?.toFixed(4) || 'N/A'}\n**Best Ask:** ${orderbookData.bestAsk?.toFixed(4) || 'N/A'}\n**Mid Price:** ${orderbookData.midPrice?.toFixed(4) || 'N/A'}`, 
                    inline: false 
                }
            );

            return embed;
        } catch (error) {
            console.error('Error creating orderbook embed:', error);
            return this.createErrorEmbed('Failed to fetch orderbook data');
        }
    }

    async createDepthChartEmbed() {
        try {
            const orderbookData = await this.fetchOrderbookData();
            
            const embed = new EmbedBuilder()
                .setTitle('📊 Market Depth Visualization')
                .setColor('#0099ff')
                .setTimestamp();

            // Calculate cumulative volumes
            let bidVolume = 0;
            let askVolume = 0;
            
            orderbookData.bids.slice(0, 10).forEach(bid => bidVolume += bid.size);
            orderbookData.asks.slice(0, 10).forEach(ask => askVolume += ask.size);

            const totalVolume = bidVolume + askVolume;
            const bidPercentage = ((bidVolume / totalVolume) * 100).toFixed(1);
            const askPercentage = ((askVolume / totalVolume) * 100).toFixed(1);

            // Create visual depth representation
            const bidBar = '🟢'.repeat(Math.floor(bidPercentage / 5));
            const askBar = '🔴'.repeat(Math.floor(askPercentage / 5));

            embed.addFields(
                { 
                    name: '📊 Order Book Depth (Top 10 levels)', 
                    value: `**Buy Side:** ${bidVolume.toLocaleString()} XRP (${bidPercentage}%)\n${bidBar}\n\n**Sell Side:** ${askVolume.toLocaleString()} XRP (${askPercentage}%)\n${askBar}`, 
                    inline: false 
                },
                {
                    name: '⚖️ Market Balance',
                    value: bidVolume > askVolume ? '🟢 **Buy Pressure Dominant**' : askVolume > bidVolume ? '🔴 **Sell Pressure Dominant**' : '⚖️ **Balanced Market**',
                    inline: false
                }
            );

            return embed;
        } catch (error) {
            console.error('Error creating depth chart embed:', error);
            return this.createErrorEmbed('Failed to create depth chart');
        }
    }

    createActionButtons() {
        try {
            return new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('orderbook_refresh')
                        .setLabel('🔄 Refresh')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('orderbook_depth')
                        .setLabel('📊 Full Depth')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('orderbook_settings')
                        .setLabel('⚙️ Settings')
                        .setStyle(ButtonStyle.Secondary)
                );
        } catch (error) {
            console.error('Error creating action buttons:', error);
            return null;
        }
    }

    async fetchOrderbookData() {
        try {
            // Fetch from multiple exchanges and aggregate
            const [binanceData, bitstampData] = await Promise.allSettled([
                this.fetchBinanceOrderbook(),
                this.fetchBitstampOrderbook()
            ]);

            let bids = [];
            let asks = [];

            // Process Binance data
            if (binanceData.status === 'fulfilled' && binanceData.value) {
                bids = bids.concat(binanceData.value.bids);
                asks = asks.concat(binanceData.value.asks);
            }

            // Process Bitstamp data
            if (bitstampData.status === 'fulfilled' && bitstampData.value) {
                bids = bids.concat(bitstampData.value.bids);
                asks = asks.concat(bitstampData.value.asks);
            }

            // Sort and aggregate
            bids.sort((a, b) => b.price - a.price); // Highest price first
            asks.sort((a, b) => a.price - b.price); // Lowest price first

            const bestBid = bids[0]?.price;
            const bestAsk = asks[0]?.price;
            const spread = bestAsk && bestBid ? bestAsk - bestBid : 0;
            const midPrice = bestAsk && bestBid ? (bestAsk + bestBid) / 2 : 0;

            return {
                bids: bids.slice(0, 20),
                asks: asks.slice(0, 20),
                spread,
                bestBid,
                bestAsk,
                midPrice,
                lastUpdate: new Date()
            };
        } catch (error) {
            console.error('Error fetching orderbook data:', error);
            return this.getFallbackOrderbookData();
        }
    }

    async fetchBinanceOrderbook() {
        try {
            const response = await axios.get('https://api.binance.com/api/v3/depth?symbol=XRPUSDT&limit=20', {
                timeout: 5000
            });

            const bids = response.data.bids.map(([price, quantity]) => ({
                price: parseFloat(price),
                size: parseFloat(quantity),
                exchange: 'Binance'
            }));

            const asks = response.data.asks.map(([price, quantity]) => ({
                price: parseFloat(price),
                size: parseFloat(quantity),
                exchange: 'Binance'
            }));

            return { bids, asks };
        } catch (error) {
            console.error('Error fetching Binance orderbook:', error);
            return null;
        }
    }

    async fetchBitstampOrderbook() {
        try {
            const response = await axios.get('https://www.bitstamp.net/api/v2/order_book/xrpusd/', {
                timeout: 5000
            });

            const bids = response.data.bids.slice(0, 20).map(([price, quantity]) => ({
                price: parseFloat(price),
                size: parseFloat(quantity),
                exchange: 'Bitstamp'
            }));

            const asks = response.data.asks.slice(0, 20).map(([price, quantity]) => ({
                price: parseFloat(price),
                size: parseFloat(quantity),
                exchange: 'Bitstamp'
            }));

            return { bids, asks };
        } catch (error) {
            console.error('Error fetching Bitstamp orderbook:', error);
            return null;
        }
    }

    getFallbackOrderbookData() {
        return {
            bids: [
                { price: 0.6150, size: 50000, exchange: 'Fallback' },
                { price: 0.6149, size: 75000, exchange: 'Fallback' },
                { price: 0.6148, size: 100000, exchange: 'Fallback' }
            ],
            asks: [
                { price: 0.6151, size: 45000, exchange: 'Fallback' },
                { price: 0.6152, size: 80000, exchange: 'Fallback' },
                { price: 0.6153, size: 60000, exchange: 'Fallback' }
            ],
            spread: 0.0001,
            bestBid: 0.6150,
            bestAsk: 0.6151,
            midPrice: 0.61505,
            lastUpdate: new Date()
        };
    }

    createErrorEmbed(message) {
        return new EmbedBuilder()
            .setTitle('❌ Live Orderbook Error')
            .setColor('#ff0000')
            .setDescription(message)
            .setTimestamp();
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('🛑 Live Orderbook Service stopped');
        }
    }
}

export { LiveOrderbookService };