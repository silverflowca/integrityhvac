class ApiService {
    getBaseUrl() {
        // If environment variable is set, use it
        if (import.meta.env.VITE_API_URL) {
            return import.meta.env.VITE_API_URL;
        }

        // Check at runtime if we're on localhost
        if (typeof window !== 'undefined') {
            const hostname = window.location.hostname;
            const port = window.location.port;

            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                // If running on Vite dev server (port 5173 or 3000), use local backend
                if (port === '5173' || port === '3000') {
                    return 'http://localhost:3004/api';
                }
                // If running on Docker port (8677), use Docker backend
                if (port === '8677') {
                    return '/api';
                }
                // Default to local backend for development
                return 'http://localhost:3004/api';
            }
        }

        // For production (non-localhost), use relative URLs
        return '/api';
    }

    getHeaders() {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    }

    async request(endpoint, options = {}) {
        const baseUrl = this.getBaseUrl();
        const url = `${baseUrl}${endpoint}`;

        console.log('[API] Request URL:', url);
        console.log('[API] Base URL:', baseUrl);
        console.log('[API] Window hostname:', typeof window !== 'undefined' ? window.location.hostname : 'N/A');

        const config = {
            headers: this.getHeaders(),
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
            console.error('Failed URL:', url);
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

    // Auth endpoints - now handled by Supabase directly in AuthContext
    // Backend /auth/me endpoint fetches user profile from database
    async getCurrentUser() {
        return this.request('/auth/me');
    }

    async updateUserProfile(userData) {
        return this.request('/auth/me', {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    }

    // Dashboard endpoints
    async getAdminDashboard() {
        return this.request('/dashboard/admin');
    }

    async getIndividualDashboard() {
        return this.request('/dashboard/individual');
    }

    async logActivity(activityData) {
        return this.request('/dashboard/activity', {
            method: 'POST',
            body: JSON.stringify(activityData)
        });
    }

    // Status endpoints
    async getStatuses() {
        return this.request('/statuses');
    }

    async addStatus(name) {
        return this.request('/statuses', {
            method: 'POST',
            body: JSON.stringify({ name })
        });
    }

    async deleteStatus(id) {
        return this.request(`/statuses/${id}`, {
            method: 'DELETE'
        });
    }

    async resetStatuses() {
        return this.request('/statuses/reset', {
            method: 'POST'
        });
    }

    async reorderStatuses(statuses) {
        return this.request('/statuses/reorder', {
            method: 'PUT',
            body: JSON.stringify({ statuses })
        });
    }

    // User endpoints
    async getUsers() {
        return this.request('/users');
    }

    // Campaign endpoints
    async getCampaigns() {
        return this.request('/campaigns');
    }

    async getCampaign(id) {
        return this.request(`/campaigns/${id}`);
    }

    async getCampaignLeads(campaignId, page = 1, limit = 50) {
        return this.request(`/campaigns/${campaignId}/leads?page=${page}&limit=${limit}`);
    }

    async getUnassignedLeadsCount() {
        return this.request('/campaigns/unassigned-count');
    }

    async getUnassignedLeads(page = 1, limit = 50) {
        return this.request(`/campaigns/unassigned/leads?page=${page}&limit=${limit}`);
    }

    async createCampaign(campaignData) {
        return this.request('/campaigns', {
            method: 'POST',
            body: JSON.stringify(campaignData),
        });
    }

    async updateCampaign(id, campaignData) {
        return this.request(`/campaigns/${id}`, {
            method: 'PUT',
            body: JSON.stringify(campaignData),
        });
    }

    async deleteCampaign(id) {
        return this.request(`/campaigns/${id}`, {
            method: 'DELETE',
        });
    }

    async assignUsersToCampaign(campaignId, userIds) {
        return this.request(`/campaigns/${campaignId}/users`, {
            method: 'PUT',  // Use PUT to replace all users
            body: JSON.stringify({ user_ids: userIds }),
        });
    }

    async removeUserFromCampaign(campaignId, userId) {
        return this.request(`/campaigns/${campaignId}/users/${userId}`, {
            method: 'DELETE',
        });
    }

    async assignLeadsToCampaign(campaignId, leadIds) {
        return this.request(`/campaigns/${campaignId}/leads`, {
            method: 'POST',
            body: JSON.stringify({ lead_ids: leadIds }),
        });
    }

    async removeLeadFromCampaign(leadId) {
        return this.request(`/leads/${leadId}`, {
            method: 'PUT',
            body: JSON.stringify({ campaign_id: null }),
        });
    }

    async bulkAssignLeadsToCampaign(leadIds, campaignId) {
        // Chunk large requests to avoid payload size limits
        const CHUNK_SIZE = 500;

        if (leadIds.length <= CHUNK_SIZE) {
            return this.request('/leads/bulk-assign-campaign', {
                method: 'POST',
                body: JSON.stringify({ leadIds, campaignId }),
            });
        }

        // Process in chunks for large batches
        let totalProcessed = 0;
        for (let i = 0; i < leadIds.length; i += CHUNK_SIZE) {
            const chunk = leadIds.slice(i, i + CHUNK_SIZE);
            const result = await this.request('/leads/bulk-assign-campaign', {
                method: 'POST',
                body: JSON.stringify({ leadIds: chunk, campaignId }),
            });
            totalProcessed += result.count || chunk.length;
        }

        return { success: true, count: totalProcessed };
    }

    // User Management
    async createUser(userData) {
        return this.request('/users', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    }

    async updateUser(userId, userData) {
        return this.request(`/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(userData),
        });
    }

    async deleteUser(userId) {
        return this.request(`/users/${userId}`, {
            method: 'DELETE',
        });
    }

    // Role Management
    async getRoles() {
        return this.request('/users/roles/list');
    }

    async createRole(roleData) {
        return this.request('/users/roles', {
            method: 'POST',
            body: JSON.stringify(roleData),
        });
    }

    // Bulk Lead Actions
    async bulkAction(data) {
        return this.request('/leads/bulk-action', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async bulkCount(filters) {
        return this.request('/leads/bulk-count', {
            method: 'POST',
            body: JSON.stringify({ filters }),
        });
    }

    // Lead Locking - Prevent multiple users dialing same lead
    async getLeadLock(leadId) {
        return this.request(`/leads/${leadId}/lock`);
    }

    async acquireLeadLock(leadId) {
        return this.request(`/leads/${leadId}/lock`, {
            method: 'POST',
        });
    }

    async releaseLeadLock(leadId) {
        return this.request(`/leads/${leadId}/lock`, {
            method: 'DELETE',
        });
    }

    async getCampaignLocks(campaignId) {
        return this.request(`/leads/campaign/${campaignId}/locks`);
    }
}

export default new ApiService();
