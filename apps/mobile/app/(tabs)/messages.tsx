import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, StyleSheet, Modal, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import api from '../../lib/api';
import { MessageSquare, ChevronRight, User, Plus, X, Clock, AlertCircle, CheckCircle2, AlertTriangle, ChevronDown } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { PremiumCard } from '../../components/ui/PremiumCard';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Input } from '../../components/ui/Input';

const STATUS_MAP: Record<string, { label: string; color: string; hex: string; icon: any }> = {
    EN_ATTENTE: { label: "En attente", color: "text-amber-500", hex: "#F59E0B", icon: Clock },
    EN_COURS: { label: "En traitement", color: "text-blue-500", hex: "#3B82F6", icon: AlertCircle },
    RESOLU: { label: "Résolu", color: "text-emerald-500", hex: "#10B981", icon: CheckCircle2 },
    FERME: { label: "Fermé", color: "text-slate-400", hex: "#94A3B8", icon: X },
};

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
    BASSE: { label: "Basse", color: "text-slate-400" },
    NORMALE: { label: "Normale", color: "text-blue-500" },
    HAUTE: { label: "Haute", color: "text-amber-500" },
    URGENTE: { label: "Urgente", color: "text-red-500" },
};

export default function MessagesScreen() {
    const [refreshing, setRefreshing] = useState(false);
    const [feedbacks, setFeedbacks] = useState<any[]>([]);
    const [conversations, setConversations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'DEMANDES' | 'DISCUSSIONS'>('DEMANDES');
    
    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    
    // New Feedback Modal State
    const [showNewModal, setShowNewModal] = useState(false);
    const [projects, setProjects] = useState<any[]>([]);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({
        subject: '',
        message: '',
        projectId: '',
        priority: 'NORMALE',
    });

    const isOuvrier = user?.role === 'OUVRIER';
    const canCreate = ['ADMIN', 'CONDUCTEUR'].includes(user?.role || '');

    const fetchFeedbacks = async () => {
        try {
            const response = await api.get('/feedbacks');
            setFeedbacks(response.data);
        } catch (error) {
            console.error("Error fetching feedbacks:", error);
        }
    };

    const fetchConversations = async () => {
        try {
            const response = await api.get('/conversations');
            setConversations(response.data);
        } catch (error) {
            console.error("Error fetching conversations:", error);
        }
    };

    const fetchData = async () => {
        if (isOuvrier) {
            setLoading(false);
            return;
        }
        setLoading(true);
        await Promise.all([fetchFeedbacks(), fetchConversations()]);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Re-fetch the active tab data every time the tab changes (removes stale-data lag)
    useEffect(() => {
        if (isOuvrier) return;
        if (activeTab === 'DEMANDES') fetchFeedbacks();
        else fetchConversations();
    }, [activeTab]);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    }, []);

    const openNewModal = async () => {
        if (activeTab === 'DISCUSSIONS') {
            router.push('/chat/new');
            return;
        }

        setShowNewModal(true);
        try {
            const res = await api.get('/projects');
            setProjects(res.data);
            if (res.data.length > 0) {
                setForm(f => ({ ...f, projectId: res.data[0].id }));
            }
        } catch (e) {
            console.error('Error loading projects:', e);
        }
    };

    const handleCreateFeedback = async () => {
        if (!form.subject.trim() || !form.message.trim() || !form.projectId) {
            Alert.alert('Champs requis', 'Sujet, message et projet sont obligatoires.');
            return;
        }
        setCreating(true);
        try {
            const res = await api.post('/feedbacks', form);
            setShowNewModal(false);
            setForm({ subject: '', message: '', projectId: projects[0]?.id || '', priority: 'NORMALE' });
            await fetchFeedbacks();
            router.push(`/conversation/${res.data.id}`);
        } catch (err: any) {
            Alert.alert('Erreur', err.response?.data?.error || 'Impossible de créer la demande');
        } finally {
            setCreating(false);
        }
    };

    if (isOuvrier) {
        return (
            <View className="flex-1 bg-white items-center justify-center px-10">
                <LinearGradient colors={['#FFFFFF', '#FDFCFB', '#F8F9FA']} style={StyleSheet.absoluteFill} />
                <View className="w-20 h-20 bg-bg-soft rounded-full items-center justify-center mb-6">
                    <X size={40} color="#E67E22" />
                </View>
                <Text className="text-secondary text-xl font-black text-center mb-2 uppercase tracking-tighter">Accès Restreint</Text>
                <Text className="text-secondary/50 text-center font-medium">La messagerie est réservée aux conducteurs et chefs de chantier.</Text>
            </View>
        );
    }

    const FeedbackCard = ({ feedback, index }: { feedback: any, index: number }) => {
        const statusMeta = STATUS_MAP[feedback.status] || STATUS_MAP.EN_ATTENTE;
        const priorityMeta = PRIORITY_MAP[feedback.priority] || PRIORITY_MAP.NORMALE;
        const StatusIcon = statusMeta.icon;

        return (
            <PremiumCard index={index} glass={true} style={{ padding: 16, marginBottom: 16, borderRadius: 28 }}>
                <TouchableOpacity 
                    className="flex-row items-start"
                    activeOpacity={0.7}
                    onPress={() => router.push(`/conversation/${feedback.id}`)}
                >
                    <View className="relative">
                        <View className="w-14 h-14 rounded-[20px] bg-bg-soft items-center justify-center mr-4 border border-border-light overflow-hidden">
                            <MessageSquare size={24} color="#4A3520" strokeWidth={2} />
                        </View>
                    </View>
                    
                    <View className="flex-1">
                        <View className="flex-row justify-between items-start mb-1">
                            <Text className="text-secondary font-black text-[16px] tracking-tight flex-1 mr-2" numberOfLines={1}>
                                {feedback.subject}
                            </Text>
                            <Text className="text-secondary/30 text-[9px] font-black uppercase tracking-[1px] mt-1 shrink-0">
                                {new Date(feedback.createdAt).toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' })}
                            </Text>
                        </View>
                        
                        <Text className="text-secondary/60 text-[13px] font-medium leading-[18px] mb-2" numberOfLines={2}>
                            {feedback.message}
                        </Text>
                        
                        <View className="flex-row items-center flex-wrap gap-2">
                            {feedback.project && (
                                <View className="bg-primary/5 px-3 py-1.5 rounded-xl border border-primary/10">
                                    <Text className="text-primary text-[9px] font-black uppercase tracking-[2px]">
                                        {feedback.project.name}
                                    </Text>
                                </View>
                            )}
                            <View className="flex-row items-center bg-bg-soft px-3 py-1.5 rounded-xl border border-border-light gap-1.5">
                                <StatusIcon size={10} color={statusMeta.hex} />
                                <Text className={`text-[9px] font-black uppercase tracking-[1px] ${statusMeta.color}`}>
                                    {statusMeta.label}
                                </Text>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            </PremiumCard>
        );
    };

    const ConversationCard = ({ conv, index }: { conv: any, index: number }) => {
        const lastMsg = conv.messages?.[0];
        
        const getConvName = () => {
            if (conv.name) return conv.name;
            const others = conv.members?.filter((m: any) => m.userId !== user?.id) || [];
            if (others.length === 0) return "Moi-même";
            if (others.length === 1) return `${others[0].user.firstName} ${others[0].user.lastName}`;
            return others.map((m: any) => m.user.firstName).join(', ');
        };

        return (
            <PremiumCard index={index} glass={true} style={{ padding: 16, marginBottom: 16, borderRadius: 28 }}>
                <TouchableOpacity 
                    className="flex-row items-start"
                    activeOpacity={0.7}
                    onPress={() => router.push(`/chat/${conv.id}`)}
                >
                    <View className="w-14 h-14 rounded-[20px] bg-secondary/10 items-center justify-center mr-4 border border-secondary/10 overflow-hidden">
                        <User size={24} color="#E67E22" strokeWidth={2} />
                    </View>
                    
                    <View className="flex-1">
                        <View className="flex-row justify-between items-start mb-1">
                            <Text className="text-secondary font-black text-[16px] tracking-tight flex-1 mr-2" numberOfLines={1}>
                                {getConvName()}
                            </Text>
                            {lastMsg && (
                                <Text className="text-secondary/30 text-[9px] font-black uppercase tracking-[1px] mt-1 shrink-0">
                                    {new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            )}
                        </View>
                        
                        <Text className="text-secondary/60 text-[13px] font-medium leading-[18px] mb-2" numberOfLines={1}>
                            {lastMsg ? `${lastMsg.authorId === user?.id ? 'Vous : ' : ''}${lastMsg.content || 'Photo'}` : 'Commencez à discuter...'}
                        </Text>
                        
                        {conv.project && (
                            <View className="self-start bg-secondary/5 px-3 py-1.5 rounded-xl border border-secondary/10">
                                <Text className="text-secondary/60 text-[9px] font-black uppercase tracking-[2px]">
                                    {conv.project.name}
                                </Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </PremiumCard>
        );
    };

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
                <Animated.View entering={FadeInUp.duration(600)} className="mb-6 flex-row justify-between items-end">
                    <View>
                        <Text className="text-secondary/40 text-sm font-black uppercase tracking-[5px] mb-2">LYNX Messagerie</Text>
                        <Text className="text-secondary text-4xl font-black tracking-tighter">Messages</Text>
                    </View>
                    {(canCreate || activeTab === 'DEMANDES') && (
                        <TouchableOpacity 
                            onPress={openNewModal}
                            className="w-14 h-14 bg-primary rounded-2xl items-center justify-center shadow-xl shadow-primary/40"
                        >
                            <Plus size={28} color="white" strokeWidth={3} />
                        </TouchableOpacity>
                    )}
                </Animated.View>

                {/* Tabs / Segmented Control */}
                <View className="flex-row bg-bg-soft p-1.5 rounded-2xl mb-8 border border-border-light shadow-sm">
                    <TouchableOpacity 
                        onPress={() => setActiveTab('DEMANDES')}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel="Demandes"
                        accessibilityState={{ selected: activeTab === 'DEMANDES' }}
                        className={`flex-1 py-3.5 rounded-xl items-center justify-center ${activeTab === 'DEMANDES' ? 'bg-white shadow-sm' : ''}`}
                    >
                        <Text className={`text-[10px] font-black uppercase tracking-[2px] ${activeTab === 'DEMANDES' ? 'text-primary' : 'text-secondary/40'}`}>Demandes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => setActiveTab('DISCUSSIONS')}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel="Discussions"
                        accessibilityState={{ selected: activeTab === 'DISCUSSIONS' }}
                        className={`flex-1 py-3.5 rounded-xl items-center justify-center ${activeTab === 'DISCUSSIONS' ? 'bg-white shadow-sm' : ''}`}
                    >
                        <Text className={`text-[10px] font-black uppercase tracking-[2px] ${activeTab === 'DISCUSSIONS' ? 'text-primary' : 'text-secondary/40'}`}>Discussions</Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator color="#E67E22" size="large" />
                    </View>
                ) : (
                    <ScrollView 
                        className="flex-1"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 100 }}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E67E22" />}
                    >
                        {activeTab === 'DEMANDES' ? (
                            feedbacks.length > 0 ? (
                                feedbacks.map((fb, index) => (
                                    <FeedbackCard key={fb.id} feedback={fb} index={index} />
                                ))
                            ) : (
                                <View className="items-center justify-center py-24 bg-bg-soft/50 rounded-[40px] border border-border-light">
                                    <View className="w-24 h-24 bg-white rounded-[35px] items-center justify-center mb-8 shadow-sm">
                                        <MessageSquare size={40} color="#F2F2F2" strokeWidth={1.5} />
                                    </View>
                                    <Text className="text-secondary/30 font-black text-xs uppercase tracking-[4px] text-center px-10">
                                        Aucune demande client
                                    </Text>
                                </View>
                            )
                        ) : (
                            conversations.length > 0 ? (
                                conversations.map((conv, index) => (
                                    <ConversationCard key={conv.id} conv={conv} index={index} />
                                ))
                            ) : (
                                <View className="items-center justify-center py-24 bg-bg-soft/50 rounded-[40px] border border-border-light">
                                    <View className="w-24 h-24 bg-white rounded-[35px] items-center justify-center mb-8 shadow-sm">
                                        <User size={40} color="#F2F2F2" strokeWidth={1.5} />
                                    </View>
                                    <Text className="text-secondary/30 font-black text-xs uppercase tracking-[4px] text-center px-10">
                                        Aucun canal de discussion
                                    </Text>
                                </View>
                            )
                        )}
                    </ScrollView>
                )}
            </View>

            {/* New Feedback Modal */}
            <Modal visible={showNewModal} transparent animationType="fade" onRequestClose={() => setShowNewModal(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
                    <View className="flex-1 bg-black/60 justify-end sm:justify-center items-center px-4 pb-4">
                        <Animated.View entering={FadeInUp.springify()} className="bg-white rounded-[36px] w-full p-6 shadow-2xl max-h-[80%]">
                            <View className="flex-row justify-between items-center mb-6">
                                <View>
                                    <Text className="text-secondary text-2xl font-black tracking-tight">Nouvelle Demande</Text>
                                    <Text className="text-secondary/40 text-[10px] font-black uppercase tracking-widest mt-1">Détaillez votre besoin</Text>
                                </View>
                                <TouchableOpacity onPress={() => setShowNewModal(false)} className="w-12 h-12 bg-bg-soft rounded-full items-center justify-center">
                                    <X size={20} color="#4A3520" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                <Text className="text-[10px] font-black text-secondary mb-2 ml-1 uppercase tracking-[3px]">Projet</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" className="mb-5">
                                    <View className="flex-row pb-2">
                                        {projects.map(p => (
                                            <TouchableOpacity
                                                key={p.id}
                                                onPress={() => setForm(f => ({ ...f, projectId: p.id }))}
                                                className={`px-4 py-3 mr-2 rounded-xl border ${form.projectId === p.id ? 'border-primary bg-primary' : 'border-border-light bg-bg-soft'}`}
                                            >
                                                <Text className={`font-black text-sm ${form.projectId === p.id ? 'text-white' : 'text-secondary'}`}>{p.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>

                                <Input
                                    label="Sujet de la demande"
                                    placeholder="Ex: Modification du plan..."
                                    value={form.subject}
                                    onChangeText={(t) => setForm(f => ({ ...f, subject: t }))}
                                />

                                <Text className="text-[10px] font-black text-secondary mb-2 ml-1 uppercase tracking-[3px] mt-2">Priorité</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" className="mb-5">
                                    <View className="flex-row pb-2">
                                        {Object.entries(PRIORITY_MAP).map(([k, v]) => (
                                            <TouchableOpacity
                                                key={k}
                                                onPress={() => setForm(f => ({ ...f, priority: k }))}
                                                className={`px-4 py-2 mr-2 rounded-xl border ${form.priority === k ? 'border-primary bg-primary/10' : 'border-border-light bg-bg-soft'}`}
                                            >
                                                <Text className={`font-black text-xs ${v.color}`}>{v.label}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>

                                <Text className="text-[10px] font-black text-secondary mb-2 ml-1 uppercase tracking-[3px]">Message détaillé</Text>
                                <View className="bg-bg-soft border border-border-light rounded-2xl mb-8 overflow-hidden min-h-[120px]">
                                    <Input
                                        placeholder="Décrivez votre demande en détail..."
                                        value={form.message}
                                        onChangeText={(t) => setForm(f => ({ ...f, message: t }))}
                                        multiline
                                        numberOfLines={4}
                                        inputClassName="bg-transparent border-0 pt-4"
                                    />
                                </View>

                                <TouchableOpacity
                                    onPress={handleCreateFeedback}
                                    disabled={creating}
                                    className="h-16 rounded-2xl overflow-hidden"
                                >
                                    <LinearGradient
                                        colors={['#E67E22', '#D35400']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        {creating ? <ActivityIndicator color="white" /> : (
                                            <Text className="text-white font-black uppercase tracking-widest">Envoyer la demande</Text>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </ScrollView>
                        </Animated.View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({});
