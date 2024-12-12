const dns = require('dns');
const { promisify } = require('util');
const resolve4 = promisify(dns.resolve4);

async function withDNSRetry(hostname, operation, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            await resolve4(hostname);
            return await operation();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

async function withRetry(operation, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
        }
    }
}

module.exports = { withDNSRetry, withRetry };