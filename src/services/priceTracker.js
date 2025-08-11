import { EmbedBuilder } from 'discord.js';
import axios from 'axios';
import WebSocket from 'ws';
import QuickChart from 'quickchart-js';

class PriceTracker {
    constructor(client) {
        this.client = client;
        this.priceChannel = '1252356323853734110';
        this.priceHistory = [];
        this.ws = null;
        this.chart = new QuickChart();
        this.retryDelay = 5000; // 5 seconds between retries
        this.maxRetries = 3;
        this.updateInterval = null; // Track the interval for cleanup
        this.isRunning = false;
        
        // Configure axios defaults
        this.api = axios.create({
            timeout: 5000, // 5 second timeout
            headers: {
                'User-Agent': 'DRXBot/1.0',
                'Accept': 'application/json'
            }
        });
        
        // Configure chart settings once
        this.chart.setWidth(800);
        this.chart.setHeight(300);
        this.chart.setBackgroundColor('#2f3136');
    }

    async fetchWithRetry(url, retries = 0) {
        try {
            return await this.api.get(url);
        } catch (error) {
            if (retries < this.maxRetries) {
                const delay = this.retryDelay * Math.pow(2, retries); // Exponential backoff
                console.log(`Retry ${retries + 1}/${this.maxRetries} for ${url}: ${error.message}`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.fetchWithRetry(url, retries + 1);
            }
            console.error(`Failed after ${this.maxRetries} retries: ${error.message}`);
            throw error;
        }
    }

    async startPriceUpdates() {
        if (this.isRunning) {
            console.log('Price updates already running');
            return;
        }

        this.isRunning = true;
        
        const updatePrice = async () => {
            if (!this.isRunning) return; // Stop if service was stopped
            
            try {
                // Use Promise.allSettled instead of Promise.all to handle partial failures
                const results = await Promise.allSettled([
                    this.fetchWithRetry('https://api.binance.com/api/v3/ticker/24hr?symbol=XRPUSDT'),
                    this.fetchWithRetry('https://api.binance.com/api/v3/klines?symbol=XRPUSDT&interval=1w&limit=1')
                ]);

                // Check if at least the price data succeeded
                if (results[0].status === 'fulfilled') {
                    const priceData = results[0].value.data;
                    this.updatePriceHistory(priceData);
                    
                    // Use week data if available, otherwise just use price data
                    const weekData = results[1].status === 'fulfilled' ? results[1].value.data : null;
                    await this.sendPriceUpdate(priceData, weekData);
                } else {
                    console.log('Price data request failed, trying alternative source...');
                    
                    // Try an alternative API as fallback
                    try {
                        const altResponse = await this.fetchWithRetry('https://api.coingecko.com/api/v3/simple/price?ids=ripple&vs_currencies=usd&include_24hr_change=true');
                        if (altResponse.data && altResponse.data.ripple) {
                            const fallbackData = {
                                lastPrice: altResponse.data.ripple.usd,
                                priceChangePercent: altResponse.data.ripple.usd_24h_change,
                                highPrice: 0,
                                lowPrice: 0
                            };
                            this.updatePriceHistory(fallbackData);
                            await this.sendPriceUpdate(fallbackData, null);
                        }
                    } catch (altError) {
                        console.log('Alternative source also failed:', altError.message);
                    }
                }
            } catch (error) {
                console.error('Price update error:', error.message);
                // Continue running even if an update fails
            }
        };

        // Initial update
        await updatePrice().catch(err => console.error('Initial price update failed:', err.message));
        
        // Set interval for updates with proper cleanup tracking
        this.updateInterval = setInterval(updatePrice, 30000); // 30 seconds
        console.log('Price tracker started with 30s intervals');
    }

    updatePriceHistory(priceData) {
        this.priceHistory.push(parseFloat(priceData.lastPrice));
        // Limit history size to prevent memory growth
        if (this.priceHistory.length > 20) {
            this.priceHistory.shift();
        }
    }

    async sendPriceUpdate(priceData, weekData) {
        try {
            const chartUrl = await this.generateChart();
            const embed = this.createEmbed(priceData, weekData, chartUrl);
            
            const channel = this.client.channels.cache.get(this.priceChannel);
            if (channel) {
                await channel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error sending price update:', error.message);
        }
    }

    async generateChart() {
        this.chart.setConfig({
            type: 'line',
            data: {
                labels: Array(this.priceHistory.length).fill(''),
                datasets: [{
                    label: 'XRP Price',
                    data: this.priceHistory,
                    borderColor: '#0099ff',
                    backgroundColor: 'rgba(0, 153, 255, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: { display: false },
                    y: {
                        display: true,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#ffffff' }
                    }
                }
            }
        });

        return await this.chart.getShortUrl();
    }

    createEmbed(priceData, weekData, chartUrl) {
        return new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('💠 Ripple (XRP) in USD')
            .addFields(
                { name: '💰 Price', value: `${parseFloat(priceData.lastPrice).toFixed(4)}`, inline: false },
                { name: '📈 Highest in 24h', value: `${parseFloat(priceData.highPrice).toFixed(4)}`, inline: true },
                { name: '📉 Lowest in 24h', value: `${parseFloat(priceData.lowPrice).toFixed(4)}`, inline: true },
                { name: '⏰ Change in 1h', value: `${priceData.priceChangePercent > 0 ? '+' : ''}${parseFloat(priceData.priceChangePercent).toFixed(2)}%`, inline: true },
                { name: '📊 Change in 24h', value: `${priceData.priceChangePercent > 0 ? '+' : ''}${parseFloat(priceData.priceChangePercent).toFixed(2)}%`, inline: true },
                { name: '📅 Change in 7d', value: `${weekData && weekData[0] ? ((priceData.lastPrice - weekData[0][1]) / weekData[0][1] * 100).toFixed(2) : '0'}%`, inline: true }
            )
            .setImage(chartUrl)
            .setTimestamp();
    }

    start() {
        if (this.isRunning) {
            console.log('Price tracker already started');
            return;
        }

        // Create WebSocket connection
        this.ws = new WebSocket('wss://s.altnet.rippletest.net:51233');
        
        this.ws.on('open', () => {
            console.log('WebSocket connected for price updates');
            this.startPriceUpdates();
        });

        this.ws.on('error', (error) => {
            console.error('Price tracker WebSocket error:', error.message);
        });

        this.ws.on('close', () => {
            console.log('Price tracker WebSocket closed');
        });
    }

    async stop() {
        console.log('Stopping price tracker...');
        this.isRunning = false;

        // Clear the update interval
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            console.log('Price update interval cleared');
        }

        // Close WebSocket connection
        if (this.ws) {
            this.ws.removeAllListeners();
            if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
                this.ws.terminate();
            }
            this.ws = null;
            console.log('Price tracker WebSocket closed');
        }

        // Clear price history to free memory
        this.priceHistory = [];
        
        console.log('Price tracker stopped');
    }
}

export default PriceTracker;
