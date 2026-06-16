import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Animated,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { authState } from '../../constants/auth';

export default function LoginScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'recovery' | 'qr'>('recovery');

  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scanAnim = useRef(new Animated.Value(0)).current;

  // Focus tracking state
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Recovery Phrase Input State
  const [recoveryPhrase, setRecoveryPhrase] = useState('');

  // Camera Permission and Scan State
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  // Loop QR scan line animation
  useEffect(() => {
    if (activeTab === 'qr') {
      setScanned(false); // Reset scanned state when opening QR tab
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scanAnim.setValue(0);
    }
  }, [activeTab, scanAnim]);

  const switchTab = (tab: 'recovery' | 'qr') => {
    if (tab === activeTab) return;

    // Smooth fade transition
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setActiveTab(tab);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleContinue = () => {
    if (recoveryPhrase.trim() === '') {
      alert('Silakan masukkan kata sandi pemulihan Anda.');
      return;
    }
    console.log('Recovery phrase submitted:', recoveryPhrase);
    alert('Akun berhasil dimuat!');
    authState.login();
    router.replace('/(dashboard)');
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setScanned(true);
    console.log('Barcode scanned:', data);
    alert(`Kode QR berhasil dipindai: ${data}`);
    authState.login();
    router.replace('/(dashboard)');
  };

  // Interpolate translateY for the scanning laser line
  const scanTranslateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 190], // Scanner box is 200px tall
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Top Navbar */}
      <View style={styles.navbarContainer}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.6}>
          <Ionicons name="chevron-back" size={26} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.navbarTitle}>Memuat Akun</Text>
        <View style={styles.spacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ flex: 1 }}>
            {/* Tab Selector - Line Indicator Style matches user request screenshot */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'recovery' && styles.tabButtonActive]}
                onPress={() => switchTab('recovery')}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, activeTab === 'recovery' && styles.tabTextActive]}>
                  Kata Sandi Pemulihan
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'qr' && styles.tabButtonActive]}
                onPress={() => switchTab('qr')}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, activeTab === 'qr' && styles.tabTextActive]}>
                  Pindai Kode QR
                </Text>
              </TouchableOpacity>
            </View>

            {/* Animated Tab Content */}
            <Animated.View style={[styles.contentWrapper, { opacity: fadeAnim }]}>
              {activeTab === 'recovery' ? (
                /* --- KATA SANDI PEMULIHAN FORM --- */
                <View style={styles.tabContent}>

                  {/* Header Title with Shield Icon */}
                  <View style={styles.contentHeader}>
                    <Text style={styles.contentTitle}>Kata Sandi Pemulihan</Text>
                    <Ionicons name="shield-checkmark" size={22} color="#0F172A" style={styles.titleIcon} />
                  </View>

                  {/* Description */}
                  <Text style={styles.description}>
                    Masukkan kata sandi pemulihan Anda untuk memuat akun Anda. Jika Anda belum menyimpannya, Anda dapat menemukannya di pengaturan aplikasi Anda.
                  </Text>

                  {/* Text Input for Recovery Words */}
                  <TextInput
                    style={[
                      styles.textAreaInput,
                      isInputFocused && styles.textAreaInputFocused
                    ]}
                    placeholder="Masukkan kata sandi pemulihan Anda"
                    placeholderTextColor="#94A3B8"
                    multiline={true}
                    numberOfLines={4}
                    value={recoveryPhrase}
                    onChangeText={setRecoveryPhrase}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    textAlignVertical="top"
                  />

                  {/* Continue Button specifically for Recovery Phrase */}
                  <View style={styles.bottomButtonContainer}>
                    <TouchableOpacity
                      style={styles.continueButton}
                      onPress={handleContinue}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.continueButtonText}>Lanjutkan</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* --- PINDAI KODE QR VIEW --- */
                <View style={styles.tabContent}>

                  {/* Header Title with QR Icon */}
                  <View style={styles.contentHeader}>
                    <Text style={styles.contentTitle}>Pindai Kode QR</Text>
                    <Ionicons name="qr-code-outline" size={22} color="#0F172A" style={styles.titleIcon} />
                  </View>

                  {/* Description */}
                  <Text style={styles.description}>
                    Pindai kode QR dari perangkat Anda yang lain untuk masuk secara instan dan aman tanpa perlu mengetik kata sandi pemulihan.
                  </Text>

                  {/* Modern QR Scan Area using expo-camera */}
                  <View style={styles.qrScanBoxContainer}>
                    {!permission ? (
                      <View style={styles.qrScanBox}>
                        <Text style={styles.qrScanInstructions}>Memuat Kamera...</Text>
                      </View>
                    ) : !permission.granted ? (
                      <View style={styles.qrScanBoxPermission}>
                        <Ionicons name="camera-outline" size={48} color="#94A3B8" style={{ marginBottom: 12 }} />
                        <Text style={styles.permissionText}>
                          Akses kamera diperlukan untuk memindai kode QR
                        </Text>
                        <TouchableOpacity
                          style={styles.permissionButton}
                          onPress={requestPermission}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.permissionButtonText}>Berikan Izin Kamera</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.qrScanBox}>
                        {/* Live camera stream */}
                        <CameraView
                          style={StyleSheet.absoluteFillObject}
                          facing="back"
                          barcodeScannerSettings={{
                            barcodeTypes: ['qr'],
                          }}
                          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                        />

                        {/* Glowing corners for scanner overlay */}
                        <View style={[styles.scannerCorner, styles.topLeftCorner]} />
                        <View style={[styles.scannerCorner, styles.topRightCorner]} />
                        <View style={[styles.scannerCorner, styles.bottomLeftCorner]} />
                        <View style={[styles.scannerCorner, styles.bottomRightCorner]} />

                        {/* Animated Scanning Line */}
                        <Animated.View style={[
                          styles.scanningLaserLine,
                          { transform: [{ translateY: scanTranslateY }] }
                        ]} />
                      </View>
                    )}
                    {permission && permission.granted && (
                      <Text style={styles.qrScanInstructions}>
                        {scanned ? 'Sedang memproses kode QR...' : 'Posisikan kode QR di dalam bingkai'}
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  navbarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9', // Subtle divider under navbar
    paddingTop: Platform.OS === 'android' ? 10 : 0,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  navbarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A', // Slate 900
    textAlign: 'center',
  },
  spacer: {
    width: 42, // Match size of back button for perfect centering
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 36,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0', // Slate 200
    marginBottom: 36,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    marginBottom: -1, // Overlap parent border
  },
  tabButtonActive: {
    borderBottomColor: '#1BA098', // Green indicator line
  },
  tabText: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#1BA098', // Green text for active tab
    fontWeight: '700',
  },
  contentWrapper: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  contentTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0F172A', // Slate 900
  },
  titleIcon: {
    marginLeft: 8,
  },
  description: {
    fontSize: 15,
    color: '#475569', // Slate 600
    lineHeight: 24,
    marginBottom: 32,
  },
  textAreaInput: {
    backgroundColor: '#F8FAFC', // Slate 50
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0', // Slate 200
    padding: 16,
    height: 140,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '500',
    lineHeight: 22,
  },
  textAreaInputFocused: {
    borderColor: '#1BA098', // Green border when active
    backgroundColor: '#FFFFFF',
    shadowColor: '#1BA098',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  // QR Scan Layout
  qrScanBoxContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  qrScanBox: {
    width: 240,
    height: 240,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  qrScanBoxPermission: {
    width: 240,
    height: 240,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  permissionText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  permissionButton: {
    backgroundColor: '#1BA098',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scannerCorner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#1BA098', // Green corners
    zIndex: 20,
  },
  topLeftCorner: {
    top: 16,
    left: 16,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  topRightCorner: {
    top: 16,
    right: 16,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  bottomLeftCorner: {
    bottom: 16,
    left: 16,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  bottomRightCorner: {
    bottom: 16,
    right: 16,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  scanningLaserLine: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 3,
    backgroundColor: '#1BA098',
    shadowColor: '#1BA098',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  qrScanInstructions: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 20,
    fontWeight: '500',
    textAlign: 'center',
  },
  bottomButtonContainer: {
    marginTop: 36,
    width: '100%',
  },
  continueButton: {
    backgroundColor: '#1BA098', // Green button
    borderRadius: 28, // Pill shape like "Lanjutkan" in screenshot
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1BA098',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
