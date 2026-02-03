/**
 * RemoteIQ Mobile App - Main Application Logic
 */

const App = {
    // Current device data cache
    devices: [],
    currentPage: 0,
    itemsPerPage: 20,
    totalItems: 0,
    isLoading: false,
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

        // Set up search and filter
        const searchInput = document.getElementById('searchInput');
        const statusFilter = document.getElementById('statusFilter');

        // Debounce search
        let timeout = null;
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    this.currentPage = 0;
                    this.loadDevices(false);
                }, 500);
            });
        }

        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                // For now, client-side filter on loaded items
                this.renderDeviceList();
            });
        }

        // Load devices
        await this.loadDevices();

        // Set up refresh
        document.getElementById('refreshBtn')?.addEventListener('click', () => {
            this.currentPage = 0;
            this.loadDevices(false);
        });

        // Add Load More button
        const container = document.getElementById('deviceList')?.parentElement;
        if (container) {
            const loadMoreBtn = document.createElement('button');
            loadMoreBtn.id = 'loadMoreBtn';
            loadMoreBtn.className = 'btn btn-secondary';
            loadMoreBtn.style.display = 'none'; // Hidden by default
            loadMoreBtn.style.margin = '20px auto';
            loadMoreBtn.style.width = '100%';
            loadMoreBtn.textContent = 'Load More';
            loadMoreBtn.onclick = () => {
                this.currentPage++;
                this.loadDevices(true);
            };
            container.appendChild(loadMoreBtn);
        }
    },

    /**
     * Load and render devices
     */
    /**
     * Load and render devices
     * @param {boolean} append - Whether to append to existing list
     */
    async loadDevices(append = false) {
        const listEl = document.getElementById('deviceList');
        const loadingEl = document.getElementById('loading');
        const emptyEl = document.getElementById('emptyState');
        const noResultsEl = document.getElementById('noResults');
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        const searchInput = document.getElementById('searchInput');

        if (!listEl) return;

        // Show loading if not appending
        if (!append) {
            loadingEl.style.display = 'flex';
            listEl.innerHTML = '';
            emptyEl.style.display = 'none';
            noResultsEl.style.display = 'none';
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        } else {
            if (loadMoreBtn) loadMoreBtn.textContent = 'Loading...';
        }

        this.isLoading = true;

        try {
            const searchQuery = searchInput ? searchInput.value : '';
            const result = await API.getDevices(this.currentPage, this.itemsPerPage, searchQuery);

            // Handle both structure types just in case (metadata or array)
            const newItems = result.items || result;
            const totalCount = result.count !== undefined ? result.count : (newItems.length < this.itemsPerPage ? newItems.length + (this.currentPage * this.itemsPerPage) : 9999);

            if (append) {
                this.devices = [...this.devices, ...newItems];
            } else {
                this.devices = newItems;
            }

            this.totalItems = totalCount;
            this.isLoading = false;

            loadingEl.style.display = 'none';
            if (loadMoreBtn) loadMoreBtn.textContent = 'Load More';

            // Show total count
            const countEl = document.getElementById('deviceCount');
            if (countEl) countEl.textContent = `(${this.devices.length}${this.totalItems > this.devices.length ? '+' : ''})`;

            if (this.devices.length === 0) {
                if (searchQuery) {
                    noResultsEl.style.display = 'block';
                } else {
                    emptyEl.style.display = 'block';
                }
                if (loadMoreBtn) loadMoreBtn.style.display = 'none';
                return;
            }

            // Render
            this.renderDeviceList(append ? newItems : null);

            // Manage Load More visibility
            if (loadMoreBtn) {
                // If we got a full page, assume there might be more (or use totalCount if reliable)
                const hasMore = newItems.length === this.itemsPerPage;
                loadMoreBtn.style.display = hasMore ? 'block' : 'none';
            }

        } catch (error) {
            this.isLoading = false;
            loadingEl.style.display = 'none';
            if (!append) {
                listEl.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">⚠️</div>
                        <p>Failed to load devices</p>
                        <p style="font-size: 0.75rem; margin-top: 8px;">${error.message}</p>
                    </div>
                `;
            } else {
                if (loadMoreBtn) loadMoreBtn.textContent = 'Failed to load more';
            }
        }
    },

    /**
     * Render the filtered device list
     * @param {Array} items - Optional items to append. If null, re-renders all.
     */
    renderDeviceList(items = null) {
        const listEl = document.getElementById('deviceList');
        const statusFilter = document.getElementById('statusFilter');
        const filterValue = statusFilter ? statusFilter.value : 'all';

        // If not appending, clear list
        if (!items) {
            listEl.innerHTML = '';
            items = this.devices;
        }

        let visibleCount = 0;

        items.forEach((device, index) => {
            // Apply client-side status filter
            const deviceState = this.getDeviceState(device);
            if (filterValue !== 'all' && deviceState !== filterValue) {
                return;
            }

            const card = this.createDeviceCard(device, index);
            listEl.appendChild(card);
            visibleCount++;
        });

        // Show/Hide no results if filter hides everything
        const noResultsEl = document.getElementById('noResults');
        if (noResultsEl) {
            // Only show 'No Results' if we have loaded devices but none match the status filter
            // AND we are doing a full render (items == this.devices)
            if (this.devices.length > 0 && items === this.devices && visibleCount === 0) {
                noResultsEl.style.display = 'block';
                noResultsEl.textContent = 'No devices match the selected filter.';
            } else if (this.devices.length > 0) {
                noResultsEl.style.display = 'none';
            }
        }
    },

    /**
     * Get device state: 'running', 'online', or 'offline'
     */
    getDeviceState(device) {
        const state = device.compositeState || {};
        const isOnline = state.ConnectionState?.value === true;

        // Ensure we handle both number and string values
        const engineSpeedVal = state.Engine_Speed?.value;
        const engineSpeed = engineSpeedVal ? Number(engineSpeedVal) : 0;

        if (isOnline && engineSpeed > 10) {
            return 'running';
        } else if (isOnline) {
            return 'online';
        }
        return 'offline';
    },

    /**
     * Create a device card element
     */
    createDeviceCard(device, index) {
        const card = document.createElement('div');
        card.className = 'card card-clickable device-card fade-in';
        card.style.animationDelay = `${index * 0.03}s`;

        const deviceState = this.getDeviceState(device);
        const name = device.name || device.ESN || 'Unknown Device';
        const esn = device.ESN || '';

        card.innerHTML = `
            <div class="device-status ${deviceState}"></div>
            <div class="device-info">
                <div class="device-name">${this.escapeHtml(name)}</div>
                <div class="device-esn">${this.escapeHtml(esn)}</div>
            </div>
            <div class="device-arrow">›</div>
        `;

        card.addEventListener('click', () => {
            // Store device data and navigate
            sessionStorage.setItem('selectedDevice', JSON.stringify(device));
            const brandParam = window.Branding ? Branding.getBrandParam() : '';
            window.location.href = 'device.html' + brandParam;
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
        // Connection status
        const deviceState = this.getDeviceState(device);
        let stateLabel = 'Offline';
        if (deviceState === 'online') stateLabel = 'Online';
        if (deviceState === 'running') stateLabel = 'Engine Running';

        const badge = document.getElementById('connectionBadge');
        badge.className = `connection-badge ${deviceState}`;
        badge.innerHTML = `
            <span class="device-status ${deviceState}"></span>
            ${stateLabel}
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
            // Search by ESN to find specific device
            const result = await API.getDevices(0, 1, this.currentDevice.ESN);
            const items = result.items || result;

            if (items.length > 0) {
                // In case search returns multiple (e.g. partial match), try to find exact ESN match
                // or just take the first one if we trust the search quality
                const updated = items.find(d => d.ESN === this.currentDevice.ESN) || items[0];

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
