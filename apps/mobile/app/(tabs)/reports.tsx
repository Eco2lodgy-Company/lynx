import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, TextInput, Alert, Modal, StyleSheet, Platform, Image } from 'react-native';
import api, { ASSET_BASE_URL, getBlobFromUri } from '../../lib/api';
import { 
    ClipboardList, 
    Calendar,
    User,
    Search,
    CloudRain,
    Thermometer,
    CheckCircle2,
    XCircle,
    FileText,
    X,
    ChevronRight,
    Filter,
    AlertTriangle,
    Package,
    Plus,
    Save,
    Send,
    Camera,
    Image as ImageIcon,
    Trash2
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Input } from '../../components/ui/Input';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { LinearGradient } from 'expo-linear-gradient';
import { PremiumCard } from '../../components/ui/PremiumCard';
import Animated, { FadeInDown, FadeInUp, Layout, FadeIn } from 'react-native-reanimated';

const STATUS_LABELS: Record<string, string> = {
    BROUILLON: 'BROUILLON',
    SOUMIS: 'SOUMIS',
    VALIDE: 'VALIDÉ',
    REJETE: 'REJETÉ',
};

const STATUS_STYLE: Record<string, { bg: string; border: string; text: string; color: string }> = {
    BROUILLON: { bg: 'bg-slate-700/30', border: 'border-white/5', text: 'text-slate-400', color: '#64748B' },
    SOUMIS: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-500', color: '#F59E0B' },
    VALIDE: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-500', color: '#10B981' },
    REJETE: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', color: '#EF4444' },
};

export default function ReportsScreen() {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const [refreshing, setRefreshing] = useState(false);
    const [logs, setLogs] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    
    // Validatio/Rejet states
    const [rejectModal, setRejectModal] = useState<{ visible: boolean; logId: string | null }>({ visible: false, logId: null });
    const [selectedLog, setSelectedLog] = useState<any>(null);
    const [counterNotes, setCounterNotes] = useState('');

    // Creation / Edit States
    const [createModal, setCreateModal] = useState(false);
    const [selectedPhotos, setSelectedPhotos] = useState<any[]>([]);
    const [editingLogId, setEditingLogId] = useState<string | null>(null);
    const [existingPhotos, setExistingPhotos] = useState<any[]>([]);
    const [newReport, setNewReport] = useState({
        projectId: '',
        weather: '',
        temperature: '',
        summary: '',
        workCompleted: '',
        issues: '',
        materialsUsed: ''
    });

    const canValidate = user?.role === 'CONDUCTEUR' || user?.role === 'ADMIN';
    const canCreate = user?.role === 'CHEF_EQUIPE' || user?.role === 'ADMIN' || user?.role === 'CONDUCTEUR';

    const fetchLogs = async () => {
        try {
            const response = await api.get('/daily-logs');
            setLogs(response.data);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProjects = async () => {
        try {
            const response = await api.get('/projects');
            setProjects(response.data);
            if (response.data.length > 0) {
                setNewReport(prev => ({ ...prev, projectId: response.data[0].id }));
            }
        } catch (error) {
            console.error('Error fetching projects:', error);
        }
    };

    useEffect(() => { 
        fetchLogs(); 
        if (canCreate) fetchProjects();
    }, []);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await fetchLogs();
        if (canCreate) await fetchProjects();
        setRefreshing(false);
    }, []);

    // Validation Action
    const handleValidate = async (logId: string) => {
        setActionLoading(true);
        try {
            await api.put(`/daily-logs/${logId}`, { status: 'VALIDE' });
            Alert.alert('✅ Validé', 'Le journal a été validé avec succès.');
            setSelectedLog(null);
            fetchLogs();
        } catch (err: any) {
            Alert.alert('Erreur', err.response?.data?.error || 'Impossible de valider');
        } finally {
            setActionLoading(false);
        }
    };

    // Reject Action
    const handleReject = async () => {
        if (!rejectModal.logId) return;
        if (!counterNotes.trim()) {
            Alert.alert('Requis', 'Veuillez saisir les notes de contre-visite.');
            return;
        }
        setActionLoading(true);
        try {
            await api.put(`/daily-logs/${rejectModal.logId}`, { 
                status: 'REJETE', 
                correctionNotes: counterNotes.trim() 
            });
            Alert.alert('❌ Rejeté', 'Journal rejeté avec succès.');
            setRejectModal({ visible: false, logId: null });
            setSelectedLog(null);
            setCounterNotes('');
            fetchLogs();
        } catch (err: any) {
            Alert.alert('Erreur', err.response?.data?.error || 'Impossible de rejeter');
        } finally {
            setActionLoading(false);
        }
    };

    // Image Upload Handlers
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

    // Edit/Delete Additions
    const handleEditLog = (log: any) => {
        setEditingLogId(log.id);
        setNewReport({
            projectId: log.projectId || log.project?.id || '',
            weather: log.weather || '',
            temperature: log.temperature?.toString() || '',
            summary: log.summary || '',
            workCompleted: log.workCompleted || '',
            issues: log.issues || '',
            materialsUsed: log.materials || ''
        });
        setExistingPhotos(log.photos || []);
        setSelectedPhotos([]);
        setSelectedLog(null);
        setCreateModal(true);
    };

    const handleDeleteLog = (logId: string) => {
        Alert.alert(
            "Supprimer le journal",
            "Êtes-vous sûr de vouloir supprimer ce rapport journalier ?",
            [
                { text: "Annuler", style: "cancel" },
                { 
                    text: "Supprimer", 
                    style: "destructive", 
                    onPress: async () => {
                        setActionLoading(true);
                        try {
                            await api.delete(`/daily-logs/${logId}`);
                            setSelectedLog(null);
                            fetchLogs();
                        } catch (err: any) {
                            Alert.alert("Erreur", "Impossible de supprimer le journal.");
                        } finally {
                            setActionLoading(false);
                        }
                    } 
                }
            ]
        );
    };

    const handleCreateReport = async (status: 'BROUILLON' | 'SOUMIS') => {
        if (!newReport.projectId || !newReport.summary.trim()) {
            Alert.alert('Requis', 'Le projet et le résumé sont obligatoires.');
            return;
        }

        setActionLoading(true);
        try {
            const uploadedUrls = [];
            for (const photo of selectedPhotos) {
                const formData = new FormData();
                if (Platform.OS === 'web') {
                    const blob = await getBlobFromUri(photo.uri);
                    formData.append('file', blob!, `log_${Date.now()}.jpg`);
                } else {
                    formData.append('file', {
                        uri: photo.uri,
                        type: 'image/jpeg',
                        name: `log_${Date.now()}.jpg`
                    } as any);
                }

                const uploadRes = await api.post('/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                uploadedUrls.push(uploadRes.data.url);
            }

            const payload: any = {
                projectId: newReport.projectId,
                weather: newReport.weather,
                temperature: newReport.temperature,
                summary: newReport.summary,
                workCompleted: newReport.workCompleted,
                issues: newReport.issues,
                materialsUsed: newReport.materialsUsed,
                status: status,
                photoUrls: uploadedUrls
            };

            if (editingLogId) {
                await api.put(`/daily-logs/${editingLogId}`, payload);
                Alert.alert('Succès', 'Journal mis à jour avec succès.');
            } else {
                payload.date = new Date().toISOString();
                await api.post('/daily-logs', payload);
                Alert.alert('Succès', `Journal ${status === 'SOUMIS' ? 'soumis pour validation' : 'enregistré en brouillon'}.`);
            }

            setCreateModal(false);
            setEditingLogId(null);
            setNewReport({
                projectId: projects.length > 0 ? projects[0].id : '',
                weather: '',
                temperature: '',
                summary: '',
                workCompleted: '',
                issues: '',
                materialsUsed: ''
            });
            setSelectedPhotos([]);
            setExistingPhotos([]);
            fetchLogs();
        } catch (err: any) {
            Alert.alert('Erreur', err.response?.data?.error || 'Erreur lors de l\'enregistrement');
        } finally {
            setActionLoading(false);
        }
    };

    const filteredLogs = logs.filter(l => 
        l.project?.name.toLowerCase().includes(search.toLowerCase()) ||
        l.summary?.toLowerCase().includes(search.toLowerCase())
    );

    const LogCard = ({ log, index }: { log: any, index: number }) => {
        const style = STATUS_STYLE[log.status] || STATUS_STYLE.BROUILLON;
        return (
            <TouchableOpacity 
                onPress={() => setSelectedLog(log)}
                activeOpacity={0.8}
            >
                <PremiumCard index={index} glass={true} style={{ padding: 18, marginBottom: 16 }}>
                    <View className="flex-row justify-between items-start mb-4">
                        <View className="flex-1">
                            <Text className="text-secondary font-black text-lg tracking-tight mb-1.5" numberOfLines={1}>
                                {log.project?.name}
                            </Text>
                            <View className="flex-row items-center bg-bg-soft self-start px-2.5 py-1 rounded-lg border border-border-light">
                                <Calendar size={12} color="#A08060" strokeWidth={2.5} />
                                <Text className="text-secondary/50 text-[10px] font-black uppercase tracking-widest ml-2">
                                    {new Date(log.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                </Text>
                            </View>
                        </View>
                        <View className={`px-3 py-1 transparent rounded-full border ${style.border}`}>
                            <Text className={`text-[9px] font-black tracking-[1.5px] uppercase ${style.text}`}>
                                {STATUS_LABELS[log.status] || log.status}
                            </Text>
                        </View>
                    </View>

                    {log.summary && (
                        <Text className="text-secondary/60 text-sm leading-5 mb-4" numberOfLines={2}>{log.summary}</Text>
                    )}

                    <View className="flex-row items-center justify-between pt-4 border-t border-secondary/5">
                        <View className="flex-row items-center">
                            <View className="flex-row items-center mr-5">
                                <CloudRain size={14} color="#C8842A" strokeWidth={2} />
                                <Text className="text-secondary/80 text-[11px] font-bold ml-2 uppercase tracking-tighter">{log.weather || '—'}</Text>
                            </View>
                            <View className="flex-row items-center">
                                <Thermometer size={14} color="#C8842A" strokeWidth={2} />
                                <Text className="text-secondary/80 text-[11px] font-bold ml-1 uppercase">{log.temperature ? `${log.temperature}°C` : '—'}</Text>
                            </View>
                        </View>
                        <View className="bg-bg-soft px-2.5 py-1 rounded-lg border border-border-light">
                            <Text className="text-secondary/50 text-[9px] font-black uppercase tracking-widest">{log.author?.firstName}</Text>
                        </View>
                    </View>
                </PremiumCard>
            </TouchableOpacity>
        );
    };

    return (
        <View className="flex-1 bg-white">
            <LinearGradient
                colors={['#FFFFFF', '#FDFCFB', '#F8F9FA']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            
            <View 
                className="flex-1 px-5"
                style={{ paddingTop: Math.max(insets.top, 24) }}
            >
                <Animated.View entering={FadeInUp.duration(600)} className="mb-8">
                    <Text className="text-secondary/50 text-sm font-bold uppercase tracking-[4px] mb-2">Historique</Text>
                    <Text className="text-secondary text-4xl font-black tracking-tighter">Journaux</Text>
                </Animated.View>

                <Animated.View entering={FadeInUp.delay(200)} className="mb-8">
                    <PremiumCard index={-1} glass={true} style={{ padding: 4, borderRadius: 20 }}>
                        <Input 
                            placeholder="Rechercher un rapport..." 
                            value={search}
                            onChangeText={setSearch}
                            //@ts-ignore
                            placeholderTextColor="#64748B"
                            inputClassName="bg-transparent border-0 h-14"
                            icon={<Search size={22} color="#C8842A" strokeWidth={2.5} />}
                        />
                    </PremiumCard>
                </Animated.View>

                {loading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator color="#C8842A" size="large" />
                    </View>
                ) : (
                    <ScrollView 
                        className="flex-1"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 100 }}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C8842A" />}
                        keyboardShouldPersistTaps="handled"
                    >
                        {filteredLogs.length > 0 ? (
                            filteredLogs.map((log, index) => <LogCard key={log.id} log={log} index={index} />)
                        ) : (
                            <View className="items-center justify-center py-24">
                                <FileText size={48} color="#E0E0E0" strokeWidth={1} />
                            <Text className="text-secondary/50 text-base font-medium mt-4 italic">Aucun document archivé</Text>
                            </View>
                        )}
                    </ScrollView>
                )}
            </View>

            {/* Fab Create Button */}
            {canCreate && (
                <TouchableOpacity
                    onPress={() => setCreateModal(true)}
                    activeOpacity={0.8}
                    hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                    className="absolute bottom-6 right-6 w-16 h-16 bg-primary rounded-full items-center justify-center shadow-lg shadow-primary/30 z-30"
                >
                    <Plus color="white" size={32} />
                </TouchableOpacity>
            )}

            <Modal
                visible={createModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => {
                    setCreateModal(false);
                    setEditingLogId(null);
                    setExistingPhotos([]);
                }}
            >
                <View className="flex-1 bg-white">
                    <LinearGradient
                        colors={['#FDFCFB', '#F8F9FA']}
                        style={StyleSheet.absoluteFill}
                    />
                    
                    <View className="flex-row items-center justify-between p-6 border-b border-secondary/10" style={{ paddingTop: Platform.OS === 'ios' ? 20 : 40 }}>
                        <Text className="text-secondary text-xl font-bold tracking-tight">{editingLogId ? "Modifier le Rapport" : "Rédiger un Rapport"}</Text>
                        <TouchableOpacity onPress={() => {
                            setCreateModal(false);
                            setEditingLogId(null);
                            setExistingPhotos([]);
                        }} className="w-10 h-10 bg-bg-soft rounded-full items-center justify-center border border-border-light">
                            <X size={20} color="#A08060" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="flex-1 p-6" contentContainerStyle={{ paddingBottom: 100 }}>
                        <Text className="text-secondary/60 text-xs font-bold uppercase tracking-widest mb-2 ml-1">Projet</Text>
                        <View className="bg-bg-soft border border-border-light rounded-2xl mb-6 overflow-hidden">
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-2 px-2">
                                {projects.map((proj) => (
                                    <TouchableOpacity 
                                        key={proj.id}
                                        onPress={() => setNewReport({...newReport, projectId: proj.id})}
                                        className={`px-4 py-3 rounded-xl mr-2 border ${newReport.projectId === proj.id ? 'bg-primary border-primary' : 'bg-transparent border-border-light'}`}
                                    >
                                        <Text className={`font-bold ${newReport.projectId === proj.id ? 'text-white' : 'text-secondary/60'}`}>
                                            {proj.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <View className="flex-row gap-4 mb-6">
                            <View className="flex-1">
                                <Text className="text-secondary/60 text-xs font-bold uppercase tracking-widest mb-2 ml-1">Météo</Text>
                                <View className="bg-bg-soft border border-border-light rounded-2xl h-14 justify-center px-4">
                                    <TextInput
                                        value={newReport.weather}
                                        onChangeText={(v) => setNewReport({...newReport, weather: v})}
                                        placeholder="Ex: Ensoleillé"
                                        placeholderTextColor="#A08060"
                                        className="text-secondary font-medium"
                                    />
                                </View>
                            </View>
                            <View className="flex-1">
                                <Text className="text-secondary/60 text-xs font-bold uppercase tracking-widest mb-2 ml-1">Température (°C)</Text>
                                <View className="bg-bg-soft border border-border-light rounded-2xl h-14 justify-center px-4">
                                    <TextInput
                                        value={newReport.temperature}
                                        onChangeText={(v) => setNewReport({...newReport, temperature: v})}
                                        placeholder="Ex: 24"
                                        keyboardType="numeric"
                                        placeholderTextColor="#A08060"
                                        className="text-secondary font-medium"
                                    />
                                </View>
                            </View>
                        </View>

                        <Text className="text-secondary/60 text-xs font-bold uppercase tracking-widest mb-2 ml-1">Résumé de la journée *</Text>
                        <View className="bg-bg-soft border border-border-light rounded-2xl mb-6 min-h-[120px] p-4">
                            <TextInput
                                value={newReport.summary}
                                onChangeText={(v) => setNewReport({...newReport, summary: v})}
                                placeholder="Que s'est-il passé aujourd'hui ?"
                                placeholderTextColor="#A08060"
                                className="text-secondary font-medium leading-6"
                                multiline
                                textAlignVertical="top"
                            />
                        </View>

                        <Text className="text-secondary/60 text-xs font-bold uppercase tracking-widest mb-2 ml-1">Travaux Réalisés</Text>
                        <View className="bg-bg-soft border border-border-light rounded-2xl mb-6 min-h-[100px] p-4">
                            <TextInput
                                value={newReport.workCompleted}
                                onChangeText={(v) => setNewReport({...newReport, workCompleted: v})}
                                placeholder="Détail des avancées..."
                                placeholderTextColor="#A08060"
                                className="text-secondary font-medium leading-6"
                                multiline
                                textAlignVertical="top"
                            />
                        </View>

                        <Text className="text-secondary/60 text-xs font-bold uppercase tracking-widest mb-2 ml-1">Problèmes Rencontrés</Text>
                        <View className="bg-bg-soft border border-border-light rounded-2xl mb-6 min-h-[100px] p-4">
                            <TextInput
                                value={newReport.issues}
                                onChangeText={(v) => setNewReport({...newReport, issues: v})}
                                placeholder="Difficultés, retards..."
                                placeholderTextColor="#A08060"
                                className="text-secondary font-medium leading-6"
                                multiline
                                textAlignVertical="top"
                            />
                        </View>

                        <Text className="text-secondary/60 text-xs font-bold uppercase tracking-widest mb-2 ml-1">Matériaux Utilisés</Text>
                        <View className="bg-bg-soft border border-border-light rounded-2xl mb-6 min-h-[100px] p-4">
                            <TextInput
                                value={newReport.materialsUsed}
                                onChangeText={(v) => setNewReport({...newReport, materialsUsed: v})}
                                placeholder="Quantités et types de matériaux..."
                                placeholderTextColor="#A08060"
                                className="text-secondary font-medium leading-6"
                                multiline
                                textAlignVertical="top"
                            />
                        </View>

                        <Text className="text-secondary/60 text-xs font-bold uppercase tracking-widest mb-2 ml-1">Photos</Text>
                        <View className="mb-6">
                            <View className="flex-row gap-4 mb-4">
                                <TouchableOpacity 
                                    onPress={takePhoto}
                                    className="flex-1 bg-bg-soft border border-border-light rounded-2xl h-14 flex-row items-center justify-center"
                                >
                                    <Camera size={20} color="#C8842A" />
                                    <Text className="text-secondary/60 font-bold ml-2">Caméra</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    onPress={pickImage}
                                    className="flex-1 bg-bg-soft border border-border-light rounded-2xl h-14 flex-row items-center justify-center"
                                >
                                    <ImageIcon size={20} color="#C8842A" />
                                    <Text className="text-secondary/60 font-bold ml-2">Galerie</Text>
                                </TouchableOpacity>
                            </View>

                            {existingPhotos.length > 0 && (
                                <View className="mb-4">
                                    <Text className="text-secondary/50 text-[10px] font-bold tracking-widest uppercase mb-3 ml-1">Déjà attachées</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                                        {existingPhotos.map((photo, index) => (
                                            <View key={index} className="mr-3 relative opacity-60">
                                                <Image 
                                                    source={{ uri: `${ASSET_BASE_URL}${photo.url}` }} 
                                                    className="w-20 h-20 rounded-xl border border-secondary/10" 
                                                />
                                            </View>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}

                            {selectedPhotos.length > 0 && (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                                    {selectedPhotos.map((photo, index) => (
                                        <View key={index} className="mr-3 relative">
                                            <Image 
                                                source={{ uri: photo.uri }} 
                                                className="w-24 h-24 rounded-2xl border border-white/10" 
                                            />
                                            <TouchableOpacity 
                                                onPress={() => removeSelectedPhoto(index)}
                                                className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 border-2 border-white shadow-lg"
                                            >
                                                <Trash2 size={12} color="white" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </ScrollView>
                            )}
                        </View>

                    </ScrollView>

                    <View className="p-6 border-t border-secondary/10 bg-white flex-row gap-4 mb-4">
                        <TouchableOpacity
                            onPress={() => handleCreateReport('BROUILLON')}
                            disabled={actionLoading}
                            activeOpacity={0.8}
                            className="flex-1 h-14 bg-bg-soft border border-border-light rounded-xl items-center justify-center flex-row"
                        >
                            <Save size={18} color="#A08060" className="mr-2" />
                            <Text className="text-secondary/60 font-bold uppercase text-xs tracking-wider">Brouillon</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => handleCreateReport('SOUMIS')}
                            disabled={actionLoading}
                            activeOpacity={0.8}
                            className="flex-1 h-14 bg-primary rounded-xl items-center justify-center shadow-lg shadow-primary/20 flex-row"
                        >
                            {actionLoading ? <ActivityIndicator color="white" /> : (
                                <>
                                    <Send size={18} color="white" className="mr-2" />
                                    <Text className="text-white font-bold uppercase text-xs tracking-wider">Soumettre</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Log Detail Modal */}
            {selectedLog && (
                <View className="absolute inset-0 bg-black/95 z-40">
                    <ScrollView 
                        className="flex-1"
                        contentContainerStyle={{ 
                            paddingTop: insets.top + 20, 
                            paddingBottom: insets.bottom + 120,
                            paddingHorizontal: 24
                        }}
                    >
                        <View className="flex-row justify-between items-center mb-8">
                            <View className="flex-1 mr-4">
                                <Text className="text-primary text-[10px] font-black uppercase tracking-[4px] mb-1">Détail du Journal</Text>
                                <Text className="text-white text-3xl font-black tracking-tight leading-9">{selectedLog.project?.name}</Text>
                            </View>
                            <View className="flex-row gap-2">
                                {(user?.role === 'ADMIN' || selectedLog.author?.id === user?.id || user?.role === 'CONDUCTEUR') && (selectedLog.status === 'BROUILLON' || selectedLog.status === 'REJETE') && (
                                    <>
                                        <TouchableOpacity 
                                            onPress={() => handleDeleteLog(selectedLog.id)}
                                            disabled={actionLoading}
                                            className="w-12 h-12 bg-red-500/10 rounded-2xl items-center justify-center border border-red-500/20"
                                        >
                                            <Trash2 size={20} color="#EF4444" />
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            onPress={() => handleEditLog(selectedLog)}
                                            disabled={actionLoading}
                                            className="w-12 h-12 bg-white/5 rounded-2xl items-center justify-center border border-white/10"
                                        >
                                            <FileText size={20} color="#C8842A" />
                                        </TouchableOpacity>
                                    </>
                                )}
                                <TouchableOpacity 
                                    onPress={() => setSelectedLog(null)}
                                    className="w-12 h-12 bg-white/5 rounded-2xl items-center justify-center border border-white/10"
                                >
                                    <X size={24} color="#C8842A" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View className="flex-row mb-10 gap-4">
                            <View className="bg-white/5 px-4 py-3 rounded-2xl border border-white/5 flex-row items-center">
                                <Calendar size={16} color="#C8842A" />
                                <Text className="text-slate-300 font-bold ml-3 uppercase text-xs tracking-widest">
                                    {new Date(selectedLog.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </Text>
                            </View>
                            <View className="bg-white/5 px-4 py-3 rounded-2xl border border-white/5 flex-row items-center">
                                <User size={16} color="#C8842A" />
                                <Text className="text-slate-300 font-bold ml-3 uppercase text-xs tracking-widest">{selectedLog.author?.firstName}</Text>
                            </View>
                        </View>

                        <View className="space-y-10">
                            {/* Summary */}
                            <View>
                                <Text className="text-slate-500 text-[10px] font-black uppercase tracking-[3px] mb-4">Résumé de la journée</Text>
                                <View className="bg-white/5 p-6 rounded-3xl border border-white/5">
                                    <Text className="text-white text-base leading-7 font-medium">{selectedLog.summary}</Text>
                                </View>
                            </View>

                            {/* Detailed Sections */}
                            {[
                                { label: "Travaux Réalisés", content: selectedLog.workCompleted, icon: CheckCircle2, color: "#10B981" },
                                { label: "Problèmes Rencontrés", content: selectedLog.issues, icon: AlertTriangle, color: "#F43F5E" },
                                { label: "Matériaux Utilisés", content: selectedLog.materials, icon: Package, color: "#818CF8" }
                            ].map((section, idx) => section.content && (
                                <View key={idx} className="mb-10">
                                    <View className="flex-row items-center mb-4 ml-1">
                                        <section.icon size={14} color={section.color} strokeWidth={3} />
                                        <Text className="text-slate-500 text-[10px] font-black uppercase tracking-[3px] ml-3">{section.label}</Text>
                                    </View>
                                    <View className="bg-white/5 p-6 rounded-3xl border border-white/5">
                                        <Text className="text-slate-300 text-sm leading-6">{section.content}</Text>
                                    </View>
                                </View>
                            ))}

                            {/* Photos */}
                            {selectedLog.photos && selectedLog.photos.length > 0 && (
                                <View className="mt-8">
                                    <Text className="text-slate-500 text-[10px] font-black uppercase tracking-[3px] mb-5 ml-1">Photos du Journal</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                                        {selectedLog.photos.map((photo: any, idx: number) => (
                                            <View 
                                                key={idx} 
                                                className="mr-4 w-48 h-64 rounded-3xl overflow-hidden border border-white/10"
                                            >
                                                <Image 
                                                    source={{ uri: `${ASSET_BASE_URL}${photo.url}` }} 
                                                    className="w-full h-full opacity-80"
                                                    resizeMode="cover"
                                                />
                                            </View>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                            
                            {/* Rejection Notes if any */}
                            {selectedLog.status === 'REJETE' && selectedLog.correctionNotes && (
                                <View className="mt-8">
                                    <View className="flex-row items-center mb-4 ml-1">
                                        <XCircle size={14} color="#EF4444" strokeWidth={3} />
                                        <Text className="text-red-500 text-[10px] font-black uppercase tracking-[3px] ml-3">Notes de Contre-visite</Text>
                                    </View>
                                    <View className="bg-red-500/5 p-6 rounded-3xl border border-red-500/10">
                                        <Text className="text-red-200/80 text-sm leading-6 font-semibold italic">"{selectedLog.correctionNotes}"</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    </ScrollView>

                    {/* Actions Bar */}
                    {canValidate && selectedLog.status === 'SOUMIS' && (
                        <View className="absolute bottom-0 left-0 right-0 p-6 pb-10 border-t border-white/10 bg-slate-950/80">
                            <View className="flex-row gap-4">
                                <TouchableOpacity
                                    onPress={() => handleValidate(selectedLog.id)}
                                    disabled={actionLoading}
                                    activeOpacity={0.8}
                                    className="flex-1 h-16 flex-row items-center justify-center bg-emerald-500 rounded-2xl shadow-2xl shadow-emerald-500/20"
                                >
                                    <CheckCircle2 size={20} color="#0F172A" strokeWidth={3} />
                                    <Text className="text-slate-900 font-black text-sm uppercase tracking-tight ml-3">Valider le Journal</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => { setRejectModal({ visible: true, logId: selectedLog.id }); setCounterNotes(''); }}
                                    disabled={actionLoading}
                                    activeOpacity={0.8}
                                    className="w-16 h-16 items-center justify-center bg-slate-900 border border-red-500/30 rounded-2xl"
                                >
                                    <XCircle size={24} color="#EF4444" strokeWidth={2.5} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            )}

            {/* Reject Modal */}
            {rejectModal.visible && (
                <View className="absolute inset-0 bg-black/50 justify-center items-center px-6 z-50">
                    <Animated.View 
                        entering={FadeInUp} 
                        className="bg-white rounded-[40px] p-8 border border-border-light w-full shadow-2xl"
                    >
                        <View className="flex-row justify-between items-center mb-6">
                            <View>
                                <Text className="text-secondary text-2xl font-black tracking-tight">Contre-visite</Text>
                                <Text className="text-red-500 text-[10px] font-black uppercase tracking-widest mt-1">Éléments non conformes</Text>
                            </View>
                            <TouchableOpacity 
                                onPress={() => setRejectModal({ visible: false, logId: null })}
                                className="w-10 h-10 bg-bg-soft rounded-full items-center justify-center border border-border-light"
                            >
                                <X size={20} color="#A08060" />
                            </TouchableOpacity>
                        </View>
                        
                        <View className="bg-bg-soft border border-border-light rounded-[28px] p-5 mb-8 min-h-[160px]">
                            <TextInput
                                className="text-secondary text-[15px] font-medium leading-6"
                                placeholder="Détaillez les correctifs nécessaires..."
                                placeholderTextColor="#A08060"
                                multiline
                                textAlignVertical="top"
                                value={counterNotes}
                                onChangeText={setCounterNotes}
                            />
                        </View>

                        <TouchableOpacity
                            onPress={handleReject}
                            disabled={actionLoading}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={['#EF4444', '#B91C1C']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={{ height: 64, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                            >
                                {actionLoading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <>
                                        <XCircle color="white" size={24} strokeWidth={3} className="mr-3" />
                                        <Text className="text-white font-black text-lg uppercase tracking-tight">Confirmer le Rejet</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({});
