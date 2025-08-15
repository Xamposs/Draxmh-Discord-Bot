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

const webhooks = {
    COMMAND: new WebhookClient({ url: 'https://discord.com/api/webhooks/1307040417015005275/D7NSPLoL5tkxlwlzGWzFyxXEiju4K9W3C7Crpz6dlcgvIS8H-LqeYfRuRzDdUXpxnGYD' }),
    MESSAGE: new WebhookClient({ url: 'https://discord.com/api/webhooks/1307039968186728559/l7isNnQfCU6raZWqJ8KgkrwDHgy5VdmBEUbh5imv1o3yPaf-MFJ4whKZLRZwgffXXei3' }),
    MOD: new WebhookClient({ url: 'https://discord.com/api/webhooks/1307040417015005275/D7NSPLoL5tkxlwlzGWzFyxXEiju4K9W3C7Crpz6dlcgvIS8H-LqeYfRuRzDdUXpxnGYD' }),
    MEMBER: new WebhookClient({ url: 'https://discord.com/api/webhooks/1307040755742670948/3mTQ9OGSiimkg_RUE_1ZrxcwFCkN6VQfqapV8xmT_IK5-whXYwVVvT0Re8ekGiNrx72b' }),
    ROLE: new WebhookClient({ url: 'https://discord.com/api/webhooks/1307041081489358871/R-51Qih9c-pscS_M3X5aarIIYKgEaHuuvxAxIWXBGKRW-57TEV_C0ZcohbJybySU3gBR' }),
    VOICE: new WebhookClient({ url: 'https://discord.com/api/webhooks/1307041220257910804/tcRAZ3gnY7copYO2eKWbU4Pc_6vTFA6NHK3y8LzuI81yiCY6omkDAmpN2slAD0Dr8XKp' }),
    INVITE: new WebhookClient({ url: 'https://discord.com/api/webhooks/1307041316189765814/cBPpdDRw-ZL3vuXmMAcAeUD_kkeiCSKm8sul-azzjhqbL0T2cxMt47kTz_Q-9PQMAZnW' }),
    SERVER: new WebhookClient({ url: 'https://discord.com/api/webhooks/1307041506778943639/C9kwowau-OmidgZt4biOgdz_mUcG1KiDeUMVD_4mlcyCUZ8Lr89KK3XMQR4A-E5l4Rn0' }),
    THREAD: new WebhookClient({ url: 'https://discord.com/api/webhooks/1307041681014521856/PZNVu-ruAtENDHpHpBERt0f_f_NxL-rDh6xIzCUz1DcE1cx-9n-RRq7dGyM2UD7O742R' }),
    CHANNEL: new WebhookClient({ url: 'https://discord.com/api/webhooks/1307041681014521856/PZNVu-ruAtENDHpHpBERt0f_f_NxL-rDh6xIzCUz1DcE1cx-9n-RRq7dGyM2UD7O742R' }),
    CHANNEL_PERMS: new WebhookClient({ url: 'https://discord.com/api/webhooks/1307041681014521856/PZNVu-ruAtENDHpHpBERt0f_f_NxL-rDh6xIzCUz1DcE1cx-9n-RRq7dGyM2UD7O742R' }),
    CHANNEL_UPDATE: new WebhookClient({ url: 'https://discord.com/api/webhooks/1307041681014521856/PZNVu-ruAtENDHpHpBERt0f_f_NxL-rDh6xIzCUz1DcE1cx-9n-RRq7dGyM2UD7O742R' })
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
    const embed = new EmbedBuilder()
        .setColor(color ?? 0x00ff00) // Use a default color if color is undefined
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
