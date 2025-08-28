import { EmbedBuilder, WebhookClient } from 'discord.js';

const LogTypes = {
    COMMAND: '⌨️',
    MESSAGE: '💬',
    MOD: '🛡️',
    MEMBER: '👤',
    CHANNEL: '📝',
    ROLE: '👑',
    VOICE: '🔊',
    INVITE: '📨',
    SERVER: '⚙️',
    THREAD: '🧵'
};

// Secure webhook initialization using environment variables
const createWebhookClient = (envVar) => {
    const url = process.env[envVar];
    if (!url) {
        console.warn(`Warning: ${envVar} not found in environment variables`);
        return null;
    }
    return new WebhookClient({ url });
};

const webhooks = {
    COMMAND: createWebhookClient('WEBHOOK_COMMAND'),
    MESSAGE: createWebhookClient('WEBHOOK_MESSAGE'),
    MOD: createWebhookClient('WEBHOOK_MOD'),
    MEMBER: createWebhookClient('WEBHOOK_MEMBER'),
    ROLE: createWebhookClient('WEBHOOK_ROLE'),
    VOICE: createWebhookClient('WEBHOOK_VOICE'),
    INVITE: createWebhookClient('WEBHOOK_INVITE'),
    SERVER: createWebhookClient('WEBHOOK_SERVER'),
    THREAD: createWebhookClient('WEBHOOK_THREAD'),
    CHANNEL: createWebhookClient('WEBHOOK_CHANNEL'),
    CHANNEL_PERMS: createWebhookClient('WEBHOOK_CHANNEL'),
    CHANNEL_UPDATE: createWebhookClient('WEBHOOK_CHANNEL')
};

const colors = {
    COMMAND: '#00ff00',
    MESSAGE: '#0099ff',
    MOD: '#ff0000',
    MEMBER: '#ffff00',
    CHANNEL: '#ff9900',
    ROLE: '#9900ff',
    VOICE: '#00ffff',
    INVITE: '#ff66cc',
    SERVER: '#cc33ff',
    THREAD: '#33ccff',
    ADD: '#00ff00',
    REMOVE: '#ff0000',
    UPDATE: '#ffaa00'
};

export const logAction = async (type, guild, data) => {
    const webhook = webhooks[type];
    if (!webhook) {
        console.warn(`No webhook configured for type: ${type}`);
        return;
    }
    
    const embed = new EmbedBuilder()
        .setColor(colors[type] ?? 0x00ff00)
        .setTimestamp()
        .setFooter({ text: guild.name, iconURL: guild.iconURL() });

    const webhook = webhooks[type];
    if (!webhook) return;

    switch (type) {
        case 'COMMAND':
            embed.setDescription(`**Command Used:** \`${data.command}\`\n**User:** ${data.user.tag}\n**Channel:** <#${data.channel.id}>`);
            break;

        case 'MESSAGE':
            embed.setDescription(`**Message ${data.action}**\n**User:** ${data.user.tag}\n**Channel:** <#${data.channel.id}>\n\n**Content:**\n${data.content || 'No content'}`);
            if (data.oldContent) {
                embed.addFields({ name: 'Old Content', value: data.oldContent });
            }
            break;

        case 'MOD':
            embed.setDescription(`**Moderation Action:** ${data.action}\n**Moderator:** ${data.mod.tag}\n**Target:** ${data.target.tag}\n**Reason:** ${data.reason || 'No reason provided'}`);
            if (data.duration) {
                embed.addFields({ name: 'Duration', value: data.duration });
            }
            break;

        case 'CHANNEL':
            embed.setDescription(`**Channel ${data.action}**\n**Channel:** ${data.channel.name}\n**Moderator:** ${data.moderator.tag}`);
            if (data.action === 'Updated') {
                if (data.oldName !== data.newName) {
                    embed.addFields(
                        { name: 'Old Name', value: data.oldName || 'None' },
                        { name: 'New Name', value: data.newName || 'None' }
                    );
                }
                if (data.oldTopic !== data.newTopic) {
                    embed.addFields(
                        { name: 'Old Topic', value: data.oldTopic || 'None' },
                        { name: 'New Topic', value: data.newTopic || 'None' }
                    );
                }
            }
            break;

        case 'ROLE':
            embed.setDescription(`**Role ${data.action}**\n**Role:** ${data.role.name}\n**Moderator:** ${data.moderator.tag}`);
            if (data.member) {
                embed.addFields({ name: 'Member', value: data.member.tag });
            }
            break;

        case 'VOICE':
            embed.setDescription(`**Voice ${data.action}**\n**User:** ${data.user.tag}\n**Channel:** ${data.channel.name}`);
            if (data.oldChannel) {
                embed.addFields({ name: 'Old Channel', value: data.oldChannel.name });
            }
            break;

        case 'INVITE':
            embed.setDescription(`**Invite ${data.action}**\n**Inviter:** ${data.inviter.tag}\n**Code:** ${data.code}\n**Uses:** ${data.uses}/${data.maxUses || '∞'}`);
            if (data.user) {
                embed.addFields({ name: 'Used By', value: data.user.tag });
            }
            break;

        case 'MEMBER':
            embed.setDescription(`**Member ${data.action}**\n**User:** ${data.user.tag}`);
            if (data.roles) {
                embed.addFields({ name: 'Roles', value: data.roles.join(', ') });
            }
            break;

        case 'THREAD':
            embed.setDescription(`**Thread ${data.action}**\n**Thread:** ${data.thread.name}\n**Parent Channel:** <#${data.thread.parentId}>`);
            if (data.moderator) {
                embed.addFields({ name: 'Moderator', value: data.moderator.tag });
            }
            break;
    }

    try {
        await webhook.send({ embeds: [embed] });
    } catch (error) {
        console.error(`Failed to send ${type} log:`, error);
    }
};

export { LogTypes, colors };
