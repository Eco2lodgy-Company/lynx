import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import api from '../lib/api';
import { Package, ChevronLeft, Info, Briefcase, ShoppingCart, Send, AlertTriangle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LinearGradient } from 'expo-linear-gradient';
import { PremiumCard } from '../components/ui/PremiumCard';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Project } from '@lynx/types';
import { useProjects, useCreateDelivery } from '@lynx/api-client';

export default function SupplyRequestScreen() {
    const { data: projects = [], isLoading: fetching } = useProjects();
    const { mutate: createDelivery, isPending: loading } = useCreateDelivery();

    const [selectedProject, setSelectedProject] = useState("");
    const [item, setItem] = useState("");
    const [quantity, setQuantity] = useState("");
    const [notes, setNotes] = useState("");
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const handleSubmit = async () => {
        if (!selectedProject || !item || !quantity) {
            Alert.alert("Erreur", "Veuillez remplir les informations essentielles (Projet, Matériel, Quantité)");
            return;
        }

        const payload = {
            projectId: selectedProject,
            item,
            quantity,
            plannedDate: new Date().toISOString(),
            notes: notes ? `SIGNALEMENT RUPTURE : ${notes}` : "SIGNALEMENT RUPTURE DE STOCK"
        };

        createDelivery(payload, {
            onSuccess: () => {
                Alert.alert("Succès", "Rupture de stock signalée au conducteur.");
                router.back();
            },
            onError: (error: any) => {
                Alert.alert("Erreur", error.response?.data?.error || "Une erreur est survenue");
            }
        });
    };

    return (
        <View className="flex-1 bg-white">
            <LinearGradient
                colors={['#FFFFFF', '#FDFCFB', '#F8F9FA']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <View className="px-5 mb-10 flex-row items-center" style={{ paddingTop: Math.max(insets.top, 24) }}>
                <TouchableOpacity 
                    onPress={() => router.back()} 
                    className="w-12 h-12 bg-bg-soft rounded-2xl items-center justify-center border border-border-light mr-5"
                >
                    <ChevronLeft size={24} color="#4A3520" />
                </TouchableOpacity>
                <View>
                    <Text className="text-secondary/50 text-[10px] font-black uppercase tracking-[4px] mb-1">Ressources & Matériaux</Text>
                    <Text className="text-secondary text-3xl font-black tracking-tight">Approvisionnement</Text>
                </View>
            </View>

            <ScrollView 
                className="flex-1 px-5" 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={{ paddingBottom: 120 }}
                keyboardShouldPersistTaps="handled"
            >
                <PremiumCard index={0} glass={true} style={{ padding: 25, marginBottom: 20 }}>
                    <View className="flex-row items-center mb-10">
                        <View className="w-12 h-12 bg-primary/10 rounded-2xl items-center justify-center mr-4 border border-primary/20">
                            <AlertTriangle color="#E67E22" size={24} />
                        </View>
                        <View>
                            <Text className="text-secondary text-xl font-black tracking-tight">Signaler Rupture</Text>
                            <Text className="text-secondary/50 text-[10px] font-black uppercase tracking-widest mt-0.5">Alerte stock critique</Text>
                        </View>
                    </View>

                    <View className="mb-10">
                        <Text className="text-secondary/50 text-[10px] font-black uppercase tracking-[2px] mb-4 ml-1">Chantier Concerné</Text>
                        {fetching ? (
                            <ActivityIndicator color="#C8842A" />
                        ) : (
                            <View className="flex-row flex-wrap">
                                {projects.map(p => (
                                    <TouchableOpacity 
                                        key={p.id}
                                        onPress={() => setSelectedProject(p.id)}
                                        className={`mr-3 mb-3 px-5 py-3 rounded-2xl border-2 ${selectedProject === p.id ? 'bg-primary/10 border-primary' : 'bg-bg-soft border-border-light'}`}
                                    >
                                        <Text className={`font-bold text-sm ${selectedProject === p.id ? 'text-primary' : 'text-secondary/60'}`}>
                                            {p.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    <View className="space-y-8">
                        <Input 
                            label="Matériel Manquant"
                            placeholder="ex: Ciment, Sable, Acier..."
                            value={item}
                            onChangeText={setItem}
                            icon={<Package size={20} color="#C8842A" strokeWidth={2.5} />}
                        />

                        <Input 
                            label="Quantité / Estimation"
                            placeholder="ex: 10 sacs, 2 tonnes..."
                            value={quantity}
                            onChangeText={setQuantity}
                            icon={<ShoppingCart size={20} color="#C8842A" strokeWidth={2.5} />}
                        />

                        <View className="mb-10">
                            <Text className="text-secondary/50 text-[10px] font-black uppercase tracking-[2px] mb-3 ml-1">Commentaires (Optionnel)</Text>
                            <TextInput 
                                className="bg-bg-soft border border-border-light rounded-[24px] p-5 text-secondary text-base font-medium min-h-[140px]"
                                placeholder="Détails sur l'urgence ou spécifications..."
                                placeholderTextColor="#A08060"
                                multiline
                                textAlignVertical="top"
                                value={notes}
                                onChangeText={setNotes}
                            />
                        </View>
                    </View>

                    <Button 
                        loading={loading}
                        onPress={handleSubmit}
                        className="h-20 rounded-[28px] shadow-2xl shadow-primary/20"
                    >
                        SIGNALER AU CONDUCTEUR
                    </Button>
                </PremiumCard>

                <Animated.View entering={FadeInDown.delay(300)} className="bg-primary/5 p-6 rounded-[30px] border border-primary/10 flex-row items-center">
                    <View className="w-10 h-10 bg-primary/10 rounded-xl items-center justify-center mr-4 border border-primary/20">
                        <Info size={18} color="#E67E22" strokeWidth={2.5} />
                    </View>
                    <Text className="flex-1 text-secondary/60 text-[11px] font-medium leading-5">
                        Ce signalement sera immédiatement ajouté au <Text className="font-black text-primary">Planning Logistique</Text> du conducteur pour action.
                    </Text>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({});
