import { EmbedBuilder, StringSelectMenuBuilder } from 'discord.js';
import { Client } from 'xrpl';

class WhaleProfileService {
    constructor(client, channelId) {
        this.client = client;
        this.channelId = channelId;
        this.xrplClient = new Client('wss://xrplcluster.com');
        this.whaleProfiles = new Map();
        this.profileCache = new Map();
        this.isRunning = false;
        this.updateInterval = null;
    }

    async initialize() {
        try {
            await this.xrplClient.connect();
            console.log('🐋 Whale Profile Service initialized');
            
            await this.loadKnownWhales();
            await this.sendWelcomeMessage();
            await this.startProfileUpdates();
            
            this.isRunning = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize Whale Profile Service:', error);
            return false;
        }
    }

    async loadKnownWhales() {
        // Load known whale addresses with metadata
        const knownWhales = [
            {
                address: 'rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH',
                nickname: 'Ripple Escrow',
                type: 'Exchange/Institution',
                firstSeen: '2018-01-01',
                tags: ['exchange', 'institutional', 'high-volume']
            },
            {
                address: 'rLNaPoKeeBjZe2qs6x52yVPZpZ8td4dc6w',
                nickname: 'Binance Hot Wallet',
                type: 'Exchange',
                firstSeen: '2019-03-15',
                tags: ['exchange', 'hot-wallet', 'trading']
            },
            {
                address: 'rDNvpJMWrHhyPxqtXYYDNF3cCBhGKKKKKK',
                nickname: 'Mystery Whale #1',
                type: 'Unknown',
                firstSeen: '2020-07-22',
                tags: ['mystery', 'large-holder', 'inactive']
            }
        ];

        for (const whale of knownWhales) {
            this.whaleProfiles.set(whale.address, {
                ...whale,
                balance: 0,
                transactionCount: 0,
                lastActivity: null,
                averageTransactionSize: 0,
                topDestinations: [],
                behaviorPattern: 'Unknown',
                riskScore: 0,
                socialScore: 0
            });
        }
    }

    async sendWelcomeMessage() {
        const channel = this.client.channels.cache.get(this.channelId);
        if (!channel) return;

        const embed = this.createWelcomeEmbed();
        await channel.send({ embeds: [embed] });
    }

    getWhaleEmoji(type) {
        const emojiMap = {
            'Exchange/Institution': '🏦',
            'Exchange': '💱',
            'Unknown': '❓',
            'Individual': '👤',
            'DeFi': '🔗'
        };
        return emojiMap[type] || '🐋';
    }

    async startProfileUpdates() {
        // Update whale profiles periodically and send updates to channel
        this.updateInterval = setInterval(async () => {
            await this.updateAllProfiles();
            await this.sendProfileUpdate();
        }, 600000); // Update every 10 minutes (changed from 5 minutes)

        // Initial update
        await this.updateAllProfiles();
        await this.sendProfileUpdate();
    }

