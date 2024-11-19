const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'scamalert',
    description: 'Shows current scam alerts and security information',
    execute(message) {
        const embed = new EmbedBuilder()
            .setTitle('🚨 DRX Security Alert System')
            .setColor('#ff0000')
            .addFields(
                { name: '⚠️ Known Scam Projects', value: 
                    '• DraxMH Token (Fake)\n' +
                    '• DraxMH Inu\n' +
                    '• DraxMH AI\n' +
                    '• DraxMH 2.0', 
                    inline: false 
                },
                { name: '✅ Official DRX Contract', value: 
                    '`rUWUQhB2pcgCbjJxaBv9GrS1hr9pCUGXxX`\n' +
                    'Always verify on Sologenic DEX', 
                    inline: false 
                },
                { name: '🛡️ How to Stay Safe', value: 
                    '• Only use official website: draxmh.io\n' +
                    '• Trade only on Sologenic DEX\n' +
                    '• Never share private keys\n' +
                    '• Team never DMs first', 
                    inline: false 
                },
                { name: '🔍 Report Scams', value: 
                    'Use `!report <details>` to report suspicious activity to mods', 
                    inline: false 
                }
            )
            .setTimestamp()
            .setFooter({ text: 'DRX Security Alert System • Stay Safe' });

        message.reply({ embeds: [embed] });
    }
};
