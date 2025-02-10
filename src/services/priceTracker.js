import { EmbedBuilder } from 'discord.js';
import axios from 'axios';
import WebSocket from 'ws';
import QuickChart from 'quickchart-js';

class PriceTracker {
    constructor(client) {
        this.client = client;
        this.priceChannel = '1252356323853734110';
        this.priceHistory = [];
        this.ws = new WebSocket('wss://s.altnet.rippletest.net:51233');
        this.chart = new QuickChart();
        this.retryDelay = 5000; // 5 seconds between retries
        this.maxRetries = 3;
        
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
            if (retries < this.maxRetries && (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED')) {
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                return this.fetchWithRetry(url, retries + 1);
            }
            throw error;
        }
    }

    async startPriceUpdates() {
        setInterval(async () => {
            try {
                const [priceData, weekData] = await Promise.all([
                    this.fetchWithRetry('https://api.binance.com/api/v3/ticker/24hr?symbol=XRPUSDT'),
                    this.fetchWithRetry('https://api.binance.com/api/v3/klines?symbol=XRPUSDT&interval=1w&limit=1')
                ]);

                // Process data and update chart only if both requests succeed
                if (priceData?.data && weekData?.data) {
                    this.updatePriceHistory(priceData.data);
                    await this.sendPriceUpdate(priceData.data, weekData.data);
                }
            } catch (error) {
                console.error('Price update error:', error.message);
                // Continue running even if an update fails
            }
        }, 10000);
    }

    updatePriceHistory(priceData) {
        this.priceHistory.push(parseFloat(priceData.lastPrice));
        if (this.priceHistory.length > 20) this.priceHistory.shift();
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
                { name: '📅 Change in 7d', value: `${weekData[0] ? ((priceData.lastPrice - weekData[0][1]) / weekData[0][1] * 100).toFixed(2) : '0'}%`, inline: true }
            )
            .setImage(chartUrl)
            .setTimestamp();
    }

    start() {
        this.ws.on('open', () => {
            console.log('WebSocket connected for price updates');
            this.startPriceUpdates();
        });

        this.ws.on('error', console.error);
    }
}

export default PriceTracker;
