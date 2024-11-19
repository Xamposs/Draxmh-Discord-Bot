const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { logAction } = require('../utils/logging');

module.exports = {
    name: 'role',
    description: 'Add or remove a role from a user',
    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return message.reply('You do not have permission to manage roles.');
        }

        const user = message.mentions.members.first();
        const role = message.mentions.roles.first();

        if (!user || !role) {
            return message.reply('Usage: !role @user @role');
        }

        if (message.guild.members.me.roles.highest.position <= role.position) {
            return message.reply('I cannot manage this role as it is higher than my role.');
        }

        let action;
        try {
            if (user.roles.cache.has(role.id)) {
                await user.roles.remove(role);
                action = 'Removed';
            } else {
                await user.roles.add(role);
                action = 'Added';
            }

            // Log to ROLE type specifically
            await logAction('ROLE', message.guild, {
                action: action,
                role: role,
                member: user.user,
                moderator: message.author
            });

            const embed = new EmbedBuilder()
                .setTitle('👥 Role Updated')
                .setColor('#00ff00')
                .addFields(
                    { name: 'User', value: user.user.tag, inline: true },
                    { name: 'Role', value: role.name, inline: true },
                    { name: 'Action', value: action, inline: true },
                    { name: 'Updated By', value: message.author.tag }
                )
                .setTimestamp();

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Role update error:', error);
            message.reply('Unable to update role. Make sure I have the proper permissions and the role is below my highest role.');
        }
    }
};