import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { Client as XrplClient } from 'xrpl';

export class CommunityFeaturesService {
    constructor(client, channelId) {
        this.client = client;
        this.channelId = channelId;
        this.xrplClient = new XrplClient('wss://xrplcluster.com');
        
        // Community data storage
        this.discussions = new Map();
        this.predictions = new Map();
        this.userStats = new Map();
        this.achievements = new Map();
        this.polls = new Map();
        
        // Leaderboard categories
        this.leaderboards = {
            predictions: new Map(),
            discussions: new Map(),
            engagement: new Map(),
            achievements: new Map()
        };
        
        // Achievement definitions
        this.achievementTypes = {
            'first_prediction': { name: '🔮 First Prophet', description: 'Made your first prediction', points: 10 },
            'accurate_predictor': { name: '🎯 Accurate Predictor', description: '5 correct predictions', points: 50 },
            'discussion_starter': { name: '💬 Discussion Starter', description: 'Started 10 discussions', points: 30 },
            'community_helper': { name: '🤝 Community Helper', description: 'Helped 20 community members', points: 40 },
            'whale_spotter': { name: '🐋 Whale Spotter', description: 'Spotted 5 whale movements first', points: 60 },
            'trend_setter': { name: '📈 Trend Setter', description: 'Predicted 3 major trends', points: 100 }
        };
        
        this.updateInterval = null;
        
        // Initialize with sample data
        this.initializeSampleData();
    }
    
    initializeSampleData() {
        // Add sample discussions
        const sampleDiscussions = [
            {
                id: 'disc_sample_1',
                title: 'XRP Whale Movement Analysis',
                content: 'Large whale movements detected on XRPL. What are your thoughts on the market impact?',
                tags: ['whale', 'analysis', 'market'],
                author: 'system',
                createdAt: Date.now() - (2 * 60 * 60 * 1000), // 2 hours ago
                lastActivity: Date.now() - (30 * 60 * 1000), // 30 min ago
                replies: [],
                reactions: { likes: 15, dislikes: 2 }
            },
            {
                id: 'disc_sample_2',
                title: 'XRPL DEX Trading Patterns',
                content: 'Interesting arbitrage opportunities emerging across different DEX pairs.',
                tags: ['dex', 'trading', 'arbitrage'],
                author: 'system',
                createdAt: Date.now() - (4 * 60 * 60 * 1000), // 4 hours ago
                lastActivity: Date.now() - (1 * 60 * 60 * 1000), // 1 hour ago
                replies: [],
                reactions: { likes: 8, dislikes: 1 }
            }
        ];
        
        sampleDiscussions.forEach(disc => {
            this.discussions.set(disc.id, disc);
        });
        
        // Add sample predictions
        const samplePredictions = [
            {
                id: 'pred_sample_1',
                title: 'XRP Price Movement',
                content: 'Predicting XRP will reach $0.65 within the next 7 days based on whale accumulation patterns.',
                timeframe: '7 days',
                confidence: 8,
                author: 'system',
                createdAt: Date.now() - (6 * 60 * 60 * 1000), // 6 hours ago
                resolved: false,
                correct: null,
                votes: { bullish: 12, bearish: 3, neutral: 5 },
                voters: new Set()
            },
            {
                id: 'pred_sample_2',
                title: 'Whale Accumulation Phase',
                content: 'Major whales will continue accumulating for the next 2 weeks before significant price movement.',
                timeframe: '2 weeks',
                confidence: 7,
                author: 'system',
                createdAt: Date.now() - (12 * 60 * 60 * 1000), // 12 hours ago
                resolved: false,
                correct: null,
                votes: { bullish: 18, bearish: 2, neutral: 4 },
                voters: new Set()
            }
        ];
        
        samplePredictions.forEach(pred => {
            this.predictions.set(pred.id, pred);
        });
        
        // Add sample user stats
        const sampleUsers = [
            {
                userId: 'sample_user_1',
                stats: {
                    totalPoints: 150,
                    correctPredictions: 8,
                    totalPredictions: 12,
                    discussionsStarted: 5,
                    achievements: ['first_prediction', 'discussion_starter'],
                    lastActivity: Date.now() - (30 * 60 * 1000)
                }
            },
            {
                userId: 'sample_user_2',
                stats: {
                    totalPoints: 220,
                    correctPredictions: 12,
                    totalPredictions: 15,
                    discussionsStarted: 8,
                    achievements: ['first_prediction', 'accurate_predictor'],
                    lastActivity: Date.now() - (45 * 60 * 1000)
                }
            },
            {
                userId: 'sample_user_3',
                stats: {
                    totalPoints: 95,
                    correctPredictions: 4,
                    totalPredictions: 8,
                    discussionsStarted: 3,
                    achievements: ['first_prediction'],
                    lastActivity: Date.now() - (2 * 60 * 60 * 1000)
                }
            }
        ];
        
        sampleUsers.forEach(user => {
            this.userStats.set(user.userId, user.stats);
        });
    }
    
