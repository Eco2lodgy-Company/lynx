import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, ScrollView, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Image, StyleSheet
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api, { ASSET_BASE_URL, getBlobFromUri } from '../../lib/api';
import { ChevronLeft, Send, Paperclip, Clock, AlertCircle, CheckCircle2, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Video, ResizeMode } from 'expo-av';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ConversationScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const scrollRef = useRef<ScrollView>(null);

    const [feedback, setFeedback] = useState<any>(null);
    const [replies, setReplies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [attachment, setAttachment] = useState<{uri: string, type: string, name: string} | null>(null);

    const fetchData = async () => {
        try {
            const [fbRes, repRes] = await Promise.all([
                api.get(`/feedbacks/${id}`),
                api.get(`/feedbacks/${id}/replies`)
            ]);
            setFeedback(fbRes.data);
            
            // Build pseudo-reply for the original feedback message
            const originalMessage = {
                id: 'original',
                content: fbRes.data.message,
                createdAt: fbRes.data.createdAt,
                authorId: fbRes.data.author?.id,
                author: fbRes.data.author ? {
                    firstName: fbRes.data.author.firstName,
                    lastName: fbRes.data.author.lastName,
                    role: fbRes.data.author.role
                } : { firstName: 'Client', lastName: '', role: 'CLIENT' },
                isOriginal: true
            };
            
            setReplies([originalMessage, ...repRes.data]);
        } catch (err) {
            console.error('Error loading feedback discussion:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, [id]);

    useEffect(() => {
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
    }, [replies.length]);

    const sendMessage = async () => {
        if (!text.trim() && !attachment) return;
        setSending(true);
        const messageText = text.trim();
        const currentAttachment = attachment;
        
        setText('');
        setAttachment(null);

        // Optimistic update
        const optimisticMsg = {
            id: `temp-${Date.now()}`,
            authorId: user?.id,
            author: { firstName: user?.name?.split(' ')[0] || '', lastName: '', role: user?.role },
            content: messageText,
            imageUrl: currentAttachment ? currentAttachment.uri : null, // local uri just for preview
            createdAt: new Date().toISOString(),
            _optimistic: true,
        };
        setReplies(prev => [...prev, optimisticMsg]);

        try {
            const formData = new FormData();
            formData.append('content', messageText);
            
            if (currentAttachment) {
                if (Platform.OS === 'web') {
                    const blob = await getBlobFromUri(currentAttachment.uri);
                    formData.append('photo', blob!, currentAttachment.name);
                } else {
                    formData.append('photo', {
                        uri: currentAttachment.uri,
                        type: currentAttachment.type,
                        name: currentAttachment.name
                    } as any);
                }
            }

            // Must use multipart/form-data for the web backend's feedback replies
            await api.post(`/feedbacks/${id}/replies`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            setAttachment(null);
            fetchData();
            
            // Auto update status if pending
            if (feedback?.status === 'EN_ATTENTE' && user?.role !== 'CLIENT') {
                api.put(`/feedbacks/${id}`, { status: 'EN_COURS' }).catch(console.error);
            }
            
        } catch (err: any) {
            console.error('Send error:', err);
            Alert.alert('Erreur', "Impossible d'envoyer la réponse");
            setText(messageText);
            setAttachment(currentAttachment);
            setReplies(prev => prev.filter(m => !(m as any)._optimistic));
        } finally {
            setSending(false);
        }
    };

    const pickMedia = async (useCamera: boolean) => {
        try {
            const { status } = useCamera 
                ? await ImagePicker.requestCameraPermissionsAsync()
                : await ImagePicker.requestMediaLibraryPermissionsAsync();
            
            if (status !== 'granted') {
                Alert.alert('Permission requise', 'Accès caméra/galerie nécessaire.');
                return;
            }

            const result = useCamera 
                ? await ImagePicker.launchCameraAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.All,
                    allowsEditing: true,
                    quality: 0.5,
                  })
                : await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.All,
                    allowsEditing: true,
                    quality: 0.5,
                  });

            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                const uri = asset.uri;
                const isVideo = asset.type === 'video';
                const type = isVideo ? 'video/mp4' : 'image/jpeg';
                // Always append extension
                const ext = isVideo ? '.mp4' : '.jpg';
                const baseName = uri.split('/').pop() || `media-${Date.now()}`;
                const name = baseName.includes('.') ? baseName : `${baseName}${ext}`;
                setAttachment({ uri, type, name });
            }
        } catch (error) {
            console.error('Error picking media:', error);
        }
    };

    const handleAttachPhoto = () => {
        Alert.alert(
            'Joindre un média',
            'Sélecteur de fichiers LYNX',
            [
                { text: 'Appareil Photo / Caméra', onPress: () => pickMedia(true) },
                { text: 'Bibliothèque', onPress: () => pickMedia(false) },
                { text: 'Annuler', style: 'cancel' },
            ]
        );
    };

    const formatTime = (iso: string) =>
        new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
        if (d.toDateString() === yesterday.toDateString()) return 'Hier';
        return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
    };

    const groupedReplies: { date: string; items: any[] }[] = [];
    let lastDate = '';
    for (const msg of replies) {
        const date = formatDate(msg.createdAt);
        if (date !== lastDate) {
            groupedReplies.push({ date, items: [] });
            lastDate = date;
        }
        groupedReplies[groupedReplies.length - 1].items.push(msg);
    }

    const STATUS_MAP: Record<string, { label: string; color: string; hex: string; icon: any }> = {
        EN_ATTENTE: { label: "En attente", color: "text-amber-500", hex: "#F59E0B", icon: Clock },
        EN_COURS: { label: "En traitement", color: "text-blue-500", hex: "#3B82F6", icon: AlertCircle },
        RESOLU: { label: "Résolu", color: "text-emerald-500", hex: "#10B981", icon: CheckCircle2 },
        FERME: { label: "Fermé", color: "text-slate-400", hex: "#94A3B8", icon: X },
    };

    const statusMeta = feedback ? (STATUS_MAP[feedback.status] || STATUS_MAP.EN_ATTENTE) : STATUS_MAP.EN_ATTENTE;
    const StatusIcon = statusMeta.icon;

    return (
        <KeyboardAvoidingView
            className="flex-1 bg-white"
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
        >
            <LinearGradient
                colors={['#FFFFFF', '#FDFCFB', '#F8F9FA']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Header */}
            <BlurView intensity={Platform.OS === 'ios' ? 90 : 100} tint="light" style={{ paddingTop: insets.top }}>
                <View className="flex-row items-center px-5 py-5 border-b border-border-light/50">
                    <TouchableOpacity onPress={() => router.back()} className="w-11 h-11 bg-bg-soft rounded-2xl items-center justify-center border border-border-light mr-4">
                        <ChevronLeft size={24} color="#E67E22" strokeWidth={3} />
                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text className="text-secondary font-black text-lg tracking-tight" numberOfLines={1}>{feedback?.subject || 'Chargement...'}</Text>
                        <View className="flex-row items-center mt-1">
                            {feedback && (
                                <View className="flex-row items-center bg-bg-soft px-1.5 py-0.5 rounded-md border border-border-light mr-2">
                                    <StatusIcon size={8} color={statusMeta.hex} className="mr-1" />
                                    <Text className={`text-[8px] font-black uppercase tracking-[1px] ${statusMeta.color}`}>
                                        {statusMeta.label}
                                    </Text>
                                </View>
                            )}
                            <Text className="text-secondary/40 text-[9px] font-black uppercase tracking-[2px]" numberOfLines={1}>
                                {feedback?.project ? feedback.project.name : 'ESPACE CLIENT LYNX'}
                            </Text>
                        </View>
                    </View>
                </View>
            </BlurView>

            {/* Messages */}
            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator color="#E67E22" size="large" />
                </View>
            ) : (
                <ScrollView
                    ref={scrollRef}
                    className="flex-1"
                    contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {groupedReplies.map((group, gi) => (
                        <View key={gi}>
                            <View className="flex-row items-center my-8">
                                <View className="flex-1 h-[1px] bg-border-light/50" />
                                <View className="bg-bg-soft px-4 py-1.5 rounded-xl mx-3 shadow-sm border border-border-light">
                                    <Text className="text-secondary/50 text-[9px] font-black uppercase tracking-[2px]">{group.date}</Text>
                                </View>
                                <View className="flex-1 h-[1px] bg-border-light/50" />
                            </View>
                            {group.items.map((msg: any, idx: number) => {
                                const isMe = (msg.authorId === user?.id) || (msg.author?.role === user?.role && msg.author?.role !== 'CLIENT');
                                const isClient = msg.author?.role === 'CLIENT';
                                
                                // To align with Web App: Clients on left, Staff (Admin/Conducteur) on right.
                                const isRight = isMe; 

                                return (
                                    <Animated.View 
                                        key={msg.id} 
                                        entering={FadeInDown.delay(idx * 50)}
                                        layout={Layout.springify()}
                                        className={`mb-6 max-w-[88%] ${isRight ? 'self-end items-end' : 'self-start items-start'}`}
                                    >
                                        {!isRight && (
                                            <Text className="text-secondary/40 text-[9px] font-black uppercase tracking-[2px] mb-1.5 ml-2">
                                                {msg.author?.firstName} {msg.author?.lastName} 
                                                {msg.isOriginal ? ' (Demande initiale)' : ''}
                                            </Text>
                                        )}
                                        
                                        <View className={`p-1 rounded-[28px] shadow-sm ${isRight ? 'bg-primary border border-primary/20' : 'bg-bg-soft border border-border-light'} ${msg._optimistic ? 'opacity-70' : ''}`}>
                                            {msg.imageUrl && (
                                                <View className="w-64 h-64 rounded-[24px] overflow-hidden bg-black/5 items-center justify-center mb-1">
                                                    {(msg.imageUrl.toLowerCase().endsWith('.mp4') || msg.imageUrl.toLowerCase().endsWith('.mov')) ? (
                                                        <Video
                                                            source={{ uri: msg.imageUrl.startsWith('http') || msg.imageUrl.startsWith('file://') ? msg.imageUrl : `${ASSET_BASE_URL}${msg.imageUrl}` }}
                                                            useNativeControls
                                                            resizeMode={ResizeMode.COVER}
                                                            style={{ width: '100%', height: '100%' }}
                                                        />
                                                    ) : (
                                                        <Image
                                                            source={{ uri: msg.imageUrl.startsWith('http') || msg.imageUrl.startsWith('file://') ? msg.imageUrl : `${ASSET_BASE_URL}${msg.imageUrl}` }}
                                                            className="w-full h-full"
                                                            resizeMode="cover"
                                                        />
                                                    )}
                                                </View>
                                            )}
                                            {msg.content ? (
                                                <View className="px-5 py-3.5">
                                                    <Text className={`text-[14px] leading-[22px] font-bold ${isRight ? 'text-white' : 'text-secondary'}`}>
                                                        {msg.content}
                                                    </Text>
                                                </View>
                                            ) : null}
                                        </View>

                                        <View className={`flex-row items-center mt-1.5 mx-2 ${isRight ? 'flex-row-reverse' : ''}`}>
                                            <Text className="text-secondary/30 text-[8px] font-black tracking-[1px] uppercase">
                                                {formatTime(msg.createdAt)}
                                            </Text>
                                            {isRight && <View className="w-1.5 h-1.5 rounded-full bg-primary mx-2 opacity-30" />}
                                        </View>
                                    </Animated.View>
                                );
                            })}
                        </View>
                    ))}
                </ScrollView>
            )}

            {/* Input Bar */}
            <BlurView intensity={Platform.OS === 'ios' ? 95 : 100} tint="light" style={{ paddingBottom: Math.max(insets.bottom, 20) }} className="border-t border-border-light/50">
                {attachment && (
                    <View className="px-5 py-4 bg-bg-soft flex-row items-center border-b border-border-light shadow-sm">
                        <View className="w-14 h-14 rounded-xl border border-border-light overflow-hidden shadow-sm mr-3">
                            {attachment.type.includes('video') ? (
                                <Video source={{ uri: attachment.uri }} className="w-full h-full" resizeMode={ResizeMode.COVER} />
                            ) : (
                                <Image source={{ uri: attachment.uri }} className="w-full h-full" />
                            )}
                        </View>
                        <View className="flex-1">
                            <Text className="text-secondary font-black text-[10px] uppercase tracking-widest">Média sélectionné</Text>
                            <Text className="text-secondary/40 text-[9px] font-bold truncate">{attachment.name}</Text>
                        </View>
                        <TouchableOpacity 
                            onPress={() => setAttachment(null)}
                            className="w-8 h-8 rounded-full bg-bg-soft border border-border-light items-center justify-center"
                        >
                            <X size={14} color="#EF4444" strokeWidth={3} />
                        </TouchableOpacity>
                    </View>
                )}
                
                <View className="px-5 py-4 flex-row items-end">
                    <TouchableOpacity
                        onPress={handleAttachPhoto}
                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                        className="w-12 h-12 rounded-xl bg-bg-soft items-center justify-center border border-border-light mr-3 shadow-sm mb-1"
                    >
                        <Paperclip size={20} color="#E67E22" strokeWidth={2.5} />
                    </TouchableOpacity>

                    <View className="flex-1 bg-bg-soft border border-border-light rounded-3xl px-5 py-1 min-h-[50px] justify-center shadow-inner">
                        <TextInput
                            className="text-secondary text-[15px] font-bold py-3"
                            placeholder="Écrire une réponse..."
                            placeholderTextColor="#A08060"
                            value={text}
                            onChangeText={setText}
                            multiline
                            style={{ maxHeight: 100 }}
                        />
                    </View>

                    <TouchableOpacity
                        onPress={sendMessage}
                        disabled={sending || (!text.trim() && !attachment)}
                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                        className={`w-12 h-12 rounded-xl items-center justify-center ml-3 shadow-xl mb-1 ${(text.trim() || attachment) ? 'bg-primary shadow-primary/40' : 'bg-bg-soft border border-border-light'}`}
                    >
                        {sending ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <Send size={20} color={(text.trim() || attachment) ? 'white' : '#A08060'} strokeWidth={3} />
                        )}
                    </TouchableOpacity>
                </View>
            </BlurView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({});
