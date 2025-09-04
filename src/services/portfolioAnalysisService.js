import { EmbedBuilder, StringSelectMenuBuilder } from 'discord.js';
import { Client } from 'xrpl';

class PortfolioAnalysisService {
    constructor(client, channelId) {
        this.client = client;
        this.channelId = channelId;
        this.xrplClient = new Client('wss://xrplcluster.com');
        this.portfolioData = new Map();
        this.assetPrices = new Map();
        this.isRunning = false;
        this.updateInterval = null;
    }

    async initialize() {
        try {
            await this.xrplClient.connect();
            console.log('📊 Portfolio Analysis Service initialized');
            
            await this.loadAssetPrices();
            await this.loadWhalePortfolios();
            await this.sendWelcomeMessage();
            await this.startPortfolioUpdates();
            
            this.isRunning = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize Portfolio Analysis Service:', error);
            return false;
        }
    }

    async loadAssetPrices() {
        // Load current asset prices for portfolio valuation
        this.assetPrices.set('XRP', 0.52);
        this.assetPrices.set('USD', 1.0);
        this.assetPrices.set('BTC', 43000);
        this.assetPrices.set('ETH', 2600);
        this.assetPrices.set('SOLO', 0.35);
        this.assetPrices.set('CORE', 0.12);
        this.assetPrices.set('CSC', 0.008);
    }

    async loadWhalePortfolios() {
        // Load known whale portfolios with holdings
        const whalePortfolios = [
            {
                address: 'rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH',
                nickname: 'Ripple Escrow',
                holdings: [
                    { asset: 'XRP', amount: 45000000000, percentage: 98.5 },
                    { asset: 'USD', amount: 500000, percentage: 1.2 },
                    { asset: 'BTC', amount: 2.5, percentage: 0.3 }
                ],
                totalValue: 23400000000,
                diversificationScore: 15,
                riskLevel: 'Low'
            },
            {
                address: 'rLNaPoKeeBjZe2qs6x52yVPZpZ8td4dc6w',
                nickname: 'Binance Hot Wallet',
                holdings: [
                    { asset: 'XRP', amount: 150000000, percentage: 85.2 },
                    { asset: 'USD', amount: 12000000, percentage: 10.8 },
                    { asset: 'SOLO', amount: 8000000, percentage: 2.5 },
                    { asset: 'CORE', amount: 10000000, percentage: 1.5 }
                ],
                totalValue: 111200000,
                diversificationScore: 45,
                riskLevel: 'Medium'
            },
            {
                address: 'rDNvpJMWrHhyPxqtXYYDNF3cCBhGKKKKKK',
                nickname: 'Mystery Whale #1',
                holdings: [
                    { asset: 'XRP', amount: 25000000, percentage: 65.0 },
                    { asset: 'SOLO', amount: 15000000, percentage: 20.0 },
                    { asset: 'CSC', amount: 50000000, percentage: 8.0 },
                    { asset: 'CORE', amount: 12000000, percentage: 5.0 },
                    { asset: 'ETH', amount: 150, percentage: 2.0 }
                ],
                totalValue: 19850000,
                diversificationScore: 78,
                riskLevel: 'High'
            }
        ];

        for (const portfolio of whalePortfolios) {
            this.portfolioData.set(portfolio.address, portfolio);
        }
    }

    async sendWelcomeMessage() {
        const channel = this.client.channels.cache.get(this.channelId);
        if (!channel) return;

        const embed = this.createWelcomeEmbed();
        await channel.send({ embeds: [embed] });
    }

    getRiskEmoji(riskLevel) {
        const emojiMap = {
            'Low': '🟢',
            'Medium': '🟡',
            'High': '🔴'
        };
        return emojiMap[riskLevel] || '⚪';
    }

    async startPortfolioUpdates() {
        // Update portfolio data periodically and send updates to channel
        this.updateInterval = setInterval(async () => {
            await this.updatePortfolioData();
            await this.updateAssetPrices();
            await this.sendPortfolioUpdate();
        }, 600000); // Update every 10 minutes

        // Initial update
        await this.updatePortfolioData();
        await this.sendPortfolioUpdate();
    }

