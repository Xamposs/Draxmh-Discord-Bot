import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { backupChannel, backupAll, restoreBackup, listBackups } from '../utils/security/backupManager.js';

export const backupCmd = {
    name: 'backup',
    description: 'Manage channel backups',
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('You do not have permission to use this command.');
        }

        if (!args.length) {
            return message.reply('Usage: !backup <all/channel/list/restore>');
        }

        const action = args[0].toLowerCase();
        switch(action) {
            case 'all':
                await backupAll(message.guild);
                message.reply('Backup of all channels completed');
                break;

            case 'channel':
                const channel = message.mentions.channels.first();
                if (!channel) return message.reply('Please mention a channel to backup');
                await backupChannel(channel);
                message.reply(`Backup of ${channel.name} completed`);
                break;

            case 'list':
                const backups = await listBackups(message.guild.id);
                const embed = new EmbedBuilder()
                    .setTitle('Channel Backups')
                    .setDescription(backups.join('\n'))
                    .setColor('#00ff00');
                message.reply({ embeds: [embed] });
                break;

            case 'restore':
                if (!args[1]) return message.reply('Please specify backup ID');
                await restoreBackup(message.guild, args[1]);
                message.reply('Backup restored successfully');
                break;
        }
    }
};
