import axios from 'axios';

const XRPL_API = 'https://xrplcluster.com/v2';
const STAKING_ADDRESS = 'rUWUQhB2pcgCbjJxaBv9GrS1hr9pCUGXxX'; // DRX staking address

export const getStakingStats = async () => {
    try {
        // Get account objects for staking data
        const response = await axios.post(XRPL_API, {
            method: 'account_objects',
            params: [{
                account: STAKING_ADDRESS,
                type: 'state',
                ledger_index: 'current'
            }]
        });

        // Get account info for total balance
        const balanceResponse = await axios.post(XRPL_API, {
            method: 'account_info',
            params: [{
                account: STAKING_ADDRESS,
                ledger_index: 'current'
            }]
        });

        const accountObjects = response.data.result.account_objects;
        const totalBalance = balanceResponse.data.result.account_data.Balance;

        return {
            totalStaked: totalBalance,
            activeStakers: accountObjects.length,
            minStake: "5,000 DRX", // Current minimum stake requirement
            lockPeriod: "90 days", // Current lock period
            apy: "8.5%", // Current APY
            nextReward: "Monthly" // Reward distribution schedule
        };
    } catch (error) {
        console.error('Error fetching staking stats:', error);
        throw error;
    }
};
