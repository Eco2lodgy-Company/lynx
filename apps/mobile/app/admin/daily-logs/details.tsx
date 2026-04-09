import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, Image, Dimensions, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Check, X, Calendar, User, Thermometer, Sun, Cloud, CloudRain, Briefcase } from 'lucide-react-native';
import api, { ASSET_BASE_URL } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { Button } from '../../../components/ui/Button';
import Animated, { FadeInUp } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export default function DailyLogDetailsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams();
    const { user } = useAuth();
    
    const [log, setLog] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    const fetchLog = async () => {
        try {
            const response = await api.get(`/daily-logs/${id}`);
            setLog(response.data);
        } catch (error) {
            Alert.alert('Erreur', 'Impossible de charger le rapport');
            router.back();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLog();
    }, [id]);

    const updateStatus = async (status: string, rejectionNote = '') => {
        setProcessing(true);
        try {
            await api.put(`/daily-logs/${id}`, { status, rejectionNote });
            Alert.alert('Succès', `Rapport ${status === 'VALIDE' ? 'validé' : 'rejeté'}`);
            fetchLog();
        } catch (error) {
            Alert.alert('Erreur', 'L\'opération a échoué');
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = () => {
        Alert.prompt(
            'Motif du rejet',
            'Veuillez expliquer pourquoi ce rapport est rejeté :',
            [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Rejeter', style: 'destructive', onPress: (note) => updateStatus('REJETE', note) }
            ]
        );
    };

    if (loading) return <View className="flex-1 items-center justify-center bg-white"><ActivityIndicator color="#E67E22" size="large" /></View>;

    const WeatherIcon = log.weather === 'ENSOLEILLE' ? Sun : log.weather === 'PLUVIEUX' ? CloudRain : Cloud;

    return (
        <View className="flex-1 bg-transparent">
            <Modal visible={true} transparent animationType="fade" onRequestClose={() => router.back()}>
                <View className="flex-1 bg-black/60 justify-center items-center px-4">
                    <Animated.View entering={FadeInUp.springify()} className="w-full max-h-[85%] bg-white rounded-[32px] overflow-hidden shadow-2xl">
                        
                        {/* Header Box */}
                        <View className="px-6 py-6 border-b border-border-light bg-bg-soft flex-row justify-between items-center">
                            <View className="flex-1 pr-4">
                                <Text className="text-secondary/50 text-[10px] font-black uppercase tracking-[3px] mb-1">
                                    {new Date(log.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </Text>
                                <Text className="text-secondary text-2xl font-black tracking-tight" numberOfLines={1}>{log.project?.name}</Text>
                            </View>
                            <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-white rounded-full items-center justify-center border border-border-light shadow-sm">
                                <X size={20} color="#4A3520" strokeWidth={2.5} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView className="flex-shrink-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
                            {/* Weather & Temp */}
                            <View className="flex-row space-x-3 mb-6">
                                <View className="flex-1 bg-bg-soft rounded-[24px] p-4 border border-border-light flex-row items-center">
                                    <View className="w-10 h-10 rounded-2xl bg-white items-center justify-center mr-3 shadow-sm shadow-secondary/5 border border-border-light">
                                        <WeatherIcon size={20} color="#E67E22" />
                                    </View>
                                    <View>
                                        <Text className="text-secondary/50 text-[9px] font-black uppercase tracking-widest">Météo</Text>
                                        <Text className="text-secondary text-xs font-bold">{log.weather?.charAt(0) + log.weather?.slice(1).toLowerCase()}</Text>
                                    </View>
                                </View>
                                <View className="flex-1 bg-bg-soft rounded-[24px] p-4 border border-border-light flex-row items-center">
                                    <View className="w-10 h-10 rounded-2xl bg-white items-center justify-center mr-3 shadow-sm shadow-secondary/5 border border-border-light">
                                        <Thermometer size={20} color="#E67E22" />
                                    </View>
                                    <View>
                                        <Text className="text-secondary/50 text-[9px] font-black uppercase tracking-widest">Temp.</Text>
                                        <Text className="text-secondary text-xs font-bold">{log.temperature}°C</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Summary */}
                            <View className="mb-6">
                                <Text className="text-secondary/50 text-[10px] font-black uppercase tracking-[3px] mb-2 ml-1">Résumé de l'activité</Text>
                                <View className="bg-bg-soft rounded-[24px] p-5 border border-border-light">
                                    <Text className="text-secondary text-sm leading-5 font-serif italic text-secondary/80">
                                        "{log.summary}"
                                    </Text>
                                </View>
                            </View>

                            {/* Tasks completed */}
                            {log.workCompleted && (
                                <View className="mb-6">
                                    <Text className="text-secondary/50 text-[10px] font-black uppercase tracking-[3px] mb-2 ml-1">Tâches Finies</Text>
                                    <View className="bg-bg-soft rounded-[24px] p-5 border border-border-light">
                                        <Text className="text-secondary font-bold text-sm leading-5">{log.workCompleted}</Text>
                                    </View>
                                </View>
                            )}

                            {/* Issues */}
                            {log.issues && (
                                <View className="mb-6">
                                    <Text className="text-red-900/50 text-[10px] font-black uppercase tracking-[3px] mb-2 ml-1">Incidents / Retards</Text>
                                    <View className="bg-red-50/50 rounded-[24px] p-5 border border-red-100">
                                        <Text className="text-red-900 text-sm font-bold leading-5">{log.issues}</Text>
                                    </View>
                                </View>
                            )}

                            {/* Photos */}
                            {log.photos && log.photos.length > 0 && (
                                <View className="mb-6">
                                    <Text className="text-secondary/50 text-[10px] font-black uppercase tracking-[3px] mb-3 ml-1">Photos du Terrain</Text>
                                    <View className="flex-row flex-wrap">
                                        {log.photos.map((p: any, idx: number) => (
                                            <View key={idx} className="w-[48%] aspect-square mr-[2%] mb-[2%] rounded-[24px] overflow-hidden border border-border-light shadow-sm">
                                                <Image source={{ uri: `${ASSET_BASE_URL}${p.url}` }} className="w-full h-full" resizeMode="cover" />
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Author */}
                            <View className="flex-row items-center bg-bg-soft p-4 rounded-[24px] border border-border-light mb-4">
                                <View className="w-10 h-10 rounded-full bg-white items-center justify-center mr-3 border border-border-light">
                                    <User size={18} color="#4A3520" />
                                </View>
                                <View>
                                    <Text className="text-secondary/50 text-[9px] font-black uppercase tracking-widest">Rédigé par</Text>
                                    <Text className="text-secondary text-xs font-black">{log.author?.firstName} {log.author?.lastName}</Text>
                                </View>
                            </View>
                        </ScrollView>

                        {/* Actions (Admin/Conducteur) */}
                        {log.status === 'SOUMIS' && (user?.role === 'ADMIN' || user?.role === 'CONDUCTEUR') && (
                            <View className="p-5 border-t border-border-light bg-white flex-row space-x-3">
                                <TouchableOpacity 
                                    onPress={handleReject}
                                    className="flex-1 h-14 bg-red-50 border border-red-100 rounded-2xl items-center justify-center"
                                >
                                    <X size={20} color="#EF4444" strokeWidth={3} />
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    onPress={() => updateStatus('VALIDE')}
                                    disabled={processing}
                                    className="flex-[3] h-14 bg-secondary rounded-2xl items-center justify-center shadow-lg shadow-secondary/20"
                                >
                                    {processing ? <ActivityIndicator color="white" /> : (
                                        <View className="flex-row items-center">
                                            <Check size={20} color="white" strokeWidth={3} className="mr-2" />
                                            <Text className="text-white font-black uppercase text-sm tracking-widest">Valider</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                    </Animated.View>
                </View>
            </Modal>
        </View>
    );
}
