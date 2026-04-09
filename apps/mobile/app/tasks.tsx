import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, Modal, TextInput } from 'react-native';
import api from '../lib/api';
import { CheckSquare, Calendar, MoreVertical, PlayCircle, CheckCircle, Clock, Plus, X, ArrowUpRight, Target } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { PremiumCard } from '../components/ui/PremiumCard';
import Animated, { FadeInDown, FadeIn, FadeOut, SlideInUp } from 'react-native-reanimated';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';
import { Task } from '@lynx/types';

export default function TasksScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const insets = useSafeAreaInsets();

    const [progressModal, setProgressModal] = useState<{ visible: boolean; task: Task | null }>({ visible: false, task: null });
    const [newProgress, setNewProgress] = useState('0');

    const canManageTasks = user?.role === 'ADMIN' || user?.role === 'CONDUCTEUR';

    const fetchTasks = async () => {
        try {
            const response = await api.get('/tasks');
            setTasks(response.data);
        } catch (error) {
            console.error("Error fetching tasks:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await fetchTasks();
        setRefreshing(false);
    }, []);

    const updateTask = async (taskId: string, data: any) => {
        setActionLoading(true);
        try {
            await api.put(`/tasks/${taskId}`, data);
            fetchTasks();
            return true;
        } catch (error: any) {
            console.error('Error updating task:', error);
            Alert.alert('Erreur', error.response?.data?.error || 'Impossible de mettre à jour la tâche.');
            return false;
        } finally {
            setActionLoading(false);
        }
    };

    const handleActionPress = (task: Task) => {
        if (!canManageTasks) return;

        const options = [
            { text: 'Mettre à jour l\'avancement (%)', onPress: () => {
                setNewProgress(task.progress?.toString() || '0');
                setProgressModal({ visible: true, task });
            }}
        ];
        
        if (task.status === 'A_FAIRE') {
            options.push({ text: 'Commencer', onPress: () => updateTask(task.id, { status: 'EN_COURS' }) });
        } else if (task.status === 'EN_COURS') {
            options.push({ text: 'Mettre en pause', onPress: () => updateTask(task.id, { status: 'EN_ATTENTE' }) });
            options.push({ text: 'Terminer (100%)', onPress: () => updateTask(task.id, { status: 'TERMINE', progress: 100 }) });
        } else if (task.status === 'EN_ATTENTE') {
            options.push({ text: 'Reprendre', onPress: () => updateTask(task.id, { status: 'EN_COURS' }) });
        }

        if (task.status !== 'TERMINE') {
            options.push({ text: 'Terminer Immédiatement', onPress: () => updateTask(task.id, { status: 'TERMINE', progress: 100 }) });
        }

        options.push({ text: 'Annuler', onPress: () => {} });

        Alert.alert(
            'Options Supérieur',
            `Gestion de "${task.title}"`,
            options as any
        );
    };

    const handleProgressUpdate = async () => {
        const progress = parseFloat(newProgress);
        if (isNaN(progress) || progress < 0 || progress > 100) {
            Alert.alert('Invalide', 'Veuillez saisir un nombre entre 0 et 100.');
            return;
        }

        const success = await updateTask(progressModal.task.id, { progress });
        if (success) {
            setProgressModal({ visible: false, task: null });
        }
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'TERMINE': return { label: 'Terminé', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)', icon: <CheckCircle size={14} color="#10B981" /> };
            case 'EN_COURS': return { label: 'En cours', color: '#6366F1', bg: 'rgba(99, 102, 241, 0.1)', icon: <PlayCircle size={14} color="#6366F1" /> };
            case 'EN_ATTENTE': return { label: 'En attente', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)', icon: <Clock size={14} color="#F59E0B" /> };
            case 'A_FAIRE': 
            default:
                return { label: 'À faire', color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.1)', icon: <CheckSquare size={14} color="#94A3B8" /> };
        }
    };

    const TaskCard = ({ task, index }: { task: Task, index: number }) => {
        const statusInfo = getStatusInfo(task.status);
        const isCompleted = task.status === 'TERMINE';
        const progress = task.progress || 0;

        return (
            <PremiumCard index={index} glass={true} style={{ padding: 18, marginBottom: 16 }}>
                <View className="flex-row justify-between items-start mb-4">
                    <View className="flex-1 mr-4">
                        <Text className={`font-black text-lg tracking-tight mb-1.5 ${isCompleted ? 'text-secondary/40 line-through' : 'text-secondary'}`}>
                            {task.title}
                        </Text>
                        <View className="flex-row items-center">
                            <Target size={12} color="#C8842A" strokeWidth={3} />
                            <Text className="text-secondary/50 text-[10px] font-black uppercase tracking-widest ml-2">{task.project?.name || 'Projet Général'}</Text>
                        </View>
                    </View>
                    
                    {canManageTasks && (
                        <TouchableOpacity 
                            onPress={() => handleActionPress(task)} 
                            className="w-12 h-12 bg-bg-soft rounded-2xl items-center justify-center border border-border-light"
                            activeOpacity={0.7}
                        >
                            <MoreVertical size={20} color="#C8842A" />
                        </TouchableOpacity>
                    )}
                </View>

                {task.description && (
                    <Text className={`text-sm leading-6 mb-6 font-medium ${isCompleted ? 'text-secondary/30' : 'text-secondary/60'}`} numberOfLines={3}>
                        {task.description}
                    </Text>
                )}

                {/* Progress Bar */}
                <View className="mb-6">
                    <View className="flex-row justify-between items-end mb-2">
                        <Text className="text-secondary/50 text-[10px] font-black uppercase tracking-widest">Progression</Text>
                        <Text className={`text-[12px] font-black ${isCompleted ? 'text-emerald-500' : 'text-secondary'}`}>{Math.round(progress)}%</Text>
                    </View>
                    <View className="h-2 bg-bg-soft rounded-full overflow-hidden border border-border-light">
                        <Animated.View 
                            entering={FadeIn.delay(400)}
                            className={`h-full rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-primary'}`} 
                            style={{ width: `${progress}%` }} 
                        />
                    </View>
                </View>

                <View className="flex-row items-center justify-between pt-5 border-t border-secondary/5">
                    <View style={{ backgroundColor: statusInfo.bg }} className="px-3 py-1.5 rounded-xl flex-row items-center border border-secondary/5">
                        {statusInfo.icon}
                        <Text style={{ color: statusInfo.color }} className="text-[10px] ml-2 font-black uppercase tracking-widest">
                            {statusInfo.label}
                        </Text>
                    </View>
                    
                    {task.dueDate && (
                        <View className="flex-row items-center bg-bg-soft px-3 py-1.5 rounded-xl border border-border-light">
                            <Calendar size={12} color={isCompleted ? '#9CA3AF' : '#A08060'} />
                            <Text className={`text-[10px] ml-2 font-black uppercase tracking-widest ${isCompleted ? 'text-secondary/30' : 'text-secondary/50'}`}>
                                {new Date(task.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </Text>
                        </View>
                    )}
                </View>
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
            
            <View className="px-6 mb-8" style={{ paddingTop: Math.max(insets.top, 24) }}>
                <Text className="text-secondary/50 text-[11px] font-black uppercase tracking-[5px] mb-2">Operations</Text>
                <Text className="text-secondary text-4xl font-black tracking-tight">Missions</Text>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator color="#C8842A" size="large" />
                </View>
            ) : (
                <View className="flex-1">
                    <ScrollView
                        className="flex-1 px-5"
                        contentContainerStyle={{ paddingBottom: 140 }}
                        refreshControl={
                            <RefreshControl 
                                refreshing={refreshing} 
                                onRefresh={onRefresh} 
                                tintColor="#C8842A" 
                            />
                        }
                        showsVerticalScrollIndicator={false}
                    >
                        {tasks.length === 0 ? (
                            <Animated.View entering={FadeIn.delay(300)} className="items-center justify-center py-32">
                                <View className="w-28 h-28 bg-bg-soft rounded-[40px] items-center justify-center mb-8 border border-border-light">
                                    <CheckSquare size={48} color="#E0E0E0" strokeWidth={1} />
                                </View>
                                <Text className="text-secondary font-black text-2xl mb-3">Table rase</Text>
                                <Text className="text-secondary/50 text-center text-sm font-medium px-10 leading-6">
                                    Aucune mission ne vous est assignée pour le moment.
                                </Text>
                            </Animated.View>
                        ) : (
                            tasks.map((task, idx) => (
                                <TaskCard key={task.id} task={task} index={idx} />
                            ))
                        )}
                    </ScrollView>

                    {/* Progress Modal */}
                    <Modal
                        visible={progressModal.visible}
                        transparent
                        animationType="slide"
                        onRequestClose={() => setProgressModal({ visible: false, task: null })}
                    >
                        <View className="flex-1 bg-black/50 justify-center items-center px-6">
                            <TouchableOpacity 
                                className="absolute inset-0"
                                onPress={() => setProgressModal({ visible: false, task: null })}
                            />
                            <Animated.View 
                                entering={SlideInUp}
                                className="bg-white rounded-[40px] p-8 w-full shadow-2xl"
                            >
                                <View className="w-12 h-1.5 bg-secondary/10 rounded-full self-center mb-8" />
                                
                                <View className="flex-row justify-between items-start mb-10">
                                    <View className="flex-1 mr-4">
                                        <Text className="text-primary text-[10px] font-black uppercase tracking-widest mb-1.5">Mise à jour</Text>
                                        <Text className="text-secondary text-2xl font-black tracking-tight" numberOfLines={2}>
                                            {progressModal.task?.title}
                                        </Text>
                                    </View>
                                    <TouchableOpacity 
                                        onPress={() => setProgressModal({ visible: false, task: null })}
                                        className="w-10 h-10 bg-bg-soft rounded-full items-center justify-center border border-border-light"
                                    >
                                        <X size={20} color="#A08060" />
                                    </TouchableOpacity>
                                </View>

                                <View className="mb-10">
                                    <View className="flex-row justify-between items-center mb-4">
                                        <Text className="text-secondary/50 text-xs font-black uppercase tracking-widest">Avancement (%)</Text>
                                        <Text className="text-primary text-2xl font-black">{newProgress}%</Text>
                                    </View>
                                    
                                    <View className="bg-bg-soft rounded-3xl border border-border-light p-6 flex-row items-center justify-between">
                                        <TouchableOpacity 
                                            onPress={() => setNewProgress(Math.max(0, parseInt(newProgress) - 10).toString())}
                                            className="w-14 h-14 bg-white rounded-2xl items-center justify-center border border-border-light"
                                        >
                                            <Text className="text-secondary text-2xl font-bold">-10</Text>
                                        </TouchableOpacity>
                                        
                                        <TextInput
                                            className="text-secondary text-5xl font-black text-center flex-1"
                                            keyboardType="numeric"
                                            value={newProgress}
                                            onChangeText={setNewProgress}
                                            maxLength={3}
                                            selectionColor="#C8842A"
                                        />

                                        <TouchableOpacity 
                                            onPress={() => setNewProgress(Math.min(100, parseInt(newProgress || '0') + 10).toString())}
                                            className="w-14 h-14 bg-white rounded-2xl items-center justify-center border border-border-light"
                                        >
                                            <Text className="text-secondary text-2xl font-bold">+10</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    onPress={handleProgressUpdate}
                                    disabled={actionLoading}
                                    activeOpacity={0.8}
                                >
                                    <LinearGradient
                                        colors={['#C8842A', '#E2A856']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={{ height: 64, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        {actionLoading ? (
                                            <ActivityIndicator color="white" />
                                        ) : (
                                            <>
                                                <ArrowUpRight color="white" size={20} strokeWidth={3} className="mr-3" />
                                                <Text className="text-white font-black text-lg uppercase tracking-tight">Enregistrer l'avancée</Text>
                                            </>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </Animated.View>
                        </View>
                    </Modal>
                </View>
            )}

            {/* FAB for creation */}
            {canManageTasks && (
                <TouchableOpacity
                    onPress={() => router.push('/admin/task-form')}
                    activeOpacity={0.9}
                    className="absolute bottom-24 right-6 w-16 h-16 rounded-[24px] bg-secondary items-center justify-center shadow-2xl shadow-secondary/50"
                    style={{ elevation: 8 }}
                >
                    <Plus size={32} color="white" strokeWidth={3} />
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({});
