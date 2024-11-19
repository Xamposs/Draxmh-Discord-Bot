const { EmbedBuilder } = require('discord.js');
const QRCode = require('qrcode');
const { getDRXPrice } = require('../services/priceService');

module.exports = {
    name: 'swap',
    description: 'Swap XRP to DRX with live pricing',
    async execute(message, args) {
        if (!args.length) {
            return message.reply('Usage: !swap <amount>');
        }

        const amount = parseFloat(args[0]);
        if (isNaN(amount)) {
            return message.reply('Please provide a valid amount!');
        }

        try {
            const priceData = await getDRXPrice();
            // Direct price calculation without division
            const price = priceData.price / 1000000;
            const expectedOutput = amount / price;
            
            const soloLink = `https://sologenic.org/trade?market=DRX%2BrUWUQhB2pcgCbjJxaBv9GrS1hr9pCUGXxX%2FXRP&network=mainnet`;
            const qrBuffer = await QRCode.toBuffer(soloLink);

            const embed = new EmbedBuilder()
                .setTitle('🔄 DRX Swap Preview')
                .setColor('#00ff00')
                .addFields(
                    { name: 'Amount In', value: `${amount} XRP`, inline: true },
                    { name: 'Expected Output', value: `${expectedOutput.toFixed(2)} DRX`, inline: true },
                    { name: 'Current Rate', value: `1 DRX = ${price.toFixed(6)} XRP`, inline: true },
                    { name: '🔗 Swap Now', value: `[Click to open Sologenic DEX](${soloLink})` }
                )
                .setImage('attachment://qr.png')
                .setFooter({ text: 'Scan QR code or click link to execute swap' });

            message.reply({ 
                embeds: [embed], 
                files: [{ attachment: qrBuffer, name: 'qr.png' }]
            });

        } catch (error) {
            console.error('Swap error:', error);
            message.reply('Error fetching swap data. Please try again.');
        }
    }
};