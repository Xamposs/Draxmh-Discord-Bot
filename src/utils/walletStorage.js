import fs from 'fs/promises';
import path from 'path';

const STORAGE_FILE = path.join(process.cwd(), 'data', 'wallets.json');

export class WalletStorage {
    constructor() {
        this.wallets = new Map();
        this.init();
    }

    async init() {
        try {
            await fs.mkdir(path.dirname(STORAGE_FILE), { recursive: true });
            const data = await fs.readFile(STORAGE_FILE, 'utf8');
            const wallets = JSON.parse(data);
            this.wallets = new Map(Object.entries(wallets));
        } catch (error) {
            await this.save();
        }
    }

    async save() {
        const data = Object.fromEntries(this.wallets);
        await fs.writeFile(STORAGE_FILE, JSON.stringify(data, null, 2));
    }

    set(userId, walletInfo) {
        this.wallets.set(userId, walletInfo);
        this.save();
    }

    get(userId) {
        return this.wallets.get(userId);
    }
}
