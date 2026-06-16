import React from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, SafeAreaView, StatusBar, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import tw from 'twrnc';

export default function DashboardIndex() {
  return (
    <SafeAreaView style={tw`flex-1 bg-white relative`}>
      <StatusBar barStyle="light-content" backgroundColor="#2ea89c" />
      
      {/* Konten Utama */}
      <ScrollView showsVerticalScrollIndicator={false} style={tw`flex-1 mb-20`}>
        {/* Header Section */}
        <View style={[tw`bg-[#2ea89c] rounded-b-[40px] pb-20 px-6 overflow-hidden relative`, { paddingTop: Platform.OS === 'android' ? 60 : 32 }]}>
          {/* Decorative Background Shapes */}
          <View style={tw`absolute -top-16 -right-12 w-64 h-64 bg-white/10 rounded-full`} />
          <View style={tw`absolute -bottom-12 -left-12 w-48 h-48 bg-black/5 rounded-full`} />
          
          <View style={tw`flex-row justify-between items-center relative z-10`}>
            <View style={tw`flex-row items-center`}>
              <View style={tw`shadow-sm rounded-full bg-white/20 p-1 mr-4`}>
                <Image 
                  source={{ uri: 'https://i.pravatar.cc/150?img=11' }} 
                  style={tw`w-14 h-14 rounded-full border-2 border-white`} 
                />
              </View>
              <View>
                <Text style={tw`text-white/90 text-sm font-medium mb-1 tracking-wide`}>Selamat Pagi,</Text>
                <Text style={tw`text-white font-extrabold text-2xl tracking-tight`}>Awan Oliver</Text>
              </View>
            </View>
            <TouchableOpacity style={tw`p-2 relative`}>
              <Ionicons name="notifications-outline" size={28} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Account ID Card */}
        <View style={tw`px-5 -mt-10 mb-8`}>
          <View style={[
            tw`bg-white rounded-3xl p-6 flex-row justify-between items-start`,
            Platform.OS === 'ios' ? tw`shadow-sm` : tw`shadow-md`,
            { elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 }
          ]}>
            <View style={tw`flex-1 pr-2`}>
              <Text style={tw`text-gray-500 text-xs font-bold tracking-wider mb-2`}>ACCOUNT ID</Text>
              <Text style={tw`text-[#2ea89c] text-sm font-medium tracking-wide`}>93572814066392150847239105</Text>
              <Text style={tw`text-[#2ea89c] text-sm font-medium tracking-wide`} numberOfLines={1} ellipsizeMode="tail">562847103958273645134rgr5....</Text>
            </View>
            <View style={tw`bg-[#e8f6ed] px-3 py-1.5 rounded-full flex-row items-center ml-2 mt-1`}>
              <View style={tw`w-2 h-2 rounded-full bg-[#3b82f6] mr-1.5 ${Platform.OS === 'ios' ? 'bg-[#4ade80]' : 'bg-[#16a34a]'}`} />
              <Text style={tw`text-[#16a34a] text-xs font-bold`}>Terverifikasi</Text>
            </View>
          </View>
        </View>

        {/* Layanan Cepat */}
        <View style={tw`px-6 mb-8`}>
          <Text style={tw`text-xl font-bold text-gray-800 mb-5`}>Layanan Cepat</Text>
          <View style={tw`flex-row gap-4`}>
            {/* Left Large Card */}
            <TouchableOpacity style={[
              tw`bg-[#f0fafa] rounded-3xl p-5 flex-1 justify-between min-h-[160px]`,
              Platform.OS === 'ios' ? tw`shadow-sm` : tw`shadow-md`,
              { elevation: 3, shadowColor: '#1e615e', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8 }
            ]}>
              <View style={tw`w-12 h-12 rounded-full bg-[#1e615e] items-center justify-center mb-6 mt-1 ml-1`}>
                <MaterialCommunityIcons name="medical-bag" size={24} color="white" />
              </View>
              <Text style={tw`text-[#1e615e] font-bold text-base leading-tight pr-2`}>
                Hasil Rekam Medis Terkini
              </Text>
            </TouchableOpacity>

            {/* Right Smaller Cards */}
            <View style={tw`flex-1 gap-4`}>
              <TouchableOpacity style={[
                tw`bg-[#f5fbf6] rounded-3xl p-4 flex-row items-center flex-1`,
                Platform.OS === 'ios' ? tw`shadow-sm` : tw`shadow-md`,
                { elevation: 2, shadowColor: '#348b48', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 6 }
              ]}>
                <View style={tw`w-10 h-10 rounded-full bg-[#e4f5e9] items-center justify-center mr-3`}>
                  <MaterialCommunityIcons name="pill" size={20} color="#348b48" />
                </View>
                <Text style={tw`text-[#348b48] font-bold text-sm flex-1`}>Resep Obat</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[
                tw`bg-[#fff7f5] rounded-3xl p-4 flex-row items-center flex-1`,
                Platform.OS === 'ios' ? tw`shadow-sm` : tw`shadow-md`,
                { elevation: 2, shadowColor: '#b14e4e', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 6 }
              ]}>
                <View style={tw`w-10 h-10 rounded-full bg-[#ffecec] items-center justify-center mr-3`}>
                  <MaterialCommunityIcons name="flask-outline" size={20} color="#b14e4e" />
                </View>
                <Text style={tw`text-[#b14e4e] font-bold text-sm flex-1`}>Hasil Lab</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Kunjungan Terakhir */}
        <View style={tw`px-6 mb-8`}>
          <View style={tw`flex-row justify-between items-center mb-5`}>
            <Text style={tw`text-xl font-bold text-gray-800`}>Kunjungan Terakhir</Text>
            <TouchableOpacity>
              <Text style={tw`text-[#2ea89c] font-bold text-sm`}>Lihat semua</Text>
            </TouchableOpacity>
          </View>

          {/* List Kunjungan */}
          {[
            { id: 1, rs: 'RS Pondok Indah', doctor: 'dr. Sarah Wijaya, Sp.PD' },
            { id: 2, rs: 'RS Janadra', doctor: 'dr. Luna Jaya, Sp.PD' },
            { id: 3, rs: 'Klinik Hamil Sehat', doctor: 'dr. Soetomo, Sp.PD' },
            { id: 4, rs: 'RS Pondok Indah', doctor: 'dr. Sarah Wijaya, Sp.PD' },
          ].map((item, index) => (
            <TouchableOpacity key={item.id} style={tw`bg-white border border-gray-100 rounded-3xl p-4 mb-3 flex-row items-center shadow-sm`}>
              <View style={tw`w-14 h-14 rounded-2xl bg-[#eafaf8] items-center justify-center mr-4`}>
                <MaterialCommunityIcons name="stethoscope" size={26} color="#2ea89c" />
              </View>
              <View style={tw`flex-1`}>
                <Text style={tw`font-bold text-gray-800 text-base mb-1`}>{item.rs}</Text>
                <Text style={tw`text-gray-500 text-sm`}>{item.doctor}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={[
        tw`absolute bottom-0 w-full bg-white flex-row justify-between items-end px-6 pb-6 pt-3 border-t border-gray-100`,
        { elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 10 }
      ]}>
        {/* Beranda */}
        <TouchableOpacity style={tw`items-center flex-1`}>
          <Ionicons name="home" size={24} color="#2ea89c" />
          <Text style={tw`text-[#2ea89c] text-xs font-medium mt-1`}>Beranda</Text>
        </TouchableOpacity>

        {/* RME */}
        <TouchableOpacity style={tw`items-center flex-1`}>
          <Ionicons name="document-text-outline" size={24} color="#9ca3af" />
          <Text style={tw`text-gray-400 text-xs font-medium mt-1`}>RME</Text>
        </TouchableOpacity>

        {/* Floating Scan QR */}
        <View style={tw`items-center flex-1 relative h-14`}>
          <View style={[
            tw`absolute -top-8 bg-white rounded-full p-1.5`,
            { elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5 }
          ]}>
            <TouchableOpacity style={tw`bg-[#2ea89c] w-14 h-14 rounded-full items-center justify-center`}>
              <MaterialCommunityIcons name="qrcode-scan" size={24} color="white" />
            </TouchableOpacity>
          </View>
          <Text style={tw`text-[#2ea89c] text-xs font-medium absolute bottom-0`}>Scan QR</Text>
        </View>

        {/* Log */}
        <TouchableOpacity style={tw`items-center flex-1`}>
          <MaterialCommunityIcons name="history" size={26} color="#9ca3af" />
          <Text style={tw`text-gray-400 text-xs font-medium mt-1`}>Log</Text>
        </TouchableOpacity>

        {/* Profil */}
        <TouchableOpacity style={tw`items-center flex-1`}>
          <Ionicons name="person-outline" size={24} color="#9ca3af" />
          <Text style={tw`text-gray-400 text-xs font-medium mt-1`}>Profil</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}
