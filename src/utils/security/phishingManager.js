  const phishingSettings = new Map();
  const phishingLogs = new Map();

  function togglePhishing(guildId, enabled) {
      const settings = phishingSettings.get(guildId) || { whitelist: [] };
      settings.enabled = enabled;
      phishingSettings.set(guildId, settings);
  }

  function addWhitelist(guildId, domain) {
      const settings = phishingSettings.get(guildId) || { enabled: false, whitelist: [] };
      settings.whitelist.push(domain);
      phishingSettings.set(guildId, settings);
  }

  function removeWhitelist(guildId, domain) {
      const settings = phishingSettings.get(guildId);
      if (settings) {
          settings.whitelist = settings.whitelist.filter(d => d !== domain);
          phishingSettings.set(guildId, settings);
      }
  }

  function getPhishingLogs(guildId) {
      return phishingLogs.get(guildId) || [];
  }

  async function handlePhishingDetection(message) {
      const settings = phishingSettings.get(message.guild.id);
      if (!settings?.enabled) return;

      // Check for URLs in message
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = message.content.match(urlRegex);

      if (!urls) return;

      for (const url of urls) {
          try {
              const domain = new URL(url).hostname;
            
              // Skip whitelisted domains
              if (settings.whitelist.includes(domain)) continue;

              // Check against known phishing domains
              const isPhishing = await checkPhishingDomain(domain);
            
              if (isPhishing) {
                  // Delete message
                  await message.delete();
                
                  // Log the attempt
                  const log = `${message.author.tag} posted suspicious link: ${domain}`;
                  if (!phishingLogs.has(message.guild.id)) {
                      phishingLogs.set(message.guild.id, []);
                  }
                  phishingLogs.get(message.guild.id).push(log);
                
                  // Alert channel
                  await message.channel.send(`⚠️ Suspicious link detected and removed.`);
              }
          } catch (error) {
              console.error('Error checking URL:', error);
          }
      }
  }

  // Helper function to check if domain is suspicious
  async function checkPhishingDomain(domain) {
      // Add your phishing detection logic here
      const knownPhishingDomains = [
          'fake-draxmh.com',
          'draxmh-free.com',
          'draxmh-airdrop.com'
      ];
      return knownPhishingDomains.includes(domain);
  }

  module.exports = { 
      handlePhishingDetection,
      togglePhishing, 
      addWhitelist, 
      removeWhitelist, 
      getPhishingLogs 
  };
