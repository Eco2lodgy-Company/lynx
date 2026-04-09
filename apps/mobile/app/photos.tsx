import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, StyleSheet, Dimensions, RefreshControl, Modal, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Image as ImageIcon, X, Calendar, Plus } from 'lucide-react-native';
import api, { ASSET_BASE_URL, getBlobFromUri } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Photo, Project } from '@lynx/types';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 60) / 2;

const getPhotoUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return `${ASSET_BASE_URL}${url}`;
    return `${ASSET_BASE_URL}/${url}`;
};

export default function PhotoGalleryScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProject, setSelectedProject] = useState<string | null>(null);
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

    const fetchData = async () => {
        try {
            const [photosRes, projectsRes] = await Promise.all([
                api.get('/photos'),
                api.get('/projects')
            ]);
            setPhotos(photosRes.data);
            setProjects(projectsRes.data);
        } catch (error) {
            console.error("Error fetching gallery data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    }, []);

    const filteredPhotos = selectedProject 
        ? photos.filter(p => p.project?.id === selectedProject)
        : photos;

    const canUpload = ['ADMIN', 'CONDUCTEUR', 'CHEF_EQUIPE'].includes(user?.role || '');

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.7,
            });
            
            if (!result.canceled && result.assets[0] && selectedProject) {
                setLoading(true);
                const asset = result.assets[0];
                const formData = new FormData();
                
                if (Platform.OS === 'web') {
                    const blob = await getBlobFromUri(asset.uri);
                    formData.append('file', blob!, `photo_${Date.now()}.webp`);
                } else {
                    formData.append('file', {
                        uri: asset.uri,
                        type: 'image/jpeg',
                        name: `photo_${Date.now()}.jpg`
                    } as any);
                }

                const uploadRes = await api.post('/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                await api.post('/photos', {
                    url: uploadRes.data.url,
                    caption: "Photo ajoutée manuellement",
                    projectId: selectedProject,
                    takenAt: new Date().toISOString()
                });

                fetchData();
            } else if (!selectedProject) {
                Alert.alert("Projet requis", "Veuillez sélectionner un projet spécifique avant d'ajouter une photo.");
            }
        } catch (error) {
            console.error("Error uploading photo:", error);
            Alert.alert("Erreur", "Impossible d'ajouter la photo.");
        } finally {
            setLoading(false);
        }
    };

    const PhotoViewer = () => (
        <Modal visible={!!selectedPhoto} transparent animationType="fade" onRequestClose={() => setSelectedPhoto(null)}>
            <View className="flex-1 bg-black/95 justify-center">
                <TouchableOpacity 
                    onPress={() => setSelectedPhoto(null)}
                    className="absolute top-12 right-6 z-50 w-12 h-12 bg-white/10 rounded-full items-center justify-center border border-white/20"
                >
                    <X color="white" size={24} />
                </TouchableOpacity>
                
                {selectedPhoto && (
                    <Animated.View entering={ZoomIn.duration(400)} className="w-full aspect-square">
                        <Image 
                            source={{ uri: getPhotoUrl(selectedPhoto.url) }}
                            className="w-full h-full"
                            resizeMode="contain"
                        />
                    </Animated.View>
                )}

                <View className="absolute bottom-12 left-6 right-6">
                    <View className="flex-row items-center mb-2">
                        <View className={`px-2 py-0.5 rounded-md mr-3 ${selectedPhoto?.source === 'MESSAGE' ? 'bg-blue-500' : 'bg-primary'}`}>
                            <Text className="text-white text-[8px] font-black uppercase tracking-wider">{selectedPhoto?.source || 'RAPPORT'}</Text>
                        </View>
                        <Text className="text-white text-2xl font-black">{selectedPhoto?.project?.name}</Text>
                    </View>
                    <View className="flex-row items-center mb-4">
                        <Calendar size={14} color="#E67E22" />
                        <Text className="text-white/60 text-xs font-bold ml-2">
                            {new Date(selectedPhoto?.takenAt || selectedPhoto?.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </Text>
                    </View>
                    <Text className="text-white/80 text-sm leading-5 italic">"{selectedPhoto?.caption}"</Text>
                </View>
            </View>
        </Modal>
    );

    return (
        <View className="flex-1 bg-white">
            <LinearGradient colors={['#FFFFFF', '#FDFCFB', '#F8F9FA']} style={StyleSheet.absoluteFill} />
            
            <View className="px-6 pb-6" style={{ paddingTop: Math.max(insets.top, 24) }}>
                <View className="flex-row items-center justify-between mb-8">
                    <TouchableOpacity onPress={() => router.back()} className="bg-bg-soft w-12 h-12 rounded-2xl items-center justify-center border border-border-light">
                        <ChevronLeft size={24} color="#4A3520" strokeWidth={3} />
                    </TouchableOpacity>
                    <View className="flex-row items-center bg-bg-warm px-4 py-2 rounded-2xl border border-secondary/5">
                        <ImageIcon size={18} color="#E67E22" />
                        <Text className="text-secondary text-xs font-black ml-2 uppercase tracking-widest">{filteredPhotos.length}</Text>
                    </View>
                </View>

                <Text className="text-secondary/40 text-[10px] font-black uppercase tracking-[4px] mb-1">Photothèque</Text>
                <Text className="text-secondary text-5xl font-black tracking-tight">Galerie</Text>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-8">
                    <TouchableOpacity 
                        onPress={() => setSelectedProject(null)}
                        className={`px-6 py-3 rounded-2xl mr-3 border ${!selectedProject ? 'bg-secondary border-secondary shadow-lg shadow-secondary/20' : 'bg-bg-soft border-border-light'}`}
                    >
                        <Text className={`text-[10px] font-black uppercase tracking-wider ${!selectedProject ? 'text-white' : 'text-secondary/40'}`}>Tous les projets</Text>
                    </TouchableOpacity>
                    {projects.map(p => (
                        <TouchableOpacity 
                            key={p.id}
                            onPress={() => setSelectedProject(p.id)}
                            className={`px-6 py-3 rounded-2xl mr-3 border ${selectedProject === p.id ? 'bg-secondary border-secondary shadow-lg shadow-secondary/20' : 'bg-bg-soft border-border-light'}`}
                        >
                            <Text className={`text-[10px] font-black uppercase tracking-wider ${selectedProject === p.id ? 'text-white' : 'text-secondary/40'}`}>{p.name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator color="#E67E22" size="large" />
                </View>
            ) : (
                <ScrollView 
                    className="flex-1" 
                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E67E22" />}
                >
                    <View className="flex-row flex-wrap justify-between">
                        {filteredPhotos.map((photo, index) => (
                            <Animated.View 
                                key={photo.id} 
                                entering={FadeInDown.delay(index * 50).duration(600)}
                                className="mb-5"
                                style={{ width: COLUMN_WIDTH }}
                            >
                                <TouchableOpacity 
                                    onPress={() => setSelectedPhoto(photo)}
                                    activeOpacity={0.9}
                                    className="bg-white rounded-[32px] overflow-hidden border border-border-light shadow-sm"
                                    style={{ height: COLUMN_WIDTH }}
                                >
                                    <View className={`absolute top-3 left-3 z-10 px-2 py-0.5 rounded-md ${photo.source === 'MESSAGE' ? 'bg-blue-500/80' : 'bg-primary/80'}`}>
                                        <Text className="text-white text-[7px] font-black uppercase tracking-widest">{photo.source || 'RAPPORT'}</Text>
                                    </View>
                                    <Image 
                                        source={{ uri: getPhotoUrl(photo.url) }}
                                        style={{ width: '100%', height: '100%' }}
                                        resizeMode="cover"
                                    />
                                    <LinearGradient
                                        colors={['transparent', 'rgba(0,0,0,0.6)']}
                                        className="absolute inset-0 justify-end p-4"
                                    >
                                        <Text className="text-white text-[10px] font-black uppercase tracking-wider" numberOfLines={1}>
                                            {photo.project?.name}
                                        </Text>
                                        <Text className="text-white/60 text-[8px] font-bold mt-0.5">
                                            {new Date(photo.takenAt || photo.createdAt).toLocaleDateString('fr-FR')}
                                        </Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </Animated.View>
                        ))}
                    </View>

                    {filteredPhotos.length === 0 && (
                        <View className="items-center justify-center py-20">
                            <ImageIcon size={64} color="#F3F4F6" strokeWidth={1} />
                            <Text className="text-secondary/40 text-lg font-medium mt-4 italic">Aucune photo trouvée</Text>
                        </View>
                    )}
                </ScrollView>
            )}

            {canUpload && (
                <TouchableOpacity
                    onPress={pickImage}
                    className="absolute bottom-8 right-8 w-16 h-16 bg-primary rounded-full items-center justify-center shadow-xl shadow-primary/40 border-4 border-white"
                >
                    <Plus color="white" size={32} strokeWidth={3} />
                </TouchableOpacity>
            )}

            <PhotoViewer />
        </View>
    );
}
