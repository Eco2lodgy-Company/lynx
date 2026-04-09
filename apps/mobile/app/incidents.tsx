import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal, StyleSheet, Platform, Image, Dimensions } from 'react-native';
import api, { ASSET_BASE_URL, getBlobFromUri } from '../lib/api';
import { AlertTriangle, MapPin, Search, ChevronDown, CheckCircle, Clock, ChevronLeft, Plus, Image as ImageIcon, X, Trash2 } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LinearGradient } from 'expo-linear-gradient';
import { PremiumCard } from '../components/ui/PremiumCard';
import Animated, { FadeInDown, FadeIn, SlideInUp, ZoomIn, FadeInUp } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { Incident, Project } from '@lynx/types';
import { useIncidents, useCreateIncident, useUpdateIncidentStatus, useProjects } from '@lynx/api-client';

const { width } = Dimensions.get('window');

const getPhotoUrl = (url?: string | null) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return `${ASSET_BASE_URL}${url}`;
    return `${ASSET_BASE_URL}/${url}`;
};

export default function IncidentsScreen() {
    const { data: incidents = [], isLoading: loading, refetch } = useIncidents();
    const { data: projects = [] } = useProjects();
    const createIncident = useCreateIncident();
    const updateIncidentStatus = useUpdateIncidentStatus();
    
    const [refreshing, setRefreshing] = useState(false);
    const { user } = useAuth();
    const insets = useSafeAreaInsets();

    const [modalVisible, setModalVisible] = useState(false);
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [selectedPhotos, setSelectedPhotos] = useState<any[]>([]);
    const [selectedPhotoViewer, setSelectedPhotoViewer] = useState<string | null>(null);

    // Form states
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [severity, setSeverity] = useState('MOYENNE');
    const [location, setLocation] = useState('');
    const [selectedProject, setSelectedProject] = useState('');

    const severities = ['FAIBLE', 'MOYENNE', 'HAUTE', 'CRITIQUE'];

    useEffect(() => {
        if (projects.length > 0 && !selectedProject) {
            setSelectedProject(projects[0].id);
        }
    }, [projects, selectedProject]);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.7,
        });

        if (!result.canceled) {
            setSelectedPhotos([...selectedPhotos, ...result.assets]);
        }
    };

    const takePhoto = async () => {
        const result = await ImagePicker.launchCameraAsync({
            quality: 0.7,
        });

        if (!result.canceled) {
            setSelectedPhotos([...selectedPhotos, ...result.assets]);
        }
    };

    const removeSelectedPhoto = (index: number) => {
        setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!selectedProject || !title.trim()) {
            Alert.alert("Erreur", "Le projet et le titre sont requis");
            return;
        }

        setLoadingSubmit(true);
        try {
            // 1. Upload photos first
            const uploadedUrls = [];
            for (const photo of selectedPhotos) {
                const filename = photo.uri.split('/').pop() || `incident_${Date.now()}.jpg`;
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : `image/jpeg`;

                const formData = new FormData();
                if (Platform.OS === 'web') {
                    const blob = await getBlobFromUri(photo.uri);
                    formData.append('file', blob!, filename);
                } else {
                    formData.append('file', {
                        uri: photo.uri,
                        type,
                        name: filename
                    } as any);
                }

                const uploadRes = await api.post('/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                uploadedUrls.push(uploadRes.data.url);
            }

            // 2. Create incident
            await createIncident.mutateAsync({
                projectId: selectedProject,
                title: title.trim(),
                description: description.trim(),
                severity,
                location: location.trim(),
                photoUrls: uploadedUrls
            });

            Alert.alert("Succès", "Incident déclaré avec succès.");
            setModalVisible(false);
            // Reset form
            setTitle('');
            setDescription('');
            setSeverity('MOYENNE');
            setLocation('');
            setSelectedPhotos([]);
        } catch (error: any) {
            Alert.alert("Erreur", error.response?.data?.error || "Une erreur est survenue");
        } finally {
            setLoadingSubmit(false);
        }
    };

    const handleResolve = (incidentId: string) => {
        Alert.alert(
            "Marquer comme résolu",
            "Voulez-vous vraiment clore cet incident ? Il sera définitivement archivé.",
            [
                { text: "Annuler", style: "cancel" },
                {
                    text: "Confirmer",
                    onPress: async () => {
                        try {
                            await updateIncidentStatus.mutateAsync({
                                id: incidentId,
                                status: 'FERME'
                            });
                        } catch (error) {
                            Alert.alert('Erreur', 'Impossible de mettre à jour le statut.');
                        }
                    }
                }
            ]
        );
    };

    const getSeverityInfo = (sev: string) => {
        switch (sev) {
            case 'CRITIQUE': return { color: '#F43F5E', bg: 'rgba(244, 63, 94, 0.15)', border: '#F43F5E' };
            case 'HAUTE': return { color: '#F97316', bg: 'rgba(249, 115, 22, 0.15)', border: '#F97316' };
            case 'MOYENNE': return { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)', border: '#F59E0B' };
            case 'FAIBLE': return { color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)', border: '#10B981' };
            default: return { color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.15)', border: '#94A3B8' };
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'RESOLU':
            case 'FERME':
                return <CheckCircle size={14} color="#10B981" />;
            default:
                return <Clock size={14} color="#F59E0B" />;
        }
    };

    const IncidentCard = ({ incident, index }: { incident: Incident, index: number }) => {
        const sevInfo = getSeverityInfo(incident.severity);
        const isResolved = incident.status === 'RESOLU' || incident.status === 'FERME';

        return (
            <PremiumCard index={index} glass={true} style={{ padding: 18, marginBottom: 14 }}>
                <View className="flex-row justify-between items-start mb-4">
                    <View className="flex-1 mr-4">
                        <Text className={`font-black text-lg tracking-tight mb-1 ${isResolved ? 'text-secondary/40 line-through' : 'text-secondary'}`} numberOfLines={2}>
                            {incident.title}
                        </Text>
                        <View className="flex-row items-center">
                            <View className="w-1.5 h-1.5 rounded-full bg-primary/40 mr-2" />
                            <Text className="text-primary text-[10px] font-black uppercase tracking-widest">{incident.project?.name}</Text>
                        </View>
                    </View>
                    <View style={{ backgroundColor: sevInfo.bg, borderColor: sevInfo.border }} className="px-3 py-1 rounded-lg border">
                        <Text style={{ color: sevInfo.color }} className="text-[9px] font-black uppercase tracking-widest">{incident.severity}</Text>
                    </View>
                </View>
                
                {incident.description && (
                    <Text className={`text-sm leading-5 mb-5 font-medium ${isResolved ? 'text-secondary/30' : 'text-secondary/60'}`} numberOfLines={3}>
                        {incident.description}
                    </Text>
                )}

                {incident.photos && incident.photos.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
                        {incident.photos.map((p: any) => (
                            <TouchableOpacity 
                                key={p.id} 
                                className="mr-3 rounded-2xl overflow-hidden"
                                style={{ width: 80, height: 80 }}
                                onPress={() => setSelectedPhotoViewer(p.url)}
                            >
                                <Image 
                                    source={{ uri: getPhotoUrl(p.url) }}
                                    style={{ width: 80, height: 80 }}
                                    resizeMode="cover"
                                />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}

                <View className="flex-row items-center justify-between border-t border-secondary/5 pt-4 mt-1">
                    <View className="flex-row items-center bg-bg-soft px-3 py-1.5 rounded-xl border border-border-light">
                        {getStatusIcon(incident.status)}
                        <Text className={`text-[10px] font-black uppercase tracking-widest ml-2 ${isResolved ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {incident.status}
                        </Text>
                        <View className="w-px h-3 bg-secondary/10 mx-3" />
                        <Text className="text-secondary/40 text-[9px] font-black uppercase tracking-widest">
                            {new Date(incident.date).toLocaleDateString()}
                        </Text>
                    </View>
                    
                    {!isResolved && (user?.role === 'CONDUCTEUR' || user?.role === 'ADMIN') && (
                        <TouchableOpacity 
                            onPress={() => handleResolve(incident.id)} 
                            className="bg-primary/10 border border-primary/30 px-4 py-2 rounded-xl flex-row items-center"
                        >
                            <CheckCircle size={14} color="#C8842A" strokeWidth={2.5} />
                            <Text className="text-primary text-[10px] font-black uppercase tracking-widest ml-2">Clore</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {incident.location && (
                    <View className="flex-row items-center mt-3 bg-bg-soft self-start px-2 py-1 rounded-lg border border-border-light">
                        <MapPin size={10} color="#A08060" />
                        <Text className="text-secondary/50 text-[9px] font-bold ml-1.5 uppercase tracking-tighter">{incident.location}</Text>
                    </View>
                )}
            </PremiumCard>
        );
    };

    const PhotoViewer = () => (
        <Modal visible={!!selectedPhotoViewer} transparent animationType="fade">
            <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill}>
                <TouchableOpacity 
                    className="flex-1 justify-center items-center"
                    onPress={() => setSelectedPhotoViewer(null)}
                >
                    <Animated.View entering={FadeInUp.springify()} className="w-11/12 max-h-[80%] bg-white rounded-[32px] overflow-hidden">
                        <Image 
                            source={{ uri: getPhotoUrl(selectedPhotoViewer) }}
                            className="w-full h-[400px]"
                            resizeMode="contain"
                        />
                    </Animated.View>
                    <TouchableOpacity 
                        onPress={() => setSelectedPhotoViewer(null)}
                        className="absolute top-16 right-6 w-12 h-12 bg-white/10 rounded-full items-center justify-center border border-white/20"
                    >
                        <X color="white" size={24} />
                    </TouchableOpacity>
                </TouchableOpacity>
            </BlurView>
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
            
            <View className="px-5 mb-10 flex-row justify-between items-end" style={{ paddingTop: Math.max(insets.top, 24) }}>
                <View>
                    <Text className="text-secondary/50 text-[10px] font-black uppercase tracking-[4px] mb-1">Rapports de Sécurité</Text>
                    <Text className="text-secondary text-4xl font-black tracking-tight">Incidents</Text>
                </View>
                <TouchableOpacity 
                    onPress={() => setModalVisible(true)}
                    activeOpacity={0.8}
                    className="w-16 h-16 rounded-[22px] items-center justify-center shadow-2xl shadow-red-500/40 bg-red-600"
                >
                    <AlertTriangle color="#FFF" size={32} strokeWidth={2.5} />
                    <View className="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-full items-center justify-center border-2 border-red-600">
                        <Plus size={14} color="#EF4444" strokeWidth={3} />
                    </View>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator color="#C8842A" size="large" />
                </View>
            ) : (
                <ScrollView
                    className="flex-1 px-5"
                    contentContainerStyle={{ paddingBottom: 120 }}
                    refreshControl={
                        <RefreshControl 
                            refreshing={refreshing} 
                            onRefresh={onRefresh} 
                            tintColor="#C8842A" 
                            colors={['#C8842A']} 
                        />
                    }
                    showsVerticalScrollIndicator={false}
                >
                    {incidents.length === 0 ? (
                        <Animated.View entering={FadeIn.delay(300)} className="items-center justify-center py-20">
                            <View className="w-24 h-24 bg-bg-soft rounded-[35px] items-center justify-center mb-6 border border-border-light">
                                <CheckCircle size={48} color="#E0E0E0" strokeWidth={1.5} />
                            </View>
                            <Text className="text-secondary font-black text-xl mb-2">Zone sécurisée</Text>
                            <Text className="text-secondary/50 text-center text-sm font-medium">Aucun incident n'a été signalé. La vigilance reste de mise.</Text>
                        </Animated.View>
                    ) : (
                        incidents.map((incident, idx) => (
                            <IncidentCard key={incident.id} incident={incident} index={idx} />
                        ))
                    )}
                </ScrollView>
            )}

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View className="flex-1 bg-black/50 justify-center items-center">
                    <View className="flex-1 justify-end w-full">
                        <Animated.View entering={SlideInUp.springify()} className="bg-white rounded-t-[40px] p-8 h-[92%] shadow-2xl">
                            <View className="flex-row justify-between items-center mb-10">
                                <View>
                                    <Text className="text-red-500 text-[10px] font-black uppercase tracking-[4px] mb-1">Alerte Immédiate</Text>
                                    <Text className="text-secondary text-2xl font-black tracking-tight">Signalement</Text>
                                </View>
                                <TouchableOpacity 
                                    onPress={() => setModalVisible(false)} 
                                    className="w-12 h-12 bg-bg-soft rounded-2xl items-center justify-center border border-border-light"
                                >
                                    <Text className="text-secondary/50 font-bold text-lg">✕</Text>
                                </TouchableOpacity>
                            </View>

                            <ScrollView 
                                showsVerticalScrollIndicator={false} 
                                contentContainerStyle={{ paddingBottom: 60 }}
                                keyboardShouldPersistTaps="handled"
                            >
                                <View className="mb-8">
                                    <Text className="text-secondary/50 text-[10px] font-black uppercase tracking-[2px] mb-4 ml-1">Projet de Référence</Text>
                                    <View className="flex-row flex-wrap">
                                        {projects.map(p => (
                                            <TouchableOpacity
                                                key={p.id}
                                                onPress={() => setSelectedProject(p.id)}
                                                className={`mr-3 mb-3 px-5 py-3 rounded-2xl border-2 ${selectedProject === p.id ? 'bg-primary/10 border-primary' : 'bg-bg-soft border-border-light'}`}
                                            >
                                                <Text className={`font-bold text-sm ${selectedProject === p.id ? 'text-primary' : 'text-secondary/60'}`}>{p.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                <View className="mb-8">
                                    <Text className="text-secondary/50 text-[10px] font-black uppercase tracking-[2px] mb-4 ml-1">Niveau de Criticité</Text>
                                    <View className="flex-row flex-wrap">
                                        {severities.map(sev => {
                                            const sevInfo = getSeverityInfo(sev);
                                            return (
                                                <TouchableOpacity
                                                    key={sev}
                                                    onPress={() => setSeverity(sev)}
                                                    style={{ 
                                                        backgroundColor: severity === sev ? sevInfo.bg : '#F8F9FA',
                                                        borderColor: severity === sev ? sevInfo.border : '#E5E7EB'
                                                    }}
                                                    className="mr-3 mb-3 px-5 py-3 rounded-2xl border-2"
                                                >
                                                    <Text style={{ color: severity === sev ? sevInfo.color : '#6B7280' }} className="text-xs font-black uppercase tracking-widest">{sev}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>

                                <View className="space-y-6">
                                    <Input
                                        label="Nature de l'incident"
                                        placeholder="Ex: Panne machine, Accident..."
                                        value={title}
                                        onChangeText={setTitle}
                                    />

                                    <Input
                                        label="Localisation précise"
                                        placeholder="Zone, Bâtiment, Étage..."
                                        value={location}
                                        onChangeText={setLocation}
                                    />

                                    <View className="mb-8">
                                        <Text className="text-secondary/50 text-[10px] font-black uppercase tracking-[2px] mb-3 ml-1">Photos à l'appui</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-4">
                                            <TouchableOpacity 
                                                onPress={takePhoto}
                                                className="w-24 h-24 bg-bg-soft rounded-3xl items-center justify-center border-2 border-dashed border-border-light mr-3"
                                            >
                                                <ImageIcon size={24} color="#A08060" />
                                            </TouchableOpacity>
                                            <TouchableOpacity 
                                                onPress={pickImage}
                                                className="w-24 h-24 bg-bg-soft rounded-3xl items-center justify-center border-2 border-dashed border-border-light mr-3"
                                            >
                                                <Plus size={24} color="#A08060" />
                                            </TouchableOpacity>
                                            {selectedPhotos.map((photo, idx) => (
                                                <View key={idx} className="relative mr-3">
                                                    <Image source={{ uri: photo.uri }} className="w-24 h-24 rounded-3xl" />
                                                    <TouchableOpacity 
                                                        onPress={() => removeSelectedPhoto(idx)}
                                                        className="absolute -top-2 -right-2 w-7 h-7 bg-red-600 rounded-full items-center justify-center border-2 border-white"
                                                    >
                                                        <Trash2 size={12} color="white" />
                                                    </TouchableOpacity>
                                                </View>
                                            ))}
                                        </ScrollView>
                                    </View>

                                    <View className="mb-10">
                                        <Text className="text-secondary/50 text-[10px] font-black uppercase tracking-[2px] mb-3 ml-1">Observations</Text>
                                        <TextInput
                                            className="bg-bg-soft border border-border-light text-secondary p-5 rounded-2xl text-base font-medium min-h-[140px]"
                                            placeholder="Détaillez la situation..."
                                            placeholderTextColor="#A08060"
                                            multiline
                                            textAlignVertical="top"
                                            value={description}
                                            onChangeText={setDescription}
                                        />
                                    </View>
                                </View>

                                <Button  
                                    onPress={handleSubmit} 
                                    variant="primary" 
                                    className="w-full h-20 rounded-[28px]"
                                    disabled={loadingSubmit || !title.trim()}
                                >
                                    {loadingSubmit ? <ActivityIndicator color="white" /> : "Transmettre le Rapport"}
                                </Button>
                            </ScrollView>
                        </Animated.View>
                    </View>
                </View>
            </Modal>
            <PhotoViewer />
        </View>
    );
}

const styles = StyleSheet.create({});
