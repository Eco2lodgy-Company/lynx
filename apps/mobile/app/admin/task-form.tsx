import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Check, CheckSquare, Briefcase, Calendar, List, Flag, Users } from 'lucide-react-native';
import api from '../../lib/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import Animated, { FadeInUp } from 'react-native-reanimated';

export default function TaskFormScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams();
    const isEdit = !!id;

    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [projects, setProjects] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);

    const [form, setForm] = useState({
        title: '',
        description: '',
        projectId: '',
        priority: 'NORMALE',
        dueDate: '',
        assigneeIds: [] as string[],
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [projRes, usersRes, taskRes] = await Promise.all([
                    api.get('/projects').catch(() => ({ data: [] })),
                    api.get('/users').catch(() => ({ data: [] })),
                    isEdit ? api.get(`/tasks/${id}`).catch(() => ({ data: null })) : Promise.resolve({ data: null })
                ]);

                setProjects(projRes.data);
                setUsers(usersRes.data);

                if (isEdit && taskRes.data) {
                    const t = taskRes.data;
                    setForm({
                        title: t.title || '',
                        description: t.description || '',
                        projectId: t.projectId || '',
                        priority: t.priority || 'NORMALE',
                        dueDate: t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : '',
                        assigneeIds: t.assignments?.map((a: any) => a.userId) || [],
                    });
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                Alert.alert('Erreur', 'Impossible de charger les données');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const handleSave = async () => {
        if (!form.title || !form.projectId) {
            Alert.alert('Champs requis', 'Le titre et le projet sont obligatoires.');
            return;
        }

        setSaving(true);
        try {
            if (isEdit) {
                await api.put(`/tasks/${id}`, form);
            } else {
                await api.post('/tasks', form);
            }
            Alert.alert('Succès', `Tâche ${isEdit ? 'mise à jour' : 'ajoutée'} avec succès`);
            router.back();
        } catch (error: any) {
            console.error('Error saving task:', error);
            const msg = error.response?.data?.error || 'Une erreur est survenue';
            Alert.alert('Erreur', msg);
        } finally {
            setSaving(false);
        }
    };

    const toggleAssignee = (userId: string) => {
        setForm(f => ({
            ...f,
            assigneeIds: f.assigneeIds.includes(userId)
                ? f.assigneeIds.filter(id => id !== userId)
                : [...f.assigneeIds, userId]
        }));
    };

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator color="#E67E22" size="large" />
            </View>
        );
    }

    const priorities = ['BASSE', 'NORMALE', 'HAUTE', 'URGENTE'];

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-white"
        >
            <LinearGradient colors={['#FFFFFF', '#FDFCFB', '#F8F9FA']} style={StyleSheet.absoluteFill} />
            
            <View className="px-6 pb-4 flex-row items-center border-b border-secondary/5" style={{ paddingTop: Math.max(insets.top, 24) }}>
                <TouchableOpacity onPress={() => router.back()} className="mr-5 bg-bg-soft w-12 h-12 rounded-2xl items-center justify-center border border-border-light">
                    <ChevronLeft size={24} color="#4A3520" strokeWidth={3} />
                </TouchableOpacity>
                <Text className="text-secondary text-2xl font-black tracking-tight">{isEdit ? 'Modifier' : 'Nouvelle'} Tâche</Text>
            </View>

            <ScrollView 
                className="flex-1 px-6 pt-8" 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <Animated.View entering={FadeInUp.duration(600)}>
                    <Input label="Titre de la tâche" value={form.title} onChangeText={(t) => setForm(f => ({ ...f, title: t }))} placeholder="Monter les échafaudages" icon={<CheckSquare size={18} color="#A08060" />} />
                    <Input label="Description" value={form.description} onChangeText={(t) => setForm(f => ({ ...f, description: t }))} placeholder="Détails de l'intervention..." multiline numberOfLines={3} />
                    
                    <Text className="text-[10px] font-black text-secondary mb-3 ml-1 uppercase tracking-[3px]">Projet</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
                        <View className="flex-row">
                            {projects.map(p => (
                                <TouchableOpacity key={p.id} onPress={() => setForm(f => ({ ...f, projectId: p.id }))} className={`px-4 py-3 rounded-xl mr-2 border ${form.projectId === p.id ? 'bg-secondary border-secondary' : 'bg-bg-soft border-border-light'}`}>
                                    <Text className={`text-[10px] font-black uppercase ${form.projectId === p.id ? 'text-white' : 'text-secondary/60'}`}>{p.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    <View className="flex-row space-x-4">
                        <View className="flex-1">
                            <Input label="Date d'échéance" value={form.dueDate} onChangeText={(t) => setForm(f => ({ ...f, dueDate: t }))} placeholder="AAAA-MM-JJ" icon={<Calendar size={18} color="#A08060" />} />
                        </View>
                    </View>

                    <Text className="text-[10px] font-black text-secondary mb-3 ml-1 uppercase tracking-[3px]">Priorité</Text>
                    <View className="flex-row flex-wrap mb-6">
                        {priorities.map(p => (
                            <TouchableOpacity key={p} onPress={() => setForm(f => ({ ...f, priority: p }))} className={`px-4 py-2.5 rounded-xl mr-2 mb-2 border ${form.priority === p ? 'bg-secondary border-secondary' : 'bg-bg-soft border-border-light'}`}>
                                <Text className={`text-[10px] font-black uppercase tracking-wider ${form.priority === p ? 'text-white' : 'text-secondary/60'}`}>{p}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text className="text-[10px] font-black text-secondary mb-3 ml-1 uppercase tracking-[3px]">Assigner à</Text>
                    <View className="bg-bg-soft border border-border-light rounded-3xl p-4 mb-10">
                        {users.filter(u => ['OUVRIER', 'CHEF_EQUIPE'].includes(u.role)).map(u => (
                            <TouchableOpacity key={u.id} onPress={() => toggleAssignee(u.id)} className="flex-row items-center py-3 border-b border-secondary/5 last:border-0">
                                <View className={`w-5 h-5 rounded-md border-2 mr-4 items-center justify-center ${form.assigneeIds.includes(u.id) ? 'bg-primary border-primary' : 'border-secondary/20'}`}>
                                    {form.assigneeIds.includes(u.id) && <Check size={14} color="white" strokeWidth={4} />}
                                </View>
                                <Text className={`text-sm font-bold ${form.assigneeIds.includes(u.id) ? 'text-secondary' : 'text-secondary/60'}`}>{u.firstName} {u.lastName}</Text>
                                <Text className="ml-auto text-[8px] font-black text-secondary/30 uppercase tracking-widest">{u.role}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Button loading={saving} onPress={handleSave} className="mb-10 h-16">
                        <View className="flex-row items-center">
                            <Check size={20} color="white" strokeWidth={3} className="mr-2" />
                            <Text className="text-white font-black text-lg uppercase tracking-tight">{isEdit ? 'Mettre à jour' : 'Ajouter la Tâche'}</Text>
                        </View>
                    </Button>
                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
