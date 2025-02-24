import { XummSdk } from 'xumm-sdk';
import { config } from '../config.js';

const xumm = new XummSdk(config.xumm.apiKey, config.xumm.apiSecret);

export class XummService {
    constructor() {
        this.connectedWallets = new Map();
        this.connectionAttempts = new Map();
    }

    async createSignInRequest(userId) {
        const request = await xumm.payload.create({
            txjson: {
                TransactionType: 'SignIn'
            }
        });

        this.connectionAttempts.set(request.payload_uuidv4, {
            userId,
            timestamp: Date.now()
        });

        return {
            qrCode: request.refs.qr_png,
            link: request.next.always,
            payloadId: request.payload_uuidv4
        };
    }

    async verifySignIn(payloadId) {
        try {
            const result = await xumm.payload.get(payloadId);
            const connectionAttempt = this.connectionAttempts.get(payloadId);
            
            if (result?.meta?.signed && result?.response?.account && connectionAttempt) {
                this.connectedWallets.set(connectionAttempt.userId, {
                    address: result.response.account,
                    connectedAt: new Date(),
                    payloadId
                });
            }

            return {
                success: result?.meta?.signed || false,
                address: result?.response?.account || null
            };
        } catch (error) {
            console.error('XUMM verification error:', error);
            return { success: false, address: null };
        }
    }

    getConnectedWallet(userId) {
        const wallet = this.connectedWallets.get(userId);
        console.log(`Getting wallet for user ${userId}:`, wallet);
        return wallet;
    }
}