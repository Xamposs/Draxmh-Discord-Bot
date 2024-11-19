const { EmbedBuilder } = require('discord.js');
const { getStakingStats } = require('../services/stakingService');

module.exports = {
    name: 'stake-stats',
    description: 'Get DRX staking pool statistics',
    async execute(message) {
        try {
            const stakingStats = await getStakingStats();
            
            const embed = new EmbedBuilder()
                .setTitle('🌟 DRX Staking Statistics')
                .setColor('#00ff00')
                .addFields(
                    { name: '💎 Total Staked', value: stakingStats.totalStaked, inline: true },
                    { name: '👥 Active Stakers', value: stakingStats.activeStakers.toString(), inline: true },
                    { name: '📊 Current APY', value: stakingStats.apy, inline: true },
                    { name: '🔒 Minimum Stake', value: stakingStats.minStake, inline: true },
                    { name: '⏳ Lock Period', value: stakingStats.lockPeriod, inline: true },
                    { name: '🎁 Rewards', value: stakingStats.nextReward, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'DRX Staking Pool Info' });

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error:', error);
            message.reply('Error fetching staking statistics!');
        }
    }
};