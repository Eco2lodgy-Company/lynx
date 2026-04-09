import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Plus, UserPlus, Search, Edit2, Trash2, Mail, Phone, Shield, Key, Users } from 'lucide-react-native';
import api from '../../lib/api';
import { PremiumCard } from '../../components/ui/PremiumCard';
import { Input } from '../../components/ui/Input';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

export default function UsersListScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');

    const fetchUsers = async () => {
        try {
            const response = await api.get('/users');
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching users:', error);
            Alert.alert('Erreur', 'Impossible de charger la liste des utilisateurs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchUsers();
        setRefreshing(false);
    };

    const handleResetPassword = (userId: string, name: string) => {
        Alert.alert(
            'Réinitialisation',
            `Voulez-vous réinitialiser le mot de passe de ${name} par défaut (password123) ?`,
            [
                { text: 'Annuler', style: 'cancel' },
                { 
                    text: 'Réinitialiser', 
                    onPress: async () => {
                        try {
                            await api.put(`/users/${userId}`, { password: 'password123' });
                            Alert.alert('Succès', 'Le mot de passe a été réinitialisé à "password123"');
                        } catch (error) {
                            Alert.alert('Erreur', 'Impossible de réinitialiser le mot de passe');
                        }
                    }
                }
            ]
        );
    };

    const handleDelete = (userId: string, name: string) => {
        Alert.alert(
            'Confirmation',
            `Voulez-vous vraiment supprimer ${name} ?`,
            [
                { text: 'Annuler', style: 'cancel' },
                { 
                    text: 'Supprimer', 
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/users/${userId}`);
                            setUsers(prev => prev.filter(u => u.id !== userId));
                        } catch (error) {
                            Alert.alert('Erreur', 'Impossible de supprimer l\'utilisateur');
                        }
                    }
                }
            ]
        );
    };

    const filteredUsers = users.filter(u => 
        u.firstName.toLowerCase().includes(search.toLowerCase()) ||
        u.lastName.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    const UserItem = ({ user, index }: { user: any, index: number }) => (
        <PremiumCard index={index} glass={true} style={{ padding: 16, marginBottom: 12 }}>
            <View className="flex-row justify-between items-start">
                <View className="flex-row items-center flex-1">
                    <View className="w-14 h-14 rounded-2xl bg-secondary/5 items-center justify-center mr-4 border border-secondary/10">
                        <Text className="text-secondary font-black text-xl">
                            {user.firstName[0].toUpperCase()}{user.lastName[0].toUpperCase()}
                        </Text>
                    </View>
                    <View className="flex-1">
                        <Text className="text-secondary font-black text-lg tracking-tight">
                            {user.firstName} {user.lastName}
                        </Text>
                        <View className="flex-row items-center mt-1">
                            <Shield size={10} color="#E67E22" />
                            <Text className="text-primary text-[10px] font-black uppercase tracking-widest ml-1.5">
                                {user.role}
                            </Text>
                        </View>
                    </View>
                </View>
                <View className="flex-row">
                    <TouchableOpacity 
                        onPress={() => handleResetPassword(user.id, `${user.firstName} ${user.lastName}`)}
                        className="bg-bg-soft p-3 rounded-xl border border-border-light mr-2"
                    >
                        <Key size={16} color="#E67E22" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => router.push({ pathname: '/admin/user-form', params: { id: user.id } })}
                        className="bg-bg-soft p-3 rounded-xl border border-border-light mr-2"
                    >
                        <Edit2 size={16} color="#4A3520" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => handleDelete(user.id, `${user.firstName} ${user.lastName}`)}
                        className="bg-red-50 p-3 rounded-xl border border-red-100"
                    >
                        <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </View>

            <View className="mt-4 pt-4 border-t border-secondary/5 flex-row space-x-4">
                <View className="flex-row items-center flex-1">
                    <Mail size={12} color="#A08060" />
                    <Text className="text-secondary/60 text-xs ml-2 font-medium" numberOfLines={1}>{user.email}</Text>
                </View>
                {user.phone && (
                    <View className="flex-row items-center">
                        <Phone size={12} color="#A08060" />
                        <Text className="text-secondary/60 text-xs ml-2 font-medium">{user.phone}</Text>
                    </View>
                )}
            </View>
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
                className="px-6 pb-6 flex-row items-center justify-between" 
                style={{ paddingTop: Math.max(insets.top, 24) }}
            >
                <TouchableOpacity 
                    onPress={() => router.back()} 
                    className="bg-bg-soft w-12 h-12 rounded-2xl items-center justify-center border border-border-light"
                >
                    <ChevronLeft size={24} color="#4A3520" strokeWidth={3} />
                </TouchableOpacity>
                <Text className="text-secondary text-2xl font-black tracking-tight">Utilisateurs</Text>
                <TouchableOpacity 
                    onPress={() => router.push('/admin/user-form')}
                    className="bg-secondary w-12 h-12 rounded-2xl items-center justify-center shadow-lg shadow-secondary/20"
                >
                    <Plus size={24} color="white" strokeWidth={3} />
                </TouchableOpacity>
            </View>

            <View className="px-6 mb-6">
                <Input 
                    placeholder="Rechercher un membre..." 
                    value={search}
                    onChangeText={setSearch}
                    icon={<Search size={20} color="#E67E22" strokeWidth={2.5} />}
                    className="bg-white border-border-light h-14"
                />
            </View>

            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator color="#E67E22" size="large" />
                </View>
            ) : (
                <ScrollView 
                    className="flex-1 px-6" 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E67E22" />}
                >
                    {filteredUsers.length > 0 ? (
                        filteredUsers.map((user, idx) => (
                            <UserItem key={user.id} user={user} index={idx} />
                        ))
                    ) : (
                        <View className="items-center justify-center py-20">
                            <Users size={64} color="#F3F4F6" strokeWidth={1} />
                            <Text className="text-secondary/40 text-lg font-medium mt-4 italic">Aucun utilisateur trouvé</Text>
                        </View>
                    )}
                </ScrollView>
            )}
        </View>
    );
}
