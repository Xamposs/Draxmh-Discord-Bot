const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const RULES_CHANNEL = '1252209254908170343';
const WELCOME_CHANNEL = '1252359290132500632';
const MEMBER_ROLE = 'Y121252360773229875220';

module.exports = async (member) => {
    try {
        const welcomeEmbed = new EmbedBuilder()
            .setTitle(`Welcome to ${member.guild.name}!`)
            .setDescription(`Hey ${member}, welcome to the official DRX community!\n\nPlease read our rules in <#${RULES_CHANNEL}> and click the button below to accept them.`)
            .setColor('#00ff00')
            .setThumbnail(member.user.displayAvatarURL())
            .addFields(
                { name: '📜 Rules', value: '1. Be respectful to all members\n2. No spam or self-promotion\n3. Use appropriate channels\n4. No NSFW content\n5. Follow Discord TOS' },
                { name: '🎯 Next Steps', value: '• Accept the rules below\n• Get your roles\n• Introduce yourself\n• Join the community!' }
            )
            .setImage('https://your-banner-image.png');

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('accept_rules')
                    .setLabel('Accept Rules')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅')
            );

        const welcomeChannel = member.guild.channels.cache.get(WELCOME_CHANNEL);
        if (welcomeChannel) {
            welcomeChannel.send({ 
                content: `Welcome ${member}!`,
                embeds: [welcomeEmbed],
                components: [row]
            });
        }
    } catch (error) {
        console.error('Member join error:', error);
    }
};
