import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { supabase } from '../config/supabaseClient'; // Gunakan import ini di project asli Anda

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const currentUserRef = useRef(null);
  // Tambahkan flag ini untuk menandai apakah kita sedang dalam fase load awal
  const isInitializingRef = useRef(true); 

  const fetchUserRole = async (userId) => {
    try {
      console.log("[Auth] Memulai pengambilan role untuk ID:", userId);
      const dbRequest = supabase.from('profiles').select('role').eq('id', userId).single();
      const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Timeout: Permintaan ke database terlalu lama dan nyangkut.")), 5000);
      });
      const { data, error } = await Promise.race([dbRequest, timeout]);

      if (error) throw error;
      if (data) {
        setRole(data.role);
        console.log("[Auth] Role berhasil dimuat:", data.role);
      }
    } catch (err) {
      console.error("[Auth] Gagal mengambil role:", err.message);
      setRole('kasir'); 
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session?.user) {
          currentUserRef.current = session.user.id;
          if (isMounted) setUser(session.user);
          // Ini adalah satu-satunya proses fetch saat aplikasi baru dimuat
          await fetchUserRole(session.user.id); 
        } else {
          currentUserRef.current = null;
          if (isMounted) {
            setUser(null);
            setRole(null);
          }
        }
      } catch (error) {
        console.error("[Auth] Kesalahan saat inisialisasi sesi:", error.message);
      } finally {
        // Tandai bahwa fase inisialisasi awal sudah selesai
        isInitializingRef.current = false; 
        if (isMounted) setLoading(false); 
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[Auth] Event: ${event} | Prev ID: ${currentUserRef.current} | New ID: ${session?.user?.id} | isInit: ${isInitializingRef.current}`);

      if (event === 'INITIAL_SESSION') return;

      if (event === 'SIGNED_IN') {
        const newUserId = session?.user?.id;
        
        // MENCEGAH RACE CONDITION: 
        // Jika kita MENGANGGAP kita masih dalam fase inisialisasi awal, 
        // biarkan initializeAuth() yang menangani fetch role, bukan listener ini.
        if (isInitializingRef.current) {
          console.log("[Auth] Mengabaikan SIGNED_IN karena aplikasi masih dalam fase inisialisasi awal.");
          return; 
        }

        if (newUserId === currentUserRef.current) {
           console.log("[Auth] Mengabaikan SIGNED_IN karena user ID tidak berubah (Tab Focus/Token Refresh).");
           return;
        }

        if (isMounted) {
          setLoading(true);
          currentUserRef.current = newUserId;
          setUser(session?.user || null);
          
          if (newUserId) {
            await fetchUserRole(newUserId);
          }
          setLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        if (isMounted) {
          currentUserRef.current = null;
          setUser(null);
          setRole(null);
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  const value = { user, role, loading };

  return (
    <AuthContext.Provider value={value}>
      {!loading ? children : (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-white">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 font-medium animate-pulse">Menghubungkan ke server...</p>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth harus digunakan di dalam AuthProvider');
  return context;
}

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center border border-gray-200">
          <h1 className="text-xl font-bold text-gray-800 mb-2">Simulasi Anti-Race Condition</h1>
          <p className="text-gray-600 text-sm">
            Logika <code className="bg-gray-100 px-1 rounded text-red-500">isInitializingRef</code> telah ditambahkan. Ini mencegah <i>listener</i> mencoba mengambil data secara prematur saat aplikasi baru dimuat.
          </p>
        </div>
      </div>
    </AuthProvider>
  );
}