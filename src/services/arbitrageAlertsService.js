import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import axios from 'axios';

class ArbitrageAlertsService {
    constructor(client, channelId) {
        this.discordClient = client;
        this.channelId = channelId;
        this.updateInterval = 10 * 60 * 1000; // 10 minutes
        this.intervalId = null;
        
        // Arbitrage configuration
        this.minProfitThreshold = 0.5; // Minimum 0.5% profit
        this.exchanges = [
            { name: 'Binance', symbol: 'XRPUSDT', api: 'binance', fees: { maker: 0.1, taker: 0.1, withdrawal: 0.25 } },
            { name: 'Coinbase', symbol: 'XRP-USD', api: 'coinbase', fees: { maker: 0.5, taker: 0.5, withdrawal: 0 } },
            { name: 'Kraken', symbol: 'XRPUSD', api: 'kraken', fees: { maker: 0.16, taker: 0.26, withdrawal: 0.02 } },
            { name: 'Bitstamp', symbol: 'xrpusd', api: 'bitstamp', fees: { maker: 0.5, taker: 0.5, withdrawal: 0.02 } },
            { name: 'KuCoin', symbol: 'XRP-USDT', api: 'kucoin', fees: { maker: 0.1, taker: 0.1, withdrawal: 0.25 } }
        ];
        
        this.arbitrageHistory = [];
        this.alertsSent = new Set();
    }

    async startAutomatedUpdates() {
        try {
            console.log('🔗 Starting Arbitrage Alerts Service');
            
            // Send initial update
            await this.sendUpdate();
            
            // Start periodic updates
            this.intervalId = setInterval(async () => {
                try {
                    await this.sendUpdate();
                    console.log(`⚡ Arbitrage Alerts update sent at ${new Date().toISOString()}`);
                } catch (error) {
                    console.error('❌ Error in Arbitrage Alerts update:', error);
                }
            }, this.updateInterval);
            
            console.log('⚡ Arbitrage Opportunity Alerts Service started successfully');
        } catch (error) {
            console.error('❌ Failed to start Arbitrage Alerts Service:', error);
        }
    }

    async sendUpdate() {
        try {
            const channel = this.discordClient.channels.cache.get(this.channelId);
            if (!channel) {
                console.error('❌ Arbitrage Alerts channel not found:', this.channelId);
                return;
            }

            const opportunities = await this.findArbitrageOpportunities();
            
            if (opportunities.length > 0) {
                const [alertEmbed, analysisEmbed] = await Promise.all([
                    this.createArbitrageAlertEmbed(opportunities),
                    this.createArbitrageAnalysisEmbed(opportunities)
                ]);

                const actionButtons = this.createActionButtons();
                const messageOptions = { embeds: [alertEmbed, analysisEmbed] };
                
                if (actionButtons) {
                    messageOptions.components = [actionButtons];
                }

                await channel.send(messageOptions);
            } else {
                // Send "no opportunities" update every hour (6 cycles)
                if (Date.now() % (6 * this.updateInterval) < this.updateInterval) {
                    const noOpportunityEmbed = this.createNoOpportunityEmbed();
                    await channel.send({ embeds: [noOpportunityEmbed] });
                }
            }
        } catch (error) {
            console.error('❌ Error sending Arbitrage Alerts update:', error);
        }
    }

    async createArbitrageAlertEmbed(opportunities) {
        const embed = new EmbedBuilder()
            .setTitle('⚡ ARBITRAGE OPPORTUNITIES DETECTED!')
            .setColor('#ff6600')
            .setTimestamp()
            .setFooter({ text: 'Arbitrage Alerts • Updates every 10 minutes' });

        let alertText = '';
        opportunities.slice(0, 3).forEach((opp, index) => {
            const profitIcon = opp.netProfit > 2 ? '🚨' : opp.netProfit > 1 ? '⚡' : '💡';
            const riskLevel = this.calculateRiskLevel(opp);
            
            alertText += `${profitIcon} **Opportunity #${index + 1}**\n`;
            alertText += `**Buy:** ${opp.buyExchange} - $${opp.buyPrice.toFixed(4)}\n`;
            alertText += `**Sell:** ${opp.sellExchange} - $${opp.sellPrice.toFixed(4)}\n`;
            alertText += `**Gross Profit:** ${opp.grossProfit.toFixed(2)}%\n`;
            alertText += `**Net Profit:** ${opp.netProfit.toFixed(2)}% ${this.getProfitEmoji(opp.netProfit)}\n`;
            alertText += `**Risk Level:** ${riskLevel}\n`;
            alertText += `**Confidence:** ${opp.confidence}%\n\n`;
        });

        embed.addFields(
            { 
                name: `🎯 Top Arbitrage Opportunities (${opportunities.length} found)`, 
                value: alertText, 
                inline: false 
            },
            {
                name: '⚠️ Important Notes',
                value: '• Prices change rapidly - act quickly\n• Consider transfer times between exchanges\n• Account for slippage on large orders\n• Verify sufficient liquidity before trading',
                inline: false
            }
        );

        return embed;
    }

