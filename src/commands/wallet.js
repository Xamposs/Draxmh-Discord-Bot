const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const XummAuthService = require('../services/xummAuth');

module.exports = {
    name: 'wallet',
    description: 'XRPL wallet commands',
    execute: async (message, args) => {
        const xummAuth = new XummAuthService();

        if (!args.length) {
            return message.channel.send('Usage:\n!wallet <address> - Check wallet info\n!wallet signin - Connect XUMM wallet\n!wallet balance - Check your balance\n!wallet transactions - View transactions\n!wallet info - Account info\n!wallet status - Check connection status\n!wallet disconnect - Disconnect wallet');
        }

        // Direct wallet lookup with address
        if (args[0].startsWith('r')) {
            return handleWalletLookup(message, args[0]);
        }

        // XUMM wallet commands
        switch(args[0]) {
            case 'signin':
                const signInData = await xummAuth.createSignInRequest(message.author.id);
                const embed = new EmbedBuilder()
                    .setTitle('🔐 XUMM Wallet Sign In')
                    .setColor('#00ff00')
                    .setDescription('Connect your XUMM wallet for enhanced features')
                    .addFields(
                        { name: '🔗 Sign In Link', value: signInData.signInUrl },
                        { name: '⏱️ Expires', value: 'In 5 minutes' }
                    )
                    .setImage(signInData.qrUrl)
                    .setTimestamp();
                message.channel.send({ embeds: [embed] });
                break;

            case 'balance':
                try {
                    if (!xummAuth.isWalletConnected(message.author.id)) {
                        return message.reply('Please connect your wallet first using !wallet signin');
                    }
                    const balance = await xummAuth.getWalletBalance(message.author.id);
                    const balanceEmbed = new EmbedBuilder()
                        .setTitle('💰 Your Wallet Balance')
                        .setColor('#00ff00')
                        .addFields({ name: 'XRP Balance', value: `${balance} XRP` })
                        .setTimestamp();
                    message.reply({ embeds: [balanceEmbed] });
                } catch (error) {
                    message.reply('Error fetching balance. Please try again.');
                }
                break;

            case 'transactions':
                try {
                    if (!xummAuth.isWalletConnected(message.author.id)) {
                        return message.reply('Please connect your wallet first using !wallet signin');
                    }
                    const txs = await xummAuth.getTransactions(message.author.id);
                    const txEmbed = new EmbedBuilder()
                        .setTitle('📜 Recent Transactions')
                        .setColor('#00ff00')
                        .setTimestamp();
                    
                    txs.forEach(tx => {
                        txEmbed.addFields({
                            name: `Transaction ${tx.hash.substring(0, 8)}...`,
                            value: `Type: ${tx.type}\nAmount: ${tx.amount} XRP\nDate: ${tx.date}`
                        });
                    });
                    
                    message.reply({ embeds: [txEmbed] });
                } catch (error) {
                    message.reply('Error fetching transactions. Please try again.');
                }
                break;

            case 'info':
                try {
                    if (!xummAuth.isWalletConnected(message.author.id)) {
                        return message.reply('Please connect your wallet first using !wallet signin');
                    }
                    const info = await xummAuth.getAccountInfo(message.author.id);
                    const infoEmbed = new EmbedBuilder()
                        .setTitle('ℹ️ Account Information')
                        .setColor('#00ff00')
                        .addFields([
                            { name: 'Address', value: info.account },
                            { name: 'Balance', value: `${(Number(info.balance) / 1000000).toFixed(2)} XRP` },
                            { name: 'Sequence', value: info.sequence.toString() }
                        ])
                        .setTimestamp();
                    message.reply({ embeds: [infoEmbed] });
                } catch (error) {
                    message.reply('Error fetching account info. Please try again.');
                }
                break;

            case 'status':
                const status = xummAuth.getConnectionStatus(message.author.id);
                if (!status) {
                    message.reply('No wallet connection found.');
                    return;
                }
                
                const statusEmbed = new EmbedBuilder()
                    .setTitle('🔗 Wallet Connection Status')
                    .setColor(status.connected ? '#00ff00' : '#ff0000')
                    .addFields([
                        { name: 'Status', value: status.connected ? 'Connected' : 'Disconnected' },
                        { name: 'Time Remaining', value: status.isExpired ? 'Expired' : status.timeLeft }
                    ])
                    .setTimestamp();
                
                message.reply({ embeds: [statusEmbed] });
                break;

            case 'disconnect':
                try {
                    if (!xummAuth.isWalletConnected(message.author.id)) {
                        return message.reply('No wallet currently connected.');
                    }
                    await xummAuth.disconnectWallet(message.author.id);
                    message.reply('✅ Wallet disconnected successfully!');
                } catch (error) {
                    message.reply('Error disconnecting wallet. Please try again.');
                }
                break;
        }
    }
};

async function handleWalletLookup(message, address) {
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
