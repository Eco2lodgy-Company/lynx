import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Plus, Calendar, User, FileText, ChevronRight, Filter } from 'lucide-react-native';
import api from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { PremiumCard } from '../../../components/ui/PremiumCard';
import Animated, { FadeInUp } from 'react-native-reanimated';

export default function DailyLogsListScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { projectId } = useLocalSearchParams();
    const { user } = useAuth();
    
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchLogs = async () => {
        try {
            const url = projectId ? `/daily-logs?projectId=${projectId}` : '/daily-logs';
            const response = await api.get(url);
            setLogs(response.data);
        } catch (error) {
            console.error('Error fetching logs:', error);
            Alert.alert('Erreur', 'Impossible de charger les rapports');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [projectId]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchLogs();
        setRefreshing(false);
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'VALIDE': return { label: 'Validé', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' };
            case 'BROUILLON': return { label: 'Brouillon', color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.1)' };
            case 'SOUMIS': return { label: 'Soumis', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' };
            case 'REJETE': return { label: 'Rejeté', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' };
            default: return { label: status, color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.1)' };
        }
    };

    const LogItem = ({ log, index }: { log: any, index: number }) => {
        const status = getStatusStyle(log.status);
        return (
            <PremiumCard index={index} glass={true} style={{ padding: 18, marginBottom: 14 }}>
                <TouchableOpacity 
                    onPress={() => router.push({ pathname: '/admin/daily-logs/details', params: { id: log.id } })}
                    activeOpacity={0.7}
                >
                    <View className="flex-row justify-between items-start mb-4">
                        <View className="flex-1 mr-4">
                            <View className="flex-row items-center mb-1">
                                <Calendar size={12} color="#A08060" />
                                <Text className="text-secondary/40 text-[10px] font-black uppercase tracking-widest ml-2">
                                    {new Date(log.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </Text>
                            </View>
                            <Text className="text-secondary font-black text-xl tracking-tight" numberOfLines={1}>
                                {log.project?.name || 'Projet'}
                            </Text>
                        </View>
                        <View style={{ backgroundColor: status.bg }} className="px-3 py-1.5 rounded-xl border border-white/5">
                            <Text style={{ color: status.color }} className="text-[10px] font-black uppercase tracking-wider">{status.label}</Text>
                        </View>
                    </View>

                    <Text className="text-secondary/60 text-sm font-medium mb-4" numberOfLines={2}>
                        {log.summary}
                    </Text>

                    <View className="flex-row items-center justify-between pt-4 border-t border-secondary/5">
                        <View className="flex-row items-center">
                            <View className="w-8 h-8 rounded-full bg-secondary/5 items-center justify-center mr-3 border border-secondary/10">
                                <User size={14} color="#4A3520" />
                            </View>
                            <Text className="text-secondary/50 text-xs font-bold">{log.author?.firstName} {log.author?.lastName}</Text>
                        </View>
                        <View className="bg-bg-soft p-2.5 rounded-xl border border-border-light">
                            <ChevronRight size={16} color="#4A3520" strokeWidth={3} />
                        </View>
                    </View>
                </TouchableOpacity>
            </PremiumCard>
        );
    };

    return (
        <View className="flex-1 bg-white">
            <LinearGradient colors={['#FFFFFF', '#FDFCFB', '#F8F9FA']} style={StyleSheet.absoluteFill} />
            
            <View className="px-6 pb-6" style={{ paddingTop: Math.max(insets.top, 24) }}>
                <View className="flex-row items-center justify-between mb-6">
                    <TouchableOpacity onPress={() => router.back()} className="bg-bg-soft w-12 h-12 rounded-2xl items-center justify-center border border-border-light">
                        <ChevronLeft size={24} color="#4A3520" strokeWidth={3} />
                    </TouchableOpacity>
                    <TouchableOpacity className="bg-bg-soft w-12 h-12 rounded-2xl items-center justify-center border border-border-light">
                        <Filter size={20} color="#4A3520" strokeWidth={2.5} />
                    </TouchableOpacity>
                </View>
                <Text className="text-secondary/40 text-[10px] font-black uppercase tracking-[4px] mb-1">Rapports d'activité</Text>
                <Text className="text-secondary text-4xl font-black tracking-tight">Journaux</Text>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator color="#E67E22" size="large" />
                </View>
            ) : (
                <ScrollView 
                    className="flex-1 px-6" 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 120 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E67E22" />}
                >
                    {logs.length > 0 ? (
                        logs.map((log, idx) => <LogItem key={log.id} log={log} index={idx} />)
                    ) : (
                        <View className="items-center justify-center py-20">
                            <FileText size={64} color="#F3F4F6" strokeWidth={1} />
                            <Text className="text-secondary/40 text-lg font-medium mt-4 italic">Aucun rapport trouvé</Text>
                        </View>
                    )}
                </ScrollView>
            )}

            {user?.role === 'CHEF_EQUIPE' && (
                <TouchableOpacity 
                    onPress={() => router.push('/admin/daily-logs/form')}
                    className="absolute bottom-10 right-6 w-16 h-16 rounded-[24px] bg-secondary items-center justify-center shadow-2xl shadow-secondary/50"
                >
                    <Plus size={32} color="white" strokeWidth={3} />
                </TouchableOpacity>
            )}
        </View>
    );
}
