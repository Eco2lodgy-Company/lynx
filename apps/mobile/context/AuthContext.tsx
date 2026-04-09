import React, { createContext, useContext, useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import api from "../lib/api";
import { router } from "expo-router";
import { Platform } from "react-native";
import { User as SharedUser } from "@lynx/types";

// The mobile API construction adds 'name' field
interface User extends SharedUser {
    name: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    updateUser: (newData: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStoredAuth();
    }, []);

    const loadStoredAuth = async () => {
        try {
            let storedToken: string | null = null;
            let storedUser: string | null = null;

            if (Platform.OS === 'web') {
                storedToken = localStorage.getItem("auth_token");
                storedUser = localStorage.getItem("auth_user");
            } else {
                storedToken = await SecureStore.getItemAsync("auth_token");
                storedUser = await SecureStore.getItemAsync("auth_user");
            }

            if (storedToken && storedUser) {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
            }
        } catch (error) {
            console.error("Error loading stored auth:", error);
        } finally {
            setLoading(false);
        }
    };

    const updateUser = async (newData: Partial<User>) => {
        if (!user) return;
        const updatedUser = { ...user, ...newData };
        setUser(updatedUser);
        if (Platform.OS === 'web') {
            localStorage.setItem("auth_user", JSON.stringify(updatedUser));
        } else {
            await SecureStore.setItemAsync("auth_user", JSON.stringify(updatedUser));
        }
    };

    const login = async (email: string, password: string) => {
        try {
            const response = await api.post("/mobile/login", { email, password });
            const { token, user } = response.data;

            if (Platform.OS === 'web') {
                localStorage.setItem("auth_token", token);
                localStorage.setItem("auth_user", JSON.stringify(user));
            } else {
                await SecureStore.setItemAsync("auth_token", token);
                await SecureStore.setItemAsync("auth_user", JSON.stringify(user));
            }

            setToken(token);
            setUser(user);
            router.replace("/dashboard");
        } catch (error: any) {
            console.error("Login failed:", error);
            throw error.response?.data?.error || "Erreur de connexion";
        }
    };

    const logout = async () => {
        try {
            if (Platform.OS === 'web') {
                localStorage.removeItem("auth_token");
                localStorage.removeItem("auth_user");
            } else {
                await SecureStore.deleteItemAsync("auth_token");
                await SecureStore.deleteItemAsync("auth_user");
            }
            setToken(null);
            setUser(null);
            router.replace("/");
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
