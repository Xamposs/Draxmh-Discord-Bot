const { EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    name: 'wallet',
    description: 'Check wallet balance and details',
    async execute(message, args) {
        if (!args.length) {
            return message.reply('Please provide a wallet address! Usage: !wallet <address>');
        }

        const address = args[0];
        const XRPL_API = 'https://xrplcluster.com/v2';

        try {
            const response = await axios.post(XRPL_API, {
                method: 'account_info',
                params: [{
                    account: address,
                    strict: true,
                    ledger_index: 'current',
                    queue: true
                }]
            });

            const accountData = response.data.result.account_data;
            const balance = (Number(accountData.Balance) / 1000000).toFixed(2);

            const embed = new EmbedBuilder()
                .setTitle('💼 Wallet Information')
                .setColor('#00ff00')
                .addFields(
                    { name: '📍 Address', value: address, inline: false },
                    { name: '💰 XRP Balance', value: `${balance} XRP`, inline: true },
                    { name: '📊 Sequence', value: accountData.Sequence.toString(), inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'XRPL Wallet Info' });

            message.reply({ embeds: [embed] });
        } catch (error) {
            message.reply('Invalid wallet address or network error!');
        }
    }
};
