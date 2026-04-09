import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, Platform, Alert, ActivityIndicator, Modal, KeyboardAvoidingView } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { 
    User, 
    Settings, 
    Shield, 
    LogOut,
    Bell,
    ChevronRight,
    Mail,
    Lock,
    X,
    CheckCircle,
    Camera
} from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { PremiumCard } from '../../components/ui/PremiumCard';
import Animated, { FadeInDown, FadeIn, FadeInUp } from 'react-native-reanimated';
import api, { ASSET_BASE_URL } from '../../lib/api';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileScreen() {
    const { user, logout, updateUser } = useAuth();
    const insets = useSafeAreaInsets();

    const [passwordModalVisible, setPasswordModalVisible] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0].uri) {
            handleUploadAvatar(result.assets[0].uri);
        }
    };

    const handleUploadAvatar = async (uri: string) => {
        setUploading(true);
        try {
            const filename = uri.split('/').pop() || `avatar_${Date.now()}.jpg`;
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : `image/jpeg`;

            const formData = new FormData();
            
            if (Platform.OS === 'web') {
                // On web, we need to fetch the blob from the uri
                const response = await fetch(uri);
                const blob = await response.blob();
                formData.append('file', blob, filename);
            } else {
                // @ts-ignore
                formData.append('file', {
                    uri,
                    type,
                    name: filename
                });
            }

            const uploadRes = await api.post('/upload', formData);

            const imageUrl = uploadRes.data.url;
            
            await api.put('/profile', { avatar: imageUrl });
            await updateUser({ image: imageUrl });
            
            Alert.alert("Succès", "Photo de profil mise à jour");
        } catch (error: any) {
            console.error("Error uploading avatar:", error);
            Alert.alert("Erreur", "Impossible de mettre à jour la photo de profil");
        } finally {
            setUploading(false);
        }
    };

    const handleUpdatePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert("Erreur", "Veuillez remplir tous les champs");
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert("Erreur", "Le nouveau mot de passe et sa confirmation ne correspondent pas");
            return;
        }

        setSaving(true);
        try {
            await api.put('/profile', {
                currentPassword,
                newPassword
            });
            Alert.alert("Succès", "Votre mot de passe a été mis à jour avec succès");
            setPasswordModalVisible(false);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error: any) {
            console.error("Error updating password:", error);
            Alert.alert("Erreur", error.response?.data?.error || "Une erreur est survenue");
        } finally {
            setSaving(false);
        }
    };

    const MenuButton = ({ icon: Icon, title, subtitle, color, onPress, index }: any) => (
        <PremiumCard 
            index={index} 
            style={{ padding: 14, marginBottom: 14 }}
            glass={true}
        >
            <TouchableOpacity 
                className="flex-row items-center justify-between"
                onPress={onPress}
                activeOpacity={0.6}
            >
                <View className="flex-row items-center">
                    <View className="w-14 h-14 rounded-2xl items-center justify-center mr-5" style={{ backgroundColor: color + '10' }}>
                        <Icon size={26} color={color} strokeWidth={2} />
                    </View>
                    <View>
                        <Text className="text-secondary font-black text-lg tracking-tight">{title}</Text>
                        {subtitle && <Text className="text-secondary/50 text-xs font-medium mt-0.5">{subtitle}</Text>}
                    </View>
                </View>
                <View className="bg-bg-soft p-2.5 rounded-2xl border border-border-light">
                    <ChevronRight color="#4A3520" size={18} strokeWidth={3} />
                </View>
            </TouchableOpacity>
        </PremiumCard>
    );

    return (
        <View className="flex-1 bg-white">
            <LinearGradient
                colors={['#FFFFFF', '#FDFCFB', '#F8F9FA']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            
            <ScrollView 
                className="flex-1" 
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ 
                    padding: 24, 
                    paddingTop: Math.max(insets.top, 24),
                    paddingBottom: Math.max(insets.bottom, 120)
                }}
            >
                <Animated.View entering={FadeInDown.duration(800)} className="items-center mb-12">
                    <View className="relative">
                        <TouchableOpacity 
                            onPress={pickImage}
                            disabled={uploading}
                            activeOpacity={0.8}
                        >
                            <View className="w-32 h-32 bg-bg-soft rounded-[45px] border-4 border-primary/20 items-center justify-center overflow-hidden shadow-2xl shadow-primary/10">
                                {uploading ? (
                                    <ActivityIndicator color="#C8842A" size="large" />
                                ) : user?.image ? (
                                    <Image source={{ uri: user.image.startsWith('http') ? user.image : `${ASSET_BASE_URL}${user.image}` }} className="w-full h-full" />
                                ) : (
                                    <View className="bg-bg-warm w-full h-full items-center justify-center">
                                        <User size={64} color="#4A3520" strokeWidth={1.5} />
                                    </View>
                                )}
                            </View>
                            <View className="absolute -bottom-2 -right-2 bg-primary w-12 h-12 rounded-3xl border-4 border-white items-center justify-center shadow-lg">
                                <Camera size={20} color="white" />
                            </View>
                        </TouchableOpacity>
                    </View>
                    <Text className="text-secondary text-4xl font-black mt-8 tracking-tight">{user?.name}</Text>
                    <View className="bg-secondary/5 px-5 py-2 rounded-2xl border border-secondary/10 mt-3">
                        <Text className="text-secondary text-[11px] font-black uppercase tracking-[3px]">{user?.role}</Text>
                    </View>
                </Animated.View>

                <PremiumCard index={1} style={{ padding: 20, marginBottom: 40, backgroundColor: '#FAF6F1' }}>
                    <View className="flex-row items-center mb-6">
                        <View className="w-10 h-10 rounded-xl bg-white items-center justify-center mr-4 shadow-sm">
                            <Mail size={18} color="#4A3520" />
                        </View>
                        <Text className="text-secondary text-base font-bold">{user?.email}</Text>
                    </View>
                    <View className="flex-row items-center">
                        <View className="w-10 h-10 rounded-xl bg-white items-center justify-center mr-4 shadow-sm">
                            <Shield size={18} color="#4A3520" />
                        </View>
                        <View>
                            <Text className="text-secondary/40 text-[10px] font-black uppercase tracking-wider">Identifiant Elite</Text>
                            <Text className="text-secondary/80 font-mono text-xs font-bold">{user?.id?.substring(0, 16).toUpperCase()}</Text>
                        </View>
                    </View>
                </PremiumCard>

                <View className="mb-12">
                    <Animated.Text 
                        entering={FadeIn.delay(600)}
                        className="text-secondary/40 text-[xs] font-black uppercase tracking-[5px] mb-8 ml-2"
                    >
                        Préférences
                    </Animated.Text>
                    
                    <MenuButton 
                        index={2}
                        icon={Bell} 
                        title="Notifications" 
                        subtitle="Centrales d'alertes & flux"
                        color="#E67E22"
                        onPress={() => Alert.alert("Notifications", "Vous êtes à jour. Aucune nouvelle notification.")}
                    />
                    <MenuButton 
                        index={3}
                        icon={Shield} 
                        title="Sécurité" 
                        subtitle="Changer votre mot de passe"
                        color="#4A3520"
                        onPress={() => setPasswordModalVisible(true)}
                    />
                    <MenuButton 
                        index={4}
                        icon={Settings} 
                        title="Configuration" 
                        subtitle="Interface & Paramètres LYNX"
                        color="#7A8000"
                        onPress={() => Alert.alert("Configuration", "Paramètres système synchronisés avec le cloud.")}
                    />
                </View>

                <TouchableOpacity 
                    onPress={logout}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={['#4A3520', '#1A0F05']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{ 
                            borderRadius: 24, 
                            height: 70, 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            shadowColor: '#4A3520', 
                            shadowOffset: { width: 0, height: 10 }, 
                            shadowOpacity: 0.2, 
                            shadowRadius: 15, 
                            elevation: 8 
                        }}
                    >
                        <View className="flex-row items-center">
                            <LogOut size={22} color="white" strokeWidth={3} />
                            <Text className="text-white font-black ml-4 text-lg tracking-tight uppercase">Déconnexion Sécurisée</Text>
                        </View>
                    </LinearGradient>
                </TouchableOpacity>

                <Animated.View entering={FadeIn.delay(1000)} className="items-center mt-16 mb-8 opacity-60">
                    <Image 
                        source={require("../../assets/logo-lynx.png")}
                        className="w-12 h-12 mb-4"
                        resizeMode="contain"
                    />
                    <Text className="text-secondary/40 text-[11px] font-black tracking-[5px] uppercase">LYNX Elite v2.0.0</Text>
                    <Text className="text-secondary/30 text-[10px] mt-2 font-bold italic">LYNX INDUSTRIES © 2026</Text>
                </Animated.View>
            </ScrollView>

            {/* Password Change Modal */}
            <Modal visible={passwordModalVisible} transparent animationType="fade" onRequestClose={() => setPasswordModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
                    <View className="flex-1 bg-black/60 justify-center items-center px-4">
                        <Animated.View 
                            entering={FadeInUp.springify()} 
                            className="bg-white rounded-[40px] p-8 w-full shadow-2xl"
                        >
                            <View className="flex-row items-center justify-between mb-8">
                                <View>
                                    <Text className="text-secondary text-2xl font-black mb-1">Sécurité</Text>
                                    <Text className="text-secondary/50 text-[10px] font-bold uppercase tracking-widest">CHANGER LE MOT DE PASSE</Text>
                                </View>
                                <TouchableOpacity 
                                    onPress={() => setPasswordModalVisible(false)} 
                                    className="w-12 h-12 bg-bg-soft rounded-full items-center justify-center border border-border-light shadow-sm"
                                >
                                    <X size={20} color="#4A3520" strokeWidth={2.5} />
                                </TouchableOpacity>
                            </View>
                            
                            <View className="bg-bg-soft border border-border-light rounded-2xl mb-5 overflow-hidden h-14">
                                <Input
                                    placeholder="Mot de passe actuel"
                                    value={currentPassword}
                                    onChangeText={setCurrentPassword}
                                    secureTextEntry
                                    inputClassName="bg-transparent border-0"
                                    placeholderTextColor="#A08060"
                                />
                            </View>

                            <View className="bg-bg-soft border border-border-light rounded-2xl mb-5 overflow-hidden h-14">
                                <Input
                                    placeholder="Nouveau mot de passe"
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    secureTextEntry
                                    inputClassName="bg-transparent border-0"
                                    placeholderTextColor="#A08060"
                                />
                            </View>

                            <View className="bg-bg-soft border border-border-light rounded-2xl mb-8 overflow-hidden h-14">
                                <Input
                                    placeholder="Confirmer le nouveau mot de passe"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry
                                    inputClassName="bg-transparent border-0"
                                    placeholderTextColor="#A08060"
                                />
                            </View>

                            <TouchableOpacity
                                onPress={handleUpdatePassword}
                                disabled={saving}
                                activeOpacity={0.8}
                                className="overflow-hidden rounded-2xl"
                            >
                                <LinearGradient
                                    colors={['#E67E22', '#D35400']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={{ height: 60, alignItems: 'center', justifyContent: 'center' }}
                                >
                                    {saving ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <View className="flex-row items-center">
                                            <CheckCircle color="white" size={20} strokeWidth={3} className="mr-2" />
                                            <Text className="text-white font-black text-sm uppercase tracking-wider">Mettre à jour</Text>
                                        </View>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}
