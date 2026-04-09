import { Tabs } from 'expo-router';
import { LayoutDashboard, HardHat, User, ClipboardList, MessageSquare } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { Platform, View, StyleSheet } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function TabLayout() {
  const { user } = useAuth();
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 30 : 20,
          left: 16,
          right: 16,
          height: 68,
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(255, 255, 255, 0.95)',
          borderRadius: 24,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: 'rgba(200, 132, 42, 0.1)', // Subtle LYNX border
          elevation: 10,
          shadowColor: '#4A3520',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.1,
          shadowRadius: 20,
          paddingBottom: 0,
        },
        tabBarBackground: () => (
          Platform.OS === 'ios' ? (
            <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
          ) : null
        ),
        tabBarActiveTintColor: '#E67E22', // Vibrant Orange
        tabBarInactiveTintColor: '#A08060',
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '800',
          marginBottom: 10,
          textTransform: 'uppercase',
          letterSpacing: 1,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconContainer : null}>
              <LayoutDashboard color={color} size={22} strokeWidth={focused ? 3 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projets',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconContainer : null}>
              <HardHat color={color} size={22} strokeWidth={focused ? 3 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Suivi',
          href: user?.role === 'OUVRIER' ? null : undefined,
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconContainer : null}>
              <ClipboardList color={color} size={22} strokeWidth={focused ? 3 : 2} />
            </View>
          ),
        }}
      />
      
      <Tabs.Screen
          name="messages"
          options={{
            title: 'Messages',
            href: user?.role === 'OUVRIER' ? null : undefined,
            tabBarIcon: ({ color, focused }) => (
              <View style={focused ? styles.activeIconContainer : null}>
                <MessageSquare color={color} size={22} strokeWidth={focused ? 3 : 2} />
              </View>
            ),
          }}
        />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconContainer : null}>
              <User color={color} size={22} strokeWidth={focused ? 3 : 2} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeIconContainer: {
    backgroundColor: 'rgba(200, 132, 42, 0.1)',
    padding: 8,
    borderRadius: 12,
    marginTop: -4,
  }
});
