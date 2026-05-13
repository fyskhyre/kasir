import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabaseClient';
import { useAlert } from '../../context/AlertContext';

export default function Profile() {
  const navigate = useNavigate();
  const { showAlert } = useAlert();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('');
  
  // State untuk Mode Edit & Modal Logout
  const [isEditing, setIsEditing] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  // Backup data untuk fitur "Batal"
  const [originalData, setOriginalData] = useState({});
  const [formData, setFormData] = useState({
    nama_lengkap: '',
    nama_toko: '',
    alamat: '',
    pesan_footer: ''
  });

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      
      // 1. Ambil Data User
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (user) setUserEmail(user.email);

      let fetchedData = { nama_lengkap: '', nama_toko: '', alamat: '', pesan_footer: '' };

      // 2. Ambil Profil Pengguna
      if (user?.id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('nama_lengkap, role')
          .eq('id', user.id)
          .single();
          
        if (profileData) {
          setUserRole(profileData.role);
          fetchedData.nama_lengkap = profileData.nama_lengkap || '';
        }
      }

      // 3. Ambil Pengaturan Toko
      const { data: storeData } = await supabase
        .from('store_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (storeData) {
        fetchedData.nama_toko = storeData.nama_toko || '';
        fetchedData.alamat = storeData.alamat || '';
        fetchedData.pesan_footer = storeData.pesan_footer || '';
      }

      // Simpan ke state aktif dan state backup
      setFormData(fetchedData);
      setOriginalData(fetchedData);

    } catch (error) {
      console.error('Gagal mengambil data profil:', error.message);
      showAlert('Gagal mengambil data profil: ' + error.message, 'warning');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBatal = () => {
    setFormData(originalData); // Kembalikan ke data semula
    setIsEditing(false); // Kunci kembali
  };

  const handleSimpan = async (e) => {
    e.preventDefault();
    if (!formData.nama_toko) return showAlert('Nama Toko tidak boleh kosong!', 'warning');

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      // 1. Update Profil Pengguna
      if (user?.id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ nama_lengkap: formData.nama_lengkap })
          .eq('id', user.id);
          
        if (profileError) throw profileError;
      }

      // 2. Update Pengaturan Toko
      const { error: storeError } = await supabase
        .from('store_settings')
        .upsert({ 
          id: 1, 
          nama_toko: formData.nama_toko,
          alamat: formData.alamat,
          pesan_footer: formData.pesan_footer,
          updated_at: new Date().toISOString()
        });

      if (storeError) throw storeError;

      // Update backup data dengan data terbaru yang sudah disimpan
      setOriginalData(formData);
      setIsEditing(false);
      showAlert('Profil berhasil diperbarui!', 'success');
      
    } catch (error) {
      showAlert('Gagal menyimpan perubahan: ' + error.message, 'warning');
    } finally {
      setSaving(false);
    }
  };

  const eksekusiLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Helper untuk styling input dinamis (Bisa diketik vs Terkunci)
  const inputClass = `w-full transition-all outline-none resize-none text-sm ${
    isEditing 
      ? 'border border-gray-300 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:bg-white text-gray-800' 
      : 'border-transparent bg-transparent p-0 text-gray-900 font-semibold'
  }`;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full h-full overflow-y-auto bg-gray-50 animate-fade-in pb-36">
      
      {/* HEADER: Tombol logout sudah dipindah dari sini */}
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Profil & Pengaturan</h2>
        <p className="text-gray-500 text-xs sm:text-sm mt-1">Kelola informasi akun dan identitas toko Anda.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        
        {/* BANNER AKUN */}
        <div className="bg-blue-600 p-6 sm:p-8 text-white flex items-center space-x-4 sm:space-x-6 relative">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-bold border-2 border-white/40 shadow-inner">
            {formData.nama_lengkap ? formData.nama_lengkap.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-bold">{formData.nama_lengkap || 'Pengguna'}</h3>
            <p className="opacity-80 text-sm">{userEmail}</p>
            <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-xs font-semibold uppercase tracking-wider">
              Role: {userRole || 'Kasir'}
            </span>
          </div>
        </div>

        {/* FORM PENGATURAN */}
        <form onSubmit={handleSimpan} className="p-4 sm:p-6 lg:p-8 space-y-6">
          
          <div className="space-y-4">
            <h4 className="font-bold text-gray-800 border-b border-gray-100 pb-2 text-sm sm:text-base">Informasi Akun</h4>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-500 mb-1">Nama Lengkap</label>
              <input 
                type="text" 
                name="nama_lengkap"
                value={formData.nama_lengkap}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder={isEditing ? "Masukkan nama lengkap" : "-"} 
                className={inputClass} 
              />
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <h4 className="font-bold text-gray-800 border-b border-gray-100 pb-2 text-sm sm:text-base">Identitas Toko (Struk)</h4>
            
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-500 mb-1">Nama Toko *</label>
              <input 
                type="text" 
                name="nama_toko"
                value={formData.nama_toko}
                onChange={handleChange}
                disabled={!isEditing}
                required={isEditing}
                placeholder={isEditing ? "Misal: Kopi Senja Utama" : "-"} 
                className={inputClass} 
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-500 mb-1">Alamat Toko</label>
              <textarea 
                name="alamat"
                value={formData.alamat}
                onChange={handleChange}
                disabled={!isEditing}
                rows={isEditing ? "3" : "2"} 
                placeholder={isEditing ? "Masukkan alamat lengkap toko" : "-"}
                className={inputClass} 
              ></textarea>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-500 mb-1">Pesan Footer Struk</label>
              <input 
                type="text" 
                name="pesan_footer"
                value={formData.pesan_footer}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder={isEditing ? "Misal: Terima kasih atas kunjungan Anda!" : "-"} 
                className={inputClass} 
              />
            </div>
          </div>

          {/* AREA TOMBOL AKSI */}
          <div className="pt-6 border-t border-gray-100 mt-6 flex flex-col gap-3">
            {isEditing ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  type="button" 
                  onClick={handleBatal}
                  disabled={saving}
                  className="w-full sm:w-1/3 px-6 py-3.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition active:scale-95"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className={`w-full sm:w-2/3 px-6 py-3.5 rounded-xl font-bold text-white transition shadow-md flex justify-center items-center ${saving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}`}
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Menyimpan...
                    </>
                  ) : 'Simpan Perubahan'}
                </button>
              </div>
            ) : (
              <>
                <button 
                  type="button" 
                  onClick={() => setIsEditing(true)}
                  className="w-full px-6 py-3.5 bg-blue-50 text-blue-600 rounded-xl font-bold border border-blue-200 hover:bg-blue-100 transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  Edit Profil
                </button>
                
                <button 
                  type="button" 
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-full px-6 py-3.5 bg-white text-red-500 rounded-xl font-bold border border-red-200 hover:bg-red-50 transition active:scale-95 flex items-center justify-center gap-2 mt-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  Keluar Akun
                </button>
              </>
            )}
          </div>

        </form>
      </div>

      {/* CUSTOM CONFIRMATION MODAL LOGOUT */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center items-center p-4 animate-fade-in" onClick={() => setShowLogoutConfirm(false)}>
          <div className="bg-white max-w-sm w-full rounded-3xl p-6 shadow-2xl text-center flex flex-col items-center animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-sm">
              <svg className="w-8 h-8 text-red-500 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <h3 className="text-xl font-black text-gray-800 mb-2">Keluar Aplikasi</h3>
            <p className="text-gray-600 text-sm mb-6">Apakah Anda yakin ingin mengakhiri sesi dan keluar dari akun ini?</p>
            
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition active:scale-95"
              >
                Batal
              </button>
              <button 
                onClick={eksekusiLogout}
                className="flex-1 py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-md transition active:scale-95"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}