import { EmbedBuilder } from 'discord.js';
import { XummService } from '../services/xummService.js';

const walletCommand = {
    name: 'wallet',
    description: 'Check your connected wallet details',
    async execute(message) {
        const xummService = new XummService();
        const walletInfo = xummService.getConnectedWallet(message.author.id);

        if (!walletInfo) {
            const embed = new EmbedBuilder()
                .setTitle('❌ No Wallet Connected')
                .setColor('#ff0000')
                .setDescription('Use !connect to link your XRPL wallet')
                .setTimestamp();
            
            return message.reply({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
            .setTitle('💼 Your XRPL Wallet')
            .setColor('#00ff00')
            .addFields(
                { name: 'Status', value: '✅ Connected', inline: true },
                { name: 'Address', value: walletInfo.address, inline: true },
                { name: 'Connected Since', value: new Date(walletInfo.connectedAt).toLocaleString(), inline: true }
            )
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};

export default walletCommand;