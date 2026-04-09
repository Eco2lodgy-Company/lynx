import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, StyleSheet, Platform, Image } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api, { ASSET_BASE_URL } from '../../lib/api';
import { PremiumCard } from '../../components/ui/PremiumCard';
import { 
    Activity, 
    AlertTriangle, 
    CheckCircle2, 
    Briefcase,
    ChevronRight,
    CircleDollarSign,
    Truck,
    ClipboardList,
    Clock,
    CheckSquare,
    Package,
    Image as ImageIcon,
    Calendar,
    LogIn,
    LogOut,
    Users
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInRight, FadeInDown } from 'react-native-reanimated';

export default function DashboardScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState<any>(null);
    const [attendance, setAttendance] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [statsRes, attRes, planRes] = await Promise.all([
                api.get('/stats'),
                api.get('/attendance'),
                api.get('/planning')
            ]);
            setStats(statsRes.data);
            const mine = attRes.data.find((a: any) => a.userId === user?.id);
            setAttendance(mine || null);
            setPlanningPreview(planRes.data.slice(0, 3));
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    const [planningPreview, setPlanningPreview] = useState<any[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    }, []);

    const StatCard = ({ title, value, icon: Icon, color, index }: any) => (
        <PremiumCard 
            index={index} 
            style={{ width: '48%', padding: 16, marginBottom: 16 }}
            glass={true}
        >
            <View className="w-10 h-10 rounded-xl items-center justify-center mb-3" style={{ backgroundColor: color + '10' }}>
                <Icon size={20} color={color} strokeWidth={2.5} />
            </View>
            <Text className="text-secondary/50 text-[10px] font-bold uppercase tracking-wider mb-1">{title}</Text>
            <Text className="text-secondary text-2xl font-black">{loading ? '...' : (value ?? 0)}</Text>
        </PremiumCard>
    );

    const quickActions = [
        {
            label: 'Planning Unifié',
            sub: "Chronologie complète du projet",
            icon: Calendar,
            color: '#C8842A',
            roles: ['CHEF_EQUIPE', 'CONDUCTEUR', 'ADMIN'],
            onPress: () => router.push('/planning'),
        },
        {
            label: 'Journal de Chantier',
            sub: "Rapport d'avancement quotidien",
            icon: ClipboardList,
            color: '#4A3520',
            roles: ['CHEF_EQUIPE', 'CONDUCTEUR', 'ADMIN'],
            onPress: () => router.push('/reports'),
        },
        {
            label: 'Pointage Présence',
            sub: "Check-in Matin / Soir",
            icon: Clock,
            color: '#E67E22',
            roles: ['CHEF_EQUIPE', 'OUVRIER', 'CONDUCTEUR', 'ADMIN'],
            onPress: () => router.push('/attendance'),
        },
        {
            label: 'Mes Tâches',
            sub: "Planning de travail assigné",
            icon: CheckSquare,
            color: '#7A8000',
            roles: ['OUVRIER', 'CHEF_EQUIPE', 'CONDUCTEUR', 'ADMIN'],
            onPress: () => router.push('/tasks'),
        },
        {
            label: 'Signaler Incident',
            sub: "Alerte de sécurité ou technique",
            icon: AlertTriangle,
            color: '#F43F5E',
            roles: ['CHEF_EQUIPE', 'CONDUCTEUR', 'ADMIN'],
            onPress: () => router.push('/incidents'),
        },
        {
            label: 'Logistique & Livraisons',
            sub: 'Suivi des approvisionnements',
            icon: Truck,
            color: '#2563EB',
            roles: ['CHEF_EQUIPE', 'CONDUCTEUR', 'ADMIN'],
            onPress: () => router.push('/deliveries'),
        },
        {
            label: 'Galerie Photos',
            sub: 'Visualisation des chantiers',
            icon: ImageIcon,
            color: '#D946EF',
            roles: ['CLIENT', 'ADMIN', 'CONDUCTEUR', 'CHEF_EQUIPE'],
            onPress: () => router.push('/photos'),
        },
        {
            label: 'Utilisateurs',
            sub: 'Gestion des membres',
            icon: Users,
            color: '#6366F1',
            roles: ['ADMIN', 'CONDUCTEUR'],
            onPress: () => router.push('/admin/users'),
        },
    ];

    const visibleActions = quickActions.filter(a => a.roles.includes(user?.role || ''));

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
                contentContainerStyle={{ 
                    padding: 24, 
                    paddingTop: Math.max(insets.top, 24),
                    paddingBottom: Math.max(insets.bottom, 100)
                }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E67E22" />}
                keyboardShouldPersistTaps="handled"
            >
                <Animated.View entering={FadeInDown.duration(800)} className="mb-8">
                    <Text className="text-secondary/40 text-xs font-bold uppercase tracking-[4px] mb-2">Pilotage Elite — LYNX</Text>
                    <View className="flex-row items-baseline justify-between">
                        <View>
                            <Text className="text-secondary text-4xl font-black tracking-tight">Bonjour,</Text>
                            <Text className="text-primary text-4xl font-black tracking-tight">{user?.name?.split(' ')[0]}</Text>
                        </View>
                        <TouchableOpacity 
                            onPress={() => router.push('/(tabs)/profile')}
                            className="w-14 h-14 bg-secondary/5 rounded-2xl border border-secondary/10 items-center justify-center overflow-hidden"
                        >
                            {user?.image ? (
                                <View className="w-full h-full">
                                    <Image 
                                        source={{ uri: user.image.startsWith('http') ? user.image : `${ASSET_BASE_URL}${user.image}` }} 
                                        className="w-full h-full"
                                        resizeMode="cover"
                                    />
                                </View>
                            ) : (
                                <Text className="text-secondary font-black text-xl">{user?.name?.charAt(0)}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                {/* Next Events Preview */}
                {(user?.role !== 'OUVRIER' && user?.role !== 'CLIENT') && (
                    <Animated.View entering={FadeInDown.delay(200)} className="mb-8">
                        <PremiumCard index={-1} glass={true} style={{ padding: 20 }}>
                            <TouchableOpacity onPress={() => router.push('/planning')}>
                                <View className="flex-row justify-between items-center mb-5">
                                    <View className="flex-row items-center">
                                        <Calendar size={18} color="#C8842A" strokeWidth={2.5} />
                                        <Text className="text-secondary font-black ml-3 text-sm uppercase tracking-widest">À Venir</Text>
                                    </View>
                                    <Text className="text-primary text-[10px] font-black uppercase tracking-widest">Voir Tout</Text>
                                </View>
                                
                                {planningPreview.length > 0 ? (
                                    planningPreview.map((item, idx) => (
                                        <View key={idx} className={`flex-row items-center py-3 ${idx < planningPreview.length - 1 ? 'border-b border-secondary/5' : ''}`}>
                                            <View className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: item.type === 'TASK' ? '#C8842A' : item.type === 'DELIVERY' ? '#3B82F6' : '#10B981' }} />
                                            <View className="flex-1">
                                                <Text className="text-secondary font-bold text-sm" numberOfLines={1}>{item.title}</Text>
                                                <Text className="text-secondary/40 text-[9px] font-bold uppercase mt-0.5">
                                                    {new Date(item.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} • {item.projectName}
                                                </Text>
                                            </View>
                                            <ChevronRight size={14} color="#CBD5E1" />
                                        </View>
                                    ))
                                ) : (
                                    <Text className="text-secondary/30 italic text-xs py-2">Aucun événement planifié</Text>
                                )}
                            </TouchableOpacity>
                        </PremiumCard>
                    </Animated.View>
                )}

                <View className="flex-row flex-wrap justify-between">
                    <StatCard index={0} title="Santé Globale" value={`${Math.round(stats?.avgProgress || 0)}%`} icon={Activity} color="#E67E22" />
                    <StatCard index={1} title="Validations" value={stats?.pendingValidations} icon={CheckCircle2} color="#10B981" />
                    <StatCard index={2} title="Incidents" value={stats?.recentIncidents} icon={AlertTriangle} color="#F43F5E" />
                    <StatCard index={3} title="Missions" value={stats?.counts?.tasks} icon={Briefcase} color="#4A3520" stat={stats} />
                </View>

                {/* Project Health (Admin / Conducteur) */}
                {(user?.role === 'ADMIN' || user?.role === 'CONDUCTEUR') && stats?.projectHealth?.length > 0 && (
                    <View className="mt-4 mb-4">
                        <Text className="text-secondary text-xl font-black mb-6 tracking-tight">Santé des Chantiers</Text>
                        {stats.projectHealth.map((p: any, idx: number) => (
                            <TouchableOpacity 
                                key={idx} 
                                activeOpacity={0.8}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <PremiumCard index={idx + 4} style={{ padding: 16, marginBottom: 12 }} glass={true}>
                                    <View className="flex-row justify-between items-center mb-3">
                                        <View className="flex-1">
                                            <Text className="text-secondary font-black text-base">{p.name || p.id.substring(0, 15)}</Text>
                                            <View className="flex-row items-center mt-1">
                                                <View className={`w-2 h-2 rounded-full mr-2 ${p.incidents > 0 ? 'bg-red-500' : 'bg-green-500'}`} />
                                                <Text className="text-secondary/50 text-[10px] uppercase font-black tracking-widest">
                                                    {p.incidents} Incidents • {p.tasks} Missions
                                                </Text>
                                            </View>
                                        </View>
                                        <Text className="text-secondary text-xl font-black">{Math.round(p.progress)}%</Text>
                                    </View>
                                    <View className="h-1.5 bg-secondary/5 rounded-full overflow-hidden">
                                        <View className="h-full bg-primary rounded-full" style={{ width: `${p.progress}%` }} />
                                    </View>
                                </PremiumCard>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <View className="mt-8 mb-8">
                    <Text className="text-secondary text-xl font-black mb-8 tracking-tight text-center">Espace de Travail</Text>
                    
                    <View className="flex-row flex-wrap justify-between">
                        {visibleActions.map((action, index) => (
                            <TouchableOpacity
                                key={index}
                                onPress={action.onPress}
                                activeOpacity={0.7}
                                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                                className="w-[48%] mb-4"
                            >
                                <PremiumCard
                                    index={index + 8}
                                    style={{ padding: 16, height: 140, justifyContent: 'space-between' }}
                                    glass={true}
                                >
                                    <View className="w-12 h-12 rounded-2xl items-center justify-center" style={{ backgroundColor: action.color + '10' }}>
                                        <action.icon color={action.color} size={24} strokeWidth={2.5} />
                                    </View>
                                    <View>
                                        <Text className="text-secondary font-black text-sm tracking-tight">{action.label}</Text>
                                        <Text className="text-secondary/40 text-[9px] mt-1 font-bold leading-3 uppercase tracking-tighter" numberOfLines={2}>{action.sub}</Text>
                                    </View>
                                </PremiumCard>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Attendance Quick Action (Ouvrier/Chef) */}
                {(user?.role === 'OUVRIER' || user?.role === 'CHEF_EQUIPE') && (
                    <TouchableOpacity
                        onPress={() => router.push('/attendance')}
                        className="mt-4 mb-20"
                    >
                        <LinearGradient
                            colors={['#4A3520', '#63472C']}
                            style={{ padding: 24, borderRadius: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                        >
                            <View>
                                <Text className="text-white/60 text-[10px] font-black uppercase tracking-[3px] mb-1">Pointage Journalier</Text>
                                <Text className="text-white text-2xl font-black tracking-tight">Pointer ma présence</Text>
                            </View>
                            <View className="bg-white/10 w-14 h-14 rounded-full items-center justify-center border border-white/10">
                                <Clock color="#E2A856" size={28} strokeWidth={3} />
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({});