    async createArbitrageAnalysisEmbed(opportunities) {
        const embed = new EmbedBuilder()
            .setTitle('📊 Arbitrage Market Analysis')
            .setColor('#00ff88')
            .setTimestamp();

        // Calculate statistics
        const avgProfit = opportunities.reduce((sum, opp) => sum + opp.netProfit, 0) / opportunities.length;
        const maxProfit = Math.max(...opportunities.map(opp => opp.netProfit));
        const bestOpportunity = opportunities.find(opp => opp.netProfit === maxProfit);
        
        // Exchange frequency analysis
        const exchangeStats = {};
        opportunities.forEach(opp => {
            exchangeStats[opp.buyExchange] = (exchangeStats[opp.buyExchange] || 0) + 1;
            exchangeStats[opp.sellExchange] = (exchangeStats[opp.sellExchange] || 0) + 1;
        });
        
        const mostActiveExchange = Object.entries(exchangeStats)
            .sort(([,a], [,b]) => b - a)[0];

        // Market conditions
        const marketCondition = this.analyzeMarketConditions(opportunities);
        
        embed.addFields(
            { 
                name: '📈 Profit Analysis', 
                value: `**Average Net Profit:** ${avgProfit.toFixed(2)}%\n**Maximum Profit:** ${maxProfit.toFixed(2)}%\n**Best Route:** ${bestOpportunity?.buyExchange} → ${bestOpportunity?.sellExchange}\n**Opportunities Found:** ${opportunities.length}`, 
                inline: true 
            },
            { 
                name: '🏪 Exchange Activity', 
                value: `**Most Active:** ${mostActiveExchange?.[0] || 'N/A'}\n**Frequency:** ${mostActiveExchange?.[1] || 0} opportunities\n**Market Spread:** ${this.calculateMarketSpread(opportunities).toFixed(3)}%`, 
                inline: true 
            },
            {
                name: '🌡️ Market Conditions',
                value: marketCondition,
                inline: false
            },
            {
                name: '💡 Trading Strategy Recommendations',
                value: this.generateTradingStrategy(opportunities),
                inline: false
            }
        );

        return embed;
    }

    createNoOpportunityEmbed() {
        return new EmbedBuilder()
            .setTitle('😴 No Arbitrage Opportunities')
            .setColor('#666666')
            .setDescription('No profitable arbitrage opportunities detected at this time.')
            .addFields(
                {
                    name: '📊 Market Status',
                    value: '• Prices are well-aligned across exchanges\n• Market efficiency is high\n• Consider waiting for increased volatility',
                    inline: false
                },
                {
                    name: '⏰ Next Check',
                    value: `<t:${Math.floor((Date.now() + this.updateInterval) / 1000)}:R>`,
                    inline: false
                }
            )
            .setTimestamp()
            .setFooter({ text: 'Arbitrage monitoring continues...' });
    }

    async findArbitrageOpportunities() {
        try {
            const exchangePrices = await this.fetchAllExchangePrices();
            const validPrices = exchangePrices.filter(ex => ex.price > 0 && ex.volume > 10000);
            
            if (validPrices.length < 2) {
                return [];
            }

            const opportunities = [];
            
            // Compare all exchange pairs
            for (let i = 0; i < validPrices.length; i++) {
                for (let j = 0; j < validPrices.length; j++) {
                    if (i !== j) {
                        const buyExchange = validPrices[i];
                        const sellExchange = validPrices[j];
                        
                        if (sellExchange.price > buyExchange.price) {
                            const opportunity = this.calculateArbitrageProfit(
                                buyExchange, 
                                sellExchange
                            );
                            
                            if (opportunity.netProfit >= this.minProfitThreshold) {
                                opportunities.push(opportunity);
                            }
                        }
                    }
                }
            }
            
            // Sort by net profit (highest first)
            return opportunities.sort((a, b) => b.netProfit - a.netProfit);
        } catch (error) {
            console.error('Error finding arbitrage opportunities:', error);
            return [];
        }
    }

