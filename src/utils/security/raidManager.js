const raidSettings = new Map();
const joinLog = new Map();
const RAID_WINDOW = 60000; // 1 minute in milliseconds

export const toggleRaid = (guildId, enabled) => {
    const settings = raidSettings.get(guildId) || { threshold: 10, action: 'alert' };
    settings.enabled = enabled;
    raidSettings.set(guildId, settings);
};

export const setThreshold = (guildId, threshold) => {
    const settings = raidSettings.get(guildId) || { enabled: false, action: 'alert' };
    settings.threshold = threshold;
    raidSettings.set(guildId, settings);
};

export const setAction = (guildId, action) => {
    const settings = raidSettings.get(guildId) || { enabled: false, threshold: 10 };
    settings.action = action;
    raidSettings.set(guildId, settings);
};

export const handleRaidProtection = async (member) => {
    const settings = raidSettings.get(member.guild.id);
    if (!settings?.enabled) return;

    const now = Date.now();
    const recentJoins = getRecentJoins(member.guild.id, now);
    
    if (recentJoins >= settings.threshold) {
        await handleRaidAction(member.guild, settings.action);
    }

    logJoin(member.guild.id, now);
};

const getRecentJoins = (guildId, now) => {
    const joins = joinLog.get(guildId) || [];
    // Filter joins within the raid window
    const recentJoins = joins.filter(time => now - time < RAID_WINDOW);
    joinLog.set(guildId, recentJoins);
    return recentJoins.length;
};

const logJoin = (guildId, timestamp) => {
    const joins = joinLog.get(guildId) || [];
    joins.push(timestamp);
    // Keep only recent joins
    const now = Date.now();
    const recentJoins = joins.filter(time => now - time < RAID_WINDOW);
    joinLog.set(guildId, recentJoins);
};

const handleRaidAction = async (guild, action) => {
    const logChannel = guild.channels.cache.find(c => c.name === 'mod-logs');
    
    switch (action.toLowerCase()) {
        case 'lockdown':
            // Lock all channels
            await Promise.all(guild.channels.cache.map(async channel => {
                if (channel.manageable) {
                    await channel.permissionOverwrites.edit(guild.roles.everyone, {
                        SendMessages: false,
                        Connect: false
                    });
                }
            }));
            if (logChannel) {
                await logChannel.send('🔒 **RAID PROTECTION** - Server locked down due to suspicious join activity');
            }
            break;

        case 'verify':
            // Enable verification mode
            const verifyRole = guild.roles.cache.find(r => r.name === 'Unverified');
            if (verifyRole) {
                await guild.members.cache.filter(m => !m.user.bot).forEach(member => {
                    member.roles.add(verifyRole).catch(() => {});
                });
            }
            if (logChannel) {
                await logChannel.send('✅ **RAID PROTECTION** - Verification mode enabled for all members');
            }
            break;

        case 'alert':
        default:
            if (logChannel) {
                await logChannel.send('🚨 **RAID ALERT** - Unusual join activity detected!');
            }
            break;
    }
};

export const getRaidStats = (guildId) => {
    const joins = joinLog.get(guildId) || [];
    const now = Date.now();
    const settings = raidSettings.get(guildId) || { 
        enabled: false, 
        threshold: 10, 
        action: 'alert' 
    };

    return {
        recentJoins: joins.filter(time => now - time < RAID_WINDOW).length,
        totalTracked: joins.length,
        settings: settings,
        lastJoin: joins.length > 0 ? new Date(joins[joins.length - 1]).toISOString() : null,
        isActive: settings.enabled && joins.filter(time => now - time < RAID_WINDOW).length > 0
    };
};

export const clearRaidLogs = (guildId) => {
    joinLog.delete(guildId);
};

export const updateRaidSettings = (guildId, newSettings) => {
    const currentSettings = raidSettings.get(guildId) || { 
        enabled: false, 
        threshold: 10, 
        action: 'alert' 
    };
    
    raidSettings.set(guildId, {
        ...currentSettings,
        ...newSettings
    });
};
