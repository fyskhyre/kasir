import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../config/supabaseClient';

export default function MenuManager() {
  // === STATE DATABASE (CRUD) ===
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // === STATE MODAL MENU ===
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ id: null, nama: '', harga: '', kategori_id: '', image_url: '' });
  
  // State khusus untuk file gambar baru yang dipilih
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  // === STATE MODAL KATEGORI ===
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);

  // === FUNGSI FETCH DATA ===
  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: catData, error: catError } = await supabase.from('categories').select('*').order('urutan', { ascending: true });
      if (catError) throw catError;
      setCategories(catData || []);

      const { data: prodData, error: prodError } = await supabase.from('products').select('*');
      if (prodError) throw prodError;
      setProducts(prodData || []);
    } catch (error) {
      console.error('Gagal mengambil data:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // === FUNGSI CRUD MENU ===
  const handleTambahMenu = () => {
    setFormData({ id: null, nama: '', harga: '', kategori_id: categories.length > 0 ? categories[0].id : '', image_url: '' });
    setImageFile(null);
    setImagePreview(null);
    setIsModalOpen(true);
  };

  const handleEditMenu = (product) => {
    setFormData({ id: product.id, nama: product.nama, harga: product.harga, kategori_id: product.kategori_id, image_url: product.image_url || '' });
    setImageFile(null);
    setImagePreview(product.image_url || null);
    setIsModalOpen(true);
  };

  const handleHapusMenu = async (id, nama) => {
    if (!window.confirm(`Hapus menu "${nama}"?`)) return;
    try {
      setLoading(true);
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      alert('Gagal menghapus: ' + error.message);
      setLoading(false);
    }
  };

  // Fungsi untuk menangani perubahan input file gambar
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      // Buat URL sementara untuk preview gambar
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);
    }
  };

  const handleSimpanMenu = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      
      let finalImageUrl = formData.image_url;

      // Jika ada file gambar baru yang dipilih, upload ke Supabase Storage
      if (imageFile) {
        // Buat nama file unik
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        // Upload ke bucket 'menu_images'
        const { error: uploadError } = await supabase.storage
          .from('menu_images')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        // Dapatkan Public URL setelah berhasil upload
        const { data: publicUrlData } = supabase.storage
          .from('menu_images')
          .getPublicUrl(filePath);
          
        finalImageUrl = publicUrlData.publicUrl;
      }
      
      const payload = { 
        nama: formData.nama, 
        harga: parseInt(formData.harga), 
        kategori_id: formData.kategori_id,
        image_url: finalImageUrl
      };

      if (formData.id) {
        const { error } = await supabase.from('products').update(payload).eq('id', formData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert([payload]);
        if (error) throw error;
      }
      
      setIsModalOpen(false);
      fetchData();
      
      // Bersihkan URL sementara dari memori
      if (imagePreview && imageFile) URL.revokeObjectURL(imagePreview);
      
    } catch (error) {
      alert('Gagal menyimpan menu: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // === FUNGSI CRUD KATEGORI ===
  const handleSimpanKategori = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return alert('Nama kategori tidak boleh kosong!');
    try {
      setIsSubmittingCategory(true);
      const { error } = await supabase.from('categories').insert([{ nama: newCategoryName.trim(), urutan: categories.length }]);
      if (error) throw error;
      setIsCategoryModalOpen(false);
      setNewCategoryName('');
      fetchData();
    } catch (error) {
      alert('Gagal menyimpan kategori: ' + error.message);
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const uncategorizedProducts = products.filter(p => !p.kategori_id || !categories.find(c => String(c.id) === String(p.kategori_id)));

  return (
    <div className="bg-gray-50 min-h-screen text-gray-800 font-sans pb-10">
      
      {/* Konten Utama */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        
        {/* Header Aksi */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 mt-4 sm:mt-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Kelola Menu</h2>
            <p className="text-gray-500 text-sm mt-1">Tambah menu, edit foto, dan kelola kategori produk.</p>
          </div>
          <div className="flex space-x-2 w-full sm:w-auto">
            <button onClick={() => setIsCategoryModalOpen(true)} className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 sm:py-2 rounded-xl text-sm font-bold shadow-sm transition flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              <span>Kategori</span>
            </button>
            <button onClick={handleTambahMenu} className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 sm:py-2 rounded-xl text-sm font-bold shadow-sm transition flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              <span>Menu</span>
            </button>
          </div>
        </div>

        {/* Peringatan Kategori Kosong */}
        {!loading && categories.length === 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg flex justify-between items-center shadow-sm">
            <p className="text-sm text-yellow-700 font-medium">Belum ada kategori. Silakan buat kategori pertama Anda.</p>
          </div>
        )}

        {/* Daftar Produk berdasarkan Kategori (FORMAT LIST) */}
        {loading ? (
           <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>
        ) : products.length === 0 ? (
           <div className="text-center py-12 bg-white rounded-xl border border-gray-100 shadow-sm"><p className="text-gray-500">Belum ada menu produk terdaftar.</p></div>
        ) : (
          <div className="space-y-8">
            
            {/* Render per Kategori */}
            {categories.map(category => {
              const categoryProducts = products.filter(p => String(p.kategori_id) === String(category.id));
              if (categoryProducts.length === 0) return null;

              return (
                <div key={category.id} className="mb-4">
                  {/* Judul Kategori & Bar Pemisah */}
                  <div className="flex items-center gap-4 mb-4">
                    <h3 className="font-bold text-lg text-gray-800 whitespace-nowrap">{category.nama}</h3>
                    <div className="h-px bg-gray-200 flex-1 mt-1"></div>
                  </div>

                  {/* FORMAT LIST (Bukan Grid) */}
                  <div className="flex flex-col gap-3 sm:gap-4">
                    {categoryProducts.map(product => {
                      return (
                        <div key={product.id} className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-100 transition flex items-center gap-3 sm:gap-4">
                          
                          {/* Kiri: Foto / Thumbnail */}
                          <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 bg-gray-50 border border-gray-100 rounded-lg overflow-hidden flex items-center justify-center text-gray-300">
                            {product.image_url ? (
                              <img src={product.image_url} alt={product.nama} className="w-full h-full object-cover" />
                            ) : (
                              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            )}
                          </div>

                          {/* Tengah: Info Produk */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-800 text-sm sm:text-base truncate">{product.nama}</h4>
                            <span className="text-[11px] sm:text-xs text-gray-400 block mt-0.5">{category.nama}</span>
                            <div className="font-bold text-blue-600 mt-1 sm:mt-2 text-sm sm:text-base">
                              Rp {product.harga.toLocaleString('id-ID')}
                            </div>
                          </div>

                          {/* Kanan: Tombol Aksi */}
                          <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2 shrink-0">
                            <button onClick={() => handleEditMenu(product)} className="p-2 sm:px-3 sm:py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg sm:rounded-md transition text-xs font-bold flex items-center justify-center gap-1.5">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                              <span className="hidden sm:inline">Edit</span>
                            </button>
                            <button onClick={() => handleHapusMenu(product.id, product.nama)} className="p-2 sm:px-3 sm:py-1.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg sm:rounded-md transition text-xs font-bold flex items-center justify-center gap-1.5">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              <span className="hidden sm:inline">Hapus</span>
                            </button>
                          </div>
                          
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Kategori: Lainnya (Untuk produk yang tidak punya kategori valid) */}
            {uncategorizedProducts.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-4 mb-4">
                  <h3 className="font-bold text-lg text-gray-800 whitespace-nowrap">Lainnya (Tanpa Kategori)</h3>
                  <div className="h-px bg-gray-200 flex-1 mt-1"></div>
                </div>
                <div className="flex flex-col gap-3 sm:gap-4">
                  {uncategorizedProducts.map(product => {
                    return (
                      <div key={product.id} className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-100 transition flex items-center gap-3 sm:gap-4">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 bg-gray-50 border border-gray-100 rounded-lg overflow-hidden flex items-center justify-center text-gray-300">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.nama} className="w-full h-full object-cover" />
                          ) : (
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-800 text-sm sm:text-base truncate">{product.nama}</h4>
                          <span className="text-[11px] sm:text-xs text-gray-400 block mt-0.5">Tanpa Kategori</span>
                          <div className="font-bold text-blue-600 mt-1 sm:mt-2 text-sm sm:text-base">
                            Rp {product.harga.toLocaleString('id-ID')}
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2 shrink-0">
                          <button onClick={() => handleEditMenu(product)} className="p-2 sm:px-3 sm:py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg sm:rounded-md transition text-xs font-bold flex items-center justify-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            <span className="hidden sm:inline">Edit</span>
                          </button>
                          <button onClick={() => handleHapusMenu(product.id, product.nama)} className="p-2 sm:px-3 sm:py-1.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg sm:rounded-md transition text-xs font-bold flex items-center justify-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            <span className="hidden sm:inline">Hapus</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        )}
      </main>

      {/* === MODAL TAMBAH/EDIT MENU === */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-fade-in max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <h3 className="font-bold text-gray-800 text-lg">{formData.id ? 'Edit Menu' : 'Tambah Menu Baru'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:bg-gray-200 p-1.5 rounded-full transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            {/* Form Scrollable Area */}
            <div className="overflow-y-auto p-5 flex-1">
              <form id="menuForm" onSubmit={handleSimpanMenu} className="space-y-4">
                
                {/* Area Upload Foto */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Foto Menu</label>
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden relative group cursor-pointer hover:bg-gray-100 transition"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {imagePreview ? (
                        <>
                          <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </div>
                        </>
                      ) : (
                        <div className="text-gray-400 flex flex-col items-center">
                          <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          <span className="text-[10px] font-medium uppercase">Pilih Foto</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-2">Format: JPG, PNG. Ukuran maks: 2MB. Resolusi kotak 1:1 disarankan.</p>
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition">
                        Ganti Gambar
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImageChange} 
                        accept="image/*" 
                        className="hidden" 
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nama Menu</label>
                  <input type="text" value={formData.nama} onChange={(e) => setFormData({...formData, nama: e.target.value})} className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="Cth: Ayam Goreng" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Kategori</label>
                    <select value={formData.kategori_id} onChange={(e) => setFormData({...formData, kategori_id: e.target.value})} className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 transition bg-white" required>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.nama}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Harga (Rp)</label>
                    <input type="number" value={formData.harga} onChange={(e) => setFormData({...formData, harga: e.target.value})} className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="0" required />
                  </div>
                </div>
              </form>
            </div>
            
            {/* Footer Modal (Fixed Bottom of Modal) */}
            <div className="p-5 border-t border-gray-100 bg-gray-50 shrink-0 flex gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold transition">Batal</button>
              <button type="submit" form="menuForm" disabled={isSubmitting} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition disabled:bg-blue-400 disabled:cursor-not-allowed">
                {isSubmitting ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* === MODAL KATEGORI === */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800 text-lg">Tambah Kategori</h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-gray-500 hover:bg-gray-200 p-1.5 rounded-full transition">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSimpanKategori} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nama Kategori</label>
                <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500 transition" placeholder="Cth: Lauk Pauk" required />
              </div>
              <div className="pt-5 mt-2 border-t border-gray-100 flex gap-3">
                <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition">Batal</button>
                <button type="submit" disabled={isSubmittingCategory} className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-md transition disabled:bg-green-400 disabled:cursor-not-allowed">
                  {isSubmittingCategory ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}