import React from "react";
import { TouchableOpacity, Text, TouchableOpacityProps, ActivityIndicator, View } from "react-native";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { LinearGradient } from "expo-linear-gradient";

interface ButtonProps extends TouchableOpacityProps {
    variant?: "primary" | "secondary" | "danger" | "ghost";
    size?: "sm" | "md" | "lg";
    loading?: boolean;
    children: React.ReactNode;
    className?: string;
    textClassName?: string;
}

export function Button({
    variant = "primary",
    size = "md",
    loading = false,
    className,
    textClassName,
    children,
    disabled,
    ...props
}: ButtonProps) {
    const baseClass = "flex flex-row items-center justify-center rounded-2xl overflow-hidden active:scale-[0.97]";
    
    const sizeClasses = {
        sm: "px-4 py-2",
        md: "px-5 py-4",
        lg: "px-6 py-5",
    };

    const variantClasses = {
        primary: "shadow-xl shadow-primary/20",
        secondary: "bg-bg-soft border border-border-light",
        danger: "bg-red-500 shadow-lg shadow-red-500/10",
        ghost: "bg-transparent active:bg-black/5",
    };

    const textClasses = {
        primary: "text-white font-black uppercase tracking-tight",
        secondary: "text-secondary font-bold tracking-tight",
        danger: "text-white font-bold uppercase tracking-tight",
        ghost: "text-secondary font-bold",
    };

    const mergedClass = twMerge(
        clsx(baseClass, sizeClasses[size], variantClasses[variant], (disabled || loading) && "opacity-60"),
        className
    );

    const mergedTextClass = twMerge(
        clsx("text-center text-sm", textClasses[variant]),
        textClassName
    );

    const content = (
        <>
            {loading ? (
                <ActivityIndicator color={variant === "primary" ? "#FFFFFF" : "#E67E22"} />
            ) : (
                typeof children === 'string' ? (
                    <Text className={mergedTextClass}>{children}</Text>
                ) : children
            )}
        </>
    );

    if (variant === "primary" && !disabled && !loading) {
        return (
            <TouchableOpacity 
                disabled={disabled || loading} 
                activeOpacity={0.8}
                {...props}
            >
                <LinearGradient
                    colors={['#4A3520', '#E67E22']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className={mergedClass}
                >
                    {content}
                </LinearGradient>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity 
            className={mergedClass} 
            disabled={disabled || loading} 
            activeOpacity={0.7}
            {...props}
        >
            {content}
        </TouchableOpacity>
    );
}
