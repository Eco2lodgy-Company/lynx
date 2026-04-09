import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, StyleSheet, FlatList } from 'react-native';
import api from '../lib/api';
import { 
    Calendar, 
    CheckSquare, 
    Truck, 
    Eye, 
    ChevronRight,
    Search,
    Filter,
    Clock,
    User,
    MapPin
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { PremiumCard } from '../components/ui/PremiumCard';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';

interface PlanningItem {
    id: string;
    type: 'TASK' | 'DELIVERY' | 'VISIT';
    title: string;
    date: string;
    status: string;
    projectName: string;
    priority?: string;
    quantity?: string;
    supplier?: string;
    visitorName?: string;
    notes?: string;
}

export default function PlanningScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [refreshing, setRefreshing] = useState(false);
    const [planning, setPlanning] = useState<PlanningItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'TASK' | 'DELIVERY' | 'VISIT'>('ALL');
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    // Generate 7 days starting from today
    const weekDays = useMemo(() => {
        const days = [];
        const today = new Date();
        for (let i = 0; i < 7; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            days.push(d);
        }
        return days;
    }, []);

    const fetchPlanning = async () => {
        try {
            const response = await api.get('/planning');
            setPlanning(response.data);
        } catch (error) {
            console.error("Error fetching planning:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlanning();
    }, []);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await fetchPlanning();
        setRefreshing(false);
    }, []);

    const filteredData = planning
        .filter((item: PlanningItem) => filter === 'ALL' || item.type === filter)
        .filter((item: PlanningItem) => {
            if (!selectedDate) return true;
            return new Date(item.date).toDateString() === selectedDate;
        });

    const getIcon = (type: string) => {
        switch (type) {
            case 'TASK': return { icon: CheckSquare, color: '#C8842A', label: 'Mission' };
            case 'DELIVERY': return { icon: Truck, color: '#3B82F6', label: 'Livraison' };
            case 'VISIT': return { icon: Eye, color: '#10B981', label: 'Visite Terrain' };
            default: return { icon: Calendar, color: '#64748B', label: 'Événement' };
        }
    };

    const PlanningItemCard = ({ item, index }: { item: PlanningItem, index: number }) => {
        const { icon: Icon, color, label } = getIcon(item.type);
        const date = new Date(item.date);
        const isToday = new Date().toDateString() === date.toDateString();

        return (
            <Animated.View entering={FadeInUp.delay(index * 100)}>
                <PremiumCard index={index} style={{ padding: 18, marginBottom: 16 }} glass={true}>
                    <TouchableOpacity 
                        activeOpacity={0.7}
                        className="flex-row items-center"
                        onPress={() => {
                            if (item.type === 'TASK') router.push('/tasks');
                            if (item.type === 'DELIVERY') router.push('/deliveries');
                        }}
                    >
                        <View className="items-center justify-center mr-5">
                            <Text className={`text-xs font-black uppercase tracking-widest ${isToday ? 'text-primary' : 'text-slate-400'}`}>
                                {date.toLocaleDateString('fr-FR', { weekday: 'short' })}
                            </Text>
                            <Text className={`text-2xl font-black ${isToday ? 'text-primary' : 'text-white'}`}>
                                {date.getDate()}
                            </Text>
                            <Text className="text-[10px] text-slate-500 font-bold">
                                {date.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase()}
                            </Text>
                        </View>

                        <View className="flex-1 border-l border-white/5 pl-5">
                            <View className="flex-row items-center mb-1.5">
                                <View style={{ backgroundColor: color + '20' }} className="px-2 py-0.5 rounded-md flex-row items-center border border-white/5">
                                    <Icon size={10} color={color} />
                                    <Text style={{ color }} className="text-[8px] font-black uppercase tracking-widest ml-1.5">{label}</Text>
                                </View>
                                {item.priority === 'URGENTE' && (
                                    <View className="bg-red-500/10 px-2 py-0.5 rounded-md ml-2 border border-red-500/20">
                                        <Text className="text-red-500 text-[8px] font-black uppercase tracking-widest">Urgent</Text>
                                    </View>
                                )}
                            </View>

                            <Text className="text-white font-black text-lg mb-1 tracking-tight" numberOfLines={1}>{item.title}</Text>
                            
                            <View className="flex-row items-center">
                                <MapPin size={10} color="#64748B" />
                                <Text className="text-slate-400 text-[10px] font-bold ml-1.5 tracking-tight">{item.projectName}</Text>
                            </View>

                            {item.type === 'VISIT' && (
                                <View className="flex-row items-center mt-2 bg-emerald-500/5 self-start px-2 py-1 rounded-lg border border-emerald-500/10">
                                    <User size={10} color="#10B981" />
                                    <Text className="text-emerald-500 text-[9px] font-bold ml-1.5 uppercase tracking-tighter">Par: {item.visitorName}</Text>
                                </View>
                            )}

                            {item.type === 'DELIVERY' && (
                                <View className="flex-row items-center mt-2 bg-blue-500/5 self-start px-2 py-1 rounded-lg border border-blue-500/10">
                                    <Truck size={10} color="#3B82F6" />
                                    <Text className="text-blue-500 text-[9px] font-bold ml-1.5 uppercase tracking-tighter">{item.quantity} • {item.supplier}</Text>
                                </View>
                            )}
                        </View>

                        <ChevronRight size={16} color="#334155" />
                    </TouchableOpacity>
                </PremiumCard>
            </Animated.View>
        );
    };

    return (
        <View className="flex-1 bg-slate-950">
            <LinearGradient
                colors={['#1e293b', '#0f172a', '#020617']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            
            <View className="px-6 mb-8" style={{ paddingTop: Math.max(insets.top, 24) }}>
                <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-slate-500 text-[11px] font-black uppercase tracking-[5px] opacity-60">Chronologie</Text>
                    <TouchableOpacity 
                        onPress={() => router.back()}
                        className="bg-white/5 px-4 py-2 rounded-xl border border-white/10"
                    >
                        <Text className="text-white text-[10px] font-black uppercase tracking-widest">Retour</Text>
                    </TouchableOpacity>
                </View>
                <Text className="text-white text-4xl font-black tracking-tight">Planning</Text>
            </View>

            <View className="px-6 mb-6">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3">
                    {[
                        { id: 'ALL', label: 'Tout', icon: Calendar },
                        { id: 'TASK', label: 'Missions', icon: CheckSquare },
                        { id: 'DELIVERY', label: 'Livraisons', icon: Truck },
                        { id: 'VISIT', label: 'Visites', icon: Eye },
                    ].map((btn) => (
                        <TouchableOpacity 
                            key={btn.id}
                            onPress={() => setFilter(btn.id as any)}
                            className={`flex-row items-center px-5 py-3 rounded-2xl border-2 ${filter === btn.id ? 'bg-primary border-primary shadow-lg shadow-primary/20' : 'bg-white/5 border-white/5'}`}
                        >
                            <btn.icon size={14} color={filter === btn.id ? 'white' : '#64748B'} strokeWidth={3} />
                            <Text className={`text-[10px] font-black uppercase tracking-widest ml-2 ${filter === btn.id ? 'text-white' : 'text-slate-400'}`}>
                                {btn.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Calendar Date Strip */}
            <View className="px-4 mb-6">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                    <TouchableOpacity
                        onPress={() => setSelectedDate(null)}
                        className={`px-4 py-3 rounded-2xl mr-2 border-2 items-center ${!selectedDate ? 'bg-primary border-primary' : 'bg-white/5 border-white/5'}`}
                    >
                        <Text className={`text-[10px] font-black uppercase tracking-widest ${!selectedDate ? 'text-white' : 'text-slate-400'}`}>Tout</Text>
                    </TouchableOpacity>
                    {weekDays.map((day, idx) => {
                        const dateStr = day.toDateString();
                        const isSelected = selectedDate === dateStr;
                        const isToday = new Date().toDateString() === dateStr;
                        const count = planning.filter(p => new Date(p.date).toDateString() === dateStr).length;
                        return (
                            <TouchableOpacity
                                key={idx}
                                onPress={() => setSelectedDate(isSelected ? null : dateStr)}
                                className={`w-16 py-3 rounded-2xl mr-2 items-center border-2 ${isSelected ? 'bg-primary border-primary' : isToday ? 'bg-white/10 border-primary/30' : 'bg-white/5 border-white/5'}`}
                            >
                                <Text className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isSelected ? 'text-white' : 'text-slate-500'}`}>
                                    {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                                </Text>
                                <Text className={`text-xl font-black ${isSelected ? 'text-white' : isToday ? 'text-primary' : 'text-white'}`}>
                                    {day.getDate()}
                                </Text>
                                {count > 0 && (
                                    <View className={`w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-primary'}`} />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator color="#C8842A" size="large" />
                </View>
            ) : (
                <FlatList
                    data={filteredData}
                    renderItem={({ item, index }) => <PlanningItemCard item={item} index={index} />}
                    keyExtractor={item => `${item.type}-${item.id}`}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C8842A" />}
                    ListEmptyComponent={
                        <View className="items-center justify-center py-32">
                            <View className="w-24 h-24 bg-white/5 rounded-[35px] items-center justify-center mb-6 border border-white/10">
                                <Calendar size={40} color="#1e293b" />
                            </View>
                            <Text className="text-white font-black text-xl mb-2">Rien au programme</Text>
                            <Text className="text-slate-500 text-center text-xs font-medium px-12 leading-5">
                                Aucun événement planifié ne correspond à vos filtres.
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({});
