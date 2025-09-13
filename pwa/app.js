// XRPL Draxmh PWA Main Application
// Add WebSocket connection at the beginning of the DraxmhPWA class
class DraxmhPWA {
    constructor() {
        this.currentSection = 'home';
        this.isOnline = navigator.onLine;
        this.cache = new Map();
        this.updateInterval = null;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.setupPWAFeatures();
        this.setupOfflineDetection();
        this.setupWebSocket();
        await this.loadInitialData();
        console.log('🚀 Draxmh PWA initialized successfully!');
    }

    setupWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        try {
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('🔗 WebSocket connected');
                this.reconnectAttempts = 0;
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleWebSocketMessage(message);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };
            
            this.ws.onclose = () => {
                console.log('🔌 WebSocket disconnected');
                this.attemptReconnect();
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        } catch (error) {
            console.error('Failed to setup WebSocket:', error);
        }
    }

    handleWebSocketMessage(message) {
        switch (message.type) {
            case 'initial_data':
                this.updatePriceDisplay(message.data.priceData);
                this.updateWhaleAlerts(message.data.whaleAlerts);
                this.updateSecurityStatus(message.data.securityStatus);
                break;
            case 'price_update':
                this.updatePriceDisplay(message.data);
                break;
            case 'whale_update':
                this.updateWhaleAlerts(message.data);
                this.showNotification('🐋 New whale movement detected!');
                break;
            case 'security_update':
                this.updateSecurityStatus(message.data);
                if (message.data.status === 'warning') {
                    this.showNotification('⚠️ Security alert detected!');
                }
                break;
        }
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            setTimeout(() => this.setupWebSocket(), 5000 * this.reconnectAttempts);
        }
    }

    showNotification(message) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('XRPL Draxmh', {
                body: message,
                icon: 'icon-192.png',
                badge: 'icon-192.png'
            });
        }
    }

    setupEventListeners() {
        // Navigation buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                this.navigateToSection(section);
            });
        });

        // Refresh button
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshData());
        }

        // Install button
        const installBtn = document.getElementById('install-btn');
        if (installBtn) {
            installBtn.addEventListener('click', () => this.installPWA());
        }
    }

    setupPWAFeatures() {
        // PWA install prompt
        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            this.showInstallPrompt();
        });

        // Handle install button click
        window.installPWA = async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`PWA install outcome: ${outcome}`);
                deferredPrompt = null;
                this.hideInstallPrompt();
            }
        };
    }

    setupOfflineDetection() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.hideOfflineIndicator();
            this.refreshData();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showOfflineIndicator();
        });
    }

    navigateToSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });

        // Remove active class from all nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Show target section
        const targetSection = document.getElementById(`${sectionName}-section`);
        const targetBtn = document.querySelector(`[data-section="${sectionName}"]`);
        
        if (targetSection && targetBtn) {
            targetSection.classList.add('active');
            targetBtn.classList.add('active');
            this.currentSection = sectionName;
            
            // Load section-specific data
            this.loadSectionData(sectionName);
        }
    }

    async loadInitialData() {
        this.showLoading('home');
        try {
            await Promise.all([
                this.loadPriceData(),
                this.loadWhaleAlerts(),
                this.loadSecurityStatus()
            ]);
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('Failed to load data. Using cached data if available.');
        } finally {
            this.hideLoading('home');
        }
    }

    async loadSectionData(section) {
        switch (section) {
            case 'market':
                await this.loadMarketData();
                break;
            case 'whales':
                await this.loadWhaleData();
                break;
            case 'security':
                await this.loadSecurityData();
                break;
        }
    }

    async loadPriceData() {
        try {
            // In a real implementation, this would connect to your Discord bot's API
            const response = await this.fetchWithFallback('/api/price', {
                price: '$0.6234',
                change: '+2.45%',
                volume: '$1.2B',
                marketCap: '$35.8B',
                rank: '#6'
            });

            this.updatePriceDisplay(response);
            this.cache.set('priceData', response);
        } catch (error) {
            console.error('Error loading price data:', error);
            this.loadFromCache('priceData');
        }
    }

    async loadWhaleAlerts() {
        try {
            const response = await this.fetchWithFallback('/api/whale-alerts', [
                {
                    amount: '50,000,000 XRP',
                    type: 'Transfer',
                    from: 'Binance',
                    to: 'Unknown Wallet',
                    time: '2 minutes ago',
                    value: '$31.2M'
                },
                {
                    amount: '25,000,000 XRP',
                    type: 'Transfer',
                    from: 'Ripple',
                    to: 'Bitstamp',
                    time: '15 minutes ago',
                    value: '$15.6M'
                }
            ]);

            this.updateWhaleAlerts(response);
            this.cache.set('whaleAlerts', response);
        } catch (error) {
            console.error('Error loading whale alerts:', error);
            this.loadFromCache('whaleAlerts');
        }
    }

    async loadSecurityStatus() {
        try {
            const response = await this.fetchWithFallback('/api/security-status', {
                status: 'safe',
                threatsDetected: 0,
                lastScan: '5 minutes ago',
                activeScams: 3
            });

            this.updateSecurityStatus(response);
            this.cache.set('securityStatus', response);
        } catch (error) {
            console.error('Error loading security status:', error);
            this.loadFromCache('securityStatus');
        }
    }

    async loadMarketData() {
        this.showLoading('market');
        try {
            const response = await this.fetchWithFallback('/api/market-data', {
                exchanges: [
                    { name: 'Binance', price: '$0.6234', volume: '$456M' },
                    { name: 'Coinbase', price: '$0.6231', volume: '$234M' },
                    { name: 'Kraken', price: '$0.6235', volume: '$123M' }
                ],
                orderbook: {
                    bids: [['0.6230', '1000000'], ['0.6229', '2000000']],
                    asks: [['0.6235', '1500000'], ['0.6236', '1800000']]
                }
            });

            this.updateMarketDisplay(response);
        } catch (error) {
            console.error('Error loading market data:', error);
        } finally {
            this.hideLoading('market');
        }
    }

    async loadWhaleData() {
        this.showLoading('whales');
        try {
            const response = await this.fetchWithFallback('/api/whale-data', {
                recentWhales: [
                    { amount: '100M XRP', from: 'Binance', to: 'Unknown', time: '1h ago' },
                    { amount: '75M XRP', from: 'Ripple', to: 'Bitstamp', time: '2h ago' },
                    { amount: '50M XRP', from: 'Unknown', to: 'Coinbase', time: '3h ago' }
                ],
                totalVolume24h: '2.1B XRP',
                largestTransfer: '250M XRP'
            });

            this.updateWhaleDisplay(response);
        } catch (error) {
            console.error('Error loading whale data:', error);
        } finally {
            this.hideLoading('whales');
        }
    }

    async loadSecurityData() {
        this.showLoading('security');
        try {
            const response = await this.fetchWithFallback('/api/security-data', {
                recentThreats: [
                    { type: 'Phishing', target: 'XUMM users', severity: 'High', time: '30m ago' },
                    { type: 'Fake Airdrop', platform: 'Twitter', severity: 'Medium', time: '1h ago' }
                ],
                scamAddresses: 12,
                protectedUsers: 15420
            });

            this.updateSecurityDisplay(response);
        } catch (error) {
            console.error('Error loading security data:', error);
        } finally {
            this.hideLoading('security');
        }
    }

    async fetchWithFallback(url, fallbackData) {
        if (!this.isOnline) {
            return fallbackData;
        }

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.warn(`API call failed, using fallback data:`, error);
            return fallbackData;
        }
    }

    updatePriceDisplay(data) {
        const priceElement = document.getElementById('xrp-price');
        const changeElement = document.getElementById('price-change');
        const volumeElement = document.getElementById('volume');
        const marketCapElement = document.getElementById('market-cap');

        if (priceElement) priceElement.textContent = data.price;
        if (changeElement) {
            changeElement.textContent = data.change;
            changeElement.className = `price-change ${data.change.startsWith('+') ? 'positive' : 'negative'}`;
        }
        if (volumeElement) volumeElement.textContent = data.volume;
        if (marketCapElement) marketCapElement.textContent = data.marketCap;
    }

    updateWhaleAlerts(alerts) {
        const container = document.getElementById('whale-alerts-container');
        if (!container) return;

        container.innerHTML = alerts.map(alert => `
            <div class="whale-alert">
                <div class="whale-amount">${alert.amount}</div>
                <div class="whale-details">
                    ${alert.type}: ${alert.from} → ${alert.to}<br>
                    <small>${alert.time} • ${alert.value}</small>
                </div>
            </div>
        `).join('');
    }

    updateSecurityStatus(status) {
        const statusElement = document.getElementById('security-status');
        if (!statusElement) return;

        statusElement.className = `security-status ${status.status}`;
        statusElement.innerHTML = `
            <span class="status-icon">${status.status === 'safe' ? '🛡️' : '⚠️'}</span>
            <div>
                <strong>Network Status: ${status.status.toUpperCase()}</strong><br>
                <small>Last scan: ${status.lastScan}</small>
            </div>
        `;
    }

    updateMarketDisplay(data) {
        const exchangesContainer = document.getElementById('exchanges-container');
        if (exchangesContainer && data.exchanges) {
            exchangesContainer.innerHTML = data.exchanges.map(exchange => `
                <div class="stat-item">
                    <span class="stat-value">${exchange.price}</span>
                    <span class="stat-label">${exchange.name}</span>
                    <small>Vol: ${exchange.volume}</small>
                </div>
            `).join('');
        }
    }

    updateWhaleDisplay(data) {
        const whalesContainer = document.getElementById('recent-whales-container');
        if (whalesContainer && data.recentWhales) {
            whalesContainer.innerHTML = data.recentWhales.map(whale => `
                <div class="whale-alert">
                    <div class="whale-amount">${whale.amount}</div>
                    <div class="whale-details">
                        ${whale.from} → ${whale.to}<br>
                        <small>${whale.time}</small>
                    </div>
                </div>
            `).join('');
        }
    }

    updateSecurityDisplay(data) {
        const threatsContainer = document.getElementById('recent-threats-container');
        if (threatsContainer && data.recentThreats) {
            threatsContainer.innerHTML = data.recentThreats.map(threat => `
                <div class="whale-alert">
                    <div class="whale-amount">${threat.type}</div>
                    <div class="whale-details">
                        Target: ${threat.target || threat.platform}<br>
                        <small>Severity: ${threat.severity} • ${threat.time}</small>
                    </div>
                </div>
            `).join('');
        }
    }

    startRealTimeUpdates() {
        // Update data every 30 seconds
        this.updateInterval = setInterval(() => {
            if (this.isOnline) {
                this.loadSectionData(this.currentSection);
                if (this.currentSection === 'home') {
                    this.loadPriceData();
                    this.loadWhaleAlerts();
                }
            }
        }, 30000);
    }

    async refreshData() {
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.innerHTML = '<span class="loading"></span>';
            refreshBtn.disabled = true;
        }

        try {
            await this.loadInitialData();
            await this.loadSectionData(this.currentSection);
        } finally {
            if (refreshBtn) {
                refreshBtn.innerHTML = '🔄';
                refreshBtn.disabled = false;
            }
        }
    }

    showLoading(section) {
        const loadingElement = document.getElementById(`${section}-loading`);
        if (loadingElement) {
            loadingElement.style.display = 'block';
        }
    }

    hideLoading(section) {
        const loadingElement = document.getElementById(`${section}-loading`);
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    }

    showError(message) {
        // Create a temporary error notification
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-notification';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed; top: 80px; left: 50%; transform: translateX(-50%);
            background: var(--highlight-color); color: white; padding: 1rem;
            border-radius: 8px; z-index: 1000; animation: fadeIn 0.3s ease-in;
        `;
        
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
    }

    loadFromCache(key) {
        const cachedData = this.cache.get(key);
        if (cachedData) {
            switch (key) {
                case 'priceData':
                    this.updatePriceDisplay(cachedData);
                    break;
                case 'whaleAlerts':
                    this.updateWhaleAlerts(cachedData);
                    break;
                case 'securityStatus':
                    this.updateSecurityStatus(cachedData);
                    break;
            }
        }
    }

    showInstallPrompt() {
        const prompt = document.getElementById('install-prompt');
        if (prompt) {
            prompt.classList.add('show');
        }
    }

    hideInstallPrompt() {
        const prompt = document.getElementById('install-prompt');
        if (prompt) {
            prompt.classList.remove('show');
        }
    }

    showOfflineIndicator() {
        const indicator = document.getElementById('offline-indicator');
        if (indicator) {
            indicator.classList.add('show');
        }
    }

    hideOfflineIndicator() {
        const indicator = document.getElementById('offline-indicator');
        if (indicator) {
            indicator.classList.remove('show');
        }
    }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

// Initialize the PWA when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.draxmhPWA = new DraxmhPWA();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden, pause updates
        if (window.draxmhPWA && window.draxmhPWA.updateInterval) {
            clearInterval(window.draxmhPWA.updateInterval);
        }
    } else {
        // Page is visible, resume updates
        if (window.draxmhPWA) {
            window.draxmhPWA.startRealTimeUpdates();
            window.draxmhPWA.refreshData();
        }
    }
});