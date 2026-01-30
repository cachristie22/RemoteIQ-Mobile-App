/**
 * RemoteIQ Mobile App - Main Application Logic
 */

const App = {
    // Current device data cache
    devices: [],
    filteredDevices: [],
    currentDevice: null,

    /**
     * Initialize the app on page load
     */
    init() {
        // Check which page we're on
        const path = window.location.pathname;

        if (path.includes('dashboard.html')) {
            this.initDashboard();
        } else if (path.includes('device.html')) {
            this.initDeviceDetail();
        }
    },

    /**
     * Initialize the dashboard page
     */
    async initDashboard() {
        // Check authentication
        if (!API.isAuthenticated()) {
            window.location.href = 'index.html';
            return;
        }

        // Show user name in header if available
        const user = API.getUser();
        if (user) {
            const userEl = document.getElementById('userName');
            if (userEl) {
                userEl.textContent = user.userFirstName || 'User';
            }
        }

        // Set up search
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.filterDevices(e.target.value));
        }

        // Load devices
        await this.loadDevices();

        // Set up refresh
        document.getElementById('refreshBtn')?.addEventListener('click', () => this.loadDevices());

        // Auto-refresh every 30 seconds
        setInterval(() => this.loadDevices(), 30000);
    },

    /**
     * Load and render devices
     */
    async loadDevices() {
        const listEl = document.getElementById('deviceList');
        const loadingEl = document.getElementById('loading');
        const emptyEl = document.getElementById('emptyState');
        const noResultsEl = document.getElementById('noResults');
        const searchInput = document.getElementById('searchInput');

        if (!listEl) return;

        // Show loading
        loadingEl.style.display = 'flex';
        listEl.innerHTML = '';
        emptyEl.style.display = 'none';
        noResultsEl.style.display = 'none';

        try {
            this.devices = await API.getDevices();
            this.filteredDevices = [...this.devices];

            loadingEl.style.display = 'none';

            if (this.devices.length === 0) {
                emptyEl.style.display = 'block';
                return;
            }

            // Apply current search filter if any
            if (searchInput && searchInput.value) {
                this.filterDevices(searchInput.value);
            } else {
                this.renderDeviceList();
            }

        } catch (error) {
            loadingEl.style.display = 'none';
            listEl.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⚠️</div>
                    <p>Failed to load devices</p>
                    <p style="font-size: 0.75rem; margin-top: 8px;">${error.message}</p>
                </div>
            `;
        }
    },

    /**
     * Filter devices by search query
     */
    filterDevices(query) {
        const noResultsEl = document.getElementById('noResults');
        const listEl = document.getElementById('deviceList');

        query = query.toLowerCase().trim();

        if (!query) {
            this.filteredDevices = [...this.devices];
        } else {
            this.filteredDevices = this.devices.filter(device => {
                const name = (device.name || '').toLowerCase();
                const esn = (device.ESN || '').toLowerCase();
                return name.includes(query) || esn.includes(query);
            });
        }

        if (this.filteredDevices.length === 0 && this.devices.length > 0) {
            listEl.innerHTML = '';
            noResultsEl.style.display = 'block';
        } else {
            noResultsEl.style.display = 'none';
            this.renderDeviceList();
        }
    },

    /**
     * Render the filtered device list
     */
    renderDeviceList() {
        const listEl = document.getElementById('deviceList');
        listEl.innerHTML = '';

        this.filteredDevices.forEach((device, index) => {
            const card = this.createDeviceCard(device, index);
            listEl.appendChild(card);
        });
    },

    /**
     * Create a device card element
     */
    createDeviceCard(device, index) {
        const card = document.createElement('div');
        card.className = 'card card-clickable device-card fade-in';
        card.style.animationDelay = `${index * 0.03}s`;

        const isOnline = device.compositeState?.ConnectionState?.value === true;
        const name = device.name || device.ESN || 'Unknown Device';
        const esn = device.ESN || '';

        card.innerHTML = `
            <div class="device-status ${isOnline ? 'online' : 'offline'}"></div>
            <div class="device-info">
                <div class="device-name">${this.escapeHtml(name)}</div>
                <div class="device-esn">${this.escapeHtml(esn)}</div>
            </div>
            <div class="device-arrow">›</div>
        `;

        card.addEventListener('click', () => {
            // Store device data and navigate
            sessionStorage.setItem('selectedDevice', JSON.stringify(device));
            window.location.href = 'device.html';
        });

        return card;
    },

    /**
     * Initialize device detail page
     */
    initDeviceDetail() {
        // Check authentication
        if (!API.isAuthenticated()) {
            window.location.href = 'index.html';
            return;
        }

        // Get device from session storage
        const deviceData = sessionStorage.getItem('selectedDevice');
        if (!deviceData) {
            window.location.href = 'dashboard.html';
            return;
        }

        this.currentDevice = JSON.parse(deviceData);
        this.renderDeviceDetail();

        // Set up refresh
        document.getElementById('refreshBtn')?.addEventListener('click', () => this.refreshDevice());
    },

    /**
     * Render device detail page
     */
    renderDeviceDetail() {
        const device = this.currentDevice;
        const state = device.compositeState || {};

        // Header
        document.getElementById('deviceName').textContent = device.name || device.ESN || 'Device';
        document.getElementById('deviceEsn').textContent = device.ESN || '';

        // Connection status
        const isOnline = state.ConnectionState?.value === true;
        const badge = document.getElementById('connectionBadge');
        badge.className = `connection-badge ${isOnline ? 'online' : 'offline'}`;
        badge.innerHTML = `
            <span class="device-status ${isOnline ? 'online' : 'offline'}"></span>
            ${isOnline ? 'Online' : 'Offline'}
        `;

        // Engine metrics
        this.setMetricValue('engineSpeed', state.Engine_Speed?.value, 'RPM');
        this.setMetricValue('engineHours', state.Engine_Hours?.value?.toFixed(1), 'hrs');
        this.setMetricValue('engineTemp', state.Engine_Temperature?.value, '°F');
        this.setMetricValue('oilPressure', state.Engine_Oil_Pressure?.value, 'kPa');

        // Power metrics
        this.setMetricValue('batteryVoltage', state.Battery_Voltage?.value?.toFixed(1), 'V');
        this.setMetricValue('fuelLevel', state.Fuel_Level?.value?.toFixed(0), '%');
        this.setMetricValue('fuelRate', state.Fuel_Rate?.value?.toFixed(1), 'L/hr');
        this.setMetricValue('totalFuel', state.Total_Fuel_Used?.value?.toFixed(0), 'L');

        // Location - link to Google Maps
        const lat = state.Latitude?.value;
        const lng = state.Longitude?.value;
        const locationEl = document.getElementById('location');
        if (lat && lng) {
            const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
            locationEl.innerHTML = `<a href="${mapsUrl}" target="_blank" style="color: var(--accent);">${lat.toFixed(4)}, ${lng.toFixed(4)}</a>`;
        } else {
            locationEl.textContent = 'N/A';
        }

        // Cell signal
        const cellBar = state.Cell_Bar_Icon?.value || 0;
        document.getElementById('cellSignal').textContent = `${cellBar}/6 bars`;

        // Last update
        const lastUpdate = state.ConnectionState?.time;
        if (lastUpdate) {
            const date = new Date(lastUpdate);
            document.getElementById('lastUpdate').textContent = date.toLocaleString();
        }
    },

    /**
     * Set a metric value with unit
     */
    setMetricValue(id, value, unit) {
        const el = document.getElementById(id);
        if (el) {
            if (value !== undefined && value !== null) {
                el.innerHTML = `${value}<span class="unit">${unit}</span>`;
            } else {
                el.textContent = 'N/A';
            }
        }
    },

    /**
     * Refresh current device data
     */
    async refreshDevice() {
        try {
            const devices = await API.getDevices();
            const updated = devices.find(d => d.ESN === this.currentDevice.ESN);
            if (updated) {
                this.currentDevice = updated;
                sessionStorage.setItem('selectedDevice', JSON.stringify(updated));
                this.renderDeviceDetail();
            }
        } catch (error) {
            console.error('Refresh failed:', error);
        }
    },

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => App.init());

// Export for use
window.App = App;
