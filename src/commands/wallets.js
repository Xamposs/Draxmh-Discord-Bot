const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'wallets',
    description: 'Shows recommended wallets for DRX token',
    execute(message) {
        const embed = new EmbedBuilder()
            .setTitle('💼 Recommended Wallets for DRX')
            .setColor('#00ff00')
            .addFields(
                { 
                    name: '📱 Xaman Wallet (formerly XUMM)', 
                    value: '[Download for Android](https://play.google.com/store/apps/details?id=com.xrpllabs.xumm)\n[Download for iOS](https://apps.apple.com/us/app/xumm/id1492302343)\nSecure and user-friendly XRPL wallet',
                    inline: false 
                },
                { 
                    name: '🌐 GemWallet', 
                    value: '[Chrome Extension](https://gemwallet.app)\nBrowser extension for easy DRX transactions',
                    inline: false 
                },
                { 
                    name: '📲 Crossmark', 
                    value: '[Download Crossmark](https://crossmark.io)\nMulti-platform XRPL wallet with DRX support',
                    inline: false 
                }
            )
            .setFooter({ text: 'Always verify wallet sources before downloading' });

        message.reply({ embeds: [embed] });
    }
};
