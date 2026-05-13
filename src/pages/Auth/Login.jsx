import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabaseClient';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const navigate = useNavigate();
  const { user, role } = useAuth();

  useEffect(() => {
    if (user && role) {
      console.log("[Login] Pengguna dan Peran siap, mengalihkan ke dashboard...");
      navigate('/');
    }
  }, [user, role, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLocalLoading(true);
    setErrorMsg('');

    try {
      // Otomatis menambahkan domain email jika user hanya memasukkan username
      const email = username.includes('@') ? username : `${username}@ktb.co.id`;
      
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;

      // Catatan: Kita tidak memanggil navigate('/') secara manual di sini.
      // Kita membiarkan useEffect di atas yang menangani perpindahan halaman
      // segera setelah AuthContext mendeteksi adanya sesi baru dan selesai mengambil data role.
      
    } catch (error) {
      console.error("[Login] Galat login:", error.message);
      setErrorMsg(error.message === 'Invalid login credentials' 
        ? 'Username atau password salah.' 
        : 'Gagal masuk. Silakan periksa koneksi atau hubungi admin.');
      
      // Jika terjadi error, matikan loading agar user bisa mencoba lagi
      setLocalLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 sm:p-10 border border-gray-100">
        
        {/* Header Visual */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-bold text-3xl shadow-lg mx-auto mb-4">
            K
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Kasir Pintar</h1>
          <p className="text-sm text-gray-500 mt-2 italic font-medium">Masuk untuk mengelola transaksi Anda</p>
        </div>

        {/* Notifikasi Error */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-lg animate-pulse">
            {errorMsg}
          </div>
        )}

        {/* Form Login */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-gray-50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-gray-50 focus:bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={localLoading}
            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all duration-200 ${
              localLoading 
                ? 'bg-blue-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
            }`}
          >
            {localLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Menghubungkan...
              </span>
            ) : (
              'Masuk'
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-gray-400">
          <p>© 2024 Kasir Pintar. Seluruh hak cipta dilindungi.</p>
        </div>
      </div>
    </div>
  );
}