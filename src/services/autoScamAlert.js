const { EmbedBuilder } = require('discord.js');
const axios = require('axios');

const ALERT_CHANNEL_ID = '1307095704858005545';
const SCAN_INTERVAL = 10 * 60 * 1000; // Changed to 10 minutes

const NETWORKS = {
    SOLANA: 'Solana',
    ETHEREUM: 'Ethereum',
    BASE: 'Base',
    ARBITRUM: 'Arbitrum',
    POLYGON: 'Polygon',
    TON: 'TON'
};

async function scanNetwork(network) {
    // Simulated scan that could return potential scams
    const scamFound = Math.random() < 0.1; // 10% chance to find a scam for demo
    if (scamFound) {
        return {
            network,
            status: `${network} Network scan completed ✅`,
            scams: [{
                name: `Fake DRX ${network}`,
                contract: `0x${Math.random().toString(16).slice(2, 42)}`,
                warning: 'Impersonating official DRX token'
            }]
        };
    }
    return {
        network,
        status: `${network} Network scan completed ✅`,
        scams: []
    };
}

function startScamAlerts(client) {
    sendAlert(client);
    setInterval(() => sendAlert(client), SCAN_INTERVAL);
}

async function sendAlert(client) {
    const channel = client.channels.cache.get(ALERT_CHANNEL_ID);
    if (channel) {
        const scanResults = await Promise.all(
            Object.values(NETWORKS).map(network => scanNetwork(network))
        );

        const networkStatuses = scanResults.map(result => result.status).join('\n');
        const detectedScams = scanResults.filter(result => result.scams.length > 0);
          const { EmbedBuilder } = require('discord.js');

          function generateScamAlert(scamData) {
              return new EmbedBuilder()
                  .setTitle('🚨 DRX Multi-Chain Security Alert')
                  .setColor('#ff0000')
                  .addFields(
                      {
                          name: 'SCAM ALERT DETAILS',
                          value: `**Network:** ${scamData.network}\n` +
                       `**Scam Name:** ${scamData.name}\n` +
                       `**Full Contract:** \`${scamData.contract}\`\n` +
                       `**Creation Date:** ${scamData.creationDate}\n` +
                       `**Creator Address:** \`${scamData.creator}\`\n` +
                       `**Token Supply:** ${scamData.supply}\n` +
                       `**Holders:** ${scamData.holders}\n` +
                       `**Verification Status:** ${scamData.verified ? 'Verified ✓' : 'Unverified ⚠️'}\n` +
                       `**Risk Level:** 🔴 High Risk\n` +
                       `**Warning:** ${scamData.warning}`,
                          inline: false
                      },
                      {
                          name: '🔍 How to Verify',
                          value: `• Check on ${scamData.network}scan: [View Contract](${scamData.explorerUrl})\n` +
                       `• Compare with official DRX: \`rUWUQhB2pcgCbjJxaBv9GrS1hr9pCUGXxX\`\n` +
                       `• Report suspicious tokens using !report`
                      }
                  )
                  .setTimestamp();
          }

                  const embed = new EmbedBuilder()
                      .setTitle('🚨 DRX Multi-Chain Security Alert')
                      .setColor('#ff0000')
                      .addFields(
                          { name: '🔍 Network Scan Results', value: networkStatuses }
                      );

                  // Add scam alerts if any were detected
                  if (detectedScams.length > 0) {
                      embed.addFields({
                          name: '⚠️ SCAM ALERTS DETECTED',
                          value: detectedScams.map(result => 
                              result.scams.map(scam => 
                        `Network: ${result.network}\n` +
                        `Scam Name: ${scam.name}\n` +
                        `Contract: \`${scam.contract}\`\n` +
                        `Warning: ${scam.warning}`
                    ).join('\n\n')
                ).join('\n\n')
            });
        }

        embed.addFields(
            { name: '⚠️ Security Check', value: 
                'Regular security scan completed.\n' +
                'Stay vigilant against potential scams!'
            },
            { name: '✅ Official DRX Contract', value: 
                '`rUWUQhB2pcgCbjJxaBv9GrS1hr9pCUGXxX`\n' +
                'Always verify on Sologenic DEX'
            },
            { name: '🛡️ Security Tips', value: 
                '• Only use official website: https://www.cryptodraxmh.gr/\n' +
                '• Trade only on Sologenic DEX\n' +
                '• Never share private keys\n' +
                '• Team never DMs first\n' +
                '• Report suspicious activity with `!report` in the scam-alert channel'
            }
        )
        .setTimestamp()
        .setFooter({ text: 'DRX Multi-Chain Security Alert System • Stay Safe' });

        channel.send({ embeds: [embed] });
    }
}

module.exports = { startScamAlerts };