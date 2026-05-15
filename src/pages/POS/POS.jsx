import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import EscPosEncoder from 'esc-pos-encoder';

// 1. IMPORT HOOK GLOBAL
import { useAlert } from '../../context/AlertContext'; 
import { usePrinter } from '../../context/PrinterContext'; 

export default function POS() {
  // 2. INISIALISASI HOOK GLOBAL
  const { showAlert } = useAlert();
  const { printerDevice, printCharacteristic, connectPrinter } = usePrinter();

  // === STATE DATA ===
  const [currentUser, setCurrentUser] = useState(null); 
  const [menuData, setMenuData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [storeInfo, setStoreInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // === STATE TRANSAKSI & UI ===
  const [activeTab, setActiveTab] = useState('menu'); // <-- TAB STATE: 'menu' atau 'manual'
  const [searchQuery, setSearchQuery] = useState('');
  const [keranjang, setKeranjang] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState([]); 
  
  // === STATE INPUT MANUAL ===
  const [manualPrice, setManualPrice] = useState('0');
  const [manualNote, setManualNote] = useState('');

  // === STATE MODAL & PROSES ===
  const [isModalSummaryOpen, setIsModalSummaryOpen] = useState(false);
  const [isModalPembayaranOpen, setIsModalPembayaranOpen] = useState(false);
  const [metodePembayaran, setMetodePembayaran] = useState('Tunai');
  const [isModalSuksesOpen, setIsModalSuksesOpen] = useState(false);
  const [transaksiTerakhir, setTransaksiTerakhir] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        showAlert("Sesi kasir tidak valid. Harap login kembali.", "warning");
        return;
      }
      setCurrentUser(user); 
      
      const { data: storeData } = await supabase
        .from('store_settings')
        .select('*')
        .eq('id', 1)
        .single();
      
      setStoreInfo(storeData);

      const { data: catData } = await supabase
        .from('categories')
        .select('*')
        .order('urutan', { ascending: true });
      
      setCategories(catData || []);
      
      if (catData) {
        setExpandedCategories(catData.map(c => c.id));
      }

      const { data: prodData } = await supabase
        .from('products')
        .select('*')
        .order('urutan', { ascending: true });
      
      setMenuData(prodData || []);
    } catch (error) {
      console.error('Fetch error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId) 
        : [...prev, categoryId]
    );
  };

  // === FUNGSI KERANJANG ===
  const tambahKeKeranjang = (menu) => {
    setKeranjang(prev => {
      // Jika produk manual, selalu tambahkan sebagai item baru
      if (menu.isManual) {
        return [...prev, { ...menu }];
      }

      const itemAda = prev.find(item => item.id === menu.id);
      if (itemAda) {
        return prev.map(item => 
          item.id === menu.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { ...menu, qty: 1 }];
    });
  };

  const kurangiKeranjang = (id) => {
    setKeranjang(prev => {
      const itemAda = prev.find(item => item.id === id);
      if (!itemAda) return prev; 

      if (itemAda.qty === 1) {
        return prev.filter(item => item.id !== id);
      }
      return prev.map(item => 
        item.id === id ? { ...item, qty: item.qty - 1 } : item
      );
    });
  };

  const hapusDariKeranjang = (id) => {
    setKeranjang(prev => {
      const keranjangBaru = prev.filter(item => item.id !== id);
      if (keranjangBaru.length === 0) {
        setIsModalSummaryOpen(false);
      }
      return keranjangBaru;
    });
  };

  const totalBelanja = keranjang.reduce((total, item) => total + item.harga * item.qty, 0);
  const totalItemKeranjang = keranjang.reduce((acc, item) => acc + item.qty, 0);

  const uncategorizedProducts = menuData.filter(
    p => !p.kategori_id || !categories.find(c => String(c.id) === String(p.kategori_id))
  );

  // === FUNGSI KALKULATOR INPUT MANUAL ===
  const handleNum = (val) => {
    setManualPrice(prev => {
      if (prev === '0') return val;
      if (prev.length > 9) return prev; // Batas maksimal input panjang
      return prev + val;
    });
  };
  
  const handleDel = () => {
    setManualPrice(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
  };

  const handleC = () => {
    setManualPrice('0');
  };

  const handleTambahManual = () => {
    const price = parseInt(manualPrice || '0');
    if (price <= 0) {
      return showAlert("Harga tidak boleh nol", "warning");
    }

    const newItem = {
      id: `manual-${Date.now()}`,
      nama: manualNote.trim() || 'Item Manual',
      harga: price,
      qty: 1,
      isManual: true,
    };

    tambahKeKeranjang(newItem);
    setManualPrice('0');
    setManualNote('');
    showAlert("Item manual ditambahkan", "success");
  };

  // === LOGIKA CETAK STRUK THERMAL ===
  const handleCetakStruk = async () => {
    if (!printCharacteristic) {
      return showAlert("Printer belum terhubung! Silakan klik ikon printer di kiri atas.", "warning");
    }
    
    try {
      if (typeof EscPosEncoder === 'undefined') {
         return showAlert("Cetak sukses! (Mode Simulasi).\n\nUntuk cetak asli, pastikan Anda telah menghilangkan komentar import EscPosEncoder di VS Code.", "success");
      }

      const encoder = new EscPosEncoder();
      let result = encoder.initialize();

      try {
        const img = new Image();
        img.src = 'header_struk.png';
        
        const loadedImg = await new Promise((resolve, reject) => {
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('Logo tidak ditemukan'));
        });
        
        result = result
         .align('center')
         .image(loadedImg, 384, 128, 'atkinson');
      } catch (err) {
        console.warn("Skip logo cetak:", err.message); 
      }

      result = result
        .align('left')
        .line('--------------------------------')
        .line(`Resi  : ${transaksiTerakhir.no_invoice}`)
        .line(`Tgl   : ${transaksiTerakhir.waktu}`)
        .line(`Metode: ${transaksiTerakhir.metode}`)
        .line('--------------------------------');

      transaksiTerakhir.items.forEach(item => {
        result = result.line(item.nama.substring(0, 32));
        const priceLine = `${item.qty} x ${item.harga.toLocaleString('id-ID')}`;
        const subtotal = (item.qty * item.harga).toLocaleString('id-ID');
        result = result.line(priceLine.padEnd(32 - subtotal.length) + subtotal);
      });

      const strTotal = `Rp ${transaksiTerakhir.total.toLocaleString('id-ID')}`;
      
      // Buat teks footer secara manual
      const teksFooter = "~ Terimakasih ~";
      // Hitung jumlah spasi yang dibutuhkan untuk mendorong ke tengah
      const spasiKiri = Math.floor((32 - teksFooter.length) / 2);
      const teksTengah = " ".repeat(spasiKiri > 0 ? spasiKiri : 0) + teksFooter;

      result = result
        .line('--------------------------------')
        .bold(true)
        .line('TOTAL:'.padEnd(32 - strTotal.length) + strTotal)
        .bold(false)
        .line('--------------------------------')
        .align('left') // <--- KUNCI: Paksa tetap rata kiri!
        .line(teksTengah) // <--- Cetak teks yang sudah didorong spasi
        .newline()
        .newline()
        .newline() 
        .newline();

      const uint8array = result.encode();
      
      const CHUNK_SIZE = 100;
      for (let i = 0; i < uint8array.length; i += CHUNK_SIZE) {
        const chunk = uint8array.slice(i, i + CHUNK_SIZE);
        if (printCharacteristic.properties.writeWithoutResponse) {
           await printCharacteristic.writeValueWithoutResponse(chunk);
        } else {
           await printCharacteristic.writeValue(chunk);
        }
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      
    } catch (error) {
      console.error("Print Error:", error);
      showAlert("Terjadi kesalahan saat mencetak: " + error.message, "warning");
    }
  };

  // === LOGIKA DATABASE TRANSAKSI ===
  const prosesPembayaran = async () => {
    if (!currentUser) {
       return showAlert("Error: Identitas kasir tidak valid. Harap muat ulang halaman.", "warning");
    }

    try {
      setIsSaving(true);
      const noInvoice = `INV-${Date.now().toString().slice(-6)}`;
      const waktu = new Date().toLocaleString('id-ID', { 
        day: 'numeric', 
        month: 'short', 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      const { data: transData, error: transError } = await supabase
        .from('transactions')
        .insert([{
          no_invoice: noInvoice, 
          total_belanja: totalBelanja, 
          metode_pembayaran: metodePembayaran, 
          tanggal: new Date().toISOString(),
          user_id: currentUser.id 
        }])
        .select();

      if (transError) throw transError;

      const detailItems = keranjang.map(item => ({
        transaksi_id: transData[0].id, 
        product_id: item.isManual ? null : item.id, 
        nama_produk: item.nama, 
        harga_satuan: item.harga, 
        qty: item.qty, 
        subtotal: item.harga * item.qty,
        user_id: currentUser.id 
      }));

      const { error: itemError } = await supabase
        .from('transaction_items')
        .insert(detailItems);
        
      if (itemError) throw itemError;

      setTransaksiTerakhir({ 
        no_invoice: noInvoice, 
        items: [...keranjang], 
        total: totalBelanja, 
        metode: metodePembayaran, 
        waktu: waktu 
      });
      
      setKeranjang([]);
      setSearchQuery('');
      setIsModalPembayaranOpen(false);
      setIsModalSuksesOpen(true);
    } catch (e) {
      showAlert("Gagal menyimpan transaksi: " + e.message, "warning");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLanjutDariSummary = () => {
    setIsModalSummaryOpen(false);
    setIsModalPembayaranOpen(true);
    setMetodePembayaran('Tunai');
  };

  const renderMenuItem = (menu) => {
    const qty = keranjang.find(item => item.id === menu.id)?.qty || 0;
    return (
      <div 
        key={menu.id} 
        className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-sm border border-gray-100 transition-all hover:shadow-md"
      >
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 rounded-xl overflow-hidden shrink-0 flex items-center justify-center text-gray-300">
          {menu.image_url ? (
            <img 
              src={menu.image_url} 
              alt={menu.nama} 
              className="w-full h-full object-cover" 
              onError={(e) => {
                e.target.onerror = null; 
                e.target.outerHTML = `<svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>`;
              }}
            />
          ) : (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-gray-800 text-sm sm:text-base truncate">
            {menu.nama}
          </h4>
          <span className="text-[11px] sm:text-xs text-gray-400 block mt-0.5 truncate">
            {categories.find(c => String(c.id) === String(menu.kategori_id))?.nama || 'Tanpa Kategori'}
          </span>
          <div className="font-extrabold text-blue-600 mt-1 sm:mt-2 text-sm">
            Rp {menu.harga.toLocaleString('id-ID')}
          </div>
        </div>
        
        <div className="shrink-0 pl-2">
          {qty > 0 ? (
            <div className="flex items-center gap-3 bg-gray-50 p-1 rounded-lg border border-gray-200">
              <button 
                onClick={() => kurangiKeranjang(menu.id)} 
                className="w-8 h-8 flex items-center justify-center bg-white border rounded-md shadow-sm active:bg-gray-100 transition"
              >
                <span className="text-lg leading-none mb-0.5">-</span>
              </button>
              <span className="font-bold w-4 text-center">{qty}</span>
              <button 
                onClick={() => tambahKeKeranjang(menu)} 
                className="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-600 rounded-md shadow-sm active:scale-95 transition"
              >
                <span className="text-lg leading-none mb-0.5">+</span>
              </button>
            </div>
          ) : (
            <button 
              onClick={() => tambahKeKeranjang(menu)} 
              className="px-5 py-2 border border-blue-500 text-blue-600 rounded-xl font-bold text-xs hover:bg-blue-50 active:scale-95 transition"
            >
              Tambah
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-50 min-h-screen text-gray-800 font-sans pb-[140px] relative animate-fade-in">
      <main className="max-w-3xl mx-auto px-4 mt-4">
        
        {/* HEADER BAR: Ikon Printer & Tab Switcher */}
        <div className="flex gap-3 mb-4 sticky top-2 z-20">
          <button 
            onClick={connectPrinter} 
            className={`relative w-12 h-12 flex items-center justify-center rounded-xl border transition-all shrink-0 ${
              printerDevice ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-sm' : 'bg-white border-gray-200 text-gray-400 shadow-sm'
            }`}
            title="Hubungkan Printer Thermal Bluetooth"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            <span className={`absolute top-2 right-2.5 w-2.5 h-2.5 rounded-full border-2 border-white ${printerDevice ? 'bg-blue-500' : 'bg-red-400'}`}></span>
          </button>

          <div className="flex bg-gray-200 p-1 rounded-xl flex-1">
            <button 
              onClick={() => setActiveTab('menu')} 
              className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'menu' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Menu
            </button>
            <button 
              onClick={() => setActiveTab('manual')} 
              className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'manual' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Input Manual
            </button>
          </div>
        </div>

        {/* =========================================
            TAB 1: DAFTAR MENU
        ========================================= */}
        {activeTab === 'menu' && (
          <div className="animate-fade-in">
            {/* Search Bar */}
            <div className="relative mb-6">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </span>
              <input 
                type="text" 
                placeholder="Cari menu..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="w-full pl-10 pr-10 h-12 border border-gray-200 rounded-xl bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500 transition" 
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')} 
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : menuData.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-gray-500 text-sm font-medium">Belum ada menu terdaftar.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {categories.map(cat => {
                  const catProducts = menuData.filter(m => 
                    String(m.kategori_id) === String(cat.id) && 
                    m.nama.toLowerCase().includes(searchQuery.toLowerCase())
                  );

                  if (catProducts.length === 0) return null;

                  const isExpanded = searchQuery !== '' || expandedCategories.includes(cat.id);

                  return (
                    <div key={cat.id} className="bg-white/50 rounded-2xl p-2 sm:p-3 border border-gray-100">
                      <button 
                        onClick={() => toggleCategory(cat.id)}
                        className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-gray-100/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <h3 className="font-extrabold text-lg text-gray-800">{cat.nama}</h3>
                          <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">
                            {catProducts.length}
                          </span>
                        </div>
                        <div className={`text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="flex flex-col gap-3 mt-3">
                          {catProducts.map(menu => renderMenuItem(menu))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {uncategorizedProducts.filter(m => m.nama.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 && (
                  <div className="bg-white/50 rounded-2xl p-2 sm:p-3 border border-gray-100">
                    <button 
                      onClick={() => toggleCategory('uncategorized')}
                      className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-gray-100/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <h3 className="font-extrabold text-lg text-gray-800">Lainnya</h3>
                      </div>
                      <div className={`text-gray-400 transition-transform duration-300 ${expandedCategories.includes('uncategorized') || searchQuery !== '' ? 'rotate-180' : ''}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </button>

                    {(expandedCategories.includes('uncategorized') || searchQuery !== '') && (
                      <div className="flex flex-col gap-3 mt-3">
                        {uncategorizedProducts
                          .filter(m => m.nama.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map(menu => renderMenuItem(menu))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* =========================================
            TAB 2: INPUT MANUAL (KALKULATOR)
        ========================================= */}
        {activeTab === 'manual' && (
          <div className="animate-fade-in bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4 text-center">Input Item Manual</h3>
            
            {/* Layar Harga */}
            <div className="text-right text-4xl sm:text-5xl font-black text-gray-800 mb-4 bg-gray-50 p-4 rounded-xl border border-gray-200 overflow-hidden break-words">
              Rp {parseInt(manualPrice || '0').toLocaleString('id-ID')}
            </div>

            {/* Input Catatan */}
            <div className="mb-5">
              <input 
                type="text" 
                placeholder="Catatan / Nama Item (Opsional)" 
                value={manualNote} 
                onChange={(e) => setManualNote(e.target.value)} 
                className="w-full h-12 px-4 border border-gray-200 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition text-sm" 
              />
            </div>

            {/* Numpad Kalkulator */}
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              <button onClick={() => handleNum('1')} className="py-4 text-2xl font-bold bg-gray-50 rounded-xl hover:bg-gray-100 active:bg-gray-200 border border-gray-100 transition">1</button>
              <button onClick={() => handleNum('2')} className="py-4 text-2xl font-bold bg-gray-50 rounded-xl hover:bg-gray-100 active:bg-gray-200 border border-gray-100 transition">2</button>
              <button onClick={() => handleNum('3')} className="py-4 text-2xl font-bold bg-gray-50 rounded-xl hover:bg-gray-100 active:bg-gray-200 border border-gray-100 transition">3</button>
              <button onClick={handleDel} className="py-4 text-xl font-bold bg-red-50 text-red-500 rounded-xl hover:bg-red-100 active:bg-red-200 transition">Del</button>

              <button onClick={() => handleNum('4')} className="py-4 text-2xl font-bold bg-gray-50 rounded-xl hover:bg-gray-100 active:bg-gray-200 border border-gray-100 transition">4</button>
              <button onClick={() => handleNum('5')} className="py-4 text-2xl font-bold bg-gray-50 rounded-xl hover:bg-gray-100 active:bg-gray-200 border border-gray-100 transition">5</button>
              <button onClick={() => handleNum('6')} className="py-4 text-2xl font-bold bg-gray-50 rounded-xl hover:bg-gray-100 active:bg-gray-200 border border-gray-100 transition">6</button>
              <button onClick={handleC} className="py-4 text-xl font-bold bg-red-100 text-red-600 rounded-xl hover:bg-red-200 active:bg-red-300 transition">C</button>

              <button onClick={() => handleNum('7')} className="py-4 text-2xl font-bold bg-gray-50 rounded-xl hover:bg-gray-100 active:bg-gray-200 border border-gray-100 transition">7</button>
              <button onClick={() => handleNum('8')} className="py-4 text-2xl font-bold bg-gray-50 rounded-xl hover:bg-gray-100 active:bg-gray-200 border border-gray-100 transition">8</button>
              <button onClick={() => handleNum('9')} className="py-4 text-2xl font-bold bg-gray-50 rounded-xl hover:bg-gray-100 active:bg-gray-200 border border-gray-100 transition">9</button>
              <button onClick={() => handleNum('000')} className="py-4 text-xl font-bold bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 active:bg-blue-200 transition">000</button>

              <button onClick={() => handleNum('0')} className="py-4 text-2xl font-bold bg-gray-50 rounded-xl hover:bg-gray-100 active:bg-gray-200 border border-gray-100 transition">0</button>
              <button onClick={() => handleNum('00')} className="py-4 text-xl font-bold bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 active:bg-blue-200 transition">00</button>
              <button onClick={handleTambahManual} className="col-span-2 py-4 text-lg font-bold bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 active:scale-95 transition">
                + Tambah
              </button>
            </div>
          </div>
        )}

      </main>

      {/* FLOAT BUTTON KERANJANG */}
      <div 
        className={`fixed inset-x-0 bottom-[80px] flex justify-center z-40 transition-all duration-300 ${
          totalItemKeranjang > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
        }`}
      >
        <div className="w-full max-w-3xl px-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wide">
                Total ({totalItemKeranjang} Item)
              </span>
              <span className="text-xl font-black text-gray-800">
                Rp {totalBelanja.toLocaleString('id-ID')}
              </span>
            </div>
            <button 
              onClick={() => setIsModalSummaryOpen(true)} 
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-8 py-3.5 rounded-xl shadow-lg active:scale-95 transition"
            >
              Cek Pesanan
            </button>
          </div>
        </div>
      </div>

      {/* === MODAL SUMMARY / KERANJANG === */}
      {isModalSummaryOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex justify-center items-end sm:items-center p-0 sm:p-4"
          onClick={() => setIsModalSummaryOpen(false)}
        >
          <div 
            className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] animate-slide-up sm:animate-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-3xl sm:rounded-3xl">
              <div>
                <h3 className="font-bold text-gray-800 text-xl">Rincian Pesanan</h3>
                <p className="text-sm text-gray-500 mt-0.5">Double check item sebelum bayar</p>
              </div>
              <button 
                onClick={() => setIsModalSummaryOpen(false)} 
                className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-500 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {keranjang.map(item => (
                <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                  <div className="flex-1 min-w-0 pr-4">
                    <h4 className="font-bold text-gray-800 text-sm truncate">
                      {item.nama}
                      {item.isManual && <span className="ml-2 text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold">Manual</span>}
                    </h4>
                    <div className="text-blue-600 font-bold text-sm mt-0.5">
                      Rp {(item.harga * item.qty).toLocaleString('id-ID')}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-gray-50 p-1 rounded-lg border border-gray-200">
                      <button 
                        onClick={() => kurangiKeranjang(item.id)} 
                        className="w-7 h-7 flex items-center justify-center bg-white border rounded-md shadow-sm text-gray-600 active:bg-gray-100 transition"
                      >
                        -
                      </button>
                      <span className="font-bold w-6 text-center text-sm">{item.qty}</span>
                      <button 
                        onClick={() => tambahKeKeranjang(item)} 
                        className="w-7 h-7 flex items-center justify-center bg-blue-500 text-white rounded-md shadow-sm active:scale-95 transition"
                      >
                        +
                      </button>
                    </div>
                    <button 
                      onClick={() => hapusDariKeranjang(item.id)}
                      className="p-1.5 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                      title="Hapus Item"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-5 bg-gray-50 rounded-b-none sm:rounded-b-3xl border-t border-gray-100">
              <div className="flex justify-between items-end mb-4">
                <span className="text-gray-500 font-medium text-sm">Total Pembayaran</span>
                <span className="text-2xl font-black text-blue-600">
                  Rp {totalBelanja.toLocaleString('id-ID')}
                </span>
              </div>
              <button 
                onClick={handleLanjutDariSummary} 
                className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-bold shadow-md active:scale-95 transition"
              >
                Pilih Pembayaran
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === MODAL PILIH PEMBAYARAN === */}
      {isModalPembayaranOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center items-end sm:items-center p-4" 
          onClick={() => setIsModalPembayaranOpen(false)}
        >
          <div 
            className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800 text-xl">Pilih Metode</h3>
                <button 
                  onClick={() => setIsModalPembayaranOpen(false)} 
                  className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            
            <div className="grid grid-cols-3 gap-3 mb-6">
                {['Tunai', 'QRIS', 'Transfer Bank'].map((m) => (
                  <button 
                    key={m} 
                    onClick={() => setMetodePembayaran(m)} 
                    className={`relative p-2 sm:p-3 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                      metodePembayaran === m ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                     {metodePembayaran === m && (
                       <div className="absolute top-1 right-1 text-blue-500">
                         <svg className="w-4 h-4 bg-white rounded-full" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                       </div>
                     )}

                     {m === 'Tunai' && (
                       <img src="/cash.png" alt="Tunai" className="h-8 w-auto object-contain drop-shadow-sm mt-1" onError={(e) => { e.target.onerror = null; e.target.src = "https://cdn-icons-png.flaticon.com/512/2489/2489756.png" }} />
                     )}
                     {m === 'QRIS' && (
                       <img src="/qris.png" alt="QRIS" className="h-8 w-auto object-contain drop-shadow-sm mt-1" onError={(e) => { e.target.onerror = null; e.target.src = "https://cdn-icons-png.flaticon.com/512/2489/2489756.png" }} />
                     )}
                     {m === 'Transfer Bank' && (
                       <img src="/transfer_bank.png" alt="Transfer Bank" className="h-8 w-auto object-contain drop-shadow-sm mt-1" onError={(e) => { e.target.onerror = null; e.target.src = "https://cdn-icons-png.flaticon.com/512/2489/2489756.png" }} />
                     )}

                     <span className={`font-bold text-[11px] sm:text-xs text-center leading-tight ${
                       metodePembayaran === m ? 'text-blue-700' : 'text-gray-600'
                     }`}>
                       {m}
                     </span>
                  </button>
                ))}
            </div>

            <button 
              onClick={prosesPembayaran} 
              disabled={isSaving} 
              className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-bold shadow-md active:scale-95 transition flex justify-center items-center"
            >
               {isSaving ? (
                 <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
               ) : `Bayar Rp ${totalBelanja.toLocaleString('id-ID')}`}
            </button>
          </div>
        </div>
      )}

      {/* === MODAL TRANSAKSI BERHASIL === */}
      {isModalSuksesOpen && transaksiTerakhir && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex justify-center items-end sm:items-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center flex flex-col">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 border-4 border-white shadow-sm">
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
            </div>
            
            <h3 className="font-black text-gray-800 text-xl mb-1">Berhasil!</h3>
            <p className="text-xs text-gray-400 mb-4">
              {transaksiTerakhir.no_invoice} • {transaksiTerakhir.waktu}
            </p>
            
            <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100 text-left max-h-[160px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] relative">
              {transaksiTerakhir.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm mb-2.5">
                  <span className="text-gray-600">
                    {item.qty}x {item.nama}
                  </span>
                  <span className="font-bold text-gray-800">
                    Rp {(item.qty * item.harga).toLocaleString('id-ID')}
                  </span>
                </div>
              ))}
              <div className="border-t border-dashed border-gray-300 mt-3 pt-3 flex justify-between font-black text-blue-600 sticky bottom-0 bg-gray-50">
                <span>TOTAL</span>
                <span>Rp {transaksiTerakhir.total.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="space-y-3">
               <button 
                 onClick={handleCetakStruk} 
                 className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-md active:scale-95 flex items-center justify-center gap-2 transition"
               >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                  Cetak Thermal
               </button>
               
               <button 
                 onClick={() => {
                   setIsModalSuksesOpen(false); 
                   setTransaksiTerakhir(null);
                 }} 
                 className="w-full py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-bold active:scale-95 transition"
               >
                 Tutup
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
