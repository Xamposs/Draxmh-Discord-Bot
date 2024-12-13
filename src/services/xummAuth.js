const { XummSdk } = require('xumm-sdk');

class XummAuthService {
    constructor() {
        this.xumm = new XummSdk('e18d8927-bf02-4c6b-afc5-057c88458b50', '2ba5e921-198d-4a3b-9016-2dfbceac2ce7');
        this.connectedWallets = new Map();
    }

    async createSignInRequest(discordUserId) {
        const request = await this.xumm.payload.create({
            txjson: {
                TransactionType: 'SignIn'
            },
            options: {
                expire: 5
            }
        });

        const subscription = await this.xumm.payload.subscribe(request.uuid, event => {
            if (event.signed) {
                this.connectedWallets.set(discordUserId, {
                    address: event.account,
                    connected: true,
                    connectionTime: Date.now(),
                    expiresAt: Date.now() + (24 * 60 * 60 * 1000)
                });
            }
        });

        return {
            qrUrl: request.refs.qr_png,
            signInUrl: request.next.always,
            payloadId: request.uuid
        };
    }

    async getWalletBalance(discordUserId) {
        const walletData = this.connectedWallets.get(discordUserId);
        if (!walletData || !walletData.address) {
            throw new Error('Wallet not connected');
        }
        const response = await this.xumm.xrpl.account(walletData.address);
        return (Number(response.balance) / 1000000).toFixed(2);
    }

    async getTransactions(discordUserId) {
        const walletData = this.connectedWallets.get(discordUserId);
        if (!walletData || !walletData.address) {
            throw new Error('Wallet not connected');
        }
        const txs = await this.xumm.xrpl.transactions(walletData.address);
        return txs.slice(0, 5);
    }

    async disconnectWallet(discordUserId) {
        if (!this.connectedWallets.has(discordUserId)) {
            throw new Error('No wallet connected');
        }
        this.connectedWallets.delete(discordUserId);
    }

    isWalletConnected(discordUserId) {
        return this.connectedWallets.has(discordUserId);
    }

    getConnectionStatus(discordUserId) {
        const wallet = this.connectedWallets.get(discordUserId);
        if (!wallet) return null;
        return {
            connected: true,
            timeLeft: '24h 0m',
            isExpired: false
        };
    }
}

module.exports = XummAuthService;