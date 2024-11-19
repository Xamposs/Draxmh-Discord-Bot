const { EmbedBuilder } = require('discord.js');

const WHALE_CHANNEL_ID = '1307089076498993265';
const MIN_AMOUNT = 100000;
const MAX_AMOUNT = 10000000;

async function processTransaction(client, tx) {
    try {
        if (!tx || !tx.Account || !tx.Destination || !tx.Amount || !tx.hash) {
            return;
        }

        let amount;
        if (typeof tx.Amount === 'string') {
            amount = Number(tx.Amount) / 1000000;
        } else if (tx.Amount?.value) {
            amount = Number(tx.Amount.value);
        } else {
            return;
        }
        
        if (isNaN(amount) || amount > MAX_AMOUNT || amount < MIN_AMOUNT || tx.Account === tx.Destination) {
            return;
        }

        const channel = client.channels.cache.get(WHALE_CHANNEL_ID);
        if (!channel) return;
        
        const embed = new EmbedBuilder()
            .setTitle('🐋 Whale Alert')
            .setColor('#ff9900')
            .addFields(
                { name: 'Amount', value: `${amount.toLocaleString()} XRP`, inline: true },
                { name: 'From', value: tx.Account, inline: true },
                { name: 'To', value: tx.Destination, inline: true },
                { name: 'Transaction Details', value: `[View on XRPSCAN](https://xrpscan.com/tx/${tx.hash})` }
            )
            .setTimestamp();

        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Whale alert processing error:', error);
    }
}

module.exports = { processTransaction };