const { EmbedBuilder } = require('discord.js');
const { isCommandEnabled } = require('../utils/commandManager');

module.exports = {
    name: 'commands',
    description: 'Shows all available commands',
    execute(message) {
        const getStatus = (cmd) => isCommandEnabled(cmd, message.guild.id) ? '✅' : '❌';

        const embed = new EmbedBuilder()
            .setTitle('🤖 DRX Bot Commands')
            .setColor('#2b2d31')
            .addFields(
                { 
                    name: '💰 Token Commands', 
                    value: `\`\`\`${getStatus('price')} !price - Check DRX price\n${getStatus('volume')} !volume - Trading volume\n${getStatus('swap')} !swap - Swap tokens\`\`\``,
                    inline: false 
                },
                { 
                    name: '📊 Information', 
                    value: `\`\`\`${getStatus('info')} !info - Token information\n${getStatus('stake-stats')} !stake-stats - Staking stats\n${getStatus('dapps')} !dapps - DRX dApps\n${getStatus('socialstats')} !socialstats - Social media stats\`\`\``,
                    inline: false 
                },
                {
                    name: '🔒 Security',
                    value: `\`\`\`${getStatus('scamalert')} !scamalert - Security info\n${getStatus('report')} !report - Report issues\n${getStatus('suggest')} !suggest - Make suggestions\`\`\``,
                    inline: false
                },
                {
                    name: '🎮 Fun',
                    value: `\`\`\`${getStatus('moon')} !moon - To the moon message\n${getStatus('draxmh')} !draxmh - Shows DRX coin\`\`\``,
                    inline: false
                }
            )
            .setFooter({ text: '✅ = Enabled | ❌ = Disabled' });

        message.reply({ embeds: [embed] });
    }
};