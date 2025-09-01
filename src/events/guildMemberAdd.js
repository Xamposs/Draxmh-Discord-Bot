import { EmbedBuilder } from 'discord.js';

const RULES_CHANNEL = '1252209254908170343';
const WELCOME_CHANNEL = '1252359290132500632';
const VERIFIED_MEMBER_ROLE = '1252360773229875220'; // Your role ID
const TICKET_CHANNEL = '1324865431185657906';

// Auto-assign this role to new members
const AUTO_ROLES = ['1252360773229875220'];

export default async (member) => {
    console.log(`New member joined: ${member.user.tag}`);
    try {
        // Auto-assign the verified member role
        for (const roleId of AUTO_ROLES) {
            const role = member.guild.roles.cache.get(roleId);
            if (role) {
                await member.roles.add(role);
                console.log(`Auto-assigned role ${role.name} to ${member.user.tag}`);
            }
        }
        
        // Welcome message
        const welcomeEmbed = new EmbedBuilder()
            .setTitle(`Welcome to ${member.guild.name}!`)
            .setDescription(`Hey ${member}, welcome to the official DRX community!\n\n🎉 **You now have full access to the server!**`)
            .setColor('#ff6b35')
            .setThumbnail(member.user.displayAvatarURL())
            .addFields(
                { name: '📜 Rules', value: '1. Be respectful to all members\n2. No spam or self-promotion\n3. Use appropriate channels\n4. No NSFW content\n5. Follow Discord TOS' },
                { name: '🎫 Need Help?', value: `If you have any issues or questions, you can open a support ticket in <#${TICKET_CHANNEL}>` }
            )
            .setFooter({ text: 'Welcome to the DRX community!' });

        const welcomeChannel = member.guild.channels.cache.get(WELCOME_CHANNEL);
        console.log('Welcome channel found:', !!welcomeChannel);
        if (welcomeChannel) {
            welcomeChannel.send({ 
                content: `🎉 Welcome ${member}!`,
                embeds: [welcomeEmbed]
            });
        }
        
    } catch (error) {
        console.error('Error in guildMemberAdd:', error);
    }
};