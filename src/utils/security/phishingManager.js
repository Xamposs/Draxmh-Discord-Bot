const phishingSettings = new Map();
const phishingLogs = new Map();

// Known phishing domains database
const PHISHING_DOMAINS = [
    'fake-draxmh.com',
    'draxmh-free.com',
    'draxmh-airdrop.com',
    'draxmh-giveaway.com',
    'draxmh-presale.com',
    'free-draxmh.com',
    'draxmh-claim.com',
    'draxmh-bonus.com'
];

// Phishing patterns to detect
const SUSPICIOUS_PATTERNS = [
    /free\s*drx/i,
    /drx\s*airdrop/i,
    /claim\s*drx/i,
    /drx\s*giveaway/i,
    /drx\s*presale/i,
    /bonus\s*drx/i
];

export const togglePhishing = (guildId, enabled) => {
    const settings = phishingSettings.get(guildId) || { whitelist: [] };
    settings.enabled = enabled;
    phishingSettings.set(guildId, settings);
};

export const addWhitelist = (guildId, domain) => {
    const settings = phishingSettings.get(guildId) || { enabled: false, whitelist: [] };
    if (!settings.whitelist.includes(domain)) {
        settings.whitelist.push(domain);
        phishingSettings.set(guildId, settings);
    }
};

export const removeWhitelist = (guildId, domain) => {
    const settings = phishingSettings.get(guildId);
    if (settings) {
        settings.whitelist = settings.whitelist.filter(d => d !== domain);
        phishingSettings.set(guildId, settings);
    }
};

export const getPhishingLogs = (guildId) => {
    return phishingLogs.get(guildId) || [];
};

export const handlePhishingDetection = async (message) => {
    const settings = phishingSettings.get(message.guild.id);
    if (!settings?.enabled) return;

    // Check for URLs in message
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = message.content.match(urlRegex);

    // Check for suspicious patterns in message
    const hasPatterns = SUSPICIOUS_PATTERNS.some(pattern => 
        pattern.test(message.content)
    );

    if (hasPatterns) {
        await handleSuspiciousMessage(message, 'Suspicious pattern detected');
        return;
    }

    if (!urls) return;

    for (const url of urls) {
        try {
            const domain = new URL(url).hostname;
            
            // Skip whitelisted domains
            if (settings.whitelist.includes(domain)) continue;

            // Check against known phishing domains
            if (await checkPhishingDomain(domain)) {
                await handleSuspiciousMessage(message, `Suspicious domain detected: ${domain}`);
                break;
            }
        } catch (error) {
            console.error('Error checking URL:', error);
        }
    }
};

const checkPhishingDomain = async (domain) => {
    // Check against known phishing domains
    if (PHISHING_DOMAINS.includes(domain)) return true;

    // Check for suspicious subdomains
    if (domain.includes('draxmh') && !domain.endsWith('cryptodraxmh.gr')) return true;

    // Additional checks can be added here
    return false;
};

const handleSuspiciousMessage = async (message, reason) => {
    try {
        // Delete the suspicious message
        await message.delete();
        
        // Log the incident
        const log = {
            timestamp: new Date(),
            author: message.author.tag,
            content: message.content,
            reason: reason
        };

        if (!phishingLogs.has(message.guild.id)) {
            phishingLogs.set(message.guild.id, []);
        }
        phishingLogs.get(message.guild.id).push(log);

        // Alert channel moderators
        const alertMessage = await message.channel.send({
            content: `⚠️ Suspicious content detected and removed.\nUser: ${message.author.tag}\nReason: ${reason}`,
            allowedMentions: { users: [] }
        });

        // Delete alert after 10 seconds
        setTimeout(() => alertMessage.delete().catch(() => {}), 10000);

    } catch (error) {
        console.error('Error handling suspicious message:', error);
    }
};

export const getPhishingStats = (guildId) => {
    const logs = phishingLogs.get(guildId) || [];
    return {
        total: logs.length,
        recent: logs.filter(log => 
            (Date.now() - log.timestamp) < 24 * 60 * 60 * 1000
        ).length,
        byUser: logs.reduce((acc, log) => {
            acc[log.author] = (acc[log.author] || 0) + 1;
            return acc;
        }, {})
    };
};
