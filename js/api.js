/**
 * RemoteIQ API Wrapper
 * Handles all communication with the RemoteIQ/Losant platform
 */

const API = {
    // Base URL for the RemoteIQ API
    BASE_URL: 'https://6254b63150e14fb6deb3aa31.onlosant.com',

    /**
     * Get the stored authentication token
     */
    getToken() {
        return localStorage.getItem('remoteiq_token');
    },

    /**
     * Store the authentication token
     */
    setToken(token) {
        localStorage.setItem('remoteiq_token', token);
    },

    /**
     * Clear the authentication token
     */
    clearToken() {
        localStorage.removeItem('remoteiq_token');
        localStorage.removeItem('remoteiq_user');
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!this.getToken();
    },

    /**
     * Get stored user info
     */
    getUser() {
        const user = localStorage.getItem('remoteiq_user');
        return user ? JSON.parse(user) : null;
    },

    /**
     * Make an authenticated API request
     */
    async request(endpoint, options = {}) {
        const url = `${this.BASE_URL}${endpoint}`;
        const token = this.getToken();

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            ...options,
            headers
        });

        // Handle unauthorized responses
        if (response.status === 401) {
            this.clearToken();
            window.location.href = 'index.html';
            throw new Error('Session expired');
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Request failed');
        }

        return data;
    },

    /**
     * Login with email and password
     */
    async login(email, password) {
        const data = await this.request('/api/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        if (data.success && data.token) {
            this.setToken(data.token);
            localStorage.setItem('remoteiq_user', JSON.stringify(data.user));
            return data;
        }

        throw new Error(data.message || 'Login failed');
    },

    /**
     * Logout the current user
     */
    logout() {
        this.clearToken();
        window.location.href = 'index.html';
    },

    /**
     * Fetch all devices with their latest values
     * @param {number} page - Page number (0-indexed)
     * @param {number} resultsPerPage - Results per page (max 200)
     * @param {string} attribute - Attribute filter ('All' for all attributes)
     */
    async getDevices(page = 0, resultsPerPage = 20, search = '', attribute = 'All') {
        const params = new URLSearchParams({
            page: page.toString(),
            resultsPerPage: resultsPerPage.toString(),
            attribute
        });

        if (search) {
            params.append('search', search);
        }

        // Use V2 endpoint
        const data = await this.request(`/api/v2/last_value_query?${params}`);
        return data.result || { items: [], count: 0 };
    },

    /**
     * Fetch all devices recursively to bypass pagination limits
     */
    async getAllDevices() {
        let allDevices = [];
        let page = 0;
        const limit = 200; // API Max

        while (true) {
            const items = await this.getDevices(page, limit);
            allDevices = allDevices.concat(items);

            // If we got fewer items than the limit, we've reached the last page
            if (items.length < limit) {
                break;
            }
            page++;
        }
        return allDevices;
    },

    /**
     * Send a command to a device
     * @param {string} deviceId - The device ID
     * @param {string} command - Command name (e.g., 'Start_Engine', 'Stop_Engine')
     */
    async sendCommand(deviceId, command) {
        const params = new URLSearchParams({ command });

        return await this.request(`/api/command?${params}`, {
            method: 'POST',
            body: JSON.stringify({ deviceId })
        });
    }
};

// Export for use in other modules
window.API = API;
