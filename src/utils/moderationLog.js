const logs = new Map();
let caseCount = 0;

export const addCase = (type, user, moderator, reason) => {
    caseCount++;
    const caseData = {
        id: caseCount,
        type,
        user: user.tag,
        userId: user.id,
        moderator: moderator.tag,
        reason,
        timestamp: new Date()
    };
    
    if (!logs.has(user.id)) {
        logs.set(user.id, []);
    }
    logs.get(user.id).push(caseData);
    return caseData;
};

export const getUserCases = (userId) => {
    return logs.get(userId) || [];
};

export const getRecentCases = (limit = 10) => {
    const allCases = Array.from(logs.values()).flat();
    return allCases.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
};

// Utility functions for moderation logging
export const formatCase = (caseData) => {
    return {
        ...caseData,
        formattedTimestamp: caseData.timestamp.toLocaleString(),
        severity: getSeverity(caseData.type)
    };
};

export const getSeverity = (type) => {
    const severityLevels = {
        BAN: 'High',
        KICK: 'Medium',
        MUTE: 'Medium',
        WARN: 'Low'
    };
    return severityLevels[type] || 'Unknown';
};

export const clearUserCases = (userId) => {
    return logs.delete(userId);
};

export const getCaseCount = () => {
    return caseCount;
};

export const getAllCases = () => {
    return Array.from(logs.entries()).reduce((acc, [userId, cases]) => {
        return [...acc, ...cases];
    }, []);
};

export const searchCases = (query) => {
    const allCases = getAllCases();
    return allCases.filter(c => 
        c.user.toLowerCase().includes(query.toLowerCase()) ||
        c.reason.toLowerCase().includes(query.toLowerCase())
    );
};

export const getCasesByType = (type) => {
    const allCases = getAllCases();
    return allCases.filter(c => c.type === type);
};

export const getModeratorStats = () => {
    const allCases = getAllCases();
    return allCases.reduce((stats, c) => {
        stats[c.moderator] = (stats[c.moderator] || 0) + 1;
        return stats;
    }, {});
};