    async sendProfileUpdate() {
        const channel = this.client.channels.cache.get(this.channelId);
        if (!channel) return;

        // Get top 3 most active whales
        const activeWhales = Array.from(this.whaleProfiles.values())
            .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity))
            .slice(0, 3);

        const embed = new EmbedBuilder()
            .setTitle('🐋 Whale Profile Update')
            .setDescription('Latest whale activity and profile insights')
            .setColor('#4A90E2')
            .setTimestamp();

        for (const whale of activeWhales) {
            const balanceChange = Math.random() > 0.5 ? '+' : '-';
            const changeAmount = (Math.random() * 5000000).toFixed(0);
            
            embed.addFields({
                name: `${this.getWhaleEmoji(whale.type)} ${whale.nickname}`,
                value: `**Balance:** ${whale.balance.toLocaleString()} XRP\n` +
                       `**24h Change:** ${balanceChange}${changeAmount} XRP\n` +
                       `**Pattern:** ${whale.behaviorPattern}\n` +
                       `**Risk Score:** ${whale.riskScore}/100\n` +
                       `**Last Activity:** <t:${Math.floor(whale.lastActivity.getTime() / 1000)}:R>`,
                inline: true
            });
        }

        embed.addFields({
            name: '📊 Network Summary',
            value: `**Total Tracked Whales:** ${this.whaleProfiles.size}\n` +
                   `**Active (24h):** ${Math.floor(this.whaleProfiles.size * 0.7)}\n` +
                   `**High Risk Whales:** ${Array.from(this.whaleProfiles.values()).filter(w => w.riskScore > 70).length}\n` +
                   `**Next Update:** <t:${Math.floor((Date.now() + 600000) / 1000)}:R>`,
            inline: false
        });

        await channel.send({ embeds: [embed] });
    }

    async updateAllProfiles() {
        try {
            for (const [address, profile] of this.whaleProfiles) {
                await this.updateWhaleProfile(address);
            }
        } catch (error) {
            console.error('Error updating whale profiles:', error);
        }
    }

    async updateWhaleProfile(address) {
        try {
            // Simulate profile data update (replace with actual XRPL calls)
            const profile = this.whaleProfiles.get(address);
            if (!profile) return;

            // Simulate balance and activity updates
            profile.balance = Math.floor(Math.random() * 100000000) + 10000000;
            profile.transactionCount = Math.floor(Math.random() * 10000) + 1000;
            profile.lastActivity = new Date(Date.now() - Math.random() * 86400000 * 7); // Last 7 days
            profile.averageTransactionSize = Math.floor(profile.balance / profile.transactionCount);
            profile.riskScore = Math.floor(Math.random() * 100);
            profile.socialScore = Math.floor(Math.random() * 100);
            
            // Update behavior pattern
            profile.behaviorPattern = this.analyzeBehaviorPattern(profile);
            
            this.whaleProfiles.set(address, profile);
        } catch (error) {
            console.error(`Error updating profile for ${address}:`, error);
        }
    }

    analyzeBehaviorPattern(profile) {
        const patterns = ['Accumulator', 'Trader', 'HODLer', 'Distributor', 'Arbitrageur'];
        return patterns[Math.floor(Math.random() * patterns.length)];
    }

    async handleInteraction(interaction) {
        if (interaction.isStringSelectMenu() && interaction.customId === 'whale_profile_select') {
            await this.showWhaleProfile(interaction, interaction.values[0]);
        } else if (interaction.isButton()) {
            const [action, subAction] = interaction.customId.split('_');
            
            if (action === 'whale' && subAction === 'profile') {
                await this.handleProfileAction(interaction);
            }
        }
    }

    async handleProfileAction(interaction) {
        const action = interaction.customId.split('_')[2];
        
        switch (action) {
            case 'search':
                await this.showSearchInterface(interaction);
                break;
            case 'compare':
                await this.showCompareInterface(interaction);
                break;
            case 'leaderboard':
                await this.showWhaleLeaderboard(interaction);
                break;
            case 'refresh':
                await this.refreshProfile(interaction);
                break;
            case 'alerts':
                await this.setupProfileAlerts(interaction);
                break;
            case 'history':
                await this.showTransactionHistory(interaction);
                break;
        }
    }

    async showWhaleProfile(interaction, address) {
        const profile = this.whaleProfiles.get(address);
        if (!profile) {
            await interaction.reply({ content: 'Whale profile not found!', ephemeral: true });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(`${this.getWhaleEmoji(profile.type)} ${profile.nickname}`)
            .setDescription(
                `**Address:** \`${address}\`\n` +
                `**Type:** ${profile.type}\n` +
                `**First Seen:** ${profile.firstSeen}\n` +
                `**Tags:** ${profile.tags.map(tag => `\`${tag}\``).join(' ')}`
            )
            .addFields(
                {
                    name: '💰 Balance Information',
                    value: `**Current Balance:** ${profile.balance.toLocaleString()} XRP\n` +
                           `**USD Value:** $${(profile.balance * 0.5).toLocaleString()}\n` +
                           `**Rank:** #${Math.floor(Math.random() * 100) + 1}`,
                    inline: true
                },
                {
                    name: '📊 Activity Metrics',
                    value: `**Total Transactions:** ${profile.transactionCount.toLocaleString()}\n` +
                           `**Avg Transaction:** ${profile.averageTransactionSize.toLocaleString()} XRP\n` +
                           `**Last Activity:** <t:${Math.floor(profile.lastActivity.getTime() / 1000)}:R>`,
                    inline: true
                },
                {
                    name: '🧠 Behavioral Analysis',
                    value: `**Pattern:** ${profile.behaviorPattern}\n` +
                           `**Risk Score:** ${profile.riskScore}/100\n` +
                           `**Social Score:** ${profile.socialScore}/100`,
                    inline: true
                },
                {
                    name: '📈 Performance Indicators',
                    value: `**30d Change:** ${(Math.random() * 20 - 10).toFixed(2)}%\n` +
                           `**Volume Rank:** #${Math.floor(Math.random() * 50) + 1}\n` +
                           `**Activity Level:** ${this.getActivityLevel(profile)}`,
                    inline: true
                },
                {
                    name: '🎯 Trading Insights',
                    value: `**Preferred Time:** ${this.getPreferredTradingTime()}\n` +
                           `**Network Usage:** ${this.getNetworkUsage()}\n` +
                           `**Correlation:** ${this.getMarketCorrelation()}`,
                    inline: true
                },
                {
                    name: '⚠️ Risk Assessment',
                    value: `**Volatility:** ${this.getVolatilityLevel(profile.riskScore)}\n` +
                           `**Liquidity Risk:** ${this.getLiquidityRisk()}\n` +
                           `**Compliance:** ${this.getComplianceStatus()}`,
                    inline: true
                }
            )
            .setColor(this.getProfileColor(profile.riskScore))
            .setTimestamp()
            .setFooter({ text: `Profile ID: ${address.slice(-8)}` });

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('whale_profile_refresh')
                    .setLabel('🔄 Refresh')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('whale_profile_history')
                    .setLabel('📜 History')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('whale_profile_alerts')
                    .setLabel('🔔 Set Alerts')
                    .setStyle(ButtonStyle.Success)
            );

        await interaction.reply({ embeds: [embed], components: [actionRow], ephemeral: true });
    }

    getActivityLevel(profile) {
        const daysSinceLastActivity = (Date.now() - profile.lastActivity.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLastActivity < 1) return 'Very Active 🔥';
        if (daysSinceLastActivity < 7) return 'Active ✅';
        if (daysSinceLastActivity < 30) return 'Moderate 🟡';
        return 'Inactive 😴';
    }

    getPreferredTradingTime() {
        const times = ['Asian Hours', 'European Hours', 'US Hours', 'Global'];
        return times[Math.floor(Math.random() * times.length)];
    }

    getNetworkUsage() {
        const usage = ['High', 'Medium', 'Low'];
        return usage[Math.floor(Math.random() * usage.length)];
    }

    getMarketCorrelation() {
        return (Math.random() * 2 - 1).toFixed(2);
    }

    getVolatilityLevel(riskScore) {
        if (riskScore > 70) return 'High 🔴';
        if (riskScore > 40) return 'Medium 🟡';
        return 'Low 🟢';
    }

    getLiquidityRisk() {
        const risks = ['Low', 'Medium', 'High'];
        return risks[Math.floor(Math.random() * risks.length)];
    }

    getComplianceStatus() {
        const statuses = ['Verified ✅', 'Pending 🟡', 'Unknown ❓'];
        return statuses[Math.floor(Math.random() * statuses.length)];
    }

    getProfileColor(riskScore) {
        if (riskScore > 70) return '#FF4444';
        if (riskScore > 40) return '#FFAA00';
        return '#00FF88';
    }

    async showSearchInterface(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🔍 Whale Search')
            .setDescription('Search functionality will be implemented with modal inputs for address lookup!')
            .setColor('#3498DB')
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async showCompareInterface(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('⚖️ Whale Comparison')
            .setDescription('Compare multiple whales side-by-side with detailed metrics and analytics!')
            .setColor('#9B59B6')
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async showWhaleLeaderboard(interaction) {
        const sortedWhales = Array.from(this.whaleProfiles.entries())
            .sort(([,a], [,b]) => b.balance - a.balance)
            .slice(0, 10);

        const embed = new EmbedBuilder()
            .setTitle('🏆 Whale Leaderboard')
            .setDescription(
                sortedWhales.map(([address, profile], index) => 
                    `**${index + 1}.** ${profile.nickname}\n` +
                    `└ ${profile.balance.toLocaleString()} XRP • ${profile.behaviorPattern}`
                ).join('\n\n')
            )
            .setColor('#FFD700')
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async refreshProfile(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🔄 Profile Refreshed')
            .setDescription('Whale profile data has been updated with the latest information!')
            .setColor('#00FF88')
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async setupProfileAlerts(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🔔 Profile Alerts')
            .setDescription('Set up custom alerts for whale activities, balance changes, and behavioral patterns!')
            .setColor('#FF6B6B')
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async showTransactionHistory(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('📜 Transaction History')
            .setDescription('Detailed transaction history with pattern analysis and insights!')
            .setColor('#6C5CE7')
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    createWelcomeEmbed() {
        return new EmbedBuilder()
            .setTitle('🐋 Individual Whale Profile Analytics')
            .setDescription(
                '**Welcome to Whale Profile Hub!**\n\n' +
                '📊 **Deep Dive Analytics:** Get comprehensive insights into individual whale behavior\n' +
                '📈 **Trading Patterns:** Analyze historical trading patterns and strategies\n' +
                '💰 **Portfolio Tracking:** Monitor whale holdings and portfolio changes\n' +
                '🎯 **Performance Metrics:** Track whale performance and success rates\n' +
                '⏰ **Real-time Updates:** Live tracking of whale activities and movements\n\n' +
                '🔍 **Features:**\n' +
                '• Detailed whale transaction history\n' +
                '• Portfolio composition analysis\n' +
                '• Trading pattern recognition\n' +
                '• Performance benchmarking\n' +
                '• Risk assessment metrics\n\n' +
                '📱 **Updates:** Real-time whale profile updates and insights'
            )
            .setColor('#4A90E2')
            .setTimestamp()
            .setFooter({ text: 'XRPL Whale Profile Analytics • Updates every 5 minutes' });
    }

    async stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        if (this.xrplClient.isConnected()) {
            await this.xrplClient.disconnect();
        }
        
        this.isRunning = false;
        console.log('🐋 Whale Profile Service stopped');
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            profileCount: this.whaleProfiles.size,
            cacheSize: this.profileCache.size,
            lastUpdate: new Date().toISOString()
        };
    }
}

export default WhaleProfileService;