    async start() {
        try {
            await this.xrplClient.connect();
            console.log('Community Features Service: XRPL client connected');
            
            await this.sendWelcomeMessage();
            await this.startPeriodicUpdates();
            
            // Set up button interaction handlers
            this.setupInteractionHandlers();
            
            console.log('🏆 Community Features Service started successfully');
        } catch (error) {
            console.error('Community Features Service startup error:', error);
        }
    }
    
    async stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        if (this.xrplClient.isConnected()) {
            await this.xrplClient.disconnect();
        }
        console.log('Community Features Service stopped');
    }
    
    async sendWelcomeMessage() {
        const channel = this.client.channels.cache.get(this.channelId);
        if (!channel) return;
        
        const embed = this.createWelcomeEmbed();
        const buttons = this.createActionButtons();
        
        await channel.send({ embeds: [embed], components: [buttons] });
    }
    
    createActionButtons() {
        return new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('community_start_discussion')
                    .setLabel('💬 Start Discussion')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('community_make_prediction')
                    .setLabel('🔮 Make Prediction')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('community_view_leaderboard')
                    .setLabel('🏆 Leaderboard')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('community_view_analytics')
                    .setLabel('📊 Analytics')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('community_help')
                    .setLabel('❓ Help')
                    .setStyle(ButtonStyle.Secondary)
            );
    }
    
    async startPeriodicUpdates() {
        // Update community stats every 30 minutes
        this.updateInterval = setInterval(async () => {
            await this.updateCommunityStats();
        }, 30 * 60 * 1000);
        
        // Send initial update
        await this.updateCommunityStats();
    }
    
    async updateCommunityStats() {
        try {
            const channel = this.client.channels.cache.get(this.channelId);
            if (!channel) return;
            
            const stats = this.calculateCommunityStats();
            
            const embed = new EmbedBuilder()
                .setTitle('📊 Community Activity Summary')
                .setColor('#4169E1')
                .addFields(
                    { name: '💬 Active Discussions', value: stats.activeDiscussions.toString(), inline: true },
                    { name: '🔮 Predictions Made', value: stats.totalPredictions.toString(), inline: true },
                    { name: '👥 Active Members', value: stats.activeMembers.toString(), inline: true },
                    { name: '🎯 Prediction Accuracy', value: `${stats.predictionAccuracy}%`, inline: true },
                    { name: '🏆 Top Contributor', value: stats.topContributor || 'None yet', inline: true },
                    { name: '📈 Engagement Score', value: stats.engagementScore.toString(), inline: true }
                )
                .setFooter({ text: 'Updated every 30 minutes' })
                .setTimestamp();
            
            await channel.send({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error updating community stats:', error);
        }
    }
    
    calculateCommunityStats() {
        const now = Date.now();
        const dayAgo = now - (24 * 60 * 60 * 1000);
        
        // Calculate active discussions (last 24h)
        const activeDiscussions = Array.from(this.discussions.values())
            .filter(d => d.lastActivity > dayAgo).length;
        
        // Calculate total predictions
        const totalPredictions = this.predictions.size;
        
        // Calculate active members (last 24h)
        const activeMembers = Array.from(this.userStats.values())
            .filter(u => u.lastActivity > dayAgo).length;
        
        // Calculate prediction accuracy
        const resolvedPredictions = Array.from(this.predictions.values())
            .filter(p => p.resolved);
        const correctPredictions = resolvedPredictions.filter(p => p.correct).length;
        const predictionAccuracy = resolvedPredictions.length > 0 
            ? Math.round((correctPredictions / resolvedPredictions.length) * 100) 
            : 0;
        
        // Find top contributor
        const topContributor = Array.from(this.userStats.entries())
            .sort(([,a], [,b]) => b.totalPoints - a.totalPoints)[0];
        
        // Calculate engagement score
        const engagementScore = Math.round(
            (activeDiscussions * 10) + 
            (totalPredictions * 5) + 
            (activeMembers * 3) + 
            (predictionAccuracy * 2)
        );
        
        return {
            activeDiscussions,
            totalPredictions,
            activeMembers,
            predictionAccuracy,
            topContributor: topContributor ? `<@${topContributor[0]}>` : null,
            engagementScore
        };
    }
    
    setupInteractionHandlers() {
        this.client.on('interactionCreate', async (interaction) => {
            if (!interaction.isButton() && !interaction.isModalSubmit()) return;
            if (interaction.channelId !== this.channelId) return;
            
            try {
                if (interaction.isButton()) {
                    await this.handleButtonInteraction(interaction);
                } else if (interaction.isModalSubmit()) {
                    await this.handleModalSubmit(interaction);
                }
            } catch (error) {
                console.error('Community Features interaction error:', error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ 
                        content: '❌ An error occurred processing your request.', 
                        ephemeral: true 
                    });
                }
            }
        });
    }
    
    async handleButtonInteraction(interaction) {
        const { customId, user } = interaction;
        
        switch (customId) {
            case 'community_start_discussion':
                await this.showDiscussionModal(interaction);
                break;
            case 'community_make_prediction':
                await this.showPredictionModal(interaction);
                break;
            case 'community_view_leaderboard':
                await this.showLeaderboards(interaction);
                break;
            case 'community_view_achievements':
                await this.showAchievements(interaction, user.id);
                break;
            case 'community_create_poll':
                await this.showPollModal(interaction);
                break;
            case 'community_view_analytics':
                await this.showAnalytics(interaction);
                break;
            case 'community_help':
                await this.showHelp(interaction);
                break;
            default:
                if (customId.startsWith('vote_')) {
                    await this.handleVote(interaction);
                } else if (customId.startsWith('prediction_')) {
                    await this.handlePredictionAction(interaction);
                }
                break;
        }
    }
    
    async showDiscussionModal(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('discussion_modal')
            .setTitle('Start a New Discussion');
        
        const titleInput = new TextInputBuilder()
            .setCustomId('discussion_title')
            .setLabel('Discussion Title')
            .setStyle(TextInputStyle.Short)
            .setMaxLength(100)
            .setRequired(true);
        
        const contentInput = new TextInputBuilder()
            .setCustomId('discussion_content')
            .setLabel('Discussion Content')
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(1000)
            .setRequired(true);
        
        const tagsInput = new TextInputBuilder()
            .setCustomId('discussion_tags')
            .setLabel('Tags (comma-separated)')
            .setStyle(TextInputStyle.Short)
            .setMaxLength(200)
            .setRequired(false)
            .setPlaceholder('whale-movement, prediction, analysis');
        
        modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(contentInput),
            new ActionRowBuilder().addComponents(tagsInput)
        );
        
        await interaction.showModal(modal);
    }
    
    async showPredictionModal(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('prediction_modal')
            .setTitle('Make a Prediction');
        
        const titleInput = new TextInputBuilder()
            .setCustomId('prediction_title')
            .setLabel('Prediction Title')
            .setStyle(TextInputStyle.Short)
            .setMaxLength(100)
            .setRequired(true);
        
        const predictionInput = new TextInputBuilder()
            .setCustomId('prediction_content')
            .setLabel('Your Prediction')
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(500)
            .setRequired(true);
        
        const timeframeInput = new TextInputBuilder()
            .setCustomId('prediction_timeframe')
            .setLabel('Timeframe (e.g., 24h, 1w, 1m)')
            .setStyle(TextInputStyle.Short)
            .setMaxLength(20)
            .setRequired(true);
        
        const confidenceInput = new TextInputBuilder()
            .setCustomId('prediction_confidence')
            .setLabel('Confidence Level (1-10)')
            .setStyle(TextInputStyle.Short)
            .setMaxLength(2)
            .setRequired(true)
            .setPlaceholder('8');
        
        modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(predictionInput),
            new ActionRowBuilder().addComponents(timeframeInput),
            new ActionRowBuilder().addComponents(confidenceInput)
        );
        
        await interaction.showModal(modal);
    }
    
    async handleModalSubmit(interaction) {
        const { customId, user } = interaction;
        
        if (customId === 'discussion_modal') {
            await this.createDiscussion(interaction);
        } else if (customId === 'prediction_modal') {
            await this.createPrediction(interaction);
        } else if (customId === 'poll_modal') {
            await this.createPoll(interaction);
        }
    }
    
    async createDiscussion(interaction) {
        const title = interaction.fields.getTextInputValue('discussion_title');
        const content = interaction.fields.getTextInputValue('discussion_content');
        const tags = interaction.fields.getTextInputValue('discussion_tags') || '';
        
        const discussionId = `disc_${Date.now()}_${interaction.user.id}`;
        
        const discussion = {
            id: discussionId,
            title,
            content,
            tags: tags.split(',').map(t => t.trim()).filter(t => t),
            author: interaction.user.id,
            createdAt: Date.now(),
            lastActivity: Date.now(),
            replies: [],
            reactions: { likes: 0, dislikes: 0 }
        };
        
        this.discussions.set(discussionId, discussion);
        
        // Update user stats
        this.updateUserStats(interaction.user.id, 'discussion_created', 10);
        
        // Check for achievements
        await this.checkAchievements(interaction.user.id, 'discussion_starter');
        
        const embed = new EmbedBuilder()
            .setTitle(`💬 ${title}`)
            .setDescription(content)
            .setColor('#00ff88')
            .setAuthor({ name: interaction.user.displayName, iconURL: interaction.user.displayAvatarURL() })
            .addFields(
                { name: '🏷️ Tags', value: tags || 'None', inline: true },
                { name: '📅 Created', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
            )
            .setFooter({ text: `Discussion ID: ${discussionId}` });
        
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`discussion_like_${discussionId}`)
                    .setLabel('👍 Like')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`discussion_reply_${discussionId}`)
                    .setLabel('💬 Reply')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`discussion_share_${discussionId}`)
                    .setLabel('📤 Share')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        await interaction.reply({ embeds: [embed], components: [buttons] });
    }
    
    async createPrediction(interaction) {
        const title = interaction.fields.getTextInputValue('prediction_title');
        const content = interaction.fields.getTextInputValue('prediction_content');
        const timeframe = interaction.fields.getTextInputValue('prediction_timeframe');
        const confidence = parseInt(interaction.fields.getTextInputValue('prediction_confidence'));
        
        if (confidence < 1 || confidence > 10) {
            return await interaction.reply({ 
                content: '❌ Confidence level must be between 1 and 10.', 
                ephemeral: true 
            });
        }
        
        const predictionId = `pred_${Date.now()}_${interaction.user.id}`;
        
        const prediction = {
            id: predictionId,
            title,
            content,
            timeframe,
            confidence,
            author: interaction.user.id,
            createdAt: Date.now(),
            resolved: false,
            correct: null,
            votes: { bullish: 0, bearish: 0, neutral: 0 },
            voters: new Set()
        };
        
        this.predictions.set(predictionId, prediction);
        
        // Update user stats
        this.updateUserStats(interaction.user.id, 'prediction_made', 15);
        
        // Check for achievements
        await this.checkAchievements(interaction.user.id, 'first_prediction');
        
        const embed = new EmbedBuilder()
            .setTitle(`🔮 ${title}`)
            .setDescription(content)
            .setColor('#4169E1')
            .setAuthor({ name: interaction.user.displayName, iconURL: interaction.user.displayAvatarURL() })
            .addFields(
                { name: '⏰ Timeframe', value: timeframe, inline: true },
                { name: '🎯 Confidence', value: `${confidence}/10`, inline: true },
                { name: '📊 Community Sentiment', value: 'Vote below!', inline: true }
            )
            .setFooter({ text: `Prediction ID: ${predictionId}` });
        
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`vote_bullish_${predictionId}`)
                    .setLabel('📈 Bullish')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`vote_bearish_${predictionId}`)
                    .setLabel('📉 Bearish')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`vote_neutral_${predictionId}`)
                    .setLabel('➡️ Neutral')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        await interaction.reply({ embeds: [embed], components: [buttons] });
    }
    
    async showLeaderboards(interaction) {
        const topPredictors = Array.from(this.userStats.entries())
            .sort(([,a], [,b]) => b.correctPredictions - a.correctPredictions)
            .slice(0, 10);
        
        const topContributors = Array.from(this.userStats.entries())
            .sort(([,a], [,b]) => b.totalPoints - a.totalPoints)
            .slice(0, 10);
        
        const embed = new EmbedBuilder()
            .setTitle('🏆 Community Leaderboards')
            .setColor('#FFD700')
            .addFields(
                {
                    name: '🎯 Top Predictors',
                    value: topPredictors.length > 0 
                        ? topPredictors.map(([userId, stats], i) => 
                            `${i + 1}. <@${userId}> - ${stats.correctPredictions} correct`
                          ).join('\n')
                        : 'No predictions yet',
                    inline: true
                },
                {
                    name: '⭐ Top Contributors',
                    value: topContributors.length > 0
                        ? topContributors.map(([userId, stats], i) => 
                            `${i + 1}. <@${userId}> - ${stats.totalPoints} points`
                          ).join('\n')
                        : 'No contributors yet',
                    inline: true
                }
            )
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
    
    async showAchievements(interaction, userId) {
        const userStats = this.userStats.get(userId) || { achievements: [], totalPoints: 0 };
        const userAchievements = userStats.achievements || [];
        
        const embed = new EmbedBuilder()
            .setTitle('🎖️ Your Achievements')
            .setColor('#9932CC')
            .setDescription(`Total Points: **${userStats.totalPoints}**`)
            .addFields(
                {
                    name: '🏅 Unlocked Achievements',
                    value: userAchievements.length > 0
                        ? userAchievements.map(achId => {
                            const ach = this.achievementTypes[achId];
                            return `${ach.name} - ${ach.description} (+${ach.points} pts)`;
                          }).join('\n')
                        : 'No achievements yet',
                    inline: false
                },
                {
                    name: '🎯 Available Achievements',
                    value: Object.entries(this.achievementTypes)
                        .filter(([id]) => !userAchievements.includes(id))
                        .map(([, ach]) => `${ach.name} - ${ach.description} (+${ach.points} pts)`)
                        .join('\n') || 'All achievements unlocked!',
                    inline: false
                }
            );
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
    
    updateUserStats(userId, action, points) {
        if (!this.userStats.has(userId)) {
            this.userStats.set(userId, {
                totalPoints: 0,
                correctPredictions: 0,
                totalPredictions: 0,
                discussionsStarted: 0,
                achievements: [],
                lastActivity: Date.now()
            });
        }
        
        const stats = this.userStats.get(userId);
        stats.totalPoints += points;
        stats.lastActivity = Date.now();
        
        switch (action) {
            case 'prediction_made':
                stats.totalPredictions++;
                break;
            case 'prediction_correct':
                stats.correctPredictions++;
                break;
            case 'discussion_created':
                stats.discussionsStarted++;
                break;
        }
    }
    
    async checkAchievements(userId, type) {
        const stats = this.userStats.get(userId);
        if (!stats || stats.achievements.includes(type)) return;
        
        let unlocked = false;
        
        switch (type) {
            case 'first_prediction':
                if (stats.totalPredictions >= 1) unlocked = true;
                break;
            case 'accurate_predictor':
                if (stats.correctPredictions >= 5) unlocked = true;
                break;
            case 'discussion_starter':
                if (stats.discussionsStarted >= 10) unlocked = true;
                break;
        }
        
        if (unlocked) {
            stats.achievements.push(type);
            const achievement = this.achievementTypes[type];
            stats.totalPoints += achievement.points;
            
            // Send achievement notification
            const channel = this.client.channels.cache.get(this.channelId);
            if (channel) {
                const embed = new EmbedBuilder()
                    .setTitle('🎉 Achievement Unlocked!')
                    .setDescription(`<@${userId}> earned: **${achievement.name}**\n${achievement.description}`)
                    .setColor('#FFD700')
                    .addFields({ name: 'Points Earned', value: `+${achievement.points}`, inline: true })
                    .setTimestamp();
                
                await channel.send({ embeds: [embed] });
            }
        }
    }
    
    async showAnalytics(interaction) {
        const stats = this.calculateCommunityStats();
        
        const embed = new EmbedBuilder()
            .setTitle('📈 Community Analytics')
            .setColor('#4169E1')
            .addFields(
                { name: '📊 Overview', value: `${stats.activeMembers} active members\n${stats.totalPredictions} total predictions\n${stats.activeDiscussions} active discussions`, inline: true },
                { name: '🎯 Performance', value: `${stats.predictionAccuracy}% prediction accuracy\n${stats.engagementScore} engagement score`, inline: true },
                { name: '🏆 Top Performer', value: stats.topContributor || 'None yet', inline: true }
            )
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
    
    async showHelp(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('❓ Community Features Help')
            .setColor('#17a2b8')
            .setDescription('Learn how to use the community features:')
            .addFields(
                { name: '💬 Discussions', value: 'Start conversations about whale movements, market trends, or analysis. Earn points for quality discussions.', inline: false },
                { name: '🔮 Predictions', value: 'Make predictions about future whale behavior or market movements. Accurate predictions earn more points.', inline: false },
                { name: '🏆 Leaderboards', value: 'Compete with other community members. Rankings based on prediction accuracy and contribution points.', inline: false },
                { name: '🎖️ Achievements', value: 'Unlock badges by reaching milestones. Each achievement grants bonus points.', inline: false },
                { name: '📊 Points System', value: 'Discussions: 10pts\nPredictions: 15pts\nCorrect Predictions: 25pts\nAchievements: Variable', inline: false }
            );
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
    
    async handleVote(interaction) {
        const [, sentiment, predictionId] = interaction.customId.split('_');
        const prediction = this.predictions.get(predictionId);
        
        if (!prediction) {
            return await interaction.reply({ content: '❌ Prediction not found.', ephemeral: true });
        }
        
        if (prediction.voters.has(interaction.user.id)) {
            return await interaction.reply({ content: '❌ You have already voted on this prediction.', ephemeral: true });
        }
        
        prediction.votes[sentiment]++;
        prediction.voters.add(interaction.user.id);
        
        const total = prediction.votes.bullish + prediction.votes.bearish + prediction.votes.neutral;
        const bullishPct = Math.round((prediction.votes.bullish / total) * 100);
        const bearishPct = Math.round((prediction.votes.bearish / total) * 100);
        const neutralPct = Math.round((prediction.votes.neutral / total) * 100);
        
        await interaction.reply({ 
            content: `✅ Vote recorded! Current sentiment:\n📈 Bullish: ${bullishPct}%\n📉 Bearish: ${bearishPct}%\n➡️ Neutral: ${neutralPct}%`, 
            ephemeral: true 
        });
    }
    
    createWelcomeEmbed() {
        const stats = this.calculateCommunityStats();
        
        return new EmbedBuilder()
            .setTitle('🏆 XRPL Community Features')
            .setDescription(
                '**Welcome to Community Hub!**\n\n' +
                '💬 **Discussions** about whale movements\n' +
                '🔮 **Predictions** and community insights\n' +
                '🏆 **Leaderboards** for top predictors\n' +
                '🎖️ **Achievements** and community rewards\n\n' +
                '**Community Size:** Growing daily\n' +
                '**Features:** Polls, Discussions, Rewards\n' +
                '**Engagement:** High-quality whale insights'
            )
            .setColor('#FF69B4')
            .setThumbnail('https://cryptologos.cc/logos/xrp-xrp-logo.png')
            .setTimestamp()
            .setFooter({ 
                text: 'XRPL Community Features • Collaborative Intelligence', 
                iconURL: 'https://cryptologos.cc/logos/xrp-xrp-logo.png' 
            });
    }
}