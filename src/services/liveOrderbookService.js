import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import axios from 'axios';

class LiveOrderbookService {
    constructor(client, channelId) {
        this.discordClient = client;
        this.channelId = channelId;
        this.updateInterval = 10 * 60 * 1000; // 10 minutes
        this.intervalId = null;
        this.failureCount = 0;
        this.maxFailures = 5;
        this.circuitBreakerOpen = false;
        this.lastSuccessTime = Date.now();
        
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
        // Circuit breaker logic
        if (this.circuitBreakerOpen) {
            const timeSinceLastSuccess = Date.now() - this.lastSuccessTime;
            if (timeSinceLastSuccess < 300000) { // 5 minutes
                console.log('Circuit breaker open, skipping update');
                return;
            } else {
                console.log('Attempting to close circuit breaker');
                this.circuitBreakerOpen = false;
                this.failureCount = 0;
            }
        }
        
        try {
            const orderbookData = await this.fetchOrderbookData();
            
            if (!orderbookData || orderbookData.length === 0) {
                this.handleFailure();
                return;
            }
            
            // Success - reset failure count
            this.failureCount = 0;
            this.lastSuccessTime = Date.now();
            
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
            this.handleFailure();
        }
    }

    handleFailure() {
        this.failureCount++;
        if (this.failureCount >= this.maxFailures) {
            console.warn(`Opening circuit breaker after ${this.failureCount} failures`);
            this.circuitBreakerOpen = true;
        }
    }

    async createOrderbookEmbed() {
        try {
            const orderbookData = await this.fetchOrderbookData();
            
            if (!orderbookData || orderbookData.length === 0) {
                return this.createErrorEmbed('No orderbook data available');
            }

            // Use the first successful result or fallback data
            const data = orderbookData[0] || this.getFallbackOrderbookData();
            
            const embed = new EmbedBuilder()
                .setTitle('📊 Live XRP Orderbook')
                .setColor('#00ff88')
                .setTimestamp()
                .setFooter({ text: 'Live Orderbook • Updates every 10 minutes' });

            // Top 5 bids and asks
            const topBids = data.bids ? data.bids.slice(0, 5) : [];
            const topAsks = data.asks ? data.asks.slice(0, 5) : [];

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
                    value: `**Spread:** ${data.spread?.toFixed(4) || 'N/A'} XRP\n**Best Bid:** ${data.bestBid?.toFixed(4) || 'N/A'}\n**Best Ask:** ${data.bestAsk?.toFixed(4) || 'N/A'}\n**Mid Price:** ${data.midPrice?.toFixed(4) || 'N/A'}`, 
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
            
            if (!orderbookData || orderbookData.length === 0) {
                return this.createErrorEmbed('No depth data available');
            }

            const data = orderbookData[0] || this.getFallbackOrderbookData();
            
            const embed = new EmbedBuilder()
                .setTitle('📊 Market Depth Visualization')
                .setColor('#0099ff')
                .setTimestamp();

            // Calculate cumulative volumes
            let bidVolume = 0;
            let askVolume = 0;
            
            if (data.bids) {
                data.bids.slice(0, 10).forEach(bid => bidVolume += bid.size);
            }
            if (data.asks) {
                data.asks.slice(0, 10).forEach(ask => askVolume += ask.size);
            }

            const totalVolume = bidVolume + askVolume;
            const bidPercentage = totalVolume > 0 ? ((bidVolume / totalVolume) * 100).toFixed(1) : '0.0';
            const askPercentage = totalVolume > 0 ? ((askVolume / totalVolume) * 100).toFixed(1) : '0.0';

            // Create visual depth representation
            const bidBar = '🟢'.repeat(Math.floor(parseFloat(bidPercentage) / 5));
            const askBar = '🔴'.repeat(Math.floor(parseFloat(askPercentage) / 5));

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
        const results = await Promise.allSettled([
            this.fetchBinanceOrderbook(),
            this.fetchBitstampOrderbook()
        ]);
        
        const successfulResults = results
            .filter(result => result.status === 'fulfilled' && result.value !== null)
            .map(result => result.value);
        
        if (successfulResults.length === 0) {
            console.warn('All orderbook APIs failed, using fallback data');
            return [this.getFallbackOrderbookData()];
        }
        
        return successfulResults;
    }

    async fetchBinanceOrderbook(retries = 3) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const response = await axios.get('https://api.binance.com/api/v3/depth', {
                    params: {
                        symbol: 'XRPUSDT',
                        limit: 20
                    },
                    timeout: 15000
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

                const bestBid = bids[0]?.price || 0;
                const bestAsk = asks[0]?.price || 0;
                const spread = bestAsk - bestBid;
                const midPrice = (bestBid + bestAsk) / 2;

                return { bids, asks, spread, bestBid, bestAsk, midPrice };
            } catch (error) {
                console.error(`Binance API attempt ${attempt}/${retries} failed:`, error.message);
                
                if (attempt === retries) {
                    console.error('All Binance API attempts failed');
                    return null;
                }
                
                // Exponential backoff: wait 2^attempt seconds
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }
    }

    async fetchBitstampOrderbook() {
        try {
            const response = await axios.get('https://www.bitstamp.net/api/v2/order_book/xrpusd/', {
                timeout: 15000
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

            const bestBid = bids[0]?.price || 0;
            const bestAsk = asks[0]?.price || 0;
            const spread = bestAsk - bestBid;
            const midPrice = (bestBid + bestAsk) / 2;

            return { bids, asks, spread, bestBid, bestAsk, midPrice };
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