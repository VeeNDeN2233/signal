import axios from 'axios';
import { tokenStorage } from './tokenStorage';
const apiClient = axios.create({
    baseURL: '/api',
});
apiClient.interceptors.request.use((config) => {
    const token = tokenStorage.getAccess();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
let isRefreshing = false;
let pendingQueue: Array<{
    resolve: (token: string) => void;
    reject: (err: unknown) => void;
}> = [];
function processPendingQueue(error: unknown, token: string | null) {
    pendingQueue.forEach(({ resolve, reject }) => {
        if (error) {
            reject(error);
        }
        else {
            resolve(token!);
        }
    });
    pendingQueue = [];
}
apiClient.interceptors.response.use((response) => response, async (error) => {
    const originalRequest = error.config as typeof error.config & {
        _retry?: boolean;
    };
    if (error.response?.status !== 401 || originalRequest._retry) {
        return Promise.reject(error);
    }
    const refreshToken = tokenStorage.getRefresh();
    if (!refreshToken) {
        tokenStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
    }
    if (isRefreshing) {
        return new Promise((resolve, reject) => {
            pendingQueue.push({ resolve, reject });
        }).then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
        });
    }
    originalRequest._retry = true;
    isRefreshing = true;
    try {
        const { data } = await axios.post('/api/auth/refresh', { refreshToken });
        const { accessToken, refreshToken: newRefresh } = data.data as {
            accessToken: string;
            refreshToken: string;
        };
        tokenStorage.setTokens(accessToken, newRefresh);
        apiClient.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        processPendingQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
    }
    catch (refreshError) {
        processPendingQueue(refreshError, null);
        tokenStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
    }
    finally {
        isRefreshing = false;
    }
});
export default apiClient;
