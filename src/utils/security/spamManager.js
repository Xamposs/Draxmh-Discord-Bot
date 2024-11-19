  const spamSettings = new Map();
  const userMessages = new Map();

  async function handleSpamDetection(message) {
      const settings = spamSettings.get(message.guild.id);
      if (!settings?.enabled) return;

      const userId = message.author.id;
      const now = Date.now();
    
      if (!userMessages.has(userId)) {
          userMessages.set(userId, []);
      }
    
      const userHistory = userMessages.get(userId);
      userHistory.push(now);
    
      // Clean old messages
      const threshold = now - 5000; // 5 seconds
      while (userHistory.length && userHistory[0] < threshold) {
          userHistory.shift();
      }
    
      // Check spam based on sensitivity
      const messageCount = userHistory.length;
      const spamThreshold = {
          low: 10,
          medium: 7,
          high: 5
      }[settings.sensitivity || 'medium'];
    
      if (messageCount >= spamThreshold) {
          await message.member.timeout(300000); // 5 minute timeout
          await message.channel.send(`${message.author} has been muted for spam detection.`);
          userMessages.delete(userId);
      }
  }

  function toggleSpam(guildId, enabled) {
      const settings = spamSettings.get(guildId) || { sensitivity: 'medium', exemptRoles: [] };
      settings.enabled = enabled;
      spamSettings.set(guildId, settings);
  }

  function setSensitivity(guildId, level) {
      const settings = spamSettings.get(guildId) || { enabled: false, exemptRoles: [] };
      settings.sensitivity = level;
      spamSettings.set(guildId, settings);
  }

  function addExemptRole(guildId, roleId) {
      const settings = spamSettings.get(guildId) || { enabled: false, sensitivity: 'medium', exemptRoles: [] };
      settings.exemptRoles.push(roleId);
      spamSettings.set(guildId, settings);
  }

  module.exports = { 
      handleSpamDetection,
      toggleSpam, 
      setSensitivity, 
      addExemptRole 
  };
