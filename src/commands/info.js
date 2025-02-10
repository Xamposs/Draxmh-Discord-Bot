import { EmbedBuilder } from 'discord.js';

export const infoCmd = {
    name: 'info',
    description: 'Shows coin information',
    execute(message) {
        const embed = new EmbedBuilder()
            .setTitle('ℹ️ DRX Token Information')
            .setColor('#00ff00')
            .addFields(
                { name: 'Token Name', value: 'DRX', inline: true },
                { name: 'Network', value: 'XRPL', inline: true },
                { name: 'Contract', value: 'rUWUQhB2pcgCbjJxaBv9GrS1hr9pCUGXxX', inline: true },
                { name: 'Total Supply', value: '2,000,000,000 DRX', inline: true },
                { name: 'Website', value: 'https://www.cryptodraxmh.gr/', inline: true },
                { name: 'DEX', value: 'Sologenic', inline: true }
            )
            .setFooter({ text: 'DRX Token Info' });

        message.reply({ embeds: [embed] });
    }
};
