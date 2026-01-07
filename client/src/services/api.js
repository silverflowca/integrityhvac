const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3003/api';

class ApiService {
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Lead endpoints
    async getLeads() {
        return this.request('/leads');
    }

    async getLead(id) {
        return this.request(`/leads/${id}`);
    }

    async createLead(leadData) {
        return this.request('/leads', {
            method: 'POST',
            body: JSON.stringify(leadData),
        });
    }

    async updateLead(id, leadData) {
        return this.request(`/leads/${id}`, {
            method: 'PUT',
            body: JSON.stringify(leadData),
        });
    }

    async deleteLead(id) {
        return this.request(`/leads/${id}`, {
            method: 'DELETE',
        });
    }

    async getLeadsByStatus(status) {
        return this.request(`/leads/status/${status}`);
    }

    async getStats() {
        return this.request('/stats');
    }
}

export default new ApiService();
