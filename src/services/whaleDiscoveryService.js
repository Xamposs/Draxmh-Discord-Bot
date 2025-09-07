import { EmbedBuilder } from 'discord.js';
import { Client as XrplClient } from 'xrpl';

export class WhaleDiscoveryService {
    constructor(discordClient, channelId) {
        this.discordClient = discordClient;
        this.channelId = channelId;
        this.xrplClient = new XrplClient('wss://xrplcluster.com');
        this.whaleDatabase = new Map(); // Store whale data
        this.userFollowing = new Map(); // Store user following lists
        this.updateInterval = 15 * 60 * 1000; // 15 minutes
        this.isRunning = false;
        this.whaleThreshold = 100000; // Lowered to 100K XRP for better detection
        
        // Updated whale addresses with more current large holders
        this.knownWhales = [
            { address: 'rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH', name: 'Ripple Escrow 1', type: 'escrow' },
            { address: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh', name: 'Ripple Escrow 2', type: 'escrow' },
            { address: 'rPVMhWBsfF9iMXYj3aAzJVkPDTFNSyWdKy', name: 'Binance Hot Wallet', type: 'exchange' },
            { address: 'rLNaPoKeeBjZe2qs6x52yVPZpZ8td4dc6w', name: 'Bitstamp', type: 'exchange' },
            { address: 'rJHygWcTLVpSXkowott6kzgZU6viQSVYM1', name: 'Bitso Exchange', type: 'exchange' },
            { address: 'rLbKbPyuvs4wc1h13BEPHgbFGsRXMeFGL6', name: 'Uphold Exchange', type: 'exchange' },
            { address: 'rw2ciyaNshpHe7bCHo4bRWq6pqqynnWKQg', name: 'Gatehub Exchange', type: 'exchange' },
            { address: 'rEhxGqkqPPSxQ3P25J2N7inT5ieHYNoAM', name: 'Bittrex Exchange', type: 'exchange' },
            { address: 'rDNa9td55rNjDzlu4wjZ9VhxWkYQcr5bM6', name: 'Kraken Exchange', type: 'exchange' },
            { address: 'rBWpYJhuJWBPAkzJ4kYQqHShSkkF3rgeDE', name: 'Coinbase Exchange', type: 'exchange' }
        ];
    }

    async start() {
        if (this.isRunning) return;
        
        console.log('🐋 Starting Whale Discovery Service...');
        this.isRunning = true;
        
        try {
            await this.xrplClient.connect();
            await this.initializeWhaleDatabase();
            await this.sendInitialUpdate();
            
            // Set up periodic updates
            this.updateTimer = setInterval(() => {
                this.performWhaleDiscovery();
            }, this.updateInterval);
            
            console.log('✅ Whale Discovery Service started successfully');
        } catch (error) {
            console.error('❌ Failed to start Whale Discovery Service:', error);
            this.isRunning = false;
        }
    }

    async stop() {
        console.log('🛑 Stopping Whale Discovery Service...');
        this.isRunning = false;
        
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
        }
        
        if (this.xrplClient.isConnected()) {
            await this.xrplClient.disconnect();
        }
    }

