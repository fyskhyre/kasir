import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../config/supabaseClient';

export default function MainLayout() {
  // Mock Router untuk Canvas
  const isCanvas = typeof window !== 'undefined' && !window.location.pathname.includes('/');
  const navigate = isCanvas ? () => {} : useNavigate();
  const location = isCanvas ? { pathname: '/kasir' } : useLocation();
  
  // State untuk menyimpan role
  const [role, setRole] = useState('');

  // Fetch role langsung dari Supabase saat Layout dimuat
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        // 1. Dapatkan data user yang sedang login
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // 2. Ambil role dari tabel profiles berdasarkan ID user
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
            
          if (profile) {
            setRole(profile.role);
          }
        }
      } catch (error) {
        console.error('Gagal mengambil role user:', error);
      }
    };

    fetchUserRole();
  }, []);

  // Mendapatkan path saat ini untuk menentukan tab mana yang aktif
  const currentPath = location.pathname;

  // TODO: Nanti kita akan hubungkan ini dengan Context API / Global State
  // agar jumlah item di keranjang bisa tampil di Bottom Navigation
  const totalItemKeranjang = 0; 

  // Logika: Pengecekan role yang aman
  // Tombol Home HANYA akan muncul jika role-nya adalah 'admin'
  const isAdmin = String(role).toLowerCase() === 'admin';

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-800 font-sans">
      
      {/* Area Konten Dinamis (Halaman-halaman akan dirender di dalam Outlet ini) */}
      <main className="flex-1 overflow-y-auto pb-[76px] sm:pb-[84px] w-full">
        <Outlet />
      </main>

      {/* Bottom Navigation - Lebih ramah sentuhan (Touch-friendly) */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 px-1 sm:px-4 py-2 sm:py-3 flex justify-between items-center z-50 shadow-[0_-4px_15px_rgba(0,0,0,0.03)] pb-safe">
        
        {/* Tab: Home - HANYA DITAMPILKAN UNTUK ADMIN */}
        {isAdmin && (
          <button onClick={() => navigate('/')} className={`flex flex-col items-center flex-1 py-1 sm:py-2 rounded-xl transition active:scale-95 ${currentPath === '/' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
            <svg className="w-5 h-5 sm:w-6 sm:h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-[9px] sm:text-[10px] font-semibold">Home</span>
          </button>
        )}

        {/* Tab: Kasir */}
        <button onClick={() => navigate('/kasir')} className={`flex flex-col items-center flex-1 py-1 sm:py-2 rounded-xl transition active:scale-95 ${currentPath === '/kasir' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
          <div className="relative">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            {totalItemKeranjang > 0 && (
              <span className="absolute -top-1 -right-1.5 sm:-right-2 bg-red-500 text-white text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                {totalItemKeranjang}
              </span>
            )}
          </div>
          <span className="text-[9px] sm:text-[10px] font-semibold">Kasir</span>
        </button>

        {/* Tab: Uang Keluar */}
        <button onClick={() => navigate('/pengeluaran')} className={`flex flex-col items-center flex-1 py-1 sm:py-2 rounded-xl transition active:scale-95 ${currentPath === '/pengeluaran' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
          <svg className="w-5 h-5 sm:w-6 sm:h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="text-[9px] sm:text-[10px] font-semibold">Keluar</span>
        </button>

        {/* Tab: Menu */}
        <button onClick={() => navigate('/menu')} className={`flex flex-col items-center flex-1 py-1 sm:py-2 rounded-xl transition active:scale-95 ${currentPath === '/menu' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
          <svg className="w-5 h-5 sm:w-6 sm:h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          <span className="text-[9px] sm:text-[10px] font-semibold">Menu</span>
        </button>

        {/* Tab: Riwayat */}
        <button onClick={() => navigate('/riwayat')} className={`flex flex-col items-center flex-1 py-1 sm:py-2 rounded-xl transition active:scale-95 ${currentPath === '/riwayat' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
          <svg className="w-5 h-5 sm:w-6 sm:h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[9px] sm:text-[10px] font-semibold">Riwayat</span>
        </button>

        {/* Tab: Profil */}
        <button onClick={() => navigate('/profil')} className={`flex flex-col items-center flex-1 py-1 sm:py-2 rounded-xl transition active:scale-95 ${currentPath === '/profil' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
          <svg className="w-5 h-5 sm:w-6 sm:h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-[9px] sm:text-[10px] font-semibold">Profil</span>
        </button>
      </nav>

    </div>
  );
}