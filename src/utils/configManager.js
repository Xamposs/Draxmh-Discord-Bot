import fs from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';

class ConfigManager extends EventEmitter {
    constructor() {
        super();
        this.config = {};
        this.watchers = new Map();
        this.configPath = path.join(process.cwd(), 'config');
        this.envOverrides = new Map();
        
        this.loadEnvironmentOverrides();
    }

    loadEnvironmentOverrides() {
        // Map environment variables to config paths
        const envMappings = {
            'DISCORD_TOKEN': 'discord.token',
            'XUMM_API_KEY': 'xumm.apiKey',
            'XUMM_API_SECRET': 'xumm.apiSecret',
            'XRP_ANALYSIS_CHANNEL_ID': 'channels.xrpAnalysis',
            'DRX_ANALYSIS_CHANNEL_ID': 'channels.drxAnalysis',
            'DEX_ANALYTICS_CHANNEL_ID': 'channels.dexAnalytics',
            'PATH_ANALYSIS_CHANNEL_ID': 'channels.pathAnalysis',
            'TOKEN_SCANNER_CHANNEL_ID': 'channels.tokenScanner',
            'MARKET_PSYCHOLOGY_CHANNEL_ID': 'channels.marketPsychology'
        };

        for (const [envVar, configPath] of Object.entries(envMappings)) {
            if (process.env[envVar]) {
                this.envOverrides.set(configPath, process.env[envVar]);
            }
        }
    }

    async loadConfig(environment = 'production') {
        try {
            // Load base config
            const baseConfigPath = path.join(this.configPath, 'base.json');
            const baseConfig = await this.loadConfigFile(baseConfigPath);
            
            // Load environment-specific config
            const envConfigPath = path.join(this.configPath, `${environment}.json`);
            const envConfig = await this.loadConfigFile(envConfigPath);
            
            // Merge configurations
            this.config = this.deepMerge(baseConfig, envConfig);
            
            // Apply environment variable overrides
            this.applyEnvironmentOverrides();
            
            // Validate configuration
            this.validateConfig();
            
            console.log(`Configuration loaded for environment: ${environment}`);
            this.emit('configLoaded', this.config);
            
        } catch (error) {
            console.error('Failed to load configuration:', error);
            throw error;
        }
    }

    async loadConfigFile(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.warn(`Config file not found: ${filePath}`);
                return {};
            }
            throw error;
        }
    }

    deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        
        return result;
    }

    applyEnvironmentOverrides() {
        for (const [configPath, value] of this.envOverrides) {
            this.setNestedValue(this.config, configPath, value);
        }
    }

    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        let current = obj;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!(keys[i] in current)) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    validateConfig() {
        const required = [
            'discord.token',
            'xumm.apiKey',
            'xumm.apiSecret'
        ];
        
        const missing = required.filter(path => !this.getNestedValue(this.config, path));
        
        if (missing.length > 0) {
            throw new Error(`Missing required configuration: ${missing.join(', ')}`);
        }
    }

    get(path, defaultValue = undefined) {
        const value = this.getNestedValue(this.config, path);
        return value !== undefined ? value : defaultValue;
    }

    set(path, value) {
        this.setNestedValue(this.config, path, value);
        this.emit('configChanged', { path, value });
    }

    async saveConfig(environment = 'production') {
        try {
            const configPath = path.join(this.configPath, `${environment}.json`);
            await fs.mkdir(this.configPath, { recursive: true });
            await fs.writeFile(configPath, JSON.stringify(this.config, null, 2));
            console.log(`Configuration saved to ${configPath}`);
        } catch (error) {
            console.error('Failed to save configuration:', error);
            throw error;
        }
    }

    watchConfig(filePath, callback) {
        if (this.watchers.has(filePath)) {
            return;
        }

        const watcher = fs.watch(filePath, async (eventType) => {
            if (eventType === 'change') {
                try {
                    const newConfig = await this.loadConfigFile(filePath);
                    callback(newConfig);
                } catch (error) {
                    console.error(`Error reloading config file ${filePath}:`, error);
                }
            }
        });

        this.watchers.set(filePath, watcher);
    }

    stopWatching() {
        for (const [filePath, watcher] of this.watchers) {
            watcher.close();
        }
        this.watchers.clear();
    }

    getAll() {
        return { ...this.config };
    }
}

export const configManager = new ConfigManager();
export { ConfigManager };