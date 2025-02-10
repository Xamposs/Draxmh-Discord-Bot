const spamSettings = new Map();
const userMessages = new Map();
const SPAM_WINDOW = 5000; // 5 seconds
const TIMEOUT_DURATION = 300000; // 5 minutes

const SENSITIVITY_THRESHOLDS = {
    low: { messages: 10, interval: 5000 },
    medium: { messages: 7, interval: 5000 },
    high: { messages: 5, interval: 5000 }
};

export const handleSpamDetection = async (message) => {
    const settings = spamSettings.get(message.guild.id);
    if (!settings?.enabled) return;

    // Check for exempt roles
    if (message.member.roles.cache.some(role => settings.exemptRoles.includes(role.id))) {
        return;
    }

    const userId = message.author.id;
    const now = Date.now();
    
    if (!userMessages.has(userId)) {
        userMessages.set(userId, []);
    }
    
    const userHistory = userMessages.get(userId);
    userHistory.push({
        timestamp: now,
        content: message.content,
        channelId: message.channel.id
    });
    
    // Clean old messages
    const threshold = now - SPAM_WINDOW;
    while (userHistory.length && userHistory[0].timestamp < threshold) {
        userHistory.shift();
    }
    
    // Get threshold based on sensitivity
    const { messages: spamThreshold } = SENSITIVITY_THRESHOLDS[settings.sensitivity || 'medium'];
    
    // Check for spam patterns
    if (userHistory.length >= spamThreshold) {
        await handleSpamViolation(message, userHistory);
        userMessages.delete(userId);
    }

    // Check for repeated content
    if (checkRepeatedContent(userHistory)) {
        await handleSpamViolation(message, userHistory);
        userMessages.delete(userId);
    }
};

const checkRepeatedContent = (history) => {
    if (history.length < 3) return false;
    const lastMessages = history.slice(-3);
    return lastMessages.every(msg => msg.content === lastMessages[0].content);
};

const handleSpamViolation = async (message, history) => {
    try {
        // Timeout the user
        await message.member.timeout(TIMEOUT_DURATION, 'Spam Detection');
        
        // Delete spam messages
        const uniqueChannels = [...new Set(history.map(h => h.channelId))];
        for (const channelId of uniqueChannels) {
            const channel = message.guild.channels.cache.get(channelId);
            if (channel) {
                const messages = await channel.messages.fetch({ 
                    limit: 100 
                });
                const userMessages = messages.filter(m => 
                    m.author.id === message.author.id && 
                    Date.now() - m.createdTimestamp < SPAM_WINDOW
                );
                if (userMessages.size > 0) {
                    await channel.bulkDelete(userMessages);
                }
            }
        }

        // Send notification
        await message.channel.send({
            content: `${message.author} has been muted for ${TIMEOUT_DURATION/60000} minutes due to spam detection.`,
            allowedMentions: { users: [message.author.id] }
        });

    } catch (error) {
        console.error('Error handling spam violation:', error);
    }
};

export const toggleSpam = (guildId, enabled) => {
    const settings = spamSettings.get(guildId) || { 
        sensitivity: 'medium', 
        exemptRoles: [],
        notifyChannel: null
    };
    settings.enabled = enabled;
    spamSettings.set(guildId, settings);
};

export const setSensitivity = (guildId, level) => {
    if (!SENSITIVITY_THRESHOLDS[level]) return false;
    const settings = spamSettings.get(guildId) || { 
        enabled: false, 
        exemptRoles: [],
        notifyChannel: null
    };
    settings.sensitivity = level;
    spamSettings.set(guildId, settings);
    return true;
};

export const addExemptRole = (guildId, roleId) => {
    const settings = spamSettings.get(guildId) || { 
        enabled: false, 
        sensitivity: 'medium', 
        exemptRoles: [],
        notifyChannel: null
    };
    if (!settings.exemptRoles.includes(roleId)) {
        settings.exemptRoles.push(roleId);
        spamSettings.set(guildId, settings);
    }
};

export const removeExemptRole = (guildId, roleId) => {
    const settings = spamSettings.get(guildId);
    if (settings) {
        settings.exemptRoles = settings.exemptRoles.filter(id => id !== roleId);
        spamSettings.set(guildId, settings);
    }
};

export const getSpamSettings = (guildId) => {
    return spamSettings.get(guildId) || {
        enabled: false,
        sensitivity: 'medium',
        exemptRoles: [],
        notifyChannel: null
    };
};

export const getSpamStats = (guildId) => {
    const settings = getSpamSettings(guildId);
    const activeUsers = Array.from(userMessages.entries()).filter(([userId, history]) => 
        history.some(msg => Date.now() - msg.timestamp < SPAM_WINDOW)
    ).length;

    return {
        activeUsers,
        settings,
        thresholds: SENSITIVITY_THRESHOLDS[settings.sensitivity]
    };
};

export const clearUserHistory = (userId) => {
    userMessages.delete(userId);
};
