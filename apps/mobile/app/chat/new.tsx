import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Check, Users, Briefcase, Search, User as UserIcon, X } from 'lucide-react-native';
import api from '../../lib/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import Animated, { FadeInUp } from 'react-native-reanimated';

export default function NewConversationScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    
    const [search, setSearch] = useState('');
    const [selectedProject, setSelectedProject] = useState<string | null>(null);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [convName, setConvName] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [usersRes, projRes] = await Promise.all([
                    api.get('/users'),
                    api.get('/projects')
                ]);
                
                // STRICT FILTER: No workers allowed in messaging
                setUsers(usersRes.data.filter((u: any) => u.role !== 'OUVRIER' && u.isActive));
                setProjects(projRes.data);
            } catch (error) {
                console.error('Error fetching data:', error);
                Alert.alert('Erreur', 'Impossible de charger les participants');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleCreate = async () => {
        if (selectedUsers.length === 0) {
            Alert.alert('Champs requis', 'Veuillez sélectionner au moins un participant.');
            return;
        }

        setCreating(true);
        try {
            const payload = {
                name: convName.trim() || null,
                projectId: selectedProject,
                participantIds: selectedUsers
            };

            const res = await api.post('/conversations', payload);
            Alert.alert('Succès', 'Discussion créée avec succès');
            router.replace(`/chat/${res.data.id}`);
        } catch (error: any) {
            console.error('Error creating conversation:', error);
            Alert.alert('Erreur', "Impossible de créer la discussion");
        } finally {
            setCreating(false);
        }
    };

    const toggleUser = (userId: string) => {
        setSelectedUsers(prev => 
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const filteredUsers = users.filter(u => 
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator color="#E67E22" size="large" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-white">
            <LinearGradient colors={['#FFFFFF', '#FDFCFB', '#F8F9FA']} style={StyleSheet.absoluteFill} />
            
            <View className="px-6 pb-4 flex-row items-center border-b border-secondary/5" style={{ paddingTop: Math.max(insets.top, 24) }}>
                <TouchableOpacity onPress={() => router.back()} className="mr-5 bg-bg-soft w-12 h-12 rounded-2xl items-center justify-center border border-border-light">
                    <ChevronLeft size={24} color="#4A3520" strokeWidth={3} />
                </TouchableOpacity>
                <Text className="text-secondary text-2xl font-black tracking-tight">Nouvelle Discussion</Text>
            </View>

            <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Animated.View entering={FadeInUp.duration(600)}>
                    {/* Channel Name */}
                    <Input 
                        label="Nom de la discussion (Optionnel)" 
                        value={convName} 
                        onChangeText={setConvName} 
                        placeholder="Ex: Coordination Chantier X" 
                        icon={<Users size={18} color="#A08060" />} 
                    />

                    {/* Project Link */}
                    <Text className="text-[10px] font-black text-secondary mb-3 ml-1 uppercase tracking-[3px]">Associer à un projet (Optionnel)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-8">
                        <View className="flex-row">
                            <TouchableOpacity 
                                onPress={() => setSelectedProject(null)} 
                                className={`px-4 py-3 rounded-xl mr-2 border ${selectedProject === null ? 'bg-secondary border-secondary' : 'bg-bg-soft border-border-light'}`}
                            >
                                <Text className={`text-[10px] font-black uppercase ${selectedProject === null ? 'text-white' : 'text-secondary/60'}`}>Aucun</Text>
                            </TouchableOpacity>
                            {projects.map(p => (
                                <TouchableOpacity 
                                    key={p.id} 
                                    onPress={() => setSelectedProject(p.id)} 
                                    className={`px-4 py-3 rounded-xl mr-2 border ${selectedProject === p.id ? 'bg-secondary border-secondary' : 'bg-bg-soft border-border-light'}`}
                                >
                                    <Text className={`text-[10px] font-black uppercase ${selectedProject === p.id ? 'text-white' : 'text-secondary/60'}`}>{p.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    {/* Member Selection */}
                    <View className="flex-row items-center justify-between mb-3 ml-1">
                        <Text className="text-[10px] font-black text-secondary uppercase tracking-[3px]">Sélectionner les membres</Text>
                        <Text className="text-primary text-[10px] font-black uppercase tracking-[1px]">{selectedUsers.length} sélectionnés</Text>
                    </View>

                    <View className="bg-bg-soft border border-border-light rounded-2xl mb-4 px-4 py-2 flex-row items-center">
                        <Search size={18} color="#A08060" className="mr-3" />
                        <TextInput 
                            className="flex-1 py-2 text-secondary font-bold h-10" 
                            placeholder="Rechercher un membre..." 
                            value={search}
                            onChangeText={setSearch}
                        />
                        {search.length > 0 && (
                            <TouchableOpacity onPress={() => setSearch('')}>
                                <X size={16} color="#A08060" />
                            </TouchableOpacity>
                        )}
                    </View>

                    <View className="mb-10">
                        {filteredUsers.map((u, idx) => {
                            const isSelected = selectedUsers.includes(u.id);
                            return (
                                <TouchableOpacity 
                                    key={u.id} 
                                    onPress={() => toggleUser(u.id)}
                                    className={`flex-row items-center p-4 mb-3 rounded-3xl border ${isSelected ? 'bg-primary/5 border-primary' : 'bg-white border-border-light shadow-sm'}`}
                                >
                                    <View className={`w-12 h-12 rounded-2xl items-center justify-center mr-4 ${isSelected ? 'bg-primary' : 'bg-bg-soft'}`}>
                                        <UserIcon size={20} color={isSelected ? 'white' : '#A08060'} />
                                    </View>
                                    <View className="flex-1">
                                        <Text className={`font-bold text-[15px] ${isSelected ? 'text-primary' : 'text-secondary'}`}>{u.firstName} {u.lastName}</Text>
                                        <Text className="text-secondary/40 text-[10px] font-black uppercase tracking-[1px]">{u.role}</Text>
                                    </View>
                                    <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${isSelected ? 'border-primary bg-primary' : 'border-border-light'}`}>
                                        {isSelected && <Check size={12} color="white" strokeWidth={4} />}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </Animated.View>
            </ScrollView>

            <View className="p-6 border-t border-border-light bg-white/80">
                <Button loading={creating} onPress={handleCreate} className="h-16">
                    <Text className="text-white font-black text-lg uppercase tracking-tight">Créer la Discussion</Text>
                </Button>
            </View>
        </View>
    );
}
