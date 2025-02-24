import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'wallets.json');

export class WalletDatabase {
    static async load() {
        try {
            await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
            const data = await fs.readFile(DB_PATH, 'utf8');
            return JSON.parse(data);
        } catch {
            return {};
        }
    }

    static async save(data) {
        await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
    }
}
