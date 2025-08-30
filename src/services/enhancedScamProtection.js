import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

class EnhancedScamProtection {
    constructor(client) {
        this.client = client;
        this.alertChannelId = '1307095704858005545';
        this.quarantineRoleId = 'QUARANTINE_ROLE_ID'; // Set your quarantine role ID
        this.modChannelId = 'MOD_CHANNEL_ID'; // Set your mod channel ID
        
        // AI Analysis patterns
        this.scamPatterns = {
            phishing: [
                /click.*here.*claim/i,
                /urgent.*verify.*account/i,
                /congratulations.*won/i,
                /limited.*time.*offer/i,
                /metamask.*connect/i,
                /wallet.*validation/i
            ],
            impersonation: [
                /official.*drx.*team/i,
                /admin.*support/i,
                /customer.*service/i,
                /technical.*support/i
            ],
            financial: [
                /send.*\d+.*get.*\d+/i,
                /double.*investment/i,
                /guaranteed.*profit/i,
                /risk.*free/i,
                /pump.*dump/i
            ],
            urgency: [
                /act.*now/i,
                /expires.*soon/i,
                /limited.*spots/i,
                /hurry.*up/i
            ]
        };
        
        // Suspicious domains and links
        this.suspiciousDomains = [
            'bit.ly', 'tinyurl.com', 'short.link', 't.me',
            'discord.gg', 'discordapp.com'
        ];
        
        // User reputation system
        this.userReputations = new Map();
        this.reportDatabase = new Map();
        
        // Real-time scam database
        this.scamDatabase = {
            knownScams: new Set(),
            suspiciousUsers: new Map(),
            reportedMessages: new Map(),
            whitelistedUsers: new Set()
        };
        
        this.loadDatabase();
        this.startRealTimeUpdates();
    }

    // AI-Powered Message Analysis
    async analyzeMessage(message) {
        if (message.author.bot) return { isScam: false, confidence: 0 };
        
        const content = message.content.toLowerCase();
        const author = message.author;
        
        let riskScore = 0;
        let detectedPatterns = [];
        
        // Pattern matching analysis
        for (const [category, patterns] of Object.entries(this.scamPatterns)) {
            for (const pattern of patterns) {
                if (pattern.test(content)) {
                    riskScore += this.getPatternWeight(category);
                    detectedPatterns.push({ category, pattern: pattern.source });
                }
            }
        }
        
        // URL analysis
        const urls = this.extractUrls(content);
        for (const url of urls) {
            const urlRisk = await this.analyzeUrl(url);
            riskScore += urlRisk.score;
            if (urlRisk.suspicious) {
                detectedPatterns.push({ category: 'suspicious_url', url });
            }
        }
        
        // User behavior analysis
        const userRisk = this.analyzeUserBehavior(author, message);
        riskScore += userRisk.score;
        
        // Account age and activity analysis
        const accountRisk = this.analyzeAccountRisk(author);
        riskScore += accountRisk.score;
        
        const confidence = Math.min(riskScore / 100, 1);
        const isScam = confidence > 0.7;
        
        return {
            isScam,
            confidence,
            riskScore,
            detectedPatterns,
            recommendation: this.getRecommendation(confidence)
        };
    }
    
    getPatternWeight(category) {
        const weights = {
            phishing: 30,
            impersonation: 25,
            financial: 20,
            urgency: 15
        };
        return weights[category] || 10;
    }
    
