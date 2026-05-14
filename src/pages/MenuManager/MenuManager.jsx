import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../config/supabaseClient';

export default function MenuManager() {
  // === STATE DATABASE (CRUD) ===
  const [currentUser, setCurrentUser] = useState(null); // <--- STATE BARU UNTUK SESI KASIR
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // === STATE DRAG AND DROP & MODE EDIT ===
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [draggedProduct, setDraggedProduct] = useState(null);
  const [dragOverProduct, setDragOverProduct] = useState(null);

  // === STATE MODAL MENU ===
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ id: null, nama: '', harga: '', kategori_id: '', image_url: '' });
  
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

      // --- TAMBAHAN RBAC: Ambil Sesi Kasir ---
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        alert("Sesi tidak valid. Harap login kembali.");
        setLoading(false);
        return;
      }
      setCurrentUser(user);

      // Karena RLS aktif, query ini otomatis hanya mengambil data milik kasir bersangkutan
      const { data: catData, error: catError } = await supabase.from('categories').select('*').order('urutan', { ascending: true });
      if (catError) throw catError;
      setCategories(catData || []);

      const { data: prodData, error: prodError } = await supabase.from('products').select('*').order('urutan', { ascending: true });
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

  // === FUNGSI BANTUAN TUTUP MODAL ===
  const closeMenuModal = () => {
    setIsModalOpen(false);
    if (imagePreview && imageFile) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  };

  // === FUNGSI DRAG AND DROP ===
  const handleDragStart = (e, product) => {
    if (!isReorderMode) return;
    setDraggedProduct(product);
    setTimeout(() => e.target.classList.add("opacity-40", "scale-95"), 0);
  };

  const handleDragEnter = (e, targetProduct) => {
    e.preventDefault();
    if (!isReorderMode || !draggedProduct || draggedProduct.id === targetProduct.id) return;
    if (String(draggedProduct.kategori_id) !== String(targetProduct.kategori_id)) return;
    setDragOverProduct(targetProduct);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); 
  };

  const handleDrop = async (e, targetProduct) => {
    e.preventDefault();
    if (!isReorderMode || !draggedProduct || !targetProduct) return;
    if (draggedProduct.id === targetProduct.id) return;
    if (String(draggedProduct.kategori_id) !== String(targetProduct.kategori_id)) return;

    const categoryId = draggedProduct.kategori_id;
    
    let catProducts = products
      .filter(p => String(p.kategori_id) === String(categoryId))
      .sort((a, b) => (a.urutan || 0) - (b.urutan || 0));

    const draggedIdx = catProducts.findIndex(p => p.id === draggedProduct.id);
    const targetIdx = catProducts.findIndex(p => p.id === targetProduct.id);

    const newCatProducts = [...catProducts];
    const [removed] = newCatProducts.splice(draggedIdx, 1);
    newCatProducts.splice(targetIdx, 0, removed);

    const updates = newCatProducts.map((p, idx) => ({ ...p, urutan: idx }));

    // 1. Update State Lokal Optimistis
    setProducts(prev => prev.map(p => {
      if (String(p.kategori_id) === String(categoryId)) {
        const updatedItem = updates.find(u => u.id === p.id);
        return updatedItem ? updatedItem : p;
      }
      return p;
    }));

    setDraggedProduct(null);
    setDragOverProduct(null);
    document.querySelectorAll('.opacity-40').forEach(el => el.classList.remove('opacity-40', 'scale-95'));

    // 2. Update ke Database Supabase
    try {
      await Promise.all(
        updates.map(update =>
          supabase.from('products').update({ urutan: update.urutan }).eq('id', update.id)
        )
      );
    } catch (error) {
      console.error("Gagal menyimpan urutan:", error);
      alert("Terjadi kesalahan saat menyimpan posisi menu.");
      fetchData(); 
    }
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove('opacity-40', 'scale-95');
    setDraggedProduct(null);
    setDragOverProduct(null);
  };

  // === FUNGSI CRUD MENU ===
  const handleTambahMenu = () => {
    setFormData({ id: null, nama: '', harga: '', kategori_id: categories.length > 0 ? categories[0].id : '', image_url: '' });
    setImageFile(null);
    setImagePreview(null);
    setIsModalOpen(true);
  };

  const handleEditMenu = (product) => {
    setFormData({ id: product.id, nama: product.nama, harga: product.harga, kategori_id: product.kategori_id || '', image_url: product.image_url || '' });
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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      if (imagePreview && imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSimpanMenu = async (e) => {
    e.preventDefault();
    if (!currentUser) return alert("Sesi tidak valid!"); // <--- Proteksi RBAC

    try {
      setIsSubmitting(true);
      let finalImageUrl = formData.image_url;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage.from('menu_images').upload(fileName, imageFile);
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('menu_images').getPublicUrl(fileName);
        finalImageUrl = publicUrlData.publicUrl;
      }
      
      const currentCatProducts = products.filter(p => String(p.kategori_id) === String(formData.kategori_id));
      const nextUrutan = currentCatProducts.length;

      const payload = { 
        nama: formData.nama, 
        harga: parseInt(formData.harga), 
        kategori_id: formData.kategori_id ? formData.kategori_id : null,
        image_url: finalImageUrl,
        user_id: currentUser.id // <--- Label hak milik kasir disematkan!
      };

      if (formData.id) {
        const { error } = await supabase.from('products').update(payload).eq('id', formData.id);
        if (error) throw error;
      } else {
        payload.urutan = nextUrutan; 
        const { error } = await supabase.from('products').insert([payload]);
        if (error) throw error;
      }
      
      closeMenuModal();
      fetchData();
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
    if (!currentUser) return alert("Sesi tidak valid!"); // <--- Proteksi RBAC

    try {
      setIsSubmittingCategory(true);
      const { error } = await supabase.from('categories').insert([{ 
        nama: newCategoryName.trim(), 
        urutan: categories.length,
        user_id: currentUser.id // <--- Label hak milik kasir disematkan!
      }]);
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

  const handleHapusKategori = async (id, nama) => {
    if (!window.confirm(`Hapus kategori "${nama}"? Semua menu di dalamnya akan dipindah ke "Tanpa Kategori".`)) return;
    try {
      setLoading(true);
      await supabase.from('products').update({ kategori_id: null }).eq('kategori_id', id);
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      alert('Gagal menghapus kategori: ' + error.message);
      setLoading(false);
    }
  };

  const uncategorizedProducts = products.filter(p => !p.kategori_id || !categories.find(c => String(c.id) === String(p.kategori_id)));

  return (
    <div className="bg-gray-50 min-h-screen text-gray-800 font-sans pb-10">
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        
        {/* Header Aksi */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 mt-4 sm:mt-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Kelola Menu</h2>
            <p className="text-gray-500 text-sm mt-1">Tambah, edit foto, dan kelola kategori produk Anda.</p>
          </div>
          
          <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
            {/* Tombol Toggle Mode Edit Posisi */}
            <button 
              onClick={() => setIsReorderMode(!isReorderMode)} 
              className={`flex-1 sm:flex-none px-4 py-2.5 sm:py-2 rounded-xl text-sm font-bold shadow-sm transition flex items-center justify-center gap-2 ${
                isReorderMode 
                  ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" /></svg>
              <span>{isReorderMode ? 'Selesai Atur' : 'Atur Posisi'}</span>
            </button>
            
            <button onClick={() => setIsCategoryModalOpen(true)} className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 sm:py-2 rounded-xl text-sm font-bold shadow-sm transition flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              <span className="hidden sm:inline">Kategori</span>
            </button>
            <button onClick={handleTambahMenu} className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 sm:py-2 rounded-xl text-sm font-bold shadow-sm transition flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              <span className="hidden sm:inline">Menu</span>
            </button>
          </div>
        </div>

        {/* Peringatan Kategori Kosong */}
        {!loading && categories.length === 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg flex justify-between items-center shadow-sm">
            <p className="text-sm text-yellow-700 font-medium">Belum ada kategori. Silakan buat kategori pertama Anda.</p>
          </div>
        )}

        {/* Daftar Produk berdasarkan Kategori */}
        {loading ? (
           <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>
        ) : products.length === 0 && categories.length === 0 ? (
           <div className="text-center py-12 bg-white rounded-xl border border-gray-100 shadow-sm"><p className="text-gray-500">Belum ada menu atau kategori terdaftar.</p></div>
        ) : (
          <div className="space-y-8">
            
            {/* Render per Kategori */}
            {categories.map(category => {
              const categoryProducts = products
                .filter(p => String(p.kategori_id) === String(category.id))
                .sort((a, b) => (a.urutan || 0) - (b.urutan || 0));

              return (
                <div key={category.id} className="mb-4">
                  <div className="flex items-center gap-4 mb-4 group">
                    <h3 className="font-bold text-lg text-gray-800 whitespace-nowrap">{category.nama}</h3>
                    <button 
                      onClick={() => handleHapusKategori(category.id, category.nama)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Hapus Kategori"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                    <div className="h-px bg-gray-200 flex-1 mt-1"></div>
                  </div>

                  {categoryProducts.length === 0 ? (
                     <p className="text-sm text-gray-400 italic mb-4">Kategori ini kosong.</p>
                  ) : (
                    <div className="flex flex-col gap-3 sm:gap-4">
                      {categoryProducts.map(product => {
                        const isDraggingOver = dragOverProduct?.id === product.id;
                        
                        return (
                          <div 
                            key={product.id}
                            draggable={isReorderMode} // Hanya bisa di-drag jika mode urut aktif
                            onDragStart={(e) => handleDragStart(e, product)}
                            onDragEnter={(e) => handleDragEnter(e, product)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, product)}
                            onDragEnd={handleDragEnd}
                            className={`bg-white rounded-xl p-3 sm:p-4 shadow-sm border transition flex items-center gap-2 sm:gap-4 
                              ${isReorderMode ? 'cursor-grab active:cursor-grabbing hover:border-orange-300' : 'border-gray-100 hover:shadow-md hover:border-blue-100'}
                              ${isDraggingOver ? 'border-blue-500 border-2 bg-blue-50/50 shadow-md transform scale-[1.01]' : ''}`
                            }
                          >
                            
                            {/* Grip Icon (Hanya muncul saat mode Atur Posisi aktif) */}
                            {isReorderMode && (
                              <div className="text-gray-400 pr-1 cursor-grab animate-fade-in">
                                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" /></svg>
                              </div>
                            )}

                            {/* Kiri: Foto / Thumbnail */}
                            <div className={`w-16 h-16 sm:w-20 sm:h-20 shrink-0 bg-gray-50 border border-gray-100 rounded-lg overflow-hidden flex items-center justify-center text-gray-300 ${isReorderMode ? 'pointer-events-none' : ''}`}>
                              {product.image_url ? (
                                <img src={product.image_url} alt={product.nama} className="w-full h-full object-cover" />
                              ) : (
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              )}
                            </div>

                            {/* Tengah: Info Produk */}
                            <div className={`flex-1 min-w-0 ${isReorderMode ? 'pointer-events-none' : ''}`}>
                              <h4 className="font-bold text-gray-800 text-sm sm:text-base truncate">{product.nama}</h4>
                              <span className="text-[11px] sm:text-xs text-gray-400 block mt-0.5">{category.nama}</span>
                              <div className="font-bold text-blue-600 mt-1 sm:mt-2 text-sm sm:text-base">
                                Rp {product.harga.toLocaleString('id-ID')}
                              </div>
                            </div>

                            {/* Kanan: Tombol Aksi (Hanya muncul jika TIDAK sedang mode Atur Posisi) */}
                            {!isReorderMode && (
                              <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2 shrink-0 animate-fade-in">
                                <button onClick={() => handleEditMenu(product)} className="p-2 sm:px-3 sm:py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg sm:rounded-md transition text-xs font-bold flex items-center justify-center gap-1.5">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                  <span className="hidden sm:inline">Edit</span>
                                </button>
                                <button onClick={() => handleHapusMenu(product.id, product.nama)} className="p-2 sm:px-3 sm:py-1.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg sm:rounded-md transition text-xs font-bold flex items-center justify-center gap-1.5">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  <span className="hidden sm:inline">Hapus</span>
                                </button>
                              </div>
                            )}
                            
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Kategori: Lainnya (Tanpa Kategori) */}
            {uncategorizedProducts.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-4 mb-4">
                  <h3 className="font-bold text-lg text-gray-800 whitespace-nowrap">Lainnya (Tanpa Kategori)</h3>
                  <div className="h-px bg-gray-200 flex-1 mt-1"></div>
                </div>
                <div className="flex flex-col gap-3 sm:gap-4">
                  {uncategorizedProducts.map(product => {
                    return (
                      <div key={product.id} className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100 transition flex items-center gap-3 sm:gap-4 opacity-75">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 bg-gray-50 border border-gray-100 rounded-lg overflow-hidden flex items-center justify-center text-gray-300">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.nama} className="w-full h-full object-cover" />
                          ) : (
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-800 text-sm sm:text-base truncate">{product.nama}</h4>
                          <span className="text-[11px] sm:text-xs text-red-400 block mt-0.5">Harap tetapkan kategori</span>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2 shrink-0">
                          <button onClick={() => handleEditMenu(product)} className="p-2 sm:px-3 sm:py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg sm:rounded-md transition text-xs font-bold flex items-center justify-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            <span className="hidden sm:inline">Edit</span>
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
              <button onClick={closeMenuModal} className="text-gray-500 hover:bg-gray-200 p-1.5 rounded-full transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
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
                    <select value={formData.kategori_id} onChange={(e) => setFormData({...formData, kategori_id: e.target.value})} className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 transition bg-white">
                      <option value="">-- Pilih Kategori --</option>
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
            
            <div className="p-5 border-t border-gray-100 bg-gray-50 shrink-0 flex gap-3">
              <button type="button" onClick={closeMenuModal} className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold transition">Batal</button>
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
