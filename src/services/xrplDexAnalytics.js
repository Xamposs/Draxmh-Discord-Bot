import { Client } from 'xrpl';
import { EmbedBuilder } from 'discord.js';
import { xrplManager } from '../utils/enhancedXrplManager.js';

class XRPLDexAnalytics {
    constructor(client, channelId) {
        this.discordClient = client;
        this.channelId = channelId;
        this.updateInterval = 5 * 60 * 1000; // 5 minutes
        this.updateTimer = null;
        this.lastSuccessfulUpdate = null;
        this.isRunning = false;
        
        console.log('DEX Analytics initialized with channel:', channelId);

        // Common trading pairs on XRPL
        this.tradingPairs = [
            { base: 'XRP', counter: 'USD', issuer: 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq' },
            { base: 'XRP', counter: 'EUR', issuer: 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq' },
            { base: 'XRP', counter: 'BTC', issuer: 'rchGBxcD1A1C2tdxF6papQYZ8kjRKMYcL' },
            { base: 'XRP', counter: 'ETH', issuer: 'rcA8X3TVMST1n3CJeAdGk1RdRCHii7N2h' }
        ];
        
        // Cache for data to reduce API calls
        this.cache = {
            pairs: null,
            makers: null,
            metrics: null,
            lastUpdated: 0,
            ttl: 60000 // 1 minute cache
        };
    }

    async startAutomatedUpdates() {
        console.log('Starting DEX Analytics updates...');
        this.isRunning = true;
        
        // Send initial update
        await this.sendUpdate();
        
        // Schedule regular updates
        this.updateTimer = setInterval(() => {
            if (this.isRunning) {
                this.sendUpdate();
            }
        }, this.updateInterval);
    }

    async sendUpdate() {
        const channel = this.discordClient.channels.cache.get(this.channelId);
        if (!channel) {
            console.log(`Channel ${this.channelId} not found`);
            return;
        }
        
        try {
            const analyticsEmbed = await this.createAnalyticsEmbed();
            await channel.send({ embeds: [analyticsEmbed] });
            this.lastSuccessfulUpdate = new Date();
            console.log(`DEX Analytics update sent at ${this.lastSuccessfulUpdate.toISOString()}`);
        } catch (error) {
            console.error('Error sending DEX update:', error.message);
            await this.sendFallbackUpdate();
        }
    }

    async sendFallbackUpdate() {
        const channel = this.discordClient.channels.cache.get(this.channelId);
        if (channel) {
            try {
                const fallbackEmbed = this.createFallbackEmbed();
                await channel.send({ embeds: [fallbackEmbed] });
                console.log('Sent fallback DEX Analytics update');
            } catch (error) {
                console.error('Error sending fallback update:', error.message);
            }
        }
    }

    async getTopTradedPairs() {
        // Check cache first
        if (this.cache.pairs && (Date.now() - this.cache.lastUpdated < this.cache.ttl)) {
            return this.cache.pairs;
        }
        
        try {
            const client = await xrplManager.getClient('dex-analytics');
            
            const pairsData = await Promise.all(
                this.tradingPairs.map(async pair => {
                    try {
                        const orderBook = await client.request({
                            command: 'book_offers',
                            taker_gets: pair.base === 'XRP' ? { currency: 'XRP' } : {
                                currency: pair.base,
                                issuer: pair.issuer
                            },
                            taker_pays: pair.counter === 'XRP' ? { currency: 'XRP' } : {
                                currency: pair.counter,
                                issuer: pair.issuer
                            },
                            limit: 20
                        });

                        // Calculate volume and metrics
                        let volume = 0;
                        let priceChange = 0;
                        let bestBid = 0;
                        let bestAsk = 0;

                        if (orderBook.result && orderBook.result.offers && orderBook.result.offers.length > 0) {
                            const offers = orderBook.result.offers;
                            
                            // Calculate volume from top offers
                            volume = offers.slice(0, 10).reduce((sum, offer) => {
                                const amount = parseFloat(offer.TakerGets.value || offer.TakerGets) / 1000000;
                                return sum + amount;
                            }, 0);

                            // Get best prices
                            if (offers[0]) {
                                const firstOffer = offers[0];
                                if (typeof firstOffer.TakerGets === 'string') {
                                    bestBid = parseFloat(firstOffer.TakerPays.value) / (parseFloat(firstOffer.TakerGets) / 1000000);
                                } else {
                                    bestBid = parseFloat(firstOffer.TakerPays.value || firstOffer.TakerPays) / parseFloat(firstOffer.TakerGets.value);
                                }
                            }
                        }

                        return {
                            pair: `${pair.base}/${pair.counter}`,
                            volume: volume.toFixed(2),
                            price: bestBid.toFixed(6),
                            change: priceChange.toFixed(2),
                            spread: Math.abs(bestAsk - bestBid).toFixed(6)
                        };
                    } catch (error) {
                        console.error(`Error fetching data for ${pair.base}/${pair.counter}:`, error.message);
                        return {
                            pair: `${pair.base}/${pair.counter}`,
                            volume: 'N/A',
                            price: 'N/A',
                            change: 'N/A',
                            spread: 'N/A'
                        };
                    }
                })
            );

            // Cache the results
            this.cache.pairs = pairsData;
            this.cache.lastUpdated = Date.now();
            
            return pairsData;
        } catch (error) {
            console.error('Error fetching market metrics:', error.message);
            
            // Return cached data if available
            if (this.cache.pairs) {
                console.log('Using cached pairs data due to connection error');
                return this.cache.pairs;
            }
            
            // Return fallback data
            return this.tradingPairs.map(pair => ({
                pair: `${pair.base}/${pair.counter}`,
                volume: 'N/A',
                price: 'N/A',
                change: 'N/A',
                spread: 'N/A'
            }));
        }
    }

    async getMarketMakers() {
        try {
            const client = await xrplManager.getClient('dex-analytics');
            
            // Get recent transactions to identify active market makers
            const ledger = await client.request({
                command: 'ledger',
                ledger_index: 'validated',
                transactions: true,
                expand: false
            });

            const makers = new Map();
            
            if (ledger.result && ledger.result.ledger && ledger.result.ledger.transactions) {
                ledger.result.ledger.transactions.forEach(tx => {
                    if (tx.TransactionType === 'OfferCreate') {
                        const account = tx.Account;
                        if (!makers.has(account)) {
                            makers.set(account, { offers: 0, volume: 0 });
                        }
                        makers.get(account).offers++;
                    }
                });
            }

            // Convert to array and sort by activity
            const topMakers = Array.from(makers.entries())
                .sort((a, b) => b[1].offers - a[1].offers)
                .slice(0, 5)
                .map(([account, data]) => ({
                    account: `${account.substring(0, 8)}...${account.substring(account.length - 4)}`,
                    offers: data.offers,
                    volume: data.volume.toFixed(2)
                }));

            return topMakers;
        } catch (error) {
            console.error('Error fetching market makers:', error.message);
            return [];
        }
    }

    async createAnalyticsEmbed() {
        try {
            const [topPairs, marketMakers] = await Promise.all([
                this.getTopTradedPairs(),
                this.getMarketMakers()
            ]);

            const embed = new EmbedBuilder()
                .setTitle('🔄 XRPL DEX Analytics')
                .setColor('#00ff88')
                .setTimestamp()
                .setFooter({ text: 'XRPL DEX • Live Data' });

            // Add trading pairs
            if (topPairs && topPairs.length > 0) {
                const pairsText = topPairs.map(pair => 
                    `**${pair.pair}**\n` +
                    `Price: ${pair.price}\n` +
                    `Volume: ${pair.volume} XRP\n` +
                    `Change: ${pair.change}%`
                ).join('\n\n');
                
                embed.addFields({ 
                    name: '📊 Top Trading Pairs', 
                    value: pairsText || 'No data available', 
                    inline: true 
                });
            }

            // Add market makers
            if (marketMakers && marketMakers.length > 0) {
                const makersText = marketMakers.map((maker, index) => 
                    `${index + 1}. ${maker.account}\nOffers: ${maker.offers}`
                ).join('\n');
                
                embed.addFields({ 
                    name: '🏪 Active Market Makers', 
                    value: makersText || 'No active makers found', 
                    inline: true 
                });
            }

            // Add network status
            embed.addFields({
                name: '🌐 Network Status',
                value: `✅ Connected\nLast Update: <t:${Math.floor(Date.now() / 1000)}:R>`,
                inline: false
            });

            return embed;
        } catch (error) {
            console.error('Error creating analytics embed:', error.message);
            return this.createFallbackEmbed();
        }
    }

    createFallbackEmbed() {
        return new EmbedBuilder()
            .setTitle('🔄 XRPL DEX Analytics')
            .setColor('#ff6b6b')
            .setDescription('⚠️ **Connection Issue**\n\nUnable to fetch live data from XRPL network. This may be due to:\n• Network connectivity issues\n• XRPL server maintenance\n• High network load\n\nRetrying automatically...')
            .addFields({
                name: '📊 Status',
                value: '🔄 Reconnecting to XRPL network...',
                inline: false
            })
            .setTimestamp()
            .setFooter({ text: 'XRPL DEX • Fallback Mode' });
    }

    async stop() {
        console.log('Stopping DEX Analytics...');
        this.isRunning = false;
        
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
        
        // Clear cache
        this.cache = {
            pairs: null,
            makers: null,
            metrics: null,
            lastUpdated: 0,
            ttl: 60000
        };
        
        console.log('DEX Analytics stopped');
    }
}

export { XRPLDexAnalytics };