    async initializeWhaleDatabase() {
        console.log('🔍 Initializing whale database...');
        
        for (const whale of this.knownWhales) {
            try {
                console.log(`Checking whale: ${whale.name} (${whale.address})`);
                
                // Add retry logic for XRPL requests
                let accountInfo;
                let retries = 3;
                
                while (retries > 0) {
                    try {
                        accountInfo = await this.xrplClient.request({
                            command: 'account_info',
                            account: whale.address
                        });
                        break; // Success, exit retry loop
                    } catch (error) {
                        retries--;
                        console.log(`Retry ${3 - retries}/3 for ${whale.name}: ${error.message}`);
                        if (retries === 0) throw error;
                        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
                    }
                }
                
                const balance = parseFloat(accountInfo.result.account_data.Balance) / 1000000;
                console.log(`${whale.name}: ${balance.toFixed(2)}M XRP`);
                
                if (balance >= this.whaleThreshold) {
                    this.whaleDatabase.set(whale.address, {
                        address: whale.address,
                        name: whale.name,
                        type: whale.type,
                        balance: balance,
                        lastUpdated: new Date(),
                        followers: 0,
                        rank: 0,
                        activityScore: this.calculateActivityScore(balance, whale.type)
                    });
                    console.log(`✅ Added ${whale.name} to whale database`);
                } else {
                    console.log(`❌ ${whale.name} below threshold (${balance.toFixed(2)}M < ${this.whaleThreshold / 1000000}M)`);
                }
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (error) {
                console.error(`❌ Error fetching data for ${whale.name} (${whale.address}):`, error.message);
                // Continue with next whale instead of failing completely
            }
        }
        
        this.rankWhales();
        console.log(`📊 Initialized ${this.whaleDatabase.size} whales in database`);
        
        // Log whale details for debugging
        if (this.whaleDatabase.size > 0) {
            console.log('🐋 Detected whales:');
            Array.from(this.whaleDatabase.values())
                .sort((a, b) => b.balance - a.balance)
                .forEach((whale, index) => {
                    console.log(`  ${index + 1}. ${whale.name}: ${whale.balance.toFixed(2)}M XRP`);
                });
        } else {
            console.log('⚠️ No whales detected - check XRPL connection and whale addresses');
        }
    }

    calculateActivityScore(balance, type) {
        let score = Math.min(balance / 10000000, 10); // Base score from balance
        
        // Adjust based on type
        switch (type) {
            case 'exchange':
                score += 2; // Exchanges are more active
                break;
            case 'escrow':
                score += 1; // Escrows have scheduled activity
                break;
            default:
                score += 3; // Unknown wallets are most interesting
        }
        
        return Math.min(score, 10);
    }

    rankWhales() {
        const sortedWhales = Array.from(this.whaleDatabase.values())
            .sort((a, b) => b.balance - a.balance);
        
        sortedWhales.forEach((whale, index) => {
            whale.rank = index + 1;
        });
    }

    async performWhaleDiscovery() {
        try {
            console.log('🔍 Performing whale discovery scan...');
            
            // Update existing whale balances
            await this.updateExistingWhales();
            
            // Discover new whales (simplified - in reality would scan ledger)
            await this.discoverNewWhales();
            
            // Send updated whale directory
            await this.sendWhaleDirectoryUpdate();
            
        } catch (error) {
            console.error('❌ Error during whale discovery:', error);
        }
    }

    async updateExistingWhales() {
        for (const [address, whale] of this.whaleDatabase) {
            try {
                const accountInfo = await this.xrplClient.request({
                    command: 'account_info',
                    account: address
                });
                
                const newBalance = parseFloat(accountInfo.result.account_data.Balance) / 1000000;
                const oldBalance = whale.balance;
                
                whale.balance = newBalance;
                whale.lastUpdated = new Date();
                
                // Check for significant balance changes
                const changePercent = Math.abs((newBalance - oldBalance) / oldBalance) * 100;
                if (changePercent > 5) {
                    await this.notifyBalanceChange(whale, oldBalance, newBalance);
                }
                
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error(`Error updating whale ${address}:`, error.message);
            }
        }
        
        this.rankWhales();
    }

    async discoverNewWhales() {
        // Simplified new whale discovery
        // In a real implementation, this would scan recent transactions for large balances
        const potentialNewWhales = [
            'rNewWhale1Example123456789', // Example addresses
            'rNewWhale2Example987654321'
        ];
        
        for (const address of potentialNewWhales) {
            if (!this.whaleDatabase.has(address)) {
                try {
                    const accountInfo = await this.xrplClient.request({
                        command: 'account_info',
                        account: address
                    });
                    
                    const balance = parseFloat(accountInfo.result.account_data.Balance) / 1000000;
                    
                    if (balance >= this.whaleThreshold) {
                        this.whaleDatabase.set(address, {
                            address: address,
                            name: `Unknown Whale ${this.whaleDatabase.size + 1}`,
                            type: 'unknown',
                            balance: balance,
                            lastUpdated: new Date(),
                            followers: 0,
                            rank: 0,
                            activityScore: this.calculateActivityScore(balance, 'unknown'),
                            isNew: true
                        });
                        
                        await this.notifyNewWhaleDiscovered(address, balance);
                    }
                } catch (error) {
                    // Address might not exist, continue
                }
            }
        }
    }

    async sendInitialUpdate() {
        const channel = this.discordClient.channels.cache.get(this.channelId);
        if (!channel) {
            console.error('Whale Discovery channel not found');
            return;
        }

        const embed = this.createWelcomeEmbed();
        
        await channel.send({ 
            embeds: [embed]
        });
        
        // Send initial whale directory
        await this.sendWhaleDirectoryUpdate();
    }

    async sendWelcomeMessage() {
        const channel = this.discordClient.channels.cache.get(this.channelId);
        if (!channel) {
            console.error('Whale Discovery channel not found');
            return;
        }

        const embed = this.createWelcomeEmbed();
        
        await channel.send({ 
            embeds: [embed]
        });
        
        // Send initial whale directory
        await this.sendWhaleDirectoryUpdate();
    }

    async sendWhaleDirectoryUpdate() {
        const channel = this.discordClient.channels.cache.get(this.channelId);
        if (!channel) return;

        const [directoryEmbed, statsEmbed] = await Promise.all([
            this.createWhaleDirectoryEmbed(),
            this.createWhaleStatsEmbed()
        ]);
        
        await channel.send({ 
            embeds: [directoryEmbed, statsEmbed]
        });
    }

    createWelcomeEmbed() {
        return new EmbedBuilder()
            .setTitle('🐋 XRPL Whale Discovery & Following')
            .setDescription(
                '**Welcome to the Whale Watching Hub!**\n\n' +
                '🔍 **Discover** the largest XRP holders\n' +
                '👥 **Follow** whales you\'re interested in\n' +
                '📊 **Track** their activities and movements\n' +
                '🎯 **Analyze** their trading patterns\n\n' +
                '**Whale Threshold:** 1M+ XRP\n' +
                '**Update Frequency:** Every 15 minutes\n' +
                '**Real-time Alerts:** For significant movements'
            )
            .setColor('#1E90FF')
            .setThumbnail('https://cryptologos.cc/logos/xrp-xrp-logo.png')
            .setTimestamp()
            .setFooter({ 
                text: 'XRPL Whale Discovery • Live Data', 
                iconURL: 'https://cryptologos.cc/logos/xrp-xrp-logo.png' 
            });
    }

    createWhaleDirectoryEmbed() {
        const topWhales = Array.from(this.whaleDatabase.values())
            .sort((a, b) => b.balance - a.balance)
            .slice(0, 10);

        const embed = new EmbedBuilder()
            .setTitle('🐋 Whale Directory - Top 10')
            .setColor('#FFD700')
            .setTimestamp();

        if (topWhales.length === 0) {
            embed.setDescription('🔍 Scanning for whales... Please wait.');
            return embed;
        }

        let description = '**Rank | Whale | Balance | Followers | Activity**\n';
        description += '```\n';
        
        topWhales.forEach((whale, index) => {
            const rank = `#${whale.rank}`.padEnd(4);
            const name = whale.name.substring(0, 15).padEnd(16);
            const balance = `${(whale.balance / 1000000).toFixed(1)}M`.padEnd(8);
            const followers = `${whale.followers}`.padEnd(6);
            const activity = '★'.repeat(Math.floor(whale.activityScore / 2)).padEnd(5);
            
            description += `${rank}${name}${balance}${followers}${activity}\n`;
        });
        
        description += '```\n';
        description += `**Total Whales Tracked:** ${this.whaleDatabase.size}\n`;
        description += `**Last Updated:** <t:${Math.floor(Date.now() / 1000)}:R>`;

        embed.setDescription(description);
        
        // Add fields for top 3 whales with more details
        topWhales.slice(0, 3).forEach((whale, index) => {
            const emoji = ['🥇', '🥈', '🥉'][index];
            embed.addFields({
                name: `${emoji} ${whale.name}`,
                value: `**${(whale.balance / 1000000).toFixed(2)}M XRP** | ${whale.type} | ${whale.followers} followers`,
                inline: true
            });
        });

        return embed;
    }

    createWhaleStatsEmbed() {
        const totalWhales = this.whaleDatabase.size;
        const totalBalance = Array.from(this.whaleDatabase.values())
            .reduce((sum, whale) => sum + whale.balance, 0);
        
        const whaleTypes = {};
        this.whaleDatabase.forEach(whale => {
            whaleTypes[whale.type] = (whaleTypes[whale.type] || 0) + 1;
        });

        const embed = new EmbedBuilder()
            .setTitle('📊 Whale Statistics')
            .setColor('#32CD32')
            .addFields(
                {
                    name: '🐋 Total Whales',
                    value: `**${totalWhales}** wallets`,
                    inline: true
                },
                {
                    name: '💰 Combined Holdings',
                    value: `**${(totalBalance / 1000000000).toFixed(2)}B XRP**`,
                    inline: true
                },
                {
                    name: '📈 Average Balance',
                    value: `**${(totalBalance / totalWhales / 1000000).toFixed(1)}M XRP**`,
                    inline: true
                }
            );

        // Add whale type breakdown
        let typeBreakdown = '';
        Object.entries(whaleTypes).forEach(([type, count]) => {
            const emoji = type === 'exchange' ? '🏦' : type === 'escrow' ? '🔒' : '❓';
            typeBreakdown += `${emoji} ${type}: ${count}\n`;
        });
        
        if (typeBreakdown) {
            embed.addFields({
                name: '🏷️ Whale Types',
                value: typeBreakdown,
                inline: false
            });
        }

        return embed;
    }

    // Remove these methods entirely:
    // createMainActionButtons() {
    // createDirectoryActionButtons() {
    async notifyNewWhaleDiscovered(address, balance) {
        const channel = this.discordClient.channels.cache.get(this.channelId);
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setTitle('🚨 New Whale Discovered!')
            .setDescription(
                `**A new whale has been detected!**\n\n` +
                `**Address:** \`${address}\`\n` +
                `**Balance:** ${(balance / 1000000).toFixed(2)}M XRP\n` +
                `**Rank:** #${this.whaleDatabase.get(address)?.rank || 'TBD'}\n\n` +
                `This whale has been added to our tracking system.`
            )
            .setColor('#FF6B35')
            .setTimestamp();

        await channel.send({ embeds: [embed] });
    }

    async notifyBalanceChange(whale, oldBalance, newBalance) {
        const channel = this.discordClient.channels.cache.get(this.channelId);
        if (!channel) return;

        const change = newBalance - oldBalance;
        const changePercent = (change / oldBalance) * 100;
        const isIncrease = change > 0;

        const embed = new EmbedBuilder()
            .setTitle(`${isIncrease ? '📈' : '📉'} Whale Balance Change`)
            .setDescription(
                `**${whale.name}** has ${isIncrease ? 'increased' : 'decreased'} their holdings\n\n` +
                `**Previous:** ${(oldBalance / 1000000).toFixed(2)}M XRP\n` +
                `**Current:** ${(newBalance / 1000000).toFixed(2)}M XRP\n` +
                `**Change:** ${isIncrease ? '+' : ''}${(change / 1000000).toFixed(2)}M XRP (${changePercent.toFixed(1)}%)\n` +
                `**Rank:** #${whale.rank}`
            )
            .setColor(isIncrease ? '#00FF00' : '#FF0000')
            .setTimestamp();

        await channel.send({ embeds: [embed] });
    }

    // User interaction methods
    async followWhale(userId, whaleAddress) {
        if (!this.userFollowing.has(userId)) {
            this.userFollowing.set(userId, new Set());
        }
        
        this.userFollowing.get(userId).add(whaleAddress);
        
        // Increment follower count
        const whale = this.whaleDatabase.get(whaleAddress);
        if (whale) {
            whale.followers++;
        }
        
        return true;
    }

    async unfollowWhale(userId, whaleAddress) {
        if (this.userFollowing.has(userId)) {
            this.userFollowing.get(userId).delete(whaleAddress);
            
            // Decrement follower count
            const whale = this.whaleDatabase.get(whaleAddress);
            if (whale && whale.followers > 0) {
                whale.followers--;
            }
        }
        
        return true;
    }

    getUserFollowing(userId) {
        return this.userFollowing.get(userId) || new Set();
    }

    getWhaleByAddress(address) {
        return this.whaleDatabase.get(address);
    }

    getAllWhales() {
        return Array.from(this.whaleDatabase.values());
    }
}