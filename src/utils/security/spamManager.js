const spamSettings = new Map();
const userMessages = new Map();
const SPAM_WINDOW = 5000; // 5 seconds
const TIMEOUT_DURATION = 300000; // 5 minutes
const CLEANUP_INTERVAL = 60000; // 1 minute
const MAX_USER_ENTRIES = 1000; // Maximum number of users to track

const SENSITIVITY_THRESHOLDS = {
    low: { messages: 10, interval: 5000 },
    medium: { messages: 7, interval: 5000 },
    high: { messages: 5, interval: 5000 }
};

// Cleanup interval to prevent memory leaks
let cleanupInterval = null;

const startCleanup = () => {
    if (cleanupInterval) return; // Already running
    
    cleanupInterval = setInterval(() => {
        const now = Date.now();
        const threshold = now - SPAM_WINDOW * 2; // Keep data for 2x spam window
        
        // Clean up old user message histories
        for (const [userId, history] of userMessages.entries()) {
            // Remove old messages
            const filteredHistory = history.filter(msg => msg.timestamp > threshold);
            
            if (filteredHistory.length === 0) {
                // Remove user entirely if no recent messages
                userMessages.delete(userId);
            } else {
                // Update with filtered history
                userMessages.set(userId, filteredHistory);
            }
        }
        
        // If we have too many users, remove the oldest ones
        if (userMessages.size > MAX_USER_ENTRIES) {
            const sortedUsers = Array.from(userMessages.entries())
                .sort(([,a], [,b]) => {
                    const lastA = Math.max(...a.map(msg => msg.timestamp));
                    const lastB = Math.max(...b.map(msg => msg.timestamp));
                    return lastA - lastB;
                });
            
            // Remove oldest 20% of users
            const toRemove = Math.floor(sortedUsers.length * 0.2);
            for (let i = 0; i < toRemove; i++) {
                userMessages.delete(sortedUsers[i][0]);
            }
        }
        
        console.log(`Spam manager cleanup: ${userMessages.size} users tracked`);
    }, CLEANUP_INTERVAL);
    
    console.log('Spam manager cleanup started');
};

const stopCleanup = () => {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
        console.log('Spam manager cleanup stopped');
    }
};

export const handleSpamDetection = async (message) => {
    // Start cleanup if not already running
    if (!cleanupInterval) {
        startCleanup();
    }
    
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
    
    // Clean old messages from this user's history
    const threshold = now - SPAM_WINDOW;
    while (userHistory.length && userHistory[0].timestamp < threshold) {
        userHistory.shift();
    }
    
    // Limit individual user history size
    if (userHistory.length > 50) {
        userHistory.splice(0, userHistory.length - 50);
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
    
    // Start cleanup when spam detection is enabled
    if (enabled && !cleanupInterval) {
        startCleanup();
    }
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
        totalTrackedUsers: userMessages.size,
        settings,
        thresholds: SENSITIVITY_THRESHOLDS[settings.sensitivity]
    };
};

export const clearUserHistory = (userId) => {
    userMessages.delete(userId);
};

export const clearAllHistory = () => {
    userMessages.clear();
    console.log('All spam detection history cleared');
};

export const stopSpamManager = () => {
    stopCleanup();
    userMessages.clear();
    spamSettings.clear();
    console.log('Spam manager stopped and cleaned up');
};
