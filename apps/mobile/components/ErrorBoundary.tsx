import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Global ErrorBoundary for the LYNX mobile app.
 * Catches render errors and shows a user-friendly recovery screen.
 */
export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[ErrorBoundary]', error, info.componentStack);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <View className="flex-1 bg-white items-center justify-center px-8">
                    <View className="w-20 h-20 rounded-full bg-red-50 items-center justify-center mb-6">
                        <AlertTriangle size={40} color="#EF4444" strokeWidth={2} />
                    </View>
                    <Text className="text-secondary text-2xl font-black tracking-tight text-center mb-3">
                        Oups ! Une erreur est survenue
                    </Text>
                    <Text className="text-secondary/50 text-center text-sm leading-6 mb-8">
                        L'application a rencontré un problème inattendu. Appuyez sur le bouton ci-dessous pour réessayer.
                    </Text>

                    {__DEV__ && this.state.error && (
                        <ScrollView className="max-h-32 w-full mb-6 bg-red-50 rounded-2xl p-4 border border-red-100">
                            <Text className="text-red-600 text-xs font-mono">
                                {this.state.error.message}
                            </Text>
                        </ScrollView>
                    )}

                    <TouchableOpacity
                        onPress={this.handleReset}
                        activeOpacity={0.8}
                        className="bg-primary px-8 py-4 rounded-2xl flex-row items-center shadow-lg shadow-primary/20"
                    >
                        <RefreshCw size={18} color="white" />
                        <Text className="text-white font-bold uppercase tracking-wider text-sm ml-3">
                            Réessayer
                        </Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return this.props.children;
    }
}
