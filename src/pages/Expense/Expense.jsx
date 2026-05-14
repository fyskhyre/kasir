import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';

export default function Expense() {
  const [currentUser, setCurrentUser] = useState(null); // <--- TAMBAHAN: State Sesi Kasir
  const [keterangan, setKeterangan] = useState('');
  const [nominal, setNominal] = useState('');
  const [riwayatPengeluaran, setRiwayatPengeluaran] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Ambil riwayat pengeluaran saat halaman pertama kali dimuat
  useEffect(() => {
    fetchRiwayat();
  }, []);

  const fetchRiwayat = async () => {
    try {
      setLoading(true);

      // --- TAMBAHAN RBAC: Ambil Sesi Kasir di awal ---
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        alert('Sesi tidak valid. Harap login kembali.');
        setLoading(false);
        return;
      }
      setCurrentUser(user);

      // Mengambil 50 data pengeluaran terakhir dari Supabase
      // Jika RLS sudah aktif, otomatis hanya menarik pengeluaran kasir ini saja
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('tanggal', { ascending: false })
        .limit(50);

      if (error) throw error;
      setRiwayatPengeluaran(data || []);
    } catch (error) {
      console.error('Gagal mengambil riwayat:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const simpanUangKeluar = async (e) => {
    e.preventDefault();
    if (!keterangan || !nominal) return alert('Harap isi keterangan dan nominal!');
    if (!currentUser) return alert('Sesi tidak valid, harap muat ulang halaman.'); // <--- Proteksi RBAC
    
    try {
      setSubmitting(true);

      const pengeluaranBaru = {
        user_id: currentUser.id, // <--- Menyematkan ID Kasir
        keterangan: keterangan,
        nominal: parseInt(nominal)
      };

      // Simpan ke tabel expenses di Supabase
      const { data, error } = await supabase
        .from('expenses')
        .insert([pengeluaranBaru])
        .select();

      if (error) throw error;

      alert(`Berhasil mencatat pengeluaran:\n${keterangan} - Rp ${parseInt(nominal).toLocaleString('id-ID')}`);
      
      // Reset Form Input
      setKeterangan('');
      setNominal('');
      
      // Tambahkan data baru ke bagian atas daftar riwayat tanpa perlu reload halaman
      if (data && data.length > 0) {
        setRiwayatPengeluaran([data[0], ...riwayatPengeluaran]);
      } else {
        fetchRiwayat();
      }

    } catch (error) {
      alert('Terjadi kesalahan: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Fungsi pembantu untuk memformat tanggal (Timestamp -> 06 Mei 2026, 14:30)
  const formatTanggal = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('id-ID', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(/\./g, ':');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col bg-gray-50 overflow-y-auto max-w-7xl mx-auto w-full animate-fade-in">
      <div className="mb-4 sm:mb-6 flex-shrink-0">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Uang Keluar</h2>
        <p className="text-gray-500 text-xs sm:text-sm mt-1">Catat dan pantau pengeluaran operasional Anda.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 flex-1 items-start">
        
        {/* Kolom Kiri: Form Input */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 lg:sticky lg:top-0">
          <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 border-b pb-2">Catat Pengeluaran Baru</h3>
          
          <form onSubmit={simpanUangKeluar} className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Keterangan / Keperluan</label>
              <input 
                type="text" 
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Misal: Beli es batu 2 bungkus" 
                className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none transition bg-gray-50 focus:bg-white" 
                required
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Nominal (Rp)</label>
              <input 
                type="number" 
                value={nominal}
                onChange={(e) => setNominal(e.target.value)}
                placeholder="0" 
                min="1"
                className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none transition bg-gray-50 focus:bg-white" 
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={submitting}
              className={`w-full text-white font-bold py-2.5 sm:py-3 rounded-xl mt-2 sm:mt-4 shadow-sm transition active:scale-[0.98] flex justify-center items-center ${
                submitting ? 'bg-red-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {submitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Menyimpan...
                </>
              ) : 'Simpan Pengeluaran'}
            </button>
          </form>
        </div>

        {/* Kolom Kanan: Riwayat Uang Keluar */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 mb-20 lg:mb-0">
          <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 border-b pb-2">Riwayat Uang Keluar (Terbaru)</h3>
          
          <div className="space-y-3 sm:space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
              </div>
            ) : riwayatPengeluaran.length === 0 ? (
              <p className="text-gray-400 text-xs sm:text-sm text-center py-4">Belum ada catatan pengeluaran.</p>
            ) : (
              riwayatPengeluaran.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-2.5 sm:p-3 bg-gray-50 rounded-xl border border-gray-100 transition hover:shadow-sm">
                  <div>
                    <p className="font-semibold text-xs sm:text-sm text-gray-800">{item.keterangan}</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">
                      {formatTanggal(item.tanggal)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm sm:text-base text-red-600">
                      - Rp {item.nominal.toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}
