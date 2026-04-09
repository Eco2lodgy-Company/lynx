import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Users, Briefcase, CheckSquare, ChevronRight } from 'lucide-react-native';
import { PremiumCard } from '../../components/ui/PremiumCard';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function AdminHubScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const managementOptions = [
        {
            title: 'Utilisateurs',
            sub: 'Gérer les membres et rôles',
            icon: Users,
            color: '#E67E22',
            onPress: () => router.push('/admin/users'),
        },
        {
            title: 'Projets',
            sub: 'Créer et affecter des chantiers',
            icon: Briefcase,
            color: '#4A3520',
            onPress: () => router.push('/admin/projects'),
        },
        {
            title: 'Tâches',
            sub: 'Assigner des missions',
            icon: CheckSquare,
            color: '#7A8000',
            onPress: () => router.push('/admin/tasks'),
        },
        {
            title: 'Journaux',
            sub: 'Rapports de chantier quotidiens',
            icon: CheckSquare, // Using CheckSquare for now, maybe find a better one if needed
            color: '#27AE60',
            onPress: () => router.push('/admin/daily-logs'),
        },
    ];

    return (
        <View className="flex-1 bg-white">
            <LinearGradient
                colors={['#FFFFFF', '#FDFCFB', '#F8F9FA']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            
            <View 
                className="px-6 mb-10 flex-row items-center" 
                style={{ paddingTop: Math.max(insets.top, 24) }}
            >
                <TouchableOpacity 
                    onPress={() => router.back()} 
                    className="mr-5 bg-bg-soft w-14 h-14 rounded-2xl items-center justify-center border border-border-light shadow-sm"
                >
                    <ChevronLeft size={28} color="#4A3520" strokeWidth={3} />
                </TouchableOpacity>
                <View>
                    <Text className="text-secondary/40 text-[10px] font-black uppercase tracking-[4px] mb-1">Administration</Text>
                    <Text className="text-secondary text-4xl font-black tracking-tight">Système</Text>
                </View>
            </View>

            <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
                <Text className="text-secondary/40 text-[11px] font-black uppercase tracking-[2px] mb-6 ml-2">Pilotage Global</Text>
                
                {managementOptions.map((option, index) => (
                    <Animated.View key={index} entering={FadeInDown.delay(index * 100).duration(600)}>
                        <PremiumCard
                            index={index}
                            style={{ padding: 20, marginBottom: 16 }}
                            glass={true}
                        >
                            <TouchableOpacity
                                onPress={option.onPress}
                                className="flex-row items-center justify-between"
                                activeOpacity={0.7}
                            >
                                <View className="flex-row items-center flex-1">
                                    <View 
                                        className="w-16 h-16 rounded-[24px] items-center justify-center mr-6" 
                                        style={{ backgroundColor: option.color + '10' }}
                                    >
                                        <option.icon color={option.color} size={32} strokeWidth={2} />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-secondary font-black text-xl tracking-tight">{option.title}</Text>
                                        <Text className="text-secondary/50 text-xs mt-1 font-medium">{option.sub}</Text>
                                    </View>
                                </View>
                                <View className="bg-bg-soft p-3 rounded-2xl border border-border-light">
                                    <ChevronRight color="#4A3520" size={20} strokeWidth={3} />
                                </View>
                            </TouchableOpacity>
                        </PremiumCard>
                    </Animated.View>
                ))}
            </ScrollView>
        </View>
    );
}
