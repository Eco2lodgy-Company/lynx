import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Camera, X, Check, CloudRain, Sun, Cloud, Thermometer } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import api, { ASSET_BASE_URL, getBlobFromUri } from '../../../lib/api';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import Animated, { FadeInUp } from 'react-native-reanimated';

export default function DailyLogFormScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams();
    const isEdit = !!id;

    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [projects, setProjects] = useState<any[]>([]);
    const [photos, setPhotos] = useState<any[]>([]);

    const [form, setForm] = useState({
        projectId: '',
        date: new Date().toISOString().split('T')[0],
        weather: 'ENSOLEILLE',
        temperature: '',
        summary: '',
        workCompleted: '',
        issues: '',
        materialsUsed: '',
        status: 'BROUILLON',
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [projRes, logRes] = await Promise.all([
                    api.get('/projects').catch(() => ({ data: [] })),
                    isEdit ? api.get(`/daily-logs/${id}`).catch(() => ({ data: null })) : Promise.resolve({ data: null })
                ]);
                setProjects(projRes.data);
                if (isEdit && logRes.data) {
                    const l = logRes.data;
                    setForm({
                        projectId: l.projectId,
                        date: new Date(l.date).toISOString().split('T')[0],
                        weather: l.weather || 'ENSOLEILLE',
                        temperature: l.temperature ? String(l.temperature) : '',
                        summary: l.summary || '',
                        workCompleted: l.workCompleted || '',
                        issues: l.issues || '',
                        materialsUsed: l.materials || '',
                        status: l.status,
                    });
                    if (l.photos) setPhotos(l.photos);
                }
            } catch (error) {
                Alert.alert('Erreur', 'Impossible de charger les données');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const pickImage = async () => {
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0].uri) {
            uploadImage(result.assets[0].uri);
        }
    };

    const uploadImage = async (uri: string) => {
        const formData = new FormData();
        const filename = uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename || '');
        const type = match ? `image/${match[1]}` : `image`;

        if (Platform.OS === 'web') {
            const blob = await getBlobFromUri(uri);
            formData.append('file', blob!, filename!);
        } else {
            formData.append('file', { uri, name: filename, type } as any);
        }

        try {
            const res = await api.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            // Link photo to the log if editing, or wait for save
            setPhotos(prev => [...prev, { url: res.data.url, isNew: true }]);
        } catch (error) {
            Alert.alert('Erreur', 'Échec de l\'envoi de la photo');
        }
    };

    const handleSave = async (submit = false) => {
        if (!form.projectId || !form.summary) {
            Alert.alert('Champs requis', 'Veuillez sélectionner un projet et rédiger un résumé.');
            return;
        }

        setSaving(true);
        try {
            const payload = { ...form, status: submit ? 'SOUMIS' : 'BROUILLON' };
            let log;
            if (isEdit) {
                log = (await api.put(`/daily-logs/${id}`, payload)).data;
            } else {
                log = (await api.post('/daily-logs', payload)).data;
            }

            // Save new photos
            const newPhotos = photos.filter(p => p.isNew);
            for (const p of newPhotos) {
                await api.post('/photos', {
                    url: p.url,
                    projectId: log.projectId,
                    dailyLogId: log.id,
                });
            }

            Alert.alert('Succès', `Rapport ${submit ? 'soumis' : 'enregistré'} avec succès`);
            router.back();
        } catch (error) {
            Alert.alert('Erreur', 'Impossible d\'enregistrer le rapport');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <View className="flex-1 items-center justify-center bg-white"><ActivityIndicator color="#E67E22" size="large" /></View>;

    const weatherOptions = [
        { key: 'ENSOLEILLE', icon: Sun, label: 'Ensoleillé' },
        { key: 'NUAGEUX', icon: Cloud, label: 'Nuageux' },
        { key: 'PLUVIEUX', icon: CloudRain, label: 'Pluie' },
    ];

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-white">
            <LinearGradient colors={['#FFFFFF', '#FDFCFB', '#F8F9FA']} style={StyleSheet.absoluteFill} />
            <View className="px-6 pb-4 flex-row items-center border-b border-secondary/5" style={{ paddingTop: Math.max(insets.top, 24) }}>
                <TouchableOpacity onPress={() => router.back()} className="mr-5 bg-bg-soft w-12 h-12 rounded-2xl items-center justify-center border border-border-light">
                    <ChevronLeft size={24} color="#4A3520" strokeWidth={3} />
                </TouchableOpacity>
                <Text className="text-secondary text-2xl font-black tracking-tight">{isEdit ? 'Modifier' : 'Nouveau'} Journal</Text>
            </View>

            <ScrollView 
                className="flex-1 px-6 pt-8" 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={{ paddingBottom: 60 }}
                keyboardShouldPersistTaps="handled"
            >
                <Animated.View entering={FadeInUp.duration(600)}>
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

                    <View className="flex-row space-x-4 mb-2">
                        <View className="flex-1">
                            <Text className="text-[10px] font-black text-secondary mb-3 ml-1 uppercase tracking-[3px]">Météo</Text>
                            <View className="flex-row space-x-2">
                                {weatherOptions.map(w => (
                                    <TouchableOpacity key={w.key} onPress={() => setForm(f => ({ ...f, weather: w.key }))} className={`flex-1 aspect-square rounded-2xl items-center justify-center border ${form.weather === w.key ? 'bg-secondary border-secondary' : 'bg-bg-soft border-border-light'}`}>
                                        <w.icon size={20} color={form.weather === w.key ? 'white' : '#A08060'} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                        <View className="flex-1">
                            <Input label="Température (°C)" value={form.temperature} onChangeText={(t) => setForm(f => ({ ...f, temperature: t }))} placeholder="22" keyboardType="numeric" icon={<Thermometer size={18} color="#A08060" />} />
                        </View>
                    </View>

                    <Input label="Résumé de la journée" value={form.summary} onChangeText={(t) => setForm(f => ({ ...f, summary: t }))} placeholder="Moulage des dalles du 1er étage..." multiline numberOfLines={4} />
                    <Input label="Tâches terminées" value={form.workCompleted} onChangeText={(t) => setForm(f => ({ ...f, workCompleted: t }))} placeholder="Murs porteurs, Électricité gainage..." multiline />
                    <Input label="Problèmes / Incidents" value={form.issues} onChangeText={(t) => setForm(f => ({ ...f, issues: t }))} placeholder="Retard livraison béton (2h)..." multiline />

                    <View className="mb-8">
                        <Text className="text-[10px] font-black text-secondary mb-3 ml-1 uppercase tracking-[3px]">Photos du chantier</Text>
                        <View className="flex-row flex-wrap">
                            {photos.map((p, idx) => (
                                <View key={idx} className="w-[30%] aspect-square mr-[3%] mb-3 rounded-2xl overflow-hidden border border-border-light relative">
                                    <Image source={{ uri: p.url.startsWith('/') ? `${ASSET_BASE_URL}${p.url}` : p.url }} className="w-full h-full" />
                                    <TouchableOpacity onPress={() => setPhotos(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-black/50 w-6 h-6 rounded-full items-center justify-center">
                                        <X size={12} color="white" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                            <TouchableOpacity onPress={pickImage} className="w-[30%] aspect-square bg-bg-soft rounded-2xl items-center justify-center border-2 border-dashed border-secondary/20">
                                <Camera size={24} color="#A08060" />
                                <Text className="text-[8px] font-bold text-secondary/40 mt-1 uppercase">Ajouter</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View className="flex-row space-x-3 mb-10">
                        <TouchableOpacity onPress={() => handleSave(false)} className="flex-1 h-16 bg-bg-soft border border-border-light rounded-2xl items-center justify-center">
                            <Text className="text-secondary font-black uppercase text-sm">Brouillon</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleSave(true)} disabled={saving} className="flex-[2] h-16 bg-secondary rounded-2xl items-center justify-center shadow-lg shadow-secondary/20">
                            {saving ? <ActivityIndicator color="white" /> : (
                                <View className="flex-row items-center">
                                    <Check size={20} color="white" strokeWidth={3} className="mr-2" />
                                    <Text className="text-white font-black uppercase text-lg">Envoyer</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
