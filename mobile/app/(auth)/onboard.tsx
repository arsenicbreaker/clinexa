import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function OnboardScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {/* Placeholder for the illustration */}
                <View style={styles.illustrationContainer}>
                    <View style={styles.documentIcon1}>
                        <Ionicons name="document-text" size={100} color="#E0F2F1" />
                    </View>
                    <View style={styles.documentIcon2}>
                        <Ionicons name="document-text" size={120} color="#B2DFDB" />
                    </View>
                    <View style={styles.magnifyingGlass}>
                        <View style={styles.searchIconBackground}>
                            <Ionicons name="search" size={32} color="#FFFFFF" />
                        </View>
                    </View>
                </View>

                <View style={styles.textContainer}>
                    <Text style={styles.title}>Clinexa</Text>
                    <Text style={styles.subtitle}>
                        Privasi untuk rekam medis digital yang aman dan terkontrol.
                    </Text>
                </View>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => router.push('/(auth)/register')}
                    >
                        <Text style={styles.primaryButtonText}>Buat akun</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => router.push('/(auth)/login')}
                    >
                        <Text style={styles.secondaryButtonText}>Sudah punya akun</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 60,
        paddingBottom: 40,
    },
    illustrationContainer: {
        width: width * 0.8,
        height: width * 0.8,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        marginTop: 20,
    },
    documentIcon1: {
        position: 'absolute',
        left: 20,
        top: 40,
        transform: [{ rotate: '-15deg' }],
    },
    documentIcon2: {
        position: 'absolute',
        right: 30,
        top: 20,
        transform: [{ rotate: '5deg' }],
    },
    magnifyingGlass: {
        position: 'absolute',
        bottom: 60,
        left: '40%',
        backgroundColor: '#1BA098',
        borderRadius: 40,
        padding: 16,
        borderWidth: 4,
        borderColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    searchIconBackground: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        alignItems: 'center',
        marginTop: -40,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1BA098',
        marginBottom: 16,
    },
    subtitle: {
        fontSize: 16,
        color: '#666666',
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 20,
    },
    buttonContainer: {
        width: '100%',
        gap: 16,
    },
    primaryButton: {
        backgroundColor: '#1BA098',
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        shadowColor: '#1BA098',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    secondaryButton: {
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    secondaryButtonText: {
        color: '#1BA098',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
