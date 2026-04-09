import React, { forwardRef } from "react";
import { View, Text, TextInput as RNTextInput, TextInputProps as RNTextInputProps } from "react-native";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface InputProps extends RNTextInputProps {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
    containerClassName?: string;
    inputClassName?: string;
    labelClassName?: string;
    errorClassName?: string;
}

export const Input = forwardRef<RNTextInput, InputProps>(
    ({ label, error, icon, containerClassName, inputClassName, labelClassName, errorClassName, ...props }, ref) => {
        return (
            <View className={twMerge("w-full mb-5", containerClassName)}>
                {label && (
                    <Text className={twMerge("text-[10px] font-black text-secondary mb-2 ml-1 uppercase tracking-[3px]", labelClassName)}>
                        {label}
                    </Text>
                )}
                <View className="relative w-full">
                    {icon && (
                        <View className="absolute left-4 top-0 bottom-0 z-10 flex flex-row items-center justify-center">
                            {icon}
                        </View>
                    )}
                    <RNTextInput
                        ref={ref}
                        placeholderTextColor="#A08060" // Warm brown-gray placeholder
                        className={twMerge(
                            "w-full bg-bg-soft border border-border-light rounded-2xl py-4.5 px-5 text-secondary text-base font-bold tracking-tight focus:border-primary",
                            icon ? "pl-14" : "pl-6",
                            error ? "border-red-500 bg-red-50 focus:border-red-500" : "border-border-light",
                            inputClassName
                        )}
                        {...props}
                    />
                </View>
                {error && (
                    <Text className={twMerge("text-[10px] font-black text-red-500 mt-2 ml-1 uppercase tracking-wider", errorClassName)}>
                        {error}
                    </Text>
                )}
            </View>
        );
    }
);

Input.displayName = "Input";
