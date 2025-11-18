const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

class ApiClient {
    private baseUrl: string;

    constructor() {
        this.baseUrl = API_URL;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        const config: RequestInit = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        };

        const response = await fetch(url, config);

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Request failed' }));
            throw new Error(error.error || `HTTP error! status: ${response.status}`);
        }

        return response.json();
    }




    // Import endpoints
    async getImportHistory(params?: Record<string, any>) {
        let queryString = '';
        if (params && Object.keys(params).length) {
            queryString = '?' + Object.entries(params)
                .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(String(v)))
                .join('&');
        }
        return this.request(`/api/imports/history${queryString}`);
    }

    async getImportDetails(id: string) {
        return this.request(`/api/imports/history/${id}`);
    }

    async triggerImport(data: { sourceUrl?: string; sources?: string[] }) {
        return this.request('/api/imports/trigger', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async retryImport(id: string) {
        return this.request(`/api/imports/retry/${id}`, {
            method: 'POST',
        });
    }

    async deleteImportLog(id: string) {
        return this.request(`/api/imports/history/${id}`, {
            method: 'DELETE',
        });
    }

    async getSources() {
        return this.request('/api/imports/sources');
    }

    async getImportStatistics(period?: string) {
        const queryString = period ? `?period=${period}` : '';
        return this.request(`/api/imports/statistics${queryString}`);
    }




    // Job endpoints
    async getJobs(params?: Record<string, any>) {
        const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
        return this.request(`/api/jobs${queryString}`);
    }

    async getJobById(id: string) {
        return this.request(`/api/jobs/${id}`);
    }

    async updateJob(id: string, data: any) {
        return this.request(`/api/jobs/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteJob(id: string) {
        return this.request(`/api/jobs/${id}`, {
            method: 'DELETE',
        });
    }

    async searchJobs(query: any, params?: Record<string, any>) {
        const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
        return this.request(`/api/jobs/search${queryString}`, {
            method: 'POST',
            body: JSON.stringify(query),
        });
    }

    async getJobStatistics() {
        return this.request('/api/jobs/statistics');
    }

    async getJobCategories() {
        return this.request('/api/jobs/categories');
    }

    async getJobSources() {
        return this.request('/api/jobs/sources');
    }

    async exportJobs(params?: Record<string, any>) {
        const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
        return this.request(`/api/jobs/export${queryString}`);
    }




    // Queue endpoints
    async getQueueStats() {
        return this.request('/api/queue/stats');
    }

    async getQueueHealth() {
        return this.request('/api/queue/health');
    }

    async getActiveJobs() {
        return this.request('/api/queue/jobs/active');
    }

    async getWaitingJobs() {
        return this.request('/api/queue/jobs/waiting');
    }

    async getFailedJobs() {
        return this.request('/api/queue/jobs/failed');
    }

    async retryFailedJob(jobId: string) {
        return this.request(`/api/queue/jobs/${jobId}/retry`, {
            method: 'POST',
        });
    }

    async clearCompletedJobs() {
        return this.request('/api/queue/jobs/completed', {
            method: 'DELETE',
        });
    }

    async pauseQueue() {
        return this.request('/api/queue/pause', {
            method: 'POST',
        });
    }

    async resumeQueue() {
        return this.request('/api/queue/resume', {
            method: 'POST',
        });
    }





    // Health check
    async getHealth() {
        return this.request('/health');
    }
}

export const apiClient = new ApiClient();
