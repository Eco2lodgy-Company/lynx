import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Check, User, Mail, Lock, Phone, Shield, Briefcase } from 'lucide-react-native';
import api from '../../lib/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import Animated, { FadeInUp } from 'react-native-reanimated';

export default function UserFormScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams();
    const isEdit = !!id;

    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [departments, setDepartments] = useState<any[]>([]);

    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phone: '',
        role: 'OUVRIER',
        departmentId: '',
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [depsRes, userRes] = await Promise.all([
                    api.get('/departments').catch(() => ({ data: [] })),
                    isEdit ? api.get(`/users/${id}`).catch(() => ({ data: null })) : Promise.resolve({ data: null })
                ]);

                setDepartments(depsRes.data);
                if (isEdit && userRes.data) {
                    const u = userRes.data;
                    setForm({
                        firstName: u.firstName || '',
                        lastName: u.lastName || '',
                        email: u.email || '',
                        password: '', // Don't preload password
                        phone: u.phone || '',
                        role: u.role || 'OUVRIER',
                        departmentId: u.departmentId || '',
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
        if (!form.firstName || !form.lastName || !form.email || (!isEdit && !form.password)) {
            Alert.alert('Champs requis', 'Veuillez remplir tous les champs obligatoires.');
            return;
        }

        setSaving(true);
        try {
            const payload = { ...form };
            if (isEdit && !payload.password) delete (payload as any).password;
            
            if (isEdit) {
                await api.put(`/users/${id}`, payload);
            } else {
                await api.post('/users', payload);
            }
            
            Alert.alert('Succès', `Utilisateur ${isEdit ? 'mis à jour' : 'créé'} avec succès`);
            navigation.goBack();
        } catch (error: any) {
            console.error('Error saving user:', error);
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

    const roles = ['ADMIN', 'CONDUCTEUR', 'CHEF_EQUIPE', 'OUVRIER', 'CLIENT'];

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-white"
        >
            <LinearGradient
                colors={['#FFFFFF', '#FDFCFB', '#F8F9FA']}
                style={StyleSheet.absoluteFill}
            />
            
            <View 
                className="px-6 pb-4 flex-row items-center border-b border-secondary/5" 
                style={{ paddingTop: Math.max(insets.top, 24) }}
            >
                <TouchableOpacity 
                    onPress={() => navigation.goBack()} 
                    className="mr-5 bg-bg-soft w-12 h-12 rounded-2xl items-center justify-center border border-border-light"
                >
                    <ChevronLeft size={24} color="#4A3520" strokeWidth={3} />
                </TouchableOpacity>
                <Text className="text-secondary text-2xl font-black tracking-tight">
                    {isEdit ? 'Modifier' : 'Nouvel'} Membre
                </Text>
            </View>

            <ScrollView 
                className="flex-1 px-6 pt-8" 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <Animated.View entering={FadeInUp.duration(600)}>
                    <View className="flex-row space-x-4">
                        <View className="flex-1">
                            <Input
                                label="Prénom"
                                value={form.firstName}
                                onChangeText={(t) => setForm(f => ({ ...f, firstName: t }))}
                                placeholder="Jean"
                            />
                        </View>
                        <View className="flex-1">
                            <Input
                                label="Nom"
                                value={form.lastName}
                                onChangeText={(t) => setForm(f => ({ ...f, lastName: t }))}
                                placeholder="Dupont"
                            />
                        </View>
                    </View>

                    <Input
                        label="Email"
                        value={form.email}
                        onChangeText={(t) => setForm(f => ({ ...f, email: t }))}
                        placeholder="jean.dupont@exemple.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        icon={<Mail size={18} color="#A08060" />}
                    />

                    <Input
                        label={isEdit ? "Nouveau Mot de passe (optionnel)" : "Mot de passe"}
                        value={form.password}
                        onChangeText={(t) => setForm(f => ({ ...f, password: t }))}
                        placeholder="••••••••"
                        secureTextEntry
                        icon={<Lock size={18} color="#A08060" />}
                    />

                    <Input
                        label="Téléphone"
                        value={form.phone}
                        onChangeText={(t) => setForm(f => ({ ...f, phone: t }))}
                        placeholder="+33 6 00 00 00 00"
                        keyboardType="phone-pad"
                        icon={<Phone size={18} color="#A08060" />}
                    />

                    <Text className="text-[10px] font-black text-secondary mb-3 ml-1 uppercase tracking-[3px]">Rôle</Text>
                    <View className="flex-row flex-wrap mb-6">
                        {roles.map((r) => (
                            <TouchableOpacity
                                key={r}
                                onPress={() => setForm(f => ({ ...f, role: r }))}
                                className={`px-4 py-2.5 rounded-xl mr-2 mb-2 border ${
                                    form.role === r ? 'bg-secondary border-secondary' : 'bg-bg-soft border-border-light'
                                }`}
                            >
                                <Text className={`text-[10px] font-black uppercase tracking-wider ${
                                    form.role === r ? 'text-white' : 'text-secondary/60'
                                }`}>
                                    {r}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text className="text-[10px] font-black text-secondary mb-3 ml-1 uppercase tracking-[3px]">Département</Text>
                    <View className="bg-bg-soft border border-border-light rounded-2xl p-2 mb-10">
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View className="flex-row">
                                <TouchableOpacity
                                    onPress={() => setForm(f => ({ ...f, departmentId: '' }))}
                                    className={`px-5 py-3 rounded-xl mr-2 ${form.departmentId === '' ? 'bg-white shadow-sm' : ''}`}
                                >
                                    <Text className={`text-xs font-bold ${form.departmentId === '' ? 'text-secondary' : 'text-secondary/40'}`}>Aucun</Text>
                                </TouchableOpacity>
                                {departments.map((d) => (
                                    <TouchableOpacity
                                        key={d.id}
                                        onPress={() => setForm(f => ({ ...f, departmentId: d.id }))}
                                        className={`px-5 py-3 rounded-xl mr-2 ${form.departmentId === d.id ? 'bg-white shadow-sm border border-secondary/5' : ''}`}
                                    >
                                        <Text className={`text-xs font-bold ${form.departmentId === d.id ? 'text-secondary' : 'text-secondary/40'}`}>
                                            {d.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </View>

                    <Button
                        loading={saving}
                        onPress={handleSave}
                        className="mb-10 h-16"
                    >
                        <View className="flex-row items-center">
                            <Check size={20} color="white" strokeWidth={3} className="mr-2" />
                            <Text className="text-white font-black text-lg uppercase tracking-tight">
                                {isEdit ? 'Enregistrer les modifications' : 'Créer l\'utilisateur'}
                            </Text>
                        </View>
                    </Button>
                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
