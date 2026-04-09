import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, StyleSheet, Platform, Alert } from 'react-native';
import api from '../../lib/api';
import { 
    MapPin, 
    User, 
    Calendar,
    ChevronRight,
    Search,
    Edit2,
    CheckCircle,
    Plus,
    Trash2,
    X
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { PremiumCard } from '../../components/ui/PremiumCard';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

export default function ProjectsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [refreshing, setRefreshing] = useState(false);
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const { user } = useAuth();

    // Edit logic
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingProject, setEditingProject] = useState<any>(null);
    const [newProgress, setNewProgress] = useState("");
    const [saving, setSaving] = useState(false);

    const fetchProjects = async () => {
        try {
            const response = await api.get('/projects');
            setProjects(response.data);
        } catch (error) {
            console.error("Error fetching projects:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await fetchProjects();
        setRefreshing(false);
    }, []);

    const filteredProjects = projects.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.address?.toLowerCase().includes(search.toLowerCase())
    );

    const handleSaveProgress = async () => {
        if (!editingProject) return;
        setSaving(true);
        try {
            await api.put(`/projects/${editingProject.id}`, {
                progress: parseInt(newProgress)
            });
            setProjects(prev => prev.map(p => 
                p.id === editingProject.id ? { ...p, progress: parseInt(newProgress) } : p
            ));
            setEditModalVisible(false);
        } catch (error) {
            console.error('Error updating progress', error);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (projectId: string, name: string) => {
        Alert.alert(
            'Confirmation',
            `Supprimer définitivement le projet "${name}" ?`,
            [
                { text: 'Annuler', style: 'cancel' },
                { 
                    text: 'Supprimer', 
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/projects/${projectId}`);
                            setProjects(prev => prev.filter(p => p.id !== projectId));
                        } catch (error) {
                            Alert.alert('Erreur', 'Impossible de supprimer le projet');
                        }
                    }
                }
            ]
        );
    };

    const ProjectCard = ({ project, index }: { project: any, index: number }) => (
        <PremiumCard index={index} glass={true} style={{ padding: 18, marginBottom: 18 }}>
            <TouchableOpacity 
                activeOpacity={0.7}
            >
                <View className="flex-row justify-between items-start mb-5">
                    <View className="flex-1 mr-4">
                        <Text className="text-secondary text-2xl font-black mb-2 tracking-tight" numberOfLines={1}>
                            {project.name}
                        </Text>
                        <View className="flex-row items-center bg-secondary/5 self-start px-3 py-1.5 rounded-xl border border-secondary/10">
                            <MapPin size={12} color="#4A3520" />
                            <Text className="text-secondary/60 text-[10px] font-bold ml-1.5 uppercase tracking-wider" numberOfLines={1}>
                                {project.address || 'Localisation non définie'}
                            </Text>
                        </View>
                    </View>
                    <View className={`px-4 py-1.5 transparent rounded-full border-2 ${
                        project.status === 'EN_COURS' ? 'border-primary/40' : 'border-blue-500/40'
                    }`}>
                        <Text className={`text-[10px] font-black tracking-[1.5px] uppercase ${
                            project.status === 'EN_COURS' ? 'text-primary' : 'text-blue-500'
                        }`}>
                            {project.status === 'EN_COURS' ? 'Actif' : project.status}
                        </Text>
                    </View>
                </View>

                <View className="bg-bg-soft rounded-2xl p-4 mb-6 flex-row justify-between items-center border border-border-light">
                    <View className="flex-row items-center">
                        <View className="w-10 h-10 rounded-full bg-secondary/5 items-center justify-center mr-4">
                            <User size={16} color="#4A3520" strokeWidth={2.5} />
                        </View>
                        <View>
                            <Text className="text-secondary/40 text-[9px] font-bold uppercase tracking-wider">Superviseur</Text>
                            <Text className="text-secondary text-sm font-bold leading-tight">
                                {project.supervisor?.firstName} {project.supervisor?.lastName}
                            </Text>
                        </View>
                    </View>
                    <View className="flex-row items-center">
                        <View className="w-10 h-10 rounded-full bg-bg-warm items-center justify-center mr-4">
                            <Calendar size={16} color="#4A3520" />
                        </View>
                        <View>
                            <Text className="text-secondary/40 text-[9px] font-bold uppercase tracking-wider">Début</Text>
                            <Text className="text-secondary/80 text-sm font-bold leading-tight">
                                {new Date(project.startDate).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                            </Text>
                        </View>
                    </View>
                </View>

                <View>
                    <View className="flex-row justify-between items-end mb-4">
                        <View>
                            <Text className="text-secondary/40 text-[10px] font-black uppercase tracking-[3px]">Avancement Chantier</Text>
                            <Text className="text-secondary text-3xl font-black mt-1">{Math.round(project.progress ?? 0)}%</Text>
                        </View>
                        {(user?.role === 'ADMIN' || user?.role === 'CONDUCTEUR') && (
                            <View className="flex-row">
                                <TouchableOpacity
                                    onPress={() => router.push({ pathname: '/admin/project-form', params: { id: project.id } })}
                                    className="bg-bg-soft p-4 rounded-2xl border border-secondary/10 mr-2"
                                >
                                    <Edit2 size={18} color="#4A3520" strokeWidth={2.5} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => handleDelete(project.id, project.name)}
                                    className="bg-red-50 p-4 rounded-2xl border border-red-100"
                                >
                                    <Trash2 size={18} color="#EF4444" strokeWidth={2.5} />
                                </TouchableOpacity>
                            </View>
                        )}
                        {(user?.role === 'ADMIN' || user?.role === 'CONDUCTEUR') && (
                            <TouchableOpacity
                                onPress={() => {
                                    setEditingProject(project);
                                    setNewProgress(String(project.progress ?? 0));
                                    setEditModalVisible(true);
                                }}
                                className="bg-secondary p-4 rounded-2xl shadow-lg shadow-secondary/20 ml-2"
                            >
                                <CheckCircle size={18} color="white" strokeWidth={3} />
                            </TouchableOpacity>
                        )}
                    </View>
                    <View className="w-full h-3.5 bg-bg-soft rounded-full overflow-hidden border border-border-light">
                        <LinearGradient
                            colors={['#4A3520', '#E67E22']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{ height: '100%', width: `${Math.min(100, project.progress ?? 0)}%` }}
                        />
                    </View>

                    {/* Quick Attendance Action */}
                    {(user?.role === 'OUVRIER' || user?.role === 'CHEF_EQUIPE') && project.status === 'EN_COURS' && (
                        <TouchableOpacity
                            onPress={() => router.push({ pathname: '/attendance', params: { projectId: project.id } })}
                            className="mt-6 bg-primary/5 py-4 rounded-2xl flex-row items-center justify-center border border-primary/20"
                            activeOpacity={0.7}
                        >
                            <Calendar size={18} color="#C8842A" strokeWidth={2.5} />
                            <Text className="text-primary font-black ml-3 text-xs uppercase tracking-widest">Pointer ici</Text>
                        </TouchableOpacity>
                    )}
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
            
            <View 
                className="flex-1 px-5"
                style={{ paddingTop: Math.max(insets.top, 24) }}
            >
                <Animated.View entering={FadeInUp.duration(600)} className="mb-10">
                    <Text className="text-secondary/40 text-xs font-bold uppercase tracking-[4px] mb-2">Suivi Temp réel</Text>
                    <Text className="text-secondary text-5xl font-black tracking-tighter">Projets</Text>
                </Animated.View>

                <Animated.View entering={FadeInUp.delay(200)} className="mb-10">
                    <PremiumCard index={-1} glass={true} style={{ padding: 4, borderRadius: 24 }}>
                        <Input 
                            placeholder="Rechercher par nom ou adresse..." 
                            value={search}
                            onChangeText={setSearch}
                            //@ts-ignore
                            placeholderTextColor="#A08060"
                            className="bg-transparent border-0 h-16 text-secondary text-base"
                            icon={<Search size={22} color="#E67E22" strokeWidth={2.5} />}
                        />
                    </PremiumCard>
                </Animated.View>

                {loading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator color="#E67E22" size="large" />
                    </View>
                ) : (
                    <ScrollView 
                        className="flex-1"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 120 }}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E67E22" />}
                    >
                        {filteredProjects.length > 0 ? (
                            filteredProjects.map((project, index) => (
                                <ProjectCard key={project.id} project={project} index={index} />
                            ))
                        ) : (
                            <View className="items-center justify-center py-24">
                                <Search size={64} color="#F3F4F6" strokeWidth={1} />
                                <Text className="text-secondary/40 text-lg font-medium mt-6 italic text-center">Aucun projet trouvé</Text>
                            </View>
                        )}
                    </ScrollView>
                )}

                {/* FAB for creation */}
                {(user?.role === 'ADMIN' || user?.role === 'CONDUCTEUR') && (
                    <TouchableOpacity
                        onPress={() => router.push('/admin/project-form')}
                        activeOpacity={0.9}
                        className="absolute bottom-32 right-6 w-16 h-16 rounded-[24px] bg-secondary items-center justify-center shadow-2xl shadow-secondary/50"
                        style={{ elevation: 8 }}
                    >
                        <Plus size={32} color="white" strokeWidth={3} />
                    </TouchableOpacity>
                )}

                {/* Edit Progress Modal */}
                {editModalVisible && editingProject && (
                    <Animated.View entering={FadeIn} className="absolute inset-0 bg-black/60 justify-center items-center z-50 px-6">
                    <Animated.View 
                        entering={FadeInUp} 
                        className="bg-white rounded-[40px] p-8 border border-border-light w-full shadow-2xl"
                        style={{ 
                            shadowColor: '#000', 
                            shadowOffset: { width: 0, height: 20 }, 
                            shadowOpacity: 0.15, 
                            shadowRadius: 30,
                            elevation: 24
                        }}>
                        <View className="flex-row justify-between items-center mb-8">
                            <View>
                                <Text className="text-secondary text-3xl font-black tracking-tight">Mise à jour</Text>
                                <Text className="text-secondary/50 text-xs font-bold uppercase tracking-[2px] mt-1">{editingProject.name}</Text>
                            </View>
                            <TouchableOpacity 
                                onPress={() => setEditModalVisible(false)} 
                                className="w-12 h-12 bg-bg-soft rounded-full items-center justify-center border border-border-light"
                            >
                                <X size={24} color="#4A3520" />
                            </TouchableOpacity>
                            </View>
                            
                            <View className="mb-10 items-center">
                                <Text className="text-secondary/50 text-[10px] font-black uppercase tracking-[3px] mb-6 text-center">Progression du Chantier</Text>
                                <View className="flex-row items-center justify-center mb-4">
                                    <Input
                                        value={newProgress}
                                        onChangeText={(v) => {
                                            const pulse = v.replace(/[^0-9]/g, '');
                                            if (pulse === '' || (parseInt(pulse) >= 0 && parseInt(pulse) <= 100)) {
                                                setNewProgress(pulse);
                                            }
                                        }}
                                        keyboardType="numeric"
                                        placeholder="0"
                                        maxLength={3}
                                        className="bg-bg-soft h-24 w-40 text-center text-5xl font-black text-primary rounded-3xl border border-border-light"
                                    />
                                    <Text className="text-secondary text-5xl font-black ml-4">%</Text>
                                </View>
                                <Text className="text-secondary/40 text-[10px] font-bold italic">Entrez une valeur entre 0 et 100</Text>
                            </View>

                            <TouchableOpacity
                                onPress={handleSaveProgress}
                                disabled={saving}
                                activeOpacity={0.8}
                                className="overflow-hidden rounded-2xl"
                            >
                                <LinearGradient
                                    colors={['#E67E22', '#D35400']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={{ height: 72, alignItems: 'center', justifyContent: 'center' }}
                                >
                                    {saving ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <View className="flex-row items-center">
                                            <CheckCircle color="white" size={24} strokeWidth={3} className="mr-3" />
                                            <Text className="text-white font-black text-lg uppercase tracking-wider ml-1">Mettre à jour</Text>
                                        </View>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>
                    </Animated.View>
                )}
            </View>
        </View>
    );
}
