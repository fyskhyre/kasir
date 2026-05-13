import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';

export default function Dashboard() {
  const [isAdmin, setIsAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // State untuk menyimpan ringkasan data
  const [stats, setStats] = useState({
    pendapatanHariIni: 0,
    pengeluaranHariIni: 0,
    totalTransaksi: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // 1. Cek User & Role saat ini
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Pengguna tidak terautentikasi');

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        setIsAdmin(false);
        setLoading(false);
        return; // Hentikan proses jika bukan admin
      }
      setIsAdmin(true);

      // 2. Siapkan rentang waktu untuk "Hari Ini" (00:00 - 23:59)
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // 3. Ambil total pendapatan (transaksi) hari ini
      const { data: transactions, error: trxError } = await supabase
        .from('transactions')
        .select('total_belanja')
        .gte('tanggal', startOfDay.toISOString())
        .lte('tanggal', endOfDay.toISOString());

      if (trxError) throw trxError;

      // 4. Ambil total pengeluaran hari ini
      const { data: expenses, error: expError } = await supabase
        .from('expenses')
        .select('nominal')
        .gte('tanggal', startOfDay.toISOString())
        .lte('tanggal', endOfDay.toISOString());

      if (expError) throw expError;

      // 5. Hitung total
      const totalPendapatan = transactions.reduce((sum, trx) => sum + trx.total_belanja, 0);
      const totalPengeluaran = expenses.reduce((sum, exp) => sum + exp.nominal, 0);

      setStats({
        pendapatanHariIni: totalPendapatan,
        pengeluaranHariIni: totalPengeluaran,
        totalTransaksi: transactions.length,
      });

    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- TAMPILAN LOADING ---
  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // --- TAMPILAN JIKA BUKAN ADMIN ---
  if (isAdmin === false) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full text-center">
        <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Akses Ditolak</h2>
        <p className="text-gray-500 mt-2">Halaman Dashboard hanya dapat diakses oleh Admin.</p>
      </div>
    );
  }

  // --- TAMPILAN UTAMA DASHBOARD ADMIN ---
  const labaBersih = stats.pendapatanHariIni - stats.pengeluaranHariIni;

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6">Ringkasan Hari Ini</h2>

      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6">
          Gagal memuat data: {errorMsg}
        </div>
      )}

      {/* Grid Kartu Statistik */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Kartu: Pendapatan Kotor */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm font-medium">Pendapatan Kotor</h3>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-gray-900">
            Rp {stats.pendapatanHariIni.toLocaleString('id-ID')}
          </div>
          <p className="text-xs text-gray-400 mt-2">Dari {stats.totalTransaksi} transaksi</p>
        </div>

        {/* Kartu: Pengeluaran */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm font-medium">Pengeluaran</h3>
            <div className="p-2 bg-red-50 text-red-500 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-gray-900">
            Rp {stats.pengeluaranHariIni.toLocaleString('id-ID')}
          </div>
          <p className="text-xs text-gray-400 mt-2">Uang keluar hari ini</p>
        </div>

        {/* Kartu: Laba Bersih */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
          {/* Aksen background untuk Laba Bersih */}
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-green-50 rounded-full opacity-50"></div>
          
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-gray-500 text-sm font-medium">Laba Bersih</h3>
            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
          </div>
          <div className={`text-2xl sm:text-3xl font-bold relative z-10 ${labaBersih >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            Rp {labaBersih.toLocaleString('id-ID')}
          </div>
          <p className="text-xs text-gray-400 mt-2 relative z-10">Pendapatan - Pengeluaran</p>
        </div>

      </div>

      {/* Tempat untuk grafik / daftar transaksi terbaru (Bisa ditambahkan nanti) */}
      <div className="mt-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center text-gray-500 py-16">
        <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
        <p>Ringkasan transaksi lengkap akan tampil di sini</p>
      </div>
    </div>
  );
}