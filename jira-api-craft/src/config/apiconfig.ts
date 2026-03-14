const API_CONFIG = {
    API_BASE_URL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000',
    jira: {
        login: '/jira/login',
        projects: '/jira/projects',
        issues: `/jira/issues`,
    }
};
export const POSTMAN_API_KEY_URL = 'https://go.postman.co/settings/me/api-keys';

export const API_BASE_URL = API_CONFIG.API_BASE_URL;

export default API_CONFIG;



