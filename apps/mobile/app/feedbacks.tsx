import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, Image, Modal, TouchableOpacity, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import api, { ASSET_BASE_URL } from '../lib/api';
import { Camera, MapPin, Search, X, Maximize2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input } from '../components/ui/Input';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Photo } from '@lynx/types';

export default function FeedbacksScreen() {
    const [refreshing, setRefreshing] = useState(false);
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [lightbox, setLightbox] = useState<Photo | null>(null);
    const insets = useSafeAreaInsets();

    const fetchPhotos = async () => {
        try {
            const response = await api.get('/photos');
            setPhotos(response.data);
        } catch (error) {
            console.error("Error fetching photos:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPhotos();
    }, []);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await fetchPhotos();
        setRefreshing(false);
    }, []);

    const filteredPhotos = photos.filter((p: Photo) => 
        (p.caption?.toLowerCase() || "").includes(search.toLowerCase()) ||
        p.project?.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <View className="flex-1 bg-slate-950">
            <LinearGradient
                colors={['#1e293b', '#0f172a', '#020617']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <View className="px-5 mb-10" style={{ paddingTop: Math.max(insets.top, 24) }}>
                <Text className="text-slate-500 text-[10px] font-black uppercase tracking-[4px] mb-1">Espace Client & Qualité</Text>
                <Text className="text-white text-4xl font-black tracking-tight mb-2">Galerie</Text>
                <Text className="text-slate-400 text-sm font-medium">L'avancement de vos projets en images</Text>
            </View>

            <View className="px-5 mb-10">
                <Input 
                    placeholder="Filtrer par projet ou mot-clé..." 
                    value={search}
                    onChangeText={setSearch}
                    icon={<Search size={22} color="#C8842A" strokeWidth={2.5} />}
                />
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
                    {filteredPhotos.length === 0 ? (
                        <Animated.View entering={FadeIn.delay(300)} className="items-center justify-center py-20">
                            <View className="w-24 h-24 bg-slate-900 rounded-[35px] items-center justify-center mb-6 border border-white/5">
                                <Camera size={48} color="#1e293b" strokeWidth={1.5} />
                            </View>
                            <Text className="text-white font-black text-xl mb-2">Album vide</Text>
                            <Text className="text-slate-500 text-center text-sm font-medium">Les visuels validés apparaîtront automatiquement ici.</Text>
                        </Animated.View>
                    ) : (
                        <View className="flex-row flex-wrap justify-between">
                            {filteredPhotos.map((photo, idx) => (
                                <Animated.View 
                                    key={photo.id}
                                    entering={FadeInDown.delay(idx * 50).springify()}
                                    className="w-[48%] mb-4"
                                >
                                    <TouchableOpacity 
                                        onPress={() => setLightbox(photo)}
                                        className="aspect-[4/5] bg-slate-900 rounded-[28px] overflow-hidden border border-white/5 shadow-2xl"
                                        activeOpacity={0.9}
                                    >
                                        <Image 
                                            source={{ uri: photo.url.startsWith('http') ? photo.url : `${ASSET_BASE_URL}${photo.url}` }} 
                                            className="w-full h-full"
                                            resizeMode="cover"
                                        />
                                        <LinearGradient
                                            colors={['transparent', 'rgba(2, 6, 23, 0.9)']}
                                            className="absolute inset-0 justify-end p-4"
                                        >
                                            <View className="flex-row items-center justify-between">
                                                <View className="flex-1 mr-2">
                                                    <Text className="text-white font-black text-[10px] uppercase tracking-wider" numberOfLines={1}>{photo.project?.name}</Text>
                                                    <Text className="text-primary text-[8px] font-black uppercase tracking-widest mt-0.5">LVL 0{idx +1}</Text>
                                                </View>
                                                <View className="w-6 h-6 bg-white/10 rounded-lg items-center justify-center backdrop-blur-md">
                                                    <Maximize2 size={12} color="#FFF" />
                                                </View>
                                            </View>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </Animated.View>
                            ))}
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Lightbox Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={!!lightbox}
                onRequestClose={() => setLightbox(null)}
            >
                <BlurView intensity={Platform.OS === 'ios' ? 95 : 100} tint="dark" style={StyleSheet.absoluteFill}>
                    <View className="flex-1 justify-center items-center px-6">
                        <TouchableOpacity 
                            className="absolute top-16 right-8 z-50 w-12 h-12 bg-white/10 rounded-2xl items-center justify-center border border-white/10"
                            onPress={() => setLightbox(null)}
                        >
                            <X color="#FFF" size={24} strokeWidth={2.5} />
                        </TouchableOpacity>

                        {lightbox && (
                            <View className="w-full">
                                <Animated.View entering={ZoomIn} className="aspect-[4/5] rounded-[40px] overflow-hidden shadow-2xl border border-white/10">
                                    <Image 
                                        source={{ uri: lightbox.url.startsWith('http') ? lightbox.url : `${ASSET_BASE_URL}${lightbox.url}` }} 
                                        className="w-full h-full"
                                        resizeMode="cover"
                                    />
                                </Animated.View>
                                
                                <Animated.View entering={FadeInDown.delay(200)} className="mt-8 bg-slate-900/50 p-8 rounded-[40px] border border-white/5">
                                    {lightbox.caption && (
                                        <Text className="text-white text-xl font-medium mb-6 leading-8 tracking-tight">{lightbox.caption}</Text>
                                    )}
                                    <View className="flex-row justify-between items-center">
                                        <View>
                                            <View className="flex-row items-center mb-1">
                                                <View className="w-2 h-2 rounded-full bg-primary mr-2" />
                                                <Text className="text-white font-black text-lg tracking-tighter">{lightbox.project?.name}</Text>
                                            </View>
                                            <Text className="text-slate-500 text-[10px] font-black uppercase tracking-[3px] mt-1 ml-4">
                                                {new Date(lightbox.takenAt || lightbox.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </Text>
                                        </View>
                                        <View className="bg-primary/10 px-5 py-3 rounded-2xl border border-primary/20">
                                            <Text className="text-primary text-[10px] font-black uppercase tracking-widest">
                                                {lightbox.source === 'REPORT' ? 'Rapport Pro' : 'Media Client'}
                                            </Text>
                                        </View>
                                    </View>
                                </Animated.View>
                            </View>
                        )}
                    </View>
                </BlurView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({});
