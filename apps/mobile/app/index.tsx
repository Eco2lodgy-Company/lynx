import React, { useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Image } from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { PremiumCard } from "../components/ui/PremiumCard";
import Animated, { FadeInDown, FadeInUp, FadeIn } from "react-native-reanimated";
import { ActivityIndicator, StyleSheet, TouchableOpacity } from "react-native";

export default function LoginScreen() {
    const { login } = useAuth();
    const insets = useSafeAreaInsets();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async () => {
        if (!email || !password) {
            setError("Veuillez remplir tous les champs.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await login(email, password);
        } catch (e: any) {
            setError(e || "Identifiants invalides ou erreur de connexion.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1 bg-white"
        >
            <StatusBar style="dark" />
            <LinearGradient
                colors={['#FFFFFF', '#FDFCFB', '#F5F0EB']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            
            <ScrollView
                className="flex-1 px-8"
                contentContainerStyle={{ 
                    flexGrow: 1, 
                    justifyContent: "center",
                    paddingTop: Math.max(insets.top, 24),
                    paddingBottom: Math.max(insets.bottom, 24)
                }}
                showsVerticalScrollIndicator={false}
            >
                {/* Branding Section */}
                <Animated.View entering={FadeInDown.duration(1000).springify()} className="items-center mb-16">
                    <View className="relative">
                        <View className="w-32 h-32 bg-white rounded-[35px] border-2 border-secondary/10 items-center justify-center shadow-2xl shadow-secondary/10 overflow-hidden">
                            <Image 
                                source={require("../assets/logo-lynx.png")}
                                className="w-24 h-24"
                                resizeMode="contain"
                            />
                        </View>
                        <View className="absolute -top-1 -left-1 w-6 h-6 rounded-full border-2 border-white bg-primary items-center justify-center">
                            <View className="absolute w-2 h-2 bg-primary rounded-full shadow-lg shadow-primary" />
                        </View>
                    </View>
                    
                    <Animated.View entering={FadeIn.delay(600)} className="mt-8 items-center">
                        <Text className="text-secondary/40 text-[10px] font-black uppercase tracking-[6px] mb-2">LYNX MANAGEMENT</Text>
                        <Text className="text-secondary text-2xl font-black tracking-tight">Système de Pilotage Elite</Text>
                    </Animated.View>
                </Animated.View> 

                {/* Form Section */}
                <PremiumCard 
                    index={1} 
                    delay={200} 
                    style={{ 
                        padding: 28, 
                        borderRadius: 36, 
                        backgroundColor: '#FFFFFF',
                        borderColor: 'rgba(74, 53, 32, 0.08)',
                        borderWidth: 1.5
                    }} 
                    glass={true}
                >
                    <View className="mb-10">
                        <Text className="text-secondary text-3xl font-black tracking-tight mb-2">Connexion</Text>
                        <Text className="text-secondary/50 text-[13px] font-medium leading-5">Accédez à votre espace sécurisé pour piloter vos opérations.</Text>
                    </View>

                    {error && (
                        <Animated.View entering={FadeIn} className="mb-8 p-4 bg-red-50 border border-red-200 rounded-2xl">
                            <Text className="text-red-600 text-[10px] font-black uppercase tracking-wider text-center">{error}</Text>
                        </Animated.View>
                    )}

                    <View>
                        <Input
                            label="ADRESSE EMAIL PROFESSIONNELLE"
                            placeholder="utilisateur@lynx.pro"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />

                        <View className="mt-2">
                            <Input
                                label="MOT DE PASSE"
                                placeholder="••••••••"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={handleLogin}
                        disabled={loading}
                        activeOpacity={0.9}
                        className="mt-8 overflow-hidden rounded-3xl"
                    >
                        <LinearGradient
                            colors={['#4A3520', '#2A1F14']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{ height: 72, alignItems: 'center', justifyContent: 'center' }}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text className="text-white font-black text-lg uppercase tracking-tight">Initialiser l'accès</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </PremiumCard>

                {/* Footer */}
                <Animated.View entering={FadeIn.delay(1200)} className="items-center mt-12 pb-8">
                    <Text className="text-secondary/30 text-[9px] font-black tracking-[4px] uppercase mb-1">
                        PART OF ECOTECH ECOSYSTEM
                    </Text>
                    <Text className="text-primary/60 text-[10px] font-black tracking-[2px] uppercase mb-4">
                        POWERED BY NGS
                    </Text>
                    <Text className="text-secondary/20 text-[8px] font-bold">
                        © {new Date().getFullYear()} LYNX Corp. All rights reserved.
                    </Text>
                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