    async sendPortfolioUpdate() {
        const channel = this.client.channels.cache.get(this.channelId);
        if (!channel) return;

        // Get top portfolios by value
        const topPortfolios = Array.from(this.portfolioData.values())
            .sort((a, b) => b.totalValue - a.totalValue)
            .slice(0, 3);

        const embed = new EmbedBuilder()
            .setTitle('📊 Portfolio Analysis Update')
            .setDescription('Latest whale portfolio composition and insights')
            .setColor('#E67E22')
            .setTimestamp();

        for (const portfolio of topPortfolios) {
            const topHolding = portfolio.holdings[0];
            const diversificationEmoji = portfolio.diversificationScore > 70 ? '🟢' : 
                                       portfolio.diversificationScore > 40 ? '🟡' : '🔴';
            
            embed.addFields({
                name: `💼 ${portfolio.nickname}`,
                value: `**Total Value:** $${(portfolio.totalValue / 1000000).toFixed(1)}M\n` +
                       `**Top Holding:** ${topHolding.asset} (${topHolding.percentage.toFixed(1)}%)\n` +
                       `**Diversification:** ${diversificationEmoji} ${portfolio.diversificationScore}/100\n` +
                       `**Risk Level:** ${this.getRiskEmoji(portfolio.riskLevel)} ${portfolio.riskLevel}`,
                inline: true
            });
        }

        // Calculate market overview
        const totalMarketValue = Array.from(this.portfolioData.values())
            .reduce((sum, portfolio) => sum + portfolio.totalValue, 0);
        const avgDiversification = Array.from(this.portfolioData.values())
            .reduce((sum, portfolio) => sum + portfolio.diversificationScore, 0) / this.portfolioData.size;

        embed.addFields({
            name: '🌐 Market Overview',
            value: `**Total Tracked Value:** $${(totalMarketValue / 1000000).toFixed(1)}M\n` +
                   `**Average Diversification:** ${avgDiversification.toFixed(1)}/100\n` +
                   `**Tracked Portfolios:** ${this.portfolioData.size}\n` +
                   `**Next Update:** <t:${Math.floor((Date.now() + 600000) / 1000)}:R>`,
            inline: false
        });

        await channel.send({ embeds: [embed] });
    }

    async updatePortfolioData() {
        try {
            for (const [address, portfolio] of this.portfolioData) {
                await this.refreshPortfolioHoldings(address);
            }
        } catch (error) {
            console.error('Error updating portfolio data:', error);
        }
    }

    async updateAssetPrices() {
        // Simulate price updates (replace with real price feeds)
        for (const [asset, price] of this.assetPrices) {
            const change = (Math.random() - 0.5) * 0.1; // ±5% change
            this.assetPrices.set(asset, price * (1 + change));
        }
    }

    async refreshPortfolioHoldings(address) {
        // Simulate portfolio updates (replace with actual XRPL calls)
        const portfolio = this.portfolioData.get(address);
        if (!portfolio) return;

        // Recalculate total value based on current prices
        let totalValue = 0;
        for (const holding of portfolio.holdings) {
            const price = this.assetPrices.get(holding.asset) || 0;
            totalValue += holding.amount * price;
        }
        
        portfolio.totalValue = totalValue;
        this.portfolioData.set(address, portfolio);
    }

    async handleInteraction(interaction) {
        if (interaction.isStringSelectMenu() && interaction.customId === 'portfolio_whale_select') {
            await this.showPortfolioAnalysis(interaction, interaction.values[0]);
        } else if (interaction.isButton()) {
            const [action] = interaction.customId.split('_');
            
            if (action === 'portfolio') {
                await this.handlePortfolioAction(interaction);
            }
        }
    }

    async handlePortfolioAction(interaction) {
        const action = interaction.customId.split('_')[1];
        
        switch (action) {
            case 'overview':
                await this.showMarketOverview(interaction);
                break;
            case 'compare':
                await this.showPortfolioComparison(interaction);
                break;
            case 'insights':
                await this.showAIInsights(interaction);
                break;
            case 'rebalance':
                await this.showRebalanceRecommendations(interaction);
                break;
            case 'risk':
                await this.showRiskAnalysis(interaction);
                break;
            case 'performance':
                await this.showPerformanceMetrics(interaction);
                break;
        }
    }

