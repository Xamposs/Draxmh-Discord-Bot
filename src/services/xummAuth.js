const { XummSdk } = require('xumm-sdk');
const config = require('../config');

class XummAuthService {
    constructor() {
        this.xumm = new XummSdk(config.xummApiKey, config.xummApiSecret);
    }

    async createSignInRequest(discordUserId) {
        const request = await this.xumm.payload.create({
            txjson: {
                TransactionType: 'SignIn'
            },
            options: {
                expire: 5,
                return_url: {
                    web: config.callbackUrl
                }
            },
            custom_meta: {
                identifier: `discord-auth-${discordUserId}`,
                blob: {
                    discordId: discordUserId
                }
            }
        });
        
        return {
            qrUrl: request.refs.qr_png,
            signInUrl: request.next.always,
            payloadId: request.uuid
        };
    }

    async verifySignIn(payloadId) {
        const result = await this.xumm.payload.get(payloadId);
        return {
            success: result.meta.signed,
            account: result.response?.account
        };
    }
}

module.exports = XummAuthService;
