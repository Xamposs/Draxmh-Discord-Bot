import { EmbedBuilder } from 'discord.js';

export const dappsCommand = {
    name: 'dapps',
    description: 'Get DRX dApp links and integration info',
    async execute(message) {
        const embed = new EmbedBuilder()
            .setTitle('🔗 DRX Ecosystem Links')
            .setColor('#00ff00')
            .addFields(
                { name: '💎 DRX Staking dApp', value: 'https://drx-dapp.vercel.app/', inline: true },
                { name: '💱 Quick Swap', value: 'https://drx-dapp.vercel.app/', inline: true },
                { name: '🌐 Website', value: 'https://www.cryptodraxmh.gr/', inline: true },
                { name: '📊 Analytics', value: 'https://drx-dapp.vercel.app/', inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'DRX Ecosystem Integration' });

        message.reply({ embeds: [embed] });
    }
};
