const verificationSettings = new Map();
const pendingVerifications = new Map();

export const toggleVerification = (guildId, enabled) => {
    const settings = verificationSettings.get(guildId) || { level: 1, role: null };
    settings.enabled = enabled;
    verificationSettings.set(guildId, settings);
};

export const setVerificationLevel = (guildId, level) => {
    const settings = verificationSettings.get(guildId) || { enabled: false, role: null };
    settings.level = level;
    verificationSettings.set(guildId, settings);
};

export const getVerificationStatus = (guildId) => {
    return verificationSettings.get(guildId) || { enabled: false, level: 1, role: null };
};

export const handleVerification = async (member) => {
    const settings = verificationSettings.get(member.guild.id);
    if (!settings?.enabled) return;

    try {
        // Create verification entry
        pendingVerifications.set(member.id, {
            timestamp: Date.now(),
            attempts: 0,
            completed: false
        });

        // Apply unverified role if exists
        const unverifiedRole = member.guild.roles.cache.find(r => r.name === 'Unverified');
        if (unverifiedRole) {
            await member.roles.add(unverifiedRole);
        }

        // Find verification channel
        const verificationChannel = member.guild.channels.cache.find(
            c => c.name === 'verification' || c.name === 'verify'
        );

        if (!verificationChannel) return;

        // Send level-specific verification instructions
        switch (settings.level) {
            case 1: // Basic reaction verification
                const reactionMsg = await verificationChannel.send({
                    content: `Welcome ${member}! React with ✅ to verify your account.`,
                    allowedMentions: { users: [member.id] }
                });
                await reactionMsg.react('✅');
                break;

            case 2: // Command verification
                await verificationChannel.send({
                    content: `Welcome ${member}! Type \`!verify\` to complete verification.`,
                    allowedMentions: { users: [member.id] }
                });
                break;

            case 3: // Advanced verification (captcha)
                const captcha = generateCaptcha();
                pendingVerifications.get(member.id).captcha = captcha.code;
                await verificationChannel.send({
                    content: `Welcome ${member}! Please complete this captcha: ${captcha.display}`,
                    allowedMentions: { users: [member.id] }
                });
                break;
        }
    } catch (error) {
        console.error('Verification error:', error);
    }
};

export const setVerificationRole = (guildId, roleId) => {
    const settings = verificationSettings.get(guildId) || { enabled: false, level: 1 };
    settings.role = roleId;
    verificationSettings.set(guildId, settings);
};

export const verifyUser = async (member, input = '') => {
    const settings = verificationSettings.get(member.guild.id);
    if (!settings?.enabled) return false;

    const pending = pendingVerifications.get(member.id);
    if (!pending) return false;

    // Verify based on level
    let verified = false;
    switch (settings.level) {
        case 1:
            verified = true; // Reaction verification handled separately
            break;
        case 2:
            verified = input.toLowerCase() === '!verify';
            break;
        case 3:
            verified = input === pending.captcha;
            break;
    }

    if (verified) {
        await completeVerification(member);
        return true;
    }

    pending.attempts++;
    if (pending.attempts >= 3) {
        await member.kick('Failed verification');
    }
    return false;
};

const completeVerification = async (member) => {
    const settings = verificationSettings.get(member.guild.id);
    const unverifiedRole = member.guild.roles.cache.find(r => r.name === 'Unverified');
    const verifiedRole = member.guild.roles.cache.get(settings.role);

    if (unverifiedRole) {
        await member.roles.remove(unverifiedRole);
    }
    if (verifiedRole) {
        await member.roles.add(verifiedRole);
    }

    pendingVerifications.delete(member.id);

    const welcomeChannel = member.guild.channels.cache.find(c => c.name === 'welcome');
    if (welcomeChannel) {
        await welcomeChannel.send({
            content: `Welcome ${member} to the server! You've been verified successfully.`,
            allowedMentions: { users: [member.id] }
        });
    }
};

const generateCaptcha = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const display = code.split('').join(' ');
    return { code, display };
};

export const getVerificationStats = (guildId) => {
    const settings = getVerificationStatus(guildId);
    const pending = Array.from(pendingVerifications.values()).filter(v => !v.completed);

    return {
        isEnabled: settings.enabled,
        currentLevel: settings.level,
        roleId: settings.role,
        pendingCount: pending.length,
        averageCompletionTime: calculateAverageCompletionTime(),
        timestamp: new Date()
    };
};

const calculateAverageCompletionTime = () => {
    const completedVerifications = Array.from(pendingVerifications.values())
        .filter(v => v.completed && v.completionTime);
    
    if (completedVerifications.length === 0) return 0;

    const totalTime = completedVerifications.reduce((sum, v) => 
        sum + (v.completionTime - v.timestamp), 0);
    return totalTime / completedVerifications.length;
};