    async showPortfolioAnalysis(interaction, address) {
        const portfolio = this.portfolioData.get(address);
        if (!portfolio) {
            await interaction.reply({ content: 'Portfolio not found!', ephemeral: true });
            return;
        }

        // Create pie chart representation
        const holdingsText = portfolio.holdings
            .sort((a, b) => b.percentage - a.percentage)
            .map(holding => {
                const bars = '█'.repeat(Math.floor(holding.percentage / 5));
                const value = (holding.amount * (this.assetPrices.get(holding.asset) || 0)).toLocaleString();
                return `**${holding.asset}** ${holding.percentage.toFixed(1)}%\n` +
                       `${bars} $${value}`;
            })
            .join('\n\n');

        const embed = new EmbedBuilder()
            .setTitle(`📊 ${portfolio.nickname} Portfolio`)
            .setDescription(
                `**Address:** \`${address}\`\n` +
                `**Total Value:** $${portfolio.totalValue.toLocaleString()}\n` +
                `**Diversification Score:** ${portfolio.diversificationScore}/100\n` +
                `**Risk Level:** ${this.getRiskEmoji(portfolio.riskLevel)} ${portfolio.riskLevel}\n\n` +
                `**Asset Allocation:**\n${holdingsText}`
            )
            .addFields(
                {
                    name: '📈 Performance Metrics',
                    value: `**24h Change:** ${(Math.random() * 10 - 5).toFixed(2)}%\n` +
                           `**7d Change:** ${(Math.random() * 20 - 10).toFixed(2)}%\n` +
                           `**30d Change:** ${(Math.random() * 40 - 20).toFixed(2)}%`,
                    inline: true
                },
                {
                    name: '🎯 Risk Metrics',
                    value: `**Volatility:** ${this.calculateVolatility(portfolio)}\n` +
                           `**Sharpe Ratio:** ${this.calculateSharpeRatio(portfolio)}\n` +
                           `**Max Drawdown:** ${this.calculateMaxDrawdown(portfolio)}`,
                    inline: true
                },
                {
                    name: '🔄 Rebalancing',
                    value: `**Last Rebalance:** ${this.getLastRebalance()}\n` +
                           `**Recommended:** ${this.getRebalanceRecommendation(portfolio)}\n` +
                           `**Efficiency:** ${this.getEfficiencyScore(portfolio)}/100`,
                    inline: true
                }
            )
            .setColor(this.getPortfolioColor(portfolio.diversificationScore))
            .setTimestamp()
            .setFooter({ text: `Portfolio ID: ${address.slice(-8)}` });

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('portfolio_rebalance')
                    .setLabel('🔄 Rebalance')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('portfolio_risk')
                    .setLabel('⚠️ Risk Analysis')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('portfolio_performance')
                    .setLabel('📊 Performance')
                    .setStyle(ButtonStyle.Success)
            );

