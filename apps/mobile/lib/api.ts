import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { createApiClient, setQueryApiClient, setTokenStorage } from "@lynx/api-client";

// Production VPS — deployed at https://alphatek.fr/lynx
const PROD_API_URL = "https://alphatek.fr/lynx/api";
const PROD_ASSET_URL = "https://alphatek.fr";

// Local Development
const getLocalHost = () => {
    if (Platform.OS === 'web') {
        return typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
    }
    return '10.0.2.2'; // Standard for Android emulator
};

const LOCAL_HOST = getLocalHost();
const LOCAL_API_URL = `http://${LOCAL_HOST}:3000/lynx/api`;

export const API_BASE_URL = PROD_API_URL;
export const ASSET_BASE_URL = PROD_ASSET_URL;

/**
 * Converts any data URI to a compressed Blob (WebP / JPEG) on web using Canvas.
 * Max dimension 1600px, quality 0.75.
 * Falls back to raw blob on error.
 */
export const getBlobFromUri = async (uri: string, maxDim = 1600, quality = 0.75): Promise<Blob | null> => {
    if (Platform.OS !== 'web') return null;

    try {
        const imgEl = new Image();
        imgEl.crossOrigin = 'anonymous';

        const loaded = await new Promise<boolean>((resolve) => {
            imgEl.onload = () => resolve(true);
            imgEl.onerror = () => resolve(false);
            imgEl.src = uri;
        });

        if (!loaded) {
            const response = await fetch(uri);
            return await response.blob();
        }

        let { naturalWidth: w, naturalHeight: h } = imgEl;
        if (w > maxDim || h > maxDim) {
            if (w > h) { h = Math.round((h / w) * maxDim); w = maxDim; }
            else { w = Math.round((w / h) * maxDim); h = maxDim; }
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(imgEl, 0, 0, w, h);

        return new Promise<Blob | null>((resolve) => {
            canvas.toBlob(
                (blob) => resolve(blob),
                'image/webp',
                quality
            );
        });
    } catch (err) {
        console.warn('[getBlobFromUri] Compression failed, using raw fetch:', err);
        const response = await fetch(uri);
        return await response.blob();
    }
};

// --- API Client Initialization ---

// Configure persistence for auth token
setTokenStorage({
    getToken: async () => {
        if (Platform.OS === 'web') return localStorage.getItem("auth_token");
        return await SecureStore.getItemAsync("auth_token");
    },
    setToken: async (token: string) => {
        if (Platform.OS === 'web') localStorage.setItem("auth_token", token);
        else await SecureStore.setItemAsync("auth_token", token);
    },
    removeToken: async () => {
        if (Platform.OS === 'web') localStorage.removeItem("auth_token");
        else await SecureStore.deleteItemAsync("auth_token");
    },
    getUserData: async () => {
        if (Platform.OS === 'web') return localStorage.getItem("user_data");
        return await SecureStore.getItemAsync("user_data");
    },
    setUserData: async (data: string) => {
        if (Platform.OS === 'web') localStorage.setItem("user_data", data);
        else await SecureStore.setItemAsync("user_data", data);
    },
    removeUserData: async () => {
        if (Platform.OS === 'web') localStorage.removeItem("user_data");
        else await SecureStore.deleteItemAsync("user_data");
    }
});

// Create and globally register the API client
const api = createApiClient(API_BASE_URL);

// Add logging for development
api.interceptors.request.use(async (config) => {
    console.log(`[Mobile API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
});

// Global error interceptor — surfaces errors to the user
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Lazy import to avoid circular deps  
        const { Alert } = require('react-native');

        if (error.response) {
            const status = error.response.status;
            if (status === 401) {
                Alert.alert(
                    '⏳ Session expirée',
                    'Votre session a expiré. Veuillez vous reconnecter.',
                );
            } else if (status >= 500) {
                Alert.alert(
                    '🔧 Erreur serveur',
                    'Le serveur a rencontré une erreur. Réessayez dans un instant.',
                );
            }
        } else if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
            Alert.alert(
                '📶 Pas de connexion',
                'Impossible de contacter le serveur. Vérifiez votre connexion internet.',
            );
        }

        console.error('[Mobile API Error]', error.config?.url, error.message);
        return Promise.reject(error);
    }
);

setQueryApiClient(api);

export default api;
