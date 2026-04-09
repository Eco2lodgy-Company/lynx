import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Check, Briefcase, MapPin, Calendar, Euro, User } from 'lucide-react-native';
import api from '../../lib/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import Animated, { FadeInUp } from 'react-native-reanimated';

export default function ProjectFormScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams();
    const isEdit = !!id;

    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);

    const [form, setForm] = useState({
        name: '',
        address: '',
        description: '',
        startDate: new Date().toISOString().split('T')[0],
        estimatedEndDate: '',
        budget: '',
        supervisorId: '',
        clientId: '',
        departmentId: '',
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [usersRes, depsRes, projRes] = await Promise.all([
                    api.get('/users').catch(() => ({ data: [] })),
                    api.get('/departments').catch(() => ({ data: [] })),
                    isEdit ? api.get(`/projects/${id}`).catch(() => ({ data: null })) : Promise.resolve({ data: null })
                ]);

                setUsers(usersRes.data);
                setDepartments(depsRes.data);

                if (isEdit && projRes.data) {
                    const p = projRes.data;
                    setForm({
                        name: p.name || '',
                        address: p.address || '',
                        description: p.description || '',
                        startDate: p.startDate ? new Date(p.startDate).toISOString().split('T')[0] : '',
                        estimatedEndDate: p.estimatedEndDate ? new Date(p.estimatedEndDate).toISOString().split('T')[0] : '',
                        budget: p.budget ? String(p.budget) : '',
                        supervisorId: p.supervisorId || '',
                        clientId: p.clientId || '',
                        departmentId: p.departmentId || '',
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
        if (!form.name || !form.address) {
            Alert.alert('Champs requis', 'Le nom et l\'adresse sont obligatoires.');
            return;
        }

        setSaving(true);
        try {
            if (isEdit) {
                await api.put(`/projects/${id}`, form);
            } else {
                await api.post('/projects', form);
            }
            Alert.alert('Succès', `Projet ${isEdit ? 'mis à jour' : 'créé'} avec succès`);
            router.back();
        } catch (error: any) {
            console.error('Error saving project:', error);
            const msg = error.response?.data?.error || 'Une erreur est survenue';
            Alert.alert('Erreur', msg);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator color="#E67E22" size="large" />
            </View>
        );
    }

    const supervisors = users.filter(u => ['ADMIN', 'CONDUCTEUR'].includes(u.role));
    const clients = users.filter(u => u.role === 'CLIENT');

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
                <Text className="text-secondary text-2xl font-black tracking-tight">{isEdit ? 'Modifier' : 'Nouveau'} Projet</Text>
            </View>

            <ScrollView 
                className="flex-1 px-6 pt-8" 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <Animated.View entering={FadeInUp.duration(600)}>
                    <Input label="Nom du Projet" value={form.name} onChangeText={(t) => setForm(f => ({ ...f, name: t }))} placeholder="Villa Alpha" icon={<Briefcase size={18} color="#A08060" />} />
                    <Input label="Adresse" value={form.address} onChangeText={(t) => setForm(f => ({ ...f, address: t }))} placeholder="123 Rue de la Paix" icon={<MapPin size={18} color="#A08060" />} />
                    
                    <View className="flex-row space-x-4">
                        <View className="flex-1">
                            <Input label="Date Début" value={form.startDate} onChangeText={(t) => setForm(f => ({ ...f, startDate: t }))} placeholder="AAAA-MM-JJ" icon={<Calendar size={18} color="#A08060" />} />
                        </View>
                        <View className="flex-1">
                            <Input label="Fin Estimée" value={form.estimatedEndDate} onChangeText={(t) => setForm(f => ({ ...f, estimatedEndDate: t }))} placeholder="AAAA-MM-JJ" icon={<Calendar size={18} color="#A08060" />} />
                        </View>
                    </View>

                    <Input label="Budget (€)" value={form.budget} onChangeText={(t) => setForm(f => ({ ...f, budget: t }))} placeholder="500 000 €" keyboardType="numeric" icon={<Euro size={18} color="#A08060" />} />

                    <Text className="text-[10px] font-black text-secondary mb-3 ml-1 uppercase tracking-[3px]">Superviseur</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" className="mb-6">
                        <View className="flex-row">
                            {supervisors.map(s => (
                                <TouchableOpacity key={s.id} onPress={() => setForm(f => ({ ...f, supervisorId: s.id }))} className={`px-4 py-3 rounded-xl mr-2 border ${form.supervisorId === s.id ? 'bg-secondary border-secondary' : 'bg-bg-soft border-border-light'}`}>
                                    <Text className={`text-[10px] font-black uppercase ${form.supervisorId === s.id ? 'text-white' : 'text-secondary/60'}`}>{s.firstName} {s.lastName}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    <Text className="text-[10px] font-black text-secondary mb-3 ml-1 uppercase tracking-[3px]">Client</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" className="mb-6">
                        <View className="flex-row">
                            <TouchableOpacity onPress={() => setForm(f => ({ ...f, clientId: '' }))} className={`px-4 py-3 rounded-xl mr-2 border ${form.clientId === '' ? 'bg-secondary border-secondary' : 'bg-bg-soft border-border-light'}`}>
                                <Text className={`text-[10px] font-black uppercase ${form.clientId === '' ? 'text-white' : 'text-secondary/60'}`}>Aucun</Text>
                            </TouchableOpacity>
                            {clients.map(c => (
                                <TouchableOpacity key={c.id} onPress={() => setForm(f => ({ ...f, clientId: c.id }))} className={`px-4 py-3 rounded-xl mr-2 border ${form.clientId === c.id ? 'bg-secondary border-secondary' : 'bg-bg-soft border-border-light'}`}>
                                    <Text className={`text-[10px] font-black uppercase ${form.clientId === c.id ? 'text-white' : 'text-secondary/60'}`}>{c.firstName} {c.lastName}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    <Button loading={saving} onPress={handleSave} className="mb-10 h-16">
                        <View className="flex-row items-center">
                            <Check size={20} color="white" strokeWidth={3} className="mr-2" />
                            <Text className="text-white font-black text-lg uppercase tracking-tight">{isEdit ? 'Enregistrer' : 'Créer le Projet'}</Text>
                        </View>
                    </Button>
                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