    extractUrls(text) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.match(urlRegex) || [];
    }
    
    async analyzeUrl(url) {
        try {
            const domain = new URL(url).hostname;
            
            // Check against known malicious domains
            if (this.scamDatabase.knownScams.has(domain)) {
                return { score: 50, suspicious: true, reason: 'Known malicious domain' };
            }
            
            // Check suspicious URL shorteners
            if (this.suspiciousDomains.some(d => domain.includes(d))) {
                return { score: 25, suspicious: true, reason: 'URL shortener' };
            }
            
            // Check against VirusTotal API (optional)
            const vtResult = await this.checkVirusTotal(url);
            if (vtResult.malicious) {
                return { score: 40, suspicious: true, reason: 'VirusTotal detection' };
            }
            
            return { score: 0, suspicious: false };
        } catch (error) {
            return { score: 15, suspicious: true, reason: 'Invalid URL' };
        }
    }
    
    analyzeUserBehavior(user, message) {
        const userId = user.id;
        const now = Date.now();
        
        if (!this.userReputations.has(userId)) {
            this.userReputations.set(userId, {
                messages: [],
                reports: 0,
                joinDate: user.createdAt,
                reputation: 0
            });
        }
        
        const userStats = this.userReputations.get(userId);
        userStats.messages.push({ content: message.content, timestamp: now });
        
        // Keep only recent messages (last 24 hours)
        userStats.messages = userStats.messages.filter(m => now - m.timestamp < 24 * 60 * 60 * 1000);
        
        let riskScore = 0;
        
        // Rapid messaging detection
        if (userStats.messages.length > 10) {
            riskScore += 20;
        }
        
        // Repetitive content detection
        const uniqueMessages = new Set(userStats.messages.map(m => m.content));
        if (uniqueMessages.size < userStats.messages.length * 0.5) {
            riskScore += 15;
        }
        
        // Previous reports
        riskScore += userStats.reports * 10;
        
        return { score: riskScore };
    }
    
    analyzeAccountRisk(user) {
        const accountAge = Date.now() - user.createdAt.getTime();
        const daysSinceCreation = accountAge / (1000 * 60 * 60 * 24);
        
        let riskScore = 0;
        
        // New account risk
        if (daysSinceCreation < 7) {
            riskScore += 25;
        } else if (daysSinceCreation < 30) {
            riskScore += 15;
        }
        
        // Default avatar risk
        if (!user.avatar) {
            riskScore += 10;
        }
        
        return { score: riskScore };
    }
    
    getRecommendation(confidence) {
        if (confidence > 0.9) return 'immediate_quarantine';
        if (confidence > 0.7) return 'quarantine_and_review';
        if (confidence > 0.5) return 'flag_for_review';
        if (confidence > 0.3) return 'monitor';
        return 'safe';
    }
    
    // Automatic Quarantine System
    async quarantineUser(user, guild, reason, confidence) {
        try {
            const member = await guild.members.fetch(user.id);
            const quarantineRole = guild.roles.cache.get(this.quarantineRoleId);
            
            if (!quarantineRole) {
                console.error('Quarantine role not found');
                return false;
            }
            
            // Add quarantine role
            await member.roles.add(quarantineRole);
            
            // Remove other roles (store for restoration)
            const previousRoles = member.roles.cache.filter(role => role.id !== guild.id && role.id !== this.quarantineRoleId);
            this.scamDatabase.suspiciousUsers.set(user.id, {
                quarantined: true,
                reason,
                confidence,
                timestamp: Date.now(),
                previousRoles: previousRoles.map(role => role.id)
            });
            
            await member.roles.remove(previousRoles);
            
            // Notify moderators
            await this.notifyModerators(user, reason, confidence);
            
            // Log the action
            console.log(`User ${user.tag} quarantined: ${reason} (confidence: ${confidence})`);
            
            return true;
        } catch (error) {
            console.error('Failed to quarantine user:', error);
            return false;
        }
    }
    
    async notifyModerators(user, reason, confidence) {
        const modChannel = this.client.channels.cache.get(this.modChannelId);
        if (!modChannel) return;
        
        const embed = new EmbedBuilder()
            .setTitle('🚨 Automatic User Quarantine')
            .setColor('#ff0000')
            .addFields(
                { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Confidence', value: `${(confidence * 100).toFixed(1)}%`, inline: true },
                { name: 'Reason', value: reason, inline: false },
                { name: 'Actions Available', value: '✅ Approve\n❌ Ban\n🔄 Release', inline: false }
            )
            .setTimestamp();
        
        const message = await modChannel.send({ embeds: [embed] });
        await message.react('✅');
        await message.react('❌');
        await message.react('🔄');
    }
    
    // Community Reporting System
    async handleReport(reporter, reportedUser, reason, evidence) {
        const reportId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Update reporter reputation
        if (!this.userReputations.has(reporter.id)) {
            this.userReputations.set(reporter.id, { reputation: 0, reports: 0 });
        }
        
        const reporterStats = this.userReputations.get(reporter.id);
        
        // Store report
        this.reportDatabase.set(reportId, {
            reporter: reporter.id,
            reported: reportedUser.id,
            reason,
            evidence,
            timestamp: Date.now(),
            status: 'pending',
            votes: new Map()
        });
        
        // Update reported user's report count
        if (!this.userReputations.has(reportedUser.id)) {
            this.userReputations.set(reportedUser.id, { reputation: 0, reports: 0 });
        }
        
        const reportedStats = this.userReputations.get(reportedUser.id);
        reportedStats.reports++;
        
        // Auto-quarantine if multiple reports
        if (reportedStats.reports >= 3) {
            const guild = this.client.guilds.cache.first();
            await this.quarantineUser(reportedUser, guild, 'Multiple community reports', 0.8);
        }
        
        // Notify community for voting
        await this.createCommunityVote(reportId);
        
        return reportId;
    }
    
    async createCommunityVote(reportId) {
        const report = this.reportDatabase.get(reportId);
        const channel = this.client.channels.cache.get(this.alertChannelId);
        
        const embed = new EmbedBuilder()
            .setTitle('🗳️ Community Report - Vote Required')
            .setColor('#ffa500')
            .addFields(
                { name: 'Report ID', value: reportId, inline: true },
                { name: 'Reason', value: report.reason, inline: true },
                { name: 'Evidence', value: report.evidence || 'No evidence provided', inline: false },
                { name: 'Voting', value: '👍 Legitimate Report\n👎 False Report', inline: false }
            )
            .setFooter({ text: 'Community members can vote to validate this report' })
            .setTimestamp();
        
        const message = await channel.send({ embeds: [embed] });
        await message.react('👍');
        await message.react('👎');
        
        // Store message for vote tracking
        report.voteMessageId = message.id;
    }
    
    // Real-time Database Updates
    async updateScamDatabase() {
        try {
            // Fetch from external threat intelligence APIs
            const threats = await this.fetchThreatIntelligence();
            
            for (const threat of threats) {
                this.scamDatabase.knownScams.add(threat.domain);
            }
            
            // Save to local database
            await this.saveDatabase();
            
            console.log(`Updated scam database with ${threats.length} new threats`);
        } catch (error) {
            console.error('Failed to update scam database:', error);
        }
    }
    
    async fetchThreatIntelligence() {
        // Integrate with threat intelligence APIs
        const sources = [
            'https://api.phishtank.com/data/online-valid.json',
            // Add more threat intelligence sources
        ];
        
        const threats = [];
        
        for (const source of sources) {
            try {
                const response = await axios.get(source, { timeout: 10000 });
                // Process response based on API format
                threats.push(...this.processThreatData(response.data));
            } catch (error) {
                console.error(`Failed to fetch from ${source}:`, error.message);
            }
        }
        
        return threats;
    }
    
    processThreatData(data) {
        // Process different threat intelligence formats
        if (Array.isArray(data)) {
            return data.map(item => ({
                domain: item.url || item.domain,
                type: item.type || 'phishing',
                confidence: item.confidence || 0.8
            }));
        }
        return [];
    }
    
    async checkVirusTotal(url) {
        // Optional: Integrate with VirusTotal API
        // Requires API key
        return { malicious: false };
    }
    
    // Database Management
    async loadDatabase() {
        try {
            const dbPath = path.join(process.cwd(), 'data', 'scam-database.json');
            const data = await fs.readFile(dbPath, 'utf8');
            const parsed = JSON.parse(data);
            
            this.scamDatabase.knownScams = new Set(parsed.knownScams || []);
            this.scamDatabase.suspiciousUsers = new Map(parsed.suspiciousUsers || []);
            this.userReputations = new Map(parsed.userReputations || []);
            
            console.log('Scam database loaded successfully');
        } catch (error) {
            console.log('No existing database found, starting fresh');
        }
    }
    
    async saveDatabase() {
        try {
            const dbPath = path.join(process.cwd(), 'data', 'scam-database.json');
            const data = {
                knownScams: Array.from(this.scamDatabase.knownScams),
                suspiciousUsers: Array.from(this.scamDatabase.suspiciousUsers),
                userReputations: Array.from(this.userReputations),
                lastUpdated: Date.now()
            };
            
            await fs.writeFile(dbPath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Failed to save database:', error);
        }
    }
    
    // Start real-time monitoring
    startRealTimeUpdates() {
        // Update threat database every hour
        setInterval(() => this.updateScamDatabase(), 60 * 60 * 1000);
        
        // Save database every 10 minutes
        setInterval(() => this.saveDatabase(), 10 * 60 * 1000);
        
        // Clean old data every day
        setInterval(() => this.cleanOldData(), 24 * 60 * 60 * 1000);
    }
    
    cleanOldData() {
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        
        // Clean old reports
        for (const [reportId, report] of this.reportDatabase) {
            if (report.timestamp < oneWeekAgo) {
                this.reportDatabase.delete(reportId);
            }
        }
        
        // Clean old user message history
        for (const [userId, userData] of this.userReputations) {
            if (userData.messages) {
                userData.messages = userData.messages.filter(m => m.timestamp > oneWeekAgo);
            }
        }
    }
    
    // Message event handler
    async handleMessage(message) {
        if (message.author.bot) return;
        
        // Skip whitelisted users
        if (this.scamDatabase.whitelistedUsers.has(message.author.id)) return;
        
        const analysis = await this.analyzeMessage(message);
        
        if (analysis.isScam) {
            // Delete the message
            try {
                await message.delete();
            } catch (error) {
                console.error('Failed to delete message:', error);
            }
            
            // Take action based on confidence
            if (analysis.recommendation === 'immediate_quarantine' || analysis.recommendation === 'quarantine_and_review') {
                await this.quarantineUser(message.author, message.guild, `AI Detection: ${analysis.detectedPatterns.map(p => p.category).join(', ')}`, analysis.confidence);
            }
            
            // Send alert
            await this.sendScamAlert(message, analysis);
        } else if (analysis.confidence > 0.3) {
            // Log for monitoring
            console.log(`Suspicious message from ${message.author.tag}: confidence ${analysis.confidence}`);
        }
    }
    
    async sendScamAlert(message, analysis) {
        const channel = this.client.channels.cache.get(this.alertChannelId);
        if (!channel) return;
        
        const embed = new EmbedBuilder()
            .setTitle('🚨 AI Scam Detection Alert')
            .setColor('#ff0000')
            .addFields(
                { name: 'User', value: `${message.author.tag} (${message.author.id})`, inline: true },
                { name: 'Confidence', value: `${(analysis.confidence * 100).toFixed(1)}%`, inline: true },
                { name: 'Risk Score', value: analysis.riskScore.toString(), inline: true },
                { name: 'Detected Patterns', value: analysis.detectedPatterns.map(p => p.category).join(', ') || 'None', inline: false },
                { name: 'Action Taken', value: analysis.recommendation.replace('_', ' ').toUpperCase(), inline: false },
                { name: 'Message Content', value: `\`\`\`${message.content.substring(0, 500)}\`\`\``, inline: false }
            )
            .setTimestamp();
        
        await channel.send({ embeds: [embed] });
    }
    
    // Admin commands for managing the system
    async whitelistUser(userId) {
        this.scamDatabase.whitelistedUsers.add(userId);
        await this.saveDatabase();
    }
    
    async removeWhitelist(userId) {
        this.scamDatabase.whitelistedUsers.delete(userId);
        await this.saveDatabase();
    }
    
    async releaseQuarantine(userId, guild) {
        const userData = this.scamDatabase.suspiciousUsers.get(userId);
        if (!userData || !userData.quarantined) return false;
        
        try {
            const member = await guild.members.fetch(userId);
            const quarantineRole = guild.roles.cache.get(this.quarantineRoleId);
            
            // Remove quarantine role
            await member.roles.remove(quarantineRole);
            
            // Restore previous roles
            if (userData.previousRoles) {
                const rolesToRestore = userData.previousRoles.map(roleId => guild.roles.cache.get(roleId)).filter(Boolean);
                await member.roles.add(rolesToRestore);
            }
            
            // Update database
            userData.quarantined = false;
            userData.releasedAt = Date.now();
            
            await this.saveDatabase();
            return true;
        } catch (error) {
            console.error('Failed to release quarantine:', error);
            return false;
        }
    }
    
    // Get system statistics
    getStats() {
        return {
            knownScams: this.scamDatabase.knownScams.size,
            quarantinedUsers: Array.from(this.scamDatabase.suspiciousUsers.values()).filter(u => u.quarantined).length,
            totalReports: this.reportDatabase.size,
            whitelistedUsers: this.scamDatabase.whitelistedUsers.size,
            userReputations: this.userReputations.size
        };
    }
}

export { EnhancedScamProtection };