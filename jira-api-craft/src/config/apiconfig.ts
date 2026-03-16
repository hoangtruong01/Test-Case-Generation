const envBase = (import.meta.env.VITE_BACKEND_URL || "").trim();
const isDev = Boolean(import.meta.env.DEV);

// In production, backend URL should be provided via VITE_BACKEND_URL.
// Fallback to same-origin only if env is missing.
const resolvedBaseUrl = envBase || (isDev ? "https://test-case-generation-i8wc.onrender.com" : window.location.origin);

const API_CONFIG = {
    API_BASE_URL: resolvedBaseUrl,
    jira: {
        login: '/jira/login',
        projects: '/jira/projects',
        issues: `/jira/issues`,
    }
};
export const POSTMAN_API_KEY_URL = 'https://go.postman.co/settings/me/api-keys';

export const API_BASE_URL = API_CONFIG.API_BASE_URL;

export default API_CONFIG;



