
const verificationSettings = new Map();

function toggleVerification(guildId, enabled) {
    const settings = verificationSettings.get(guildId) || { level: 1, role: null };
    settings.enabled = enabled;
    verificationSettings.set(guildId, settings);
}

function setVerificationLevel(guildId, level) {
    const settings = verificationSettings.get(guildId) || { enabled: false, role: null };
    settings.level = level;
    verificationSettings.set(guildId, settings);
}

function getVerificationStatus(guildId) {
    return verificationSettings.get(guildId) || { enabled: false, level: 1, role: null };
}

module.exports = {
    toggleVerification,
    setVerificationLevel,
    getVerificationStatus
};
