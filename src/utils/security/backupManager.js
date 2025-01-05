  const fs = require('fs').promises;
  const path = require('path');

  const BACKUP_DIR = path.join(process.cwd(), 'backups');

  async function backupChannel(channel) {
      try {
          console.log(`Starting backup for channel: ${channel.name}`);
        
          const messages = await channel.messages.fetch({ limit: 100 });
          const backup = {
              channelId: channel.id,
              name: channel.name,
              type: channel.type,
              position: channel.position,
              messages: Array.from(messages.values()).map(msg => ({
                  content: msg.content,
                  author: msg.author.tag,
                  timestamp: msg.createdTimestamp,
                  attachments: Array.from(msg.attachments.values())
              }))
          };

          await fs.mkdir(BACKUP_DIR, { recursive: true });
          const fileName = `${channel.name}_${channel.id}.json`;
          const backupPath = path.join(BACKUP_DIR, fileName);
        
          await fs.writeFile(backupPath, JSON.stringify(backup, null, 2));
          console.log(`Backup saved: ${fileName}`);
        
          return backup;
      } catch (error) {
          console.error(`Backup failed for channel ${channel.name}:`, error);
          throw error;
      }
  }
  async function backupAll(guild) {
      console.log(`Starting full backup for guild: ${guild.name}`);
      const backups = [];
    
      for (const channel of guild.channels.cache.values()) {
          if (channel.type === 0) { // 0 is GUILD_TEXT
              try {
                  const backup = await backupChannel(channel);
                  backups.push(backup);
              } catch (error) {
                  console.error(`Failed to backup channel ${channel.name}`);
              }
          }
      }
    
      console.log(`Completed backup of ${backups.length} channels`);
      return backups;
  }

  async function listBackups(guildId) {
      const backupDir = path.join(__dirname, '../../../backups');
      const files = await fs.readdir(backupDir);
      return files.filter(f => f.endsWith('.json'));
  }

  async function restoreBackup(guild, backupId) {
      const backupPath = path.join(__dirname, '../../../backups', backupId);
      const backup = JSON.parse(await fs.readFile(backupPath, 'utf8'));
      const channel = guild.channels.cache.get(backup.channelId);
      if (channel) {
          await channel.bulkDelete(100);
          for (const msg of backup.messages.reverse()) {
              await channel.send({
                  content: `[BACKUP] ${msg.author}: ${msg.content}`,
                  files: msg.attachments
              });
          }
      }
  }

  module.exports = { backupChannel, backupAll, listBackups, restoreBackup };
