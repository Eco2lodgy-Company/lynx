import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, ScrollView, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Image, StyleSheet
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api, { ASSET_BASE_URL, getBlobFromUri } from '../../lib/api';
import { ChevronLeft, Send, Paperclip, X, User } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Video, ResizeMode } from 'expo-av';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ChatScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const scrollRef = useRef<ScrollView>(null);

    const [conversation, setConversation] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [attachment, setAttachment] = useState<{uri: string, type: string, name: string} | null>(null);

    const fetchData = async () => {
        try {
            const [convRes, msgRes] = await Promise.all([
                api.get(`/conversations`).then(res => res.data.find((c: any) => c.id === id)),
                api.get(`/messages?conversationId=${id}`)
            ]);
            
            if (convRes) setConversation(convRes);
            if (msgRes.data) setMessages(msgRes.data);
        } catch (err) {
            console.error('Error loading chat:', err);
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
        if (messages.length > 0) {
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
        }
    }, [messages.length]);

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
            attachments: currentAttachment ? JSON.stringify([{ url: currentAttachment.uri, type: currentAttachment.type }]) : null,
            createdAt: new Date().toISOString(),
            _optimistic: true,
        };
        setMessages(prev => [...prev, optimisticMsg]);

        try {
            let attachmentsArray: any[] = [];
            
            if (currentAttachment) {
                const formData = new FormData();
                if (Platform.OS === 'web') {
                    const blob = await getBlobFromUri(currentAttachment.uri);
                    formData.append('file', blob!, currentAttachment.name);
                } else {
                    formData.append('file', {
                        uri: currentAttachment.uri,
                        type: currentAttachment.type,
                        name: currentAttachment.name
                    } as any);
                }
                
                const uploadRes = await api.post('/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                attachmentsArray = [{ url: uploadRes.data.url, type: currentAttachment.type }];
            }

            await api.post(`/messages`, {
                conversationId: id,
                content: messageText,
                attachments: attachmentsArray
            });
            
            fetchData();
        } catch (err: any) {
            console.error('Send error:', err);
            Alert.alert('Erreur', "Impossible d'envoyer le message");
            setText(messageText);
            setAttachment(currentAttachment);
            setMessages(prev => prev.filter(m => !(m as any)._optimistic));
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
                const ext = isVideo ? '.mp4' : '.jpg';
                const baseName = uri.split('/').pop() || `media-${Date.now()}`;
                const name = baseName.includes('.') ? baseName : `${baseName}${ext}`;
                setAttachment({ uri, type, name });
            }
        } catch (error) {
            console.error('Error picking media:', error);
        }
    };

    const handleAttach = () => {
        Alert.alert(
            'Joindre un média',
            'Sélecteur LYNX',
            [
                { text: 'Appareil Photo / Caméra', onPress: () => pickMedia(true) },
                { text: 'Bibliothèque', onPress: () => pickMedia(false) },
                { text: 'Annuler', style: 'cancel' },
            ]
        );
    };

    const formatTime = (iso: string) =>
        new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const getConvName = () => {
        if (!conversation) return 'Chargement...';
        if (conversation.name) return conversation.name;
        const others = conversation.members?.filter((m: any) => m.userId !== user?.id) || [];
        if (others.length === 0) return "Moi-même";
        if (others.length === 1) return `${others[0].user.firstName} ${others[0].user.lastName}`;
        return others.map((m: any) => m.user.firstName).join(', ');
    };

    return (
        <KeyboardAvoidingView
            className="flex-1 bg-white"
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
        >
            <LinearGradient colors={['#FFFFFF', '#FDFCFB', '#F8F9FA']} style={StyleSheet.absoluteFill} />

            {/* Header */}
            <BlurView intensity={Platform.OS === 'ios' ? 90 : 100} tint="light" style={{ paddingTop: insets.top }}>
                <View className="flex-row items-center px-5 py-5 border-b border-border-light/50">
                    <TouchableOpacity onPress={() => router.back()} className="w-11 h-11 bg-bg-soft rounded-2xl items-center justify-center border border-border-light mr-4">
                        <ChevronLeft size={24} color="#E67E22" strokeWidth={3} />
                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text className="text-secondary font-black text-lg tracking-tight" numberOfLines={1}>{getConvName()}</Text>
                        <Text className="text-secondary/40 text-[9px] font-black uppercase tracking-[2px]">
                            {conversation?.project ? conversation.project.name : 'DISCUSSION PRIVÉE'}
                        </Text>
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
                    {messages.map((msg: any, idx: number) => {
                        const isMe = msg.authorId === user?.id;
                        let attachments: any[] = [];
                        if (msg.attachments) {
                            try {
                                attachments = typeof msg.attachments === 'string' ? JSON.parse(msg.attachments) : msg.attachments;
                            } catch (e) { attachments = []; }
                        }

                        return (
                            <Animated.View 
                                key={msg.id} 
                                entering={FadeInDown.delay(idx * 30)}
                                layout={Layout.springify()}
                                className={`mb-6 max-w-[85%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}
                            >
                                {!isMe && (
                                    <Text className="text-secondary/40 text-[9px] font-black uppercase tracking-[2px] mb-1.5 ml-2">
                                        {msg.author?.firstName} {msg.author?.lastName}
                                    </Text>
                                )}
                                
                                <View className={`p-1 rounded-[28px] shadow-sm ${isMe ? 'bg-primary' : 'bg-bg-soft border border-border-light'} ${msg._optimistic ? 'opacity-70' : ''}`}>
                                    {attachments.map((att: any, i: number) => (
                                        <View key={i} className="w-64 h-64 rounded-[24px] overflow-hidden bg-black/5 items-center justify-center mb-1">
                                            {(att.type?.includes('video') || att.url?.toLowerCase().endsWith('.mp4')) ? (
                                                <Video
                                                    source={{ uri: att.url.startsWith('http') || att.url.startsWith('file://') ? att.url : `${ASSET_BASE_URL}${att.url}` }}
                                                    useNativeControls
                                                    resizeMode={ResizeMode.COVER}
                                                    style={{ width: '100%', height: '100%' }}
                                                />
                                            ) : (
                                                <Image
                                                    source={{ uri: att.url.startsWith('http') || att.url.startsWith('file://') ? att.url : `${ASSET_BASE_URL}${att.url}` }}
                                                    className="w-full h-full"
                                                    resizeMode="cover"
                                                />
                                            )}
                                        </View>
                                    ))}
                                    {msg.content ? (
                                        <View className="px-5 py-3.5">
                                            <Text className={`text-[14px] leading-[22px] font-bold ${isMe ? 'text-white' : 'text-secondary'}`}>
                                                {msg.content}
                                            </Text>
                                        </View>
                                    ) : null}
                                </View>

                                <View className={`flex-row items-center mt-1.5 mx-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                                    <Text className="text-secondary/30 text-[8px] font-black tracking-[1px] uppercase">
                                        {formatTime(msg.createdAt)}
                                    </Text>
                                </View>
                            </Animated.View>
                        );
                    })}
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
                        <TouchableOpacity onPress={() => setAttachment(null)} className="w-8 h-8 rounded-full bg-bg-soft border border-border-light items-center justify-center">
                            <X size={14} color="#EF4444" strokeWidth={3} />
                        </TouchableOpacity>
                    </View>
                )}
                
                <View className="px-5 py-4 flex-row items-end">
                    <TouchableOpacity onPress={handleAttach} className="w-12 h-12 rounded-xl bg-bg-soft items-center justify-center border border-border-light mr-3 shadow-sm mb-1">
                        <Paperclip size={20} color="#E67E22" strokeWidth={2.5} />
                    </TouchableOpacity>

                    <View className="flex-1 bg-bg-soft border border-border-light rounded-3xl px-5 py-1 min-h-[50px] justify-center shadow-inner">
                        <TextInput
                            className="text-secondary text-[15px] font-bold py-3"
                            placeholder="Écrire un message..."
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
                        className={`w-12 h-12 rounded-xl items-center justify-center ml-3 shadow-xl mb-1 ${(text.trim() || attachment) ? 'bg-primary' : 'bg-bg-soft border border-border-light'}`}
                    >
                        {sending ? <ActivityIndicator size="small" color="white" /> : <Send size={20} color={(text.trim() || attachment) ? 'white' : '#A08060'} strokeWidth={3} />}
                    </TouchableOpacity>
                </View>
            </BlurView>
        </KeyboardAvoidingView>
    );
}