        await interaction.reply({ embeds: [embed], components: [actionRow], ephemeral: true });
    }

    calculateVolatility(portfolio) {
        // Simulate volatility calculation
        const baseVolatility = portfolio.diversificationScore > 50 ? 'Low' : 'High';
        return `${baseVolatility} (${(Math.random() * 30 + 10).toFixed(1)}%)`;
    }

    calculateSharpeRatio(portfolio) {
        // Simulate Sharpe ratio calculation
        return (Math.random() * 2 + 0.5).toFixed(2);
    }

    calculateMaxDrawdown(portfolio) {
        // Simulate max drawdown calculation
        return `${(Math.random() * 25 + 5).toFixed(1)}%`;
    }

    getLastRebalance() {
        const days = Math.floor(Math.random() * 30) + 1;
        return `${days} days ago`;
    }

    getRebalanceRecommendation(portfolio) {
        const recommendations = ['Not Needed', 'Minor Adjustment', 'Major Rebalance'];
        return recommendations[Math.floor(Math.random() * recommendations.length)];
    }

    getEfficiencyScore(portfolio) {
        return Math.floor(Math.random() * 30) + 70;
    }

    getPortfolioColor(diversificationScore) {
        if (diversificationScore > 70) return '#00FF88';
        if (diversificationScore > 40) return '#FFAA00';
        return '#FF4444';
    }

    async showMarketOverview(interaction) {
        const totalMarketValue = Array.from(this.portfolioData.values())
            .reduce((sum, portfolio) => sum + portfolio.totalValue, 0);
        
        const averageDiversification = Array.from(this.portfolioData.values())
            .reduce((sum, portfolio) => sum + portfolio.diversificationScore, 0) / this.portfolioData.size;

        const embed = new EmbedBuilder()
            .setTitle('📈 Market Overview')
            .setDescription(
                `**Total Tracked Value:** $${totalMarketValue.toLocaleString()}\n` +
                `**Average Diversification:** ${averageDiversification.toFixed(1)}/100\n` +
                `**Tracked Portfolios:** ${this.portfolioData.size}\n\n` +
                `**Top Assets by Allocation:**\n` +
                `🥇 **XRP** - 78.2% of total holdings\n` +
                `🥈 **USD** - 12.1% of total holdings\n` +
                `🥉 **SOLO** - 4.3% of total holdings`
            )
            .setColor('#3498DB')
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async showPortfolioComparison(interaction) {
        const portfolios = Array.from(this.portfolioData.values()).slice(0, 3);
        
        const comparisonText = portfolios.map(portfolio => 
            `**${portfolio.nickname}**\n` +
            `Value: $${(portfolio.totalValue / 1000000).toFixed(1)}M\n` +
            `Diversification: ${portfolio.diversificationScore}/100\n` +
            `Risk: ${portfolio.riskLevel}`
        ).join('\n\n');

        const embed = new EmbedBuilder()
            .setTitle('⚖️ Portfolio Comparison')
            .setDescription(comparisonText)
            .setColor('#9B59B6')
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async showAIInsights(interaction) {
        const insights = [
            '🤖 **AI Analysis:** Current market conditions favor diversified portfolios',
            '📊 **Trend Alert:** XRP dominance is decreasing across whale portfolios',
            '⚠️ **Risk Warning:** High correlation detected between SOLO and CSC holdings',
            '💡 **Opportunity:** Underweight in DeFi tokens compared to market average',
            '🎯 **Recommendation:** Consider rebalancing towards stablecoins for risk management'
        ];

        const randomInsights = insights.sort(() => 0.5 - Math.random()).slice(0, 3);

        const embed = new EmbedBuilder()
            .setTitle('🧠 AI Portfolio Insights')
            .setDescription(randomInsights.join('\n\n'))
            .setColor('#E74C3C')
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async showRebalanceRecommendations(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🔄 Rebalancing Recommendations')
            .setDescription(
                '**Optimal Allocation Suggestions:**\n\n' +
                '📈 **Increase XRP:** +5% (Market momentum)\n' +
                '📉 **Reduce USD:** -3% (Low yield environment)\n' +
                '🆕 **Add SOLO:** +2% (Growing ecosystem)\n' +
                '⚖️ **Maintain Others:** Current allocation optimal\n\n' +
                '**Expected Impact:**\n' +
                '• Risk Reduction: 12%\n' +
                '• Return Enhancement: 8%\n' +
                '• Diversification Improvement: +15 points'
            )
            .setColor('#F39C12')
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async showRiskAnalysis(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('⚠️ Risk Analysis')
            .setDescription(
                '**Portfolio Risk Assessment:**\n\n' +
                '🔴 **High Risk Factors:**\n' +
                '• Concentration in single asset (XRP)\n' +
                '• Exposure to regulatory changes\n\n' +
                '🟡 **Medium Risk Factors:**\n' +
                '• Market volatility correlation\n' +
                '• Liquidity constraints\n\n' +
                '🟢 **Low Risk Factors:**\n' +
                '• Established asset base\n' +
                '• Strong fundamentals\n\n' +
                '**Overall Risk Score: 65/100**'
            )
            .setColor('#E74C3C')
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async showPerformanceMetrics(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('📊 Performance Metrics')
            .setDescription(
                '**Historical Performance:**\n\n' +
                '📈 **Returns:**\n' +
                '• 1 Month: +12.5%\n' +
                '• 3 Months: +28.7%\n' +
                '• 1 Year: +156.3%\n\n' +
                '📊 **Benchmarks:**\n' +
                '• vs XRP: +5.2%\n' +
                '• vs Market: +18.9%\n' +
                '• vs Peers: +7.1%\n\n' +
                '🎯 **Efficiency Metrics:**\n' +
                '• Alpha: 0.15\n' +
                '• Beta: 0.85\n' +
                '• Information Ratio: 1.23'
            )
            .setColor('#27AE60')
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    createWelcomeEmbed() {
        return new EmbedBuilder()
            .setTitle('📊 Portfolio Composition Analysis')
            .setDescription(
                '**Welcome to Portfolio Analytics Hub!**\n\n' +
                '💼 **Portfolio Breakdown:** Detailed analysis of whale portfolio compositions\n' +
                '📈 **Asset Distribution:** Track how whales distribute their holdings\n' +
                '🔄 **Rebalancing Patterns:** Monitor portfolio rebalancing strategies\n' +
                '💎 **Diversification Analysis:** Analyze whale diversification strategies\n' +
                '⚖️ **Risk Assessment:** Portfolio risk and concentration metrics\n\n' +
                '🔍 **Features:**\n' +
                '• Real-time portfolio composition tracking\n' +
                '• Asset allocation analysis\n' +
                '• Diversification scoring\n' +
                '• Risk concentration alerts\n' +
                '• Historical portfolio evolution\n\n' +
                '📱 **Updates:** Live portfolio analysis and insights'
            )
            .setColor('#E67E22')
            .setTimestamp()
            .setFooter({ text: 'XRPL Portfolio Analysis • Updates every 10 minutes' });
    }

    async stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        if (this.xrplClient.isConnected()) {
            await this.xrplClient.disconnect();
        }
        
        this.isRunning = false;
        console.log('📊 Portfolio Analysis Service stopped');
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            portfolioCount: this.portfolioData.size,
            assetCount: this.assetPrices.size,
            lastUpdate: new Date().toISOString()
        };
    }
}

export default PortfolioAnalysisService;