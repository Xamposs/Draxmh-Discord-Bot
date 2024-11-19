const { EmbedBuilder } = require('discord.js');

const ALERT_CHANNEL_ID = '1304525519349354566';

function startScamAlerts(client) {
    const INTERVAL = 12 * 60 * 60 * 1000; // 12 hours
    
    setInterval(() => {
        const channel = client.channels.cache.get(ALERT_CHANNEL_ID);
        
        if (channel) {
            const embed = new EmbedBuilder()
                .setTitle('🚨 DRX Security Alert')
                .setColor('#ff0000')
                .addFields(
                    { name: '⚠️ Stay Safe', value: 
                        '• Only use official website: draxmh.io\n' +
                        '• Official contract: rUWUQhB2pcgCbjJxaBv9GrS1hr9pCUGXxX\n' +
                        '• Trade only on Sologenic DEX\n' +
                        '• Team never DMs first', 
                        inline: false 
                    },
                    { name: '🛡️ Report Scams', value: 'Use !report to create a ticket', inline: false }
                )
                .setTimestamp()
                .setFooter({ text: 'DRX Security Alert System' });

            channel.send({ embeds: [embed] });
        }
    }, INTERVAL);

    // Send initial alert when bot starts
    const channel = client.channels.cache.get(ALERT_CHANNEL_ID);
    if (channel) {
        const embed = new EmbedBuilder()
            .setTitle('🚨 DRX Security Alert System Started')
            .setColor('#ff0000')
            .setDescription('Security alerts will be posted every 12 hours.')
            .setTimestamp();
        
        channel.send({ embeds: [embed] });
    }
}

module.exports = { startScamAlerts };