    calculateArbitrageProfit(buyExchange, sellExchange) {
        const buyPrice = buyExchange.price;
        const sellPrice = sellExchange.price;
        
        // Calculate gross profit
        const grossProfit = ((sellPrice - buyPrice) / buyPrice) * 100;
        
        // Calculate fees
        const buyFees = buyExchange.fees.taker + buyExchange.fees.withdrawal;
        const sellFees = sellExchange.fees.taker;
        const totalFees = buyFees + sellFees;
        
        // Calculate net profit after fees
        const netProfit = grossProfit - totalFees;
        
        // Calculate confidence based on volume and price stability
        const minVolume = Math.min(buyExchange.volume, sellExchange.volume);
        const volumeScore = Math.min(minVolume / 100000, 1) * 50; // Max 50 points
        const profitScore = Math.min(netProfit / 5, 1) * 50; // Max 50 points
        const confidence = Math.round(volumeScore + profitScore);
        
        return {
            buyExchange: buyExchange.name,
            sellExchange: sellExchange.name,
            buyPrice,
            sellPrice,
            grossProfit,
            netProfit,
            totalFees,
            confidence,
            volume: minVolume,
            timestamp: Date.now()
        };
    }

    calculateRiskLevel(opportunity) {
        if (opportunity.confidence > 80 && opportunity.volume > 50000) {
            return '🟢 Low Risk';
        } else if (opportunity.confidence > 60 && opportunity.volume > 20000) {
            return '🟡 Medium Risk';
        } else {
            return '🔴 High Risk';
        }
    }

    getProfitEmoji(profit) {
        if (profit > 2) return '🚀';
        if (profit > 1) return '⚡';
        if (profit > 0.5) return '💰';
        return '💡';
    }

    analyzeMarketConditions(opportunities) {
        const avgProfit = opportunities.reduce((sum, opp) => sum + opp.netProfit, 0) / opportunities.length;
        
        if (avgProfit > 2) {
            return '🔥 **High Volatility** - Excellent arbitrage conditions';
        } else if (avgProfit > 1) {
            return '⚡ **Moderate Volatility** - Good arbitrage opportunities';
        } else if (avgProfit > 0.5) {
            return '💡 **Low Volatility** - Limited but viable opportunities';
        } else {
            return '😴 **Stable Market** - Minimal arbitrage potential';
        }
    }

    generateTradingStrategy(opportunities) {
        const highProfitOpps = opportunities.filter(opp => opp.netProfit > 1.5);
        const lowRiskOpps = opportunities.filter(opp => opp.confidence > 75);
        
        if (highProfitOpps.length > 0) {
            return '🎯 **Aggressive Strategy:** Focus on high-profit opportunities\n• Target profits > 1.5%\n• Accept higher risk for better returns\n• Monitor closely for rapid execution';
        } else if (lowRiskOpps.length > 0) {
            return '🛡️ **Conservative Strategy:** Prioritize low-risk opportunities\n• Focus on high-confidence trades\n• Accept lower profits for stability\n• Suitable for larger capital amounts';
        } else {
            return '⏳ **Wait Strategy:** Current opportunities are marginal\n• Wait for better market conditions\n• Monitor for increased volatility\n• Consider other trading strategies';
        }
    }

    calculateMarketSpread(opportunities) {
        if (opportunities.length === 0) return 0;
        return opportunities.reduce((sum, opp) => sum + opp.grossProfit, 0) / opportunities.length;
    }

    createActionButtons() {
        try {
            return new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('arbitrage_refresh')
                        .setLabel('🔄 Refresh')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('arbitrage_settings')
                        .setLabel('⚙️ Settings')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('arbitrage_history')
                        .setLabel('📊 History')
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
            fees: exchange.fees,
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
            fees: exchange.fees,
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
            fees: exchange.fees,
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
            fees: exchange.fees,
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
            fees: exchange.fees,
            timestamp: Date.now()
        };
    }

    createErrorEmbed(message) {
        return new EmbedBuilder()
            .setTitle('❌ Arbitrage Alerts Error')
            .setColor('#ff0000')
            .setDescription(message)
            .setTimestamp();
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('🛑 Arbitrage Alerts Service stopped');
        }
    }
}

export { ArbitrageAlertsService };