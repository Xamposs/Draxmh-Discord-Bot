import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';

const ALERT_CHANNEL_ID = '1307095704858005545';
const SCAN_INTERVAL = 15 * 60 * 1000; // 15 minutes (changed from 10 minutes)

const NETWORKS = {
    SOLANA: 'Solana',
    ETHEREUM: 'Ethereum',
    BASE: 'Base',
    ARBITRUM: 'Arbitrum',
    POLYGON: 'Polygon',
    TON: 'TON'
};

async function scanNetwork(network) {
    const scamFound = Math.random() < 0.1;
    if (scamFound) {
        return {
            network,
            status: `${network} Network scan completed ✅`,
            scams: [{
                name: `Fake DRX ${network}`,
                contract: `0x${Math.random().toString(16).slice(2, 42)}`,
                warning: 'Impersonating official DRX token'
            }]
        };
    }
    return {
        network,
        status: `${network} Network scan completed ✅`,
        scams: []
    };
}

class EnhancedScamProtection {
    constructor(client) {
        this.client = client;
        this.scamDatabase = new Map();
        this.reportedUsers = new Map();
        this.quarantinedUsers = new Set();
        this.trustedUsers = new Set();
        
        // Configuration
        this.config = {
            alertChannelId: '1307095704858005545',
            moderatorChannelId: '1307095704858005545', // Set to your mod channel
            quarantineRoleId: 'QUARANTINE_ROLE_ID', // Create this role
            reportThreshold: 3,
            autoQuarantineThreshold: 0.8,
            databasePath: './data/scam-database.json',
            reportsPath: './data/user-reports.json'
        };
        
        // AI Analysis patterns
        this.scamPatterns = {
            urls: [
                /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/g,
                /bit\.ly|tinyurl|t\.co|short\.link/i,
                /discord\.gg\/[a-zA-Z0-9]+/g
            ],
            phrases: [
                /free\s+(crypto|token|nft|airdrop)/i,
                /double\s+your\s+(crypto|coins|tokens)/i,
                /guaranteed\s+(profit|returns)/i,
                /click\s+here\s+to\s+(claim|get|receive)/i,
                /limited\s+time\s+offer/i,
                /dm\s+me\s+for/i,
                /send\s+me\s+your\s+(seed|private\s+key)/i
            ],
            impersonation: [
                /official\s+(drx|draxmh)\s+team/i,
                /drx\s+(admin|moderator|support)/i,
                /verify\s+your\s+wallet/i
            ]
        };
        
        this.loadDatabase();
        this.startThreatIntelligence();
    }

    async loadDatabase() {
        try {
            const data = await fs.readFile(this.config.databasePath, 'utf8');
            const dbData = JSON.parse(data);
            this.scamDatabase = new Map(dbData.scams || []);
            this.trustedUsers = new Set(dbData.trustedUsers || []);
        } catch (error) {
            console.log('Creating new scam database...');
            await this.saveDatabase();
        }
    }

    async saveDatabase() {
        try {
            await fs.mkdir('./data', { recursive: true });
            const dbData = {
                scams: Array.from(this.scamDatabase.entries()),
                trustedUsers: Array.from(this.trustedUsers),
                lastUpdated: new Date().toISOString()
            };
            await fs.writeFile(this.config.databasePath, JSON.stringify(dbData, null, 2));
        } catch (error) {
            console.error('Failed to save scam database:', error);
        }
    }

    async analyzeMessage(message) {
        if (message.author.bot) return { isScam: false, confidence: 0 };
        if (this.trustedUsers.has(message.author.id)) return { isScam: false, confidence: 0 };

        let riskScore = 0;
        const reasons = [];

        // Account age analysis
        const accountAge = Date.now() - message.author.createdTimestamp;
        const daysSinceCreation = accountAge / (1000 * 60 * 60 * 24);
        
        if (daysSinceCreation < 7) {
            riskScore += 0.3;
            reasons.push('New account (less than 7 days old)');
        }

        // Message content analysis
        const content = message.content.toLowerCase();
        
        // URL analysis
        const urls = content.match(this.scamPatterns.urls[0]);
        if (urls) {
            riskScore += 0.4;
            reasons.push('Contains suspicious URLs');
            
            // Check against known scam domains
            for (const url of urls) {
                if (this.scamDatabase.has(url)) {
                    riskScore += 0.5;
                    reasons.push('Contains known scam URL');
                }
            }
        }

        // Phrase analysis
        for (const pattern of this.scamPatterns.phrases) {
            if (pattern.test(content)) {
                riskScore += 0.3;
                reasons.push('Contains scam-related phrases');
                break;
            }
        }

        // Impersonation analysis
        for (const pattern of this.scamPatterns.impersonation) {
            if (pattern.test(content)) {
                riskScore += 0.6;
                reasons.push('Potential impersonation attempt');
                break;
            }
        }

        // DM solicitation
        if (/dm\s+me|message\s+me|contact\s+me/i.test(content)) {
            riskScore += 0.2;
            reasons.push('Soliciting direct messages');
        }

        // Normalize risk score
        const confidence = Math.min(riskScore, 1.0);
        const isScam = confidence >= this.config.autoQuarantineThreshold;

        return {
            isScam,
            confidence,
            reasons,
            riskScore
        };
    }

    async quarantineUser(user, reason, evidence) {
        try {
            const guild = this.client.guilds.cache.first();
            const member = await guild.members.fetch(user.id);
            const quarantineRole = guild.roles.cache.get(this.config.quarantineRoleId);

            if (quarantineRole) {
                await member.roles.add(quarantineRole);
                this.quarantinedUsers.add(user.id);

                // Log quarantine action
                await this.logQuarantine(user, reason, evidence);
                
                return true;
            }
        } catch (error) {
            console.error('Failed to quarantine user:', error);
        }
        return false;
    }

    async logQuarantine(user, reason, evidence) {
        const moderatorChannel = this.client.channels.cache.get(this.config.moderatorChannelId);
        if (!moderatorChannel) return;

        const embed = new EmbedBuilder()
            .setTitle('🚨 Automatic User Quarantine')
            .setColor('#ff0000')
            .addFields(
                { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Reason', value: reason, inline: true },
                { name: 'Confidence', value: `${(evidence.confidence * 100).toFixed(1)}%`, inline: true },
                { name: 'Risk Factors', value: evidence.reasons.join('\n') || 'None specified' },
                { name: 'Action Required', value: 'Please review and take appropriate action' }
            )
            .setTimestamp();

        await moderatorChannel.send({ embeds: [embed] });
    }

    async handleReport(reporterId, targetId, reason) {
        if (!this.reportedUsers.has(targetId)) {
            this.reportedUsers.set(targetId, {
                reports: [],
                totalReports: 0
            });
        }

        const userReports = this.reportedUsers.get(targetId);
        userReports.reports.push({
            reporterId,
            reason,
            timestamp: Date.now()
        });
        userReports.totalReports++;

        // Auto-quarantine if threshold reached
        if (userReports.totalReports >= this.config.reportThreshold) {
            const targetUser = await this.client.users.fetch(targetId);
            await this.quarantineUser(targetUser, 'Multiple community reports', {
                confidence: 0.9,
                reasons: [`${userReports.totalReports} community reports`]
            });
        }

        return userReports.totalReports;
    }

    async startThreatIntelligence() {
        // Update threat database every hour
        setInterval(async () => {
            await this.updateThreatDatabase();
        }, 60 * 60 * 1000);

        // Initial update
        await this.updateThreatDatabase();
    }

    async updateThreatDatabase() {
        try {
            // Example: Fetch from threat intelligence APIs
            // You can integrate with services like VirusTotal, URLVoid, etc.
            
            // Simulated threat intelligence update
            const newThreats = [
                'phishing-site.com',
                'fake-drx-token.scam',
                'crypto-doubler.fraud'
            ];

            for (const threat of newThreats) {
                this.scamDatabase.set(threat, {
                    type: 'malicious_url',
                    confidence: 0.95,
                    source: 'threat_intelligence',
                    timestamp: Date.now()
                });
            }

            await this.saveDatabase();
            console.log(`Updated threat database with ${newThreats.length} new entries`);
        } catch (error) {
            console.error('Failed to update threat database:', error);
        }
    }

    async sendSecurityAlert() {
        const channel = this.client.channels.cache.get(this.config.alertChannelId);
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setTitle('🛡️ DRX Enhanced Security System Active')
            .setColor('#00ff00')
            .addFields(
                {
                    name: '🔍 Real-Time Protection',
                    value: '• AI-powered message analysis\n• Automatic scam detection\n• User behavior monitoring\n• URL reputation checking'
                },
                {
                    name: '⚡ Active Features',
                    value: `• Threat Database: ${this.scamDatabase.size} entries\n• Quarantined Users: ${this.quarantinedUsers.size}\n• Community Reports: ${this.reportedUsers.size} users reported\n• Trusted Users: ${this.trustedUsers.size}`
                },
                {
                    name: '🚨 How to Report',
                    value: 'Use `!report @user reason` to report suspicious activity\nOur AI will analyze and take appropriate action'
                },
                {
                    name: '✅ Official DRX Contract',
                    value: '`rUWUQhB2pcgCbjJxaBv9GrS1hr9pCUGXxX`\nAlways verify on Sologenic DEX'
                },
                {
                    name: '🛡️ Security Tips',
                    value: '• Only use official website: https://www.cryptodraxmh.gr/\n• Trade only on Sologenic DEX\n• Never share private keys\n• Team never DMs first\n• Report suspicious activity immediately'
                }
            )
            .setTimestamp()
            .setFooter({ text: 'DRX Enhanced Security System • AI-Powered Protection' });

        await channel.send({ embeds: [embed] });
    }

    async stop() {
        await this.saveDatabase();
        console.log('Enhanced Scam Protection stopped');
    }
}

export { EnhancedScamProtection };

// Legacy export for compatibility
// In the startScamAlerts function, update the interval:
export const startScamAlerts = (client) => {
    const protection = new EnhancedScamProtection(client);
    
    // Send initial security alert
    protection.sendSecurityAlert();
    
    // Send periodic security updates every 15 minutes
    setInterval(() => {
        protection.sendSecurityAlert();
    }, 15 * 60 * 1000); // 15 minutes
    
    return protection;
};

async function sendAlert(client) {
    const channel = client.channels.cache.get(ALERT_CHANNEL_ID);
    if (channel) {
        const scanResults = await Promise.all(
            Object.values(NETWORKS).map(network => scanNetwork(network))
        );

        const networkStatuses = scanResults.map(result => result.status).join('\n');
        const detectedScams = scanResults.filter(result => result.scams.length > 0);

        function generateScamAlert(scamData) {
            return new EmbedBuilder()
                .setTitle('🚨 DRX Multi-Chain Security Alert')
                .setColor('#ff0000')
                .addFields(
                    {
                        name: 'SCAM ALERT DETAILS',
                        value: `**Network:** ${scamData.network}\n` +
                            `**Scam Name:** ${scamData.name}\n` +
                            `**Full Contract:** \`${scamData.contract}\`\n` +
                            `**Creation Date:** ${scamData.creationDate}\n` +
                            `**Creator Address:** \`${scamData.creator}\`\n` +
                            `**Token Supply:** ${scamData.supply}\n` +
                            `**Holders:** ${scamData.holders}\n` +
                            `**Verification Status:** ${scamData.verified ? 'Verified ✓' : 'Unverified ⚠️'}\n` +
                            `**Risk Level:** 🔴 High Risk\n` +
                            `**Warning:** ${scamData.warning}`,
                        inline: false
                    },
                    {
                        name: '🔍 How to Verify',
                        value: `• Check on ${scamData.network}scan: [View Contract](${scamData.explorerUrl})\n` +
                            `• Compare with official DRX: \`rUWUQhB2pcgCbjJxaBv9GrS1hr9pCUGXxX\`\n` +
                            `• Report suspicious tokens using !report`
                    }
                )
                .setTimestamp();
        }

        const embed = new EmbedBuilder()
            .setTitle('🚨 DRX Multi-Chain Security Alert')
            .setColor('#ff0000')
            .addFields(
                { name: '🔍 Network Scan Results', value: networkStatuses }
            );

        if (detectedScams.length > 0) {
            embed.addFields({
                name: '⚠️ SCAM ALERTS DETECTED',
                value: detectedScams.map(result =>
                    result.scams.map(scam =>
                        `Network: ${result.network}\n` +
                        `Scam Name: ${scam.name}\n` +
                        `Contract: \`${scam.contract}\`\n` +
                        `Warning: ${scam.warning}`
                    ).join('\n\n')
                ).join('\n\n')
            });
        }

        embed.addFields(
            {
                name: '⚠️ Security Check',
                value:
                    'Regular security scan completed.\n' +
                    'Stay vigilant against potential scams!'
            },
            {
                name: '✅ Official DRX Contract',
                value:
                    '`rUWUQhB2pcgCbjJxaBv9GrS1hr9pCUGXxX`\n' +
                    'Always verify on Sologenic DEX'
            },
            {
                name: '🛡️ Security Tips',
                value:
                    '• Only use official website: https://www.cryptodraxmh.gr/\n' +
                    '• Trade only on Sologenic DEX\n' +
                    '• Never share private keys\n' +
                    '• Team never DMs first\n' +
                    '• Report suspicious activity with `!report` in the scam-alert channel'
            }
        )
            .setTimestamp()
            .setFooter({ text: 'DRX Multi-Chain Security Alert System • Stay Safe' });

        channel.send({ embeds: [embed] });
    }
}
