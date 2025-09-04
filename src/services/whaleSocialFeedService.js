import { EmbedBuilder } from 'discord.js';
import { Client } from 'xrpl';

class WhaleSocialFeedService {
    constructor(client, channelId) {
        this.client = client;
        this.channelId = channelId;
        this.xrplClient = new Client('wss://xrplcluster.com');
        this.feedData = {
            recentMovements: [],
            userReactions: new Map(),
            communityPredictions: new Map(),
            trendingWhales: new Set()
        };
        this.isRunning = false;
        this.updateInterval = null;
    }

    async initialize() {
        try {
            await this.xrplClient.connect();
            console.log('🐋 Whale Social Feed Service initialized');
            
            await this.sendWelcomeMessage();
            await this.startFeedUpdates();
            
            this.isRunning = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize Whale Social Feed Service:', error);
            return false;
        }
    }

    async sendWelcomeMessage() {
        const channel = this.client.channels.cache.get(this.channelId);
        if (!channel) return;

        const embed = this.createWelcomeEmbed();
        
        await channel.send({ embeds: [embed] });
    }

    async sendWhaleMovementAlert(movement) {
        const channel = this.client.channels.cache.get(this.channelId);
        if (!channel) return;

        const embed = this.createMovementEmbed(movement);
        
        const message = await channel.send({ embeds: [embed] });
        
        // Store movement for community interactions
        this.feedData.recentMovements.unshift({
            ...movement,
            messageId: message.id,
            timestamp: Date.now()
        });
        
        // Keep only last 50 movements
        if (this.feedData.recentMovements.length > 50) {
            this.feedData.recentMovements = this.feedData.recentMovements.slice(0, 50);
        }
    }

    async startFeedUpdates() {
        // Monitor whale transactions in real-time
        this.updateInterval = setInterval(async () => {
            await this.checkWhaleMovements();
            await this.updateTrendingWhales();
        }, 30000); // Check every 30 seconds

        // Initial load
        await this.checkWhaleMovements();
    }

    async checkWhaleMovements() {
        try {
            // Simulate whale movement detection (replace with actual XRPL monitoring)
            const whaleMovements = await this.detectWhaleMovements();
            
            for (const movement of whaleMovements) {
                await this.postWhaleMovement(movement);
            }
        } catch (error) {
            console.error('Error checking whale movements:', error);
        }
    }

    async detectWhaleMovements() {
        // This would connect to XRPL and monitor large transactions
        // For now, returning simulated data
        const movements = [];
        
        // Simulate random whale movements
        if (Math.random() > 0.7) {
            const whaleAddresses = [
                'rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH',
                'rLNaPoKeeBjZe2qs6x52yVPZpZ8td4dc6w',
                'rDNvpJMWrHhyPxqtXYYDNF3cCBhGKKKKKK'
            ];
            
            const movement = {
                whale: whaleAddresses[Math.floor(Math.random() * whaleAddresses.length)],
                amount: (Math.random() * 10000000 + 1000000).toFixed(0),
                type: Math.random() > 0.5 ? 'incoming' : 'outgoing',
                timestamp: new Date(),
                txHash: 'TX' + Math.random().toString(36).substr(2, 9).toUpperCase(),
                destination: whaleAddresses[Math.floor(Math.random() * whaleAddresses.length)]
            };
            
            movements.push(movement);
        }
        
        return movements;
    }

    async postWhaleMovement(movement) {
        const channel = this.client.channels.cache.get(this.channelId);
        if (!channel) return;

        const emoji = movement.type === 'incoming' ? '📈' : '📉';
        const color = movement.type === 'incoming' ? '#00FF88' : '#FF4444';
        const direction = movement.type === 'incoming' ? 'RECEIVED' : 'SENT';
        
        const embed = new EmbedBuilder()
            .setTitle(`${emoji} Whale Movement Alert`)
            .setDescription(
                `**${direction}:** ${parseInt(movement.amount).toLocaleString()} XRP\n` +
                `**Whale:** \`${movement.whale.slice(0, 8)}...${movement.whale.slice(-8)}\`\n` +
                `**Transaction:** [${movement.txHash}](https://livenet.xrpl.org/transactions/${movement.txHash})\n` +
                `**Time:** <t:${Math.floor(movement.timestamp.getTime() / 1000)}:R>\n\n` +
                `💭 **What do you think this means?**`
            )
            .setColor(color)
            .setTimestamp()
            .setFooter({ text: `Movement ID: ${movement.txHash}` });

        const message = await channel.send({ embeds: [embed] });
        
        // Store movement for tracking
        this.feedData.recentMovements.push({
            ...movement,
            messageId: message.id,
            reactions: { bullish: 0, bearish: 0, neutral: 0 },
            predictions: []
        });

        // Keep only last 50 movements
        if (this.feedData.recentMovements.length > 50) {
            this.feedData.recentMovements.shift();
        }
    }

    async handleButtonInteraction(interaction) {
        const [action, sentiment, txHash] = interaction.customId.split('_');
        
        if (action === 'whale') {
            switch (sentiment) {
                case 'feed':
                    await this.handleFeedAction(interaction, txHash);
                    break;
                case 'react':
                    await this.handleReaction(interaction, txHash);
                    break;
                case 'predict':
                    await this.handlePrediction(interaction, txHash);
                    break;
            }
        }
    }

    async handleFeedAction(interaction, action) {
        switch (action) {
            case 'refresh':
                await this.sendFeedSummary(interaction);
                break;
            case 'trending':
                await this.sendTrendingWhales(interaction);
                break;
            case 'predictions':
                await this.sendCommunityPredictions(interaction);
                break;
        }
    }

    async handleReaction(interaction, txHash) {
        const userId = interaction.user.id;
        const sentiment = interaction.customId.split('_')[2];
        
        // Store user reaction
        if (!this.feedData.userReactions.has(txHash)) {
            this.feedData.userReactions.set(txHash, new Map());
        }
        
        this.feedData.userReactions.get(txHash).set(userId, sentiment);
        
        // Update movement data
        const movement = this.feedData.recentMovements.find(m => m.txHash === txHash);
        if (movement) {
            movement.reactions[sentiment]++;
        }
        
        const embed = new EmbedBuilder()
            .setTitle('✅ Reaction Recorded')
            .setDescription(`Your **${sentiment}** sentiment has been recorded for this whale movement!`)
            .setColor('#00FF88')
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async handlePrediction(interaction, txHash) {
        // This would open a modal for prediction input
        const embed = new EmbedBuilder()
            .setTitle('🔮 Prediction Feature')
            .setDescription('Prediction functionality will be implemented with modal inputs for detailed predictions!')
            .setColor('#9B59B6')
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async sendFeedSummary(interaction) {
        const recentCount = this.feedData.recentMovements.length;
        const totalVolume = this.feedData.recentMovements.reduce((sum, m) => sum + parseInt(m.amount), 0);
        
        const embed = new EmbedBuilder()
            .setTitle('📊 Feed Summary')
            .setDescription(
                `**Recent Activity (Last Hour):**\n` +
                `• **Movements:** ${recentCount}\n` +
                `• **Total Volume:** ${totalVolume.toLocaleString()} XRP\n` +
                `• **Community Reactions:** ${this.feedData.userReactions.size}\n` +
                `• **Active Predictions:** ${this.feedData.communityPredictions.size}\n\n` +
                `🔥 **Most Active Whales:** ${Array.from(this.feedData.trendingWhales).slice(0, 3).join(', ')}`
            )
            .setColor('#3498DB')
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async sendTrendingWhales(interaction) {
        const trending = Array.from(this.feedData.trendingWhales).slice(0, 5);
        
        const embed = new EmbedBuilder()
            .setTitle('🔥 Trending Whales')
            .setDescription(
                trending.length > 0 
                    ? trending.map((whale, i) => `${i + 1}. \`${whale.slice(0, 8)}...${whale.slice(-8)}\``).join('\n')
                    : 'No trending whales at the moment. Check back soon!'
            )
            .setColor('#E74C3C')
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async sendCommunityPredictions(interaction) {
        const predictions = Array.from(this.feedData.communityPredictions.entries()).slice(0, 5);
        
        const embed = new EmbedBuilder()
            .setTitle('🔮 Community Predictions')
            .setDescription(
                predictions.length > 0
                    ? predictions.map(([tx, pred]) => `**${tx}:** ${pred.prediction}`).join('\n\n')
                    : 'No community predictions yet. Be the first to make a prediction!'
            )
            .setColor('#9B59B6')
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async updateTrendingWhales() {
        // Update trending whales based on recent activity
        const recentWhales = this.feedData.recentMovements
            .filter(m => Date.now() - m.timestamp.getTime() < 3600000) // Last hour
            .map(m => m.whale);
        
        this.feedData.trendingWhales = new Set(recentWhales);
    }

    createWelcomeEmbed() {
        return new EmbedBuilder()
            .setTitle('📱 XRPL Whale Social Feed')
            .setDescription(
                '**Welcome to the Whale Social Hub!**\n\n' +
                '🐋 **Live Feed** of whale movements\n' +
                '💬 **Community Reactions** to whale activities\n' +
                '🔮 **Predictions** and sentiment tracking\n' +
                '📊 **Trending Whales** based on activity\n\n' +
                '**Movement Threshold:** 100K+ XRP\n' +
                '**Update Frequency:** Real-time\n' +
                '**Community Features:** Reactions & Predictions'
            )
            .setColor('#FF6B6B')
            .setThumbnail('https://cryptologos.cc/logos/xrp-xrp-logo.png')
            .setTimestamp()
            .setFooter({ 
                text: 'XRPL Whale Social Feed • Live Community Data', 
                iconURL: 'https://cryptologos.cc/logos/xrp-xrp-logo.png' 
            });
    }

    createMovementEmbed(movement) {
        const embed = new EmbedBuilder()
            .setTitle('🐋 Whale Movement Detected')
            .setDescription(
                `**Whale:** \`${movement.whale}\`\n` +
                `**Amount:** ${parseInt(movement.amount).toLocaleString()} XRP\n` +
                `**Type:** ${movement.type}\n` +
                `**Value:** $${(parseInt(movement.amount) * 0.5).toLocaleString()}\n` +
                `**Transaction:** \`${movement.txHash}\`\n\n` +
                `**Impact Level:** ${this.getImpactLevel(movement.amount)}`
            )
            .setColor(movement.type === 'buy' ? '#00FF88' : '#FF4444')
            .setTimestamp()
            .setFooter({ 
                text: 'XRPL Whale Movement • Live Data', 
                iconURL: 'https://cryptologos.cc/logos/xrp-xrp-logo.png' 
            });
        
        return embed;
    }

    getImpactLevel(amount) {
        const amountNum = parseInt(amount);
        if (amountNum >= 10000000) return '🔥 MASSIVE';
        if (amountNum >= 5000000) return '⚡ MAJOR';
        if (amountNum >= 1000000) return '📈 SIGNIFICANT';
        return '📊 NOTABLE';
    }

    async stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        if (this.xrplClient.isConnected()) {
            await this.xrplClient.disconnect();
        }
        
        this.isRunning = false;
        console.log('🐋 Whale Social Feed Service stopped');
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            recentMovements: this.feedData.recentMovements.length,
            userReactions: this.feedData.userReactions.size,
            trendingWhales: this.feedData.trendingWhales.size,
            communityPredictions: this.feedData.communityPredictions.size
        };
    }
}

export default WhaleSocialFeedService;