import React from 'react';
import { View, StyleSheet, Platform, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';

interface PremiumCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  index?: number;
  delay?: number;
  glass?: boolean;
}

export const PremiumCard = ({ children, style, index = 0, delay = 80, glass = true }: PremiumCardProps) => {
  const AnimatedView = index >= 0 ? Animated.View : View;
  const animationProps = index >= 0 ? { entering: FadeInUp.delay(index * delay).springify().damping(15) } : {};

  return (
    //@ts-ignore
    <AnimatedView 
      {...animationProps}
      style={[styles.card, glass && styles.glassEffect, style]}
    >
      {glass && Platform.OS === 'ios' && (
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
      )}
      {children}
    </AnimatedView>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      android: { 
        elevation: 4,
        shadowColor: '#4A3520',
      },
      ios: {
        shadowColor: '#4A3520',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      }
    })
  },
  glassEffect: {
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.7)' : '#FFFFFF',
    borderColor: 'rgba(74, 53, 32, 0.05)', 
  }
});
