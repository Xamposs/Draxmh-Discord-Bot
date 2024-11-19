
const raidSettings = new Map();
const joinLog = new Map();

function toggleRaid(guildId, enabled) {
    const settings = raidSettings.get(guildId) || { threshold: 10, action: 'alert' };
    settings.enabled = enabled;
    raidSettings.set(guildId, settings);
}

function setThreshold(guildId, threshold) {
    const settings = raidSettings.get(guildId) || { enabled: false, action: 'alert' };
    settings.threshold = threshold;
    raidSettings.set(guildId, settings);
}

function setAction(guildId, action) {
    const settings = raidSettings.get(guildId) || { enabled: false, threshold: 10 };
    settings.action = action;
    raidSettings.set(guildId, settings);
}

module.exports = { toggleRaid, setThreshold, setAction };
