const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const XummAuthService = require('../services/xummAuth');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('xumm-signin')
        .setDescription('Sign in with your XUMM wallet'),
        
    async execute(interaction) {
        const xummAuth = new XummAuthService();
        
        const signInData = await xummAuth.createSignInRequest(interaction.user.id);
        
        const embed = new EmbedBuilder()
            .setTitle('🔐 XUMM Sign In')
            .setColor('#00ff00')
            .setDescription('Scan the QR code or click the link below to sign in with your XUMM wallet')
            .addFields(
                { name: '🔗 Sign In Link', value: signInData.signInUrl },
                { name: '⏱️ Expires', value: 'In 5 minutes' }
            )
            .setImage(signInData.qrUrl)
            .setTimestamp();
            
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
