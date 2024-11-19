const logs = new Map();
let caseCount = 0;

function addCase(type, user, moderator, reason) {
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
}

function getUserCases(userId) {
    return logs.get(userId) || [];
}

function getRecentCases(limit = 10) {
    const allCases = Array.from(logs.values()).flat();
    return allCases.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
}

module.exports = { addCase, getUserCases, getRecentCases };