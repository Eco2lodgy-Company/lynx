import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity, ActivityIndicator, StyleSheet, Platform, Modal, Image } from 'react-native';
import api, { ASSET_BASE_URL } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Clock, CheckCircle2, LogIn, LogOut, ChevronLeft, Users, MapPin, CheckCircle, Briefcase, X } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/ui/Button';
import { LinearGradient } from 'expo-linear-gradient';
import { PremiumCard } from '../components/ui/PremiumCard';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import * as Location from 'expo-location';
import { Attendance, Project } from '@lynx/types';
import { useAttendance, useCheckIn, useCheckOut, useValidateAttendance, useProjects } from '@lynx/api-client';

export default function AttendanceScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    
    const { data: teamAttendance = [], isLoading: fetchingTeam, refetch } = useAttendance();
    const { data: projects = [] } = useProjects();
    const checkInMutation = useCheckIn();
    const checkOutMutation = useCheckOut();
    const validateMutation = useValidateAttendance();

    const [loading, setLoading] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>((params.projectId as string) || null);
    const [showProjectPicker, setShowProjectPicker] = useState(false);

    const todayRecord = teamAttendance.find((a: Attendance) => a.userId === user?.id) || null;

    useEffect(() => {
        if (todayRecord?.projectId && !selectedProjectId) {
            setSelectedProjectId(todayRecord.projectId);
        }
    }, [todayRecord, selectedProjectId]);

    const getLocation = async () => {
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                return null;
            }
            
            // Fix for Android devices where getCurrentPositionAsync hangs indefinitely
            let location: any = await Promise.race([
                Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 4000))
            ]).catch(async () => {
                return await Location.getLastKnownPositionAsync();
            });

            return location?.coords || null;
        } catch (e) {
            console.error("Location error:", e);
            return null;
        }
    };

    const handleCheckIn = async () => {
        if (!selectedProjectId) {
            Alert.alert('Projet requis', 'Veuillez sélectionner un chantier pour pointer votre arrivée.');
            setShowProjectPicker(true);
            return;
        }

        setLoading(true);
        try {
            const coords = await getLocation();
            const now = new Date().toISOString();
            await checkInMutation.mutateAsync({
                date: now,
                checkIn: now,
                projectId: selectedProjectId,
                latitude: coords?.latitude,
                longitude: coords?.longitude,
            });
            Alert.alert('✅ Arrivée enregistrée', `Bienvenue ! Il est ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`);
        } catch (err: any) {
            Alert.alert('Erreur', err.response?.data?.error || 'Impossible d\'enregistrer le check-in');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckOut = async () => {
        setLoading(true);
        try {
            const coords = await getLocation();
            const now = new Date().toISOString();
            await checkOutMutation.mutateAsync({
                date: now,
                checkOut: now,
                latitude: coords?.latitude,
                longitude: coords?.longitude,
            });
            Alert.alert('✅ Départ enregistré', `Bonne fin de journée ! Départ à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`);
        } catch (err: any) {
            Alert.alert('Erreur', err.response?.data?.error || 'Impossible d\'enregistrer le check-out');
        } finally {
            setLoading(false);
        }
    };

    const handleValidate = async (attendanceId: string) => {
        setLoading(true);
        try {
            await validateMutation.mutateAsync([attendanceId]);
            Alert.alert('✅ Validé', 'Le pointage a été validé avec succès.');
        } catch (err: any) {
            Alert.alert('Erreur', err.response?.data?.error || 'Validation échouée');
        } finally {
            setLoading(false);
        }
    };

    const calculateHours = (checkIn: string, checkOut: string) => {
        if (!checkIn || !checkOut) return null;
        const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
        const hours = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        return `${hours}h${mins.toString().padStart(2, '0')}`;
    };

    const formatTime = (isoString: string | null) => {
        if (!isoString) return '--:--';
        return new Date(isoString).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    };

    const workedToday = todayRecord ? calculateHours(todayRecord.checkIn, todayRecord.checkOut) : null;
    const selectedProject = projects.find(p => p.id === selectedProjectId);

    const ProjectPicker = () => (
        <Modal
            visible={showProjectPicker}
            transparent
            animationType="fade"
            onRequestClose={() => setShowProjectPicker(false)}
        >
            <View className="flex-1 bg-black/60 justify-center items-center px-6">
                <Animated.View entering={FadeInUp} className="bg-white rounded-[40px] w-full max-h-[80%] overflow-hidden">
                    <View className="p-8 border-b border-slate-100 flex-row justify-between items-center">
                        <View>
                            <Text className="text-secondary text-2xl font-black tracking-tight">Chantier</Text>
                            <Text className="text-secondary/40 text-[10px] font-black uppercase tracking-widest mt-1">Sélectionnez votre lieu</Text>
                        </View>
                        <TouchableOpacity 
                            onPress={() => setShowProjectPicker(false)}
                            className="w-12 h-12 bg-slate-50 rounded-full items-center justify-center"
                        >
                            <X size={20} color="#4A3520" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView className="p-4">
                        {projects.map((project) => (
                            <TouchableOpacity
                                key={project.id}
                                onPress={() => {
                                    setSelectedProjectId(project.id);
                                    setShowProjectPicker(false);
                                }}
                                className={`p-6 mb-3 rounded-3xl border-2 flex-row items-center justify-between ${selectedProjectId === project.id ? 'border-primary bg-primary/5' : 'border-slate-50 bg-slate-50'}`}
                            >
                                <View className="flex-row items-center flex-1">
                                    <View className={`w-12 h-12 rounded-2xl items-center justify-center mr-4 ${selectedProjectId === project.id ? 'bg-primary/20' : 'bg-white'}`}>
                                        <Briefcase size={20} color={selectedProjectId === project.id ? '#C8842A' : '#4A3520'} />
                                    </View>
                                    <Text className={`font-black text-lg ${selectedProjectId === project.id ? 'text-primary' : 'text-secondary'}`} numberOfLines={1}>
                                        {project.name}
                                    </Text>
                                </View>
                                {selectedProjectId === project.id && <CheckCircle size={20} color="#C8842A" />}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
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
                className="px-6 mb-10 flex-row items-center justify-between" 
                style={{ paddingTop: Math.max(insets.top, 24) }}
            >
                <View className="flex-row items-center">
                    <TouchableOpacity 
                        onPress={() => router.back()} 
                        className="mr-5 bg-bg-soft w-14 h-14 rounded-2xl items-center justify-center border border-border-light shadow-sm"
                    >
                        <ChevronLeft size={28} color="#4A3520" strokeWidth={3} />
                    </TouchableOpacity>
                    <View>
                        <Text className="text-secondary/40 text-[10px] font-black uppercase tracking-[4px] mb-1">Journal Elite</Text>
                        <Text className="text-secondary text-4xl font-black tracking-tight">Pointage</Text>
                    </View>
                </View>
            </View>

            <ScrollView 
                className="flex-1 px-6" 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 150 }}
            >
                <Animated.View entering={FadeInDown.duration(600)} className="mb-12 items-center">
                    <View className="bg-secondary/5 px-6 py-2.5 rounded-2xl border border-secondary/10">
                        <Text className="text-secondary font-black text-xs uppercase tracking-[4px]">{today.toUpperCase()}</Text>
                    </View>
                </Animated.View>

                {/* My Status Card */}
                <PremiumCard index={1} glass={true} style={{ padding: 28, marginBottom: 48 }}>
                    <View className="flex-row justify-between items-center mb-10">
                        <View>
                            <Text className="text-secondary text-2xl font-black tracking-tight">Ma Présence</Text>
                            <TouchableOpacity 
                                onPress={() => !todayRecord?.checkIn && setShowProjectPicker(true)}
                                className="flex-row items-center mt-2"
                                disabled={!!todayRecord?.checkIn}
                            >
                                <Briefcase size={12} color="#C8842A" />
                                <Text className="text-primary text-[11px] font-black uppercase tracking-widest ml-2" numberOfLines={1}>
                                    {selectedProject?.name || todayRecord?.project?.name || 'Sélectionner Chantier'}
                                </Text>
                                {!todayRecord?.checkIn && <Text className="text-primary/40 text-[10px] ml-2">✎</Text>}
                            </TouchableOpacity>
                        </View>
                        <View className={`px-5 py-2 rounded-2xl border-2 ${todayRecord?.status === 'VALIDE' ? 'border-primary/40 bg-primary/5' : todayRecord?.status === 'EN_ATTENTE' ? 'border-orange-400/40 bg-orange-50' : 'border-border-light bg-bg-soft'}`}>
                            <Text className={`text-[11px] font-black tracking-widest uppercase ${todayRecord?.status === 'VALIDE' ? 'text-primary' : todayRecord?.status === 'EN_ATTENTE' ? 'text-orange-600' : 'text-secondary/30'}`}>
                                {todayRecord?.status === 'VALIDE' ? 'VALIDÉ' : todayRecord?.status === 'EN_ATTENTE' ? 'EN ATTENTE' : 'SANS POINTAGE'}
                            </Text>
                        </View>
                    </View>

                    <View className="flex-row justify-between items-center mb-12">
                        <View className="items-center flex-1">
                            <View className="w-24 h-24 rounded-[30px] bg-green-500/5 border-2 border-green-500/10 items-center justify-center mb-5">
                                <LogIn size={36} color="#10B981" strokeWidth={2.5} />
                            </View>
                            <Text className="text-secondary/30 text-[10px] font-black uppercase tracking-wider mb-1">Arrivée</Text>
                            <Text className="text-secondary font-black text-3xl tracking-tighter">{formatTime(todayRecord?.checkIn)}</Text>
                        </View>

                        <View className="items-center justify-center px-6">
                            {workedToday ? (
                                <View className="bg-primary/5 border-2 border-primary/20 px-5 py-3 rounded-2xl">
                                    <Text className="text-primary font-black text-xl tracking-tighter">{workedToday}</Text>
                                    <View className="w-full h-px bg-primary/20 my-1.5" />
                                    <Text className="text-primary/60 text-[9px] font-black text-center uppercase tracking-widest">Durée</Text>
                                </View>
                            ) : (
                                <View className="w-12 h-1 bg-secondary/5 rounded-full" />
                            )}
                        </View>

                        <View className="items-center flex-1">
                            <View className="w-24 h-24 rounded-[30px] bg-red-500/5 border-2 border-red-500/10 items-center justify-center mb-5">
                                <LogOut size={36} color="#F43F5E" strokeWidth={2.5} />
                            </View>
                            <Text className="text-secondary/30 text-[10px] font-black uppercase tracking-wider mb-1">Départ</Text>
                            <Text className="text-secondary font-black text-3xl tracking-tighter">{formatTime(todayRecord?.checkOut)}</Text>
                        </View>
                    </View>

                    <View className="flex-row gap-5">
                        <Button
                            onPress={handleCheckIn}
                            loading={loading}
                            disabled={!!todayRecord?.checkIn}
                            className={`flex-1 h-20 rounded-3xl shadow-none ${todayRecord?.checkIn ? 'bg-bg-soft border border-border-light' : ''}`}
                        >
                            <View className="items-center">
                                <Text className={`font-black uppercase tracking-widest ${todayRecord?.checkIn ? 'text-secondary/40' : 'text-white'}`}>
                                    {todayRecord?.checkIn ? 'Arrivée✓' : "Pointer l'Arrivée"}
                                </Text>
                            </View>
                        </Button>
                        <Button
                            onPress={handleCheckOut}
                            loading={loading}
                            variant={todayRecord?.checkIn && !todayRecord?.checkOut ? 'danger' : 'secondary'}
                            disabled={!todayRecord?.checkIn || !!todayRecord?.checkOut}
                            className={`flex-1 h-20 rounded-3xl shadow-none ${(!todayRecord?.checkIn || todayRecord?.checkOut) ? 'bg-bg-soft border border-border-light' : ''}`}
                        >
                            <View className="items-center">
                                <Text className={`font-black uppercase tracking-widest ${(!todayRecord?.checkIn || todayRecord?.checkOut) ? 'text-secondary/40' : 'text-white'}`}>
                                    {todayRecord?.checkOut ? 'Départ✓' : "Pointer le Départ"}
                                </Text>
                            </View>
                        </Button>
                    </View>
                </PremiumCard>

                {/* Team Attendance */}
                {(user?.role === 'CHEF_EQUIPE' || user?.role === 'CONDUCTEUR' || user?.role === 'ADMIN') && (
                    <View className="mt-4">
                        <View className="flex-row items-center mb-10 px-2">
                            <View className="w-10 h-10 rounded-xl bg-secondary/5 items-center justify-center mr-4">
                                <Users size={20} color="#4A3520" strokeWidth={2.5} />
                            </View>
                            <Text className="text-secondary text-2xl font-black tracking-tight">Équipe Opérationnelle</Text>
                        </View>
                        
                        {fetchingTeam ? (
                            <ActivityIndicator color="#E67E22" size="large" />
                        ) : teamAttendance.length === 0 ? (
                            <PremiumCard index={0} style={{ padding: 60, alignItems: 'center' }}>
                                <Users size={64} color="#F3F4F6" strokeWidth={1} />
                                <Text className="text-secondary/30 italic mt-6 text-center font-bold">Aucun membre n'a pointé ce jour.</Text>
                            </PremiumCard>
                        ) : (
                            teamAttendance.map((record: Attendance, idx: number) => (
                                <PremiumCard key={record.id} index={idx} glass={true} style={{ padding: 18, marginBottom: 16 }}>
                                    <View className="flex-row items-center justify-between">
                                        <View className="flex-row items-center flex-1">
                                            <View className="w-14 h-14 rounded-2xl bg-bg-soft items-center justify-center mr-5 border border-border-light overflow-hidden">
                                                {record.user?.avatar ? (
                                                    <Image 
                                                        source={{ uri: record.user.avatar.startsWith('http') ? record.user.avatar : `${ASSET_BASE_URL}${record.user.avatar}` }} 
                                                        className="w-full h-full"
                                                        resizeMode="cover"
                                                    />
                                                ) : (
                                                    <Text className="text-secondary font-black text-xl">{record.user?.firstName?.[0]}</Text>
                                                )}
                                            </View>
                                            <View className="flex-1">
                                                <View className="flex-row items-center">
                                                    <Text className="text-secondary font-black text-[17px] tracking-tight mr-2" numberOfLines={1}>
                                                        {record.user?.firstName} {record.user?.lastName}
                                                    </Text>
                                                    {record.latitude && (
                                                        <MapPin size={12} color="#E67E22" />
                                                    )}
                                                </View>
                                                <View className="flex-row items-center mt-1">
                                                    <Briefcase size={8} color="#C8842A" />
                                                    <Text className="text-primary text-[9px] font-black uppercase tracking-widest ml-1">{record.project?.name || 'Non spécifié'}</Text>
                                                </View>
                                            </View>
                                        </View>
                                        <View className="items-end">
                                            <View className="flex-row items-center bg-white px-4 py-2.5 rounded-2xl border border-border-light shadow-sm">
                                                <Text className="text-green-600 font-black text-xs">↑ {formatTime(record.checkIn)}</Text>
                                                <View className="w-px h-3 bg-border-light mx-3" />
                                                <Text className="text-red-500 font-black text-xs">↓ {formatTime(record.checkOut)}</Text>
                                            </View>
                                            {record.status === 'EN_ATTENTE' && user?.role === 'CHEF_EQUIPE' ? (
                                                <TouchableOpacity 
                                                    onPress={() => handleValidate(record.id)}
                                                    className="bg-primary px-4 py-1.5 rounded-xl self-end mt-2.5 flex-row items-center"
                                                >
                                                    <CheckCircle size={10} color="white" className="mr-2" />
                                                    <Text className="text-white text-[9px] font-black uppercase tracking-[1px]">Valider</Text>
                                                </TouchableOpacity>
                                            ) : record.status === 'VALIDE' ? (
                                                <View className="bg-green-50 px-3 py-1 rounded-xl self-end mt-2.5 flex-row items-center border border-green-100">
                                                    <CheckCircle2 size={10} color="#10B981" className="mr-2" />
                                                    <Text className="text-green-600 text-[9px] font-black uppercase tracking-[1px]">Validé</Text>
                                                </View>
                                            ) : (
                                                calculateHours(record.checkIn, record.checkOut) && (
                                                    <View className="bg-primary/10 px-3 py-1 rounded-xl self-end mt-2.5">
                                                        <Text className="text-primary text-[10px] font-black uppercase tracking-[2px]">{calculateHours(record.checkIn, record.checkOut)}</Text>
                                                    </View>
                                                )
                                            )}
                                        </View>
                                    </View>
                                </PremiumCard>
                            ))
                        )}
                    </View>
                )}
            </ScrollView>
            <ProjectPicker />
        </View>
    );
}

const styles = StyleSheet.create({});
