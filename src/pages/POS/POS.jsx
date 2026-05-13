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
  const [menuData, setMenuData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [storeInfo, setStoreInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // === STATE TRANSAKSI ===
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [keranjang, setKeranjang] = useState([]);
  
  // === STATE MODAL & PROSES ===
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
      setCategories([{ id: 'all', nama: 'Semua' }, ...(catData || [])]);

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

  const tambahKeKeranjang = (menu) => {
    setKeranjang(prev => {
      const itemAda = prev.find(item => item.id === menu.id);
      if (itemAda) {
        return prev.map(item => item.id === menu.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...menu, qty: 1 }];
    });
  };

  const kurangiKeranjang = (id) => {
    setKeranjang(prev => {
      const itemAda = prev.find(item => item.id === id);
      if (itemAda.qty === 1) {
        return prev.filter(item => item.id !== id);
      }
      return prev.map(item => item.id === id ? { ...item, qty: item.qty - 1 } : item);
    });
  };

  const totalBelanja = keranjang.reduce((total, item) => total + item.harga * item.qty, 0);
  const totalItemKeranjang = keranjang.reduce((acc, item) => acc + item.qty, 0);

  const filteredMenu = menuData.filter(menu => {
    const matchesCategory = activeCategory === 'all' || String(menu.kategori_id) === String(activeCategory);
    return matchesCategory && menu.nama.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // =================================================================
  // LOGIKA CETAK STRUK (MENGGUNAKAN GLOBAL PRINTER)
  // =================================================================
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
        img.src = 'kotabaru_logo.png';
        
        const loadedImg = await new Promise((resolve, reject) => {
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('Logo tidak ditemukan'));
        });
        
        result = result
         .align('center')
         .image(loadedImg, 128, 128, 'atkinson')
         .newline();
      } catch (err) {
        console.warn("Skip logo cetak:", err.message); 
      }

      result = result
        .align('center')
        .bold(true)
        .line(storeInfo?.nama_toko?.toUpperCase() || 'TOKO SAYA')
        .bold(false)
        .line(storeInfo?.alamat || '')
        .line('--------------------------------')
        .align('left')
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
      result = result
        .line('--------------------------------')
        .bold(true)
        .line('TOTAL:'.padEnd(32 - strTotal.length) + strTotal)
        .bold(false)
        .line('--------------------------------')
        .align('center')
        .line(storeInfo?.pesan_footer || 'Terima Kasih')
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
          tanggal: new Date().toISOString()
        }])
        .select();

      if (transError) throw transError;

      const detailItems = keranjang.map(item => ({
        transaksi_id: transData[0].id, 
        product_id: item.id, 
        nama_produk: item.nama, 
        harga_satuan: item.harga, 
        qty: item.qty, 
        subtotal: item.harga * item.qty
      }));

      const { error: itemError } = await supabase.from('transaction_items').insert(detailItems);
      if (itemError) throw itemError;

      setTransaksiTerakhir({ 
        no_invoice: noInvoice, 
        items: [...keranjang], 
        total: totalBelanja, 
        metode: metodePembayaran, 
        waktu: waktu 
      });
      setKeranjang([]);
      setIsModalPembayaranOpen(false);
      setIsModalSuksesOpen(true);
    } catch (e) {
      showAlert("Gagal menyimpan transaksi: " + e.message, "warning");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen text-gray-800 font-sans pb-[140px] relative">
      <main className="max-w-3xl mx-auto px-4 mt-4">
        
        {/* HEADER: PRINTER PAIRING & SEARCH BAR */}
        <div className="flex gap-3 mb-4">
          <button 
            onClick={connectPrinter} 
            className={`relative w-12 h-12 flex items-center justify-center rounded-xl border transition-all ${
              printerDevice ? 'bg-green-50 border-green-500 text-green-600 shadow-sm' : 'bg-white border-gray-200 text-gray-400'
            }`}
            title="Hubungkan Printer Thermal Bluetooth"
          >
            <svg 
              className="w-6 h-6" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" 
              />
            </svg>
            <span className={`absolute top-2 right-2.5 w-2.5 h-2.5 rounded-full border-2 border-white ${printerDevice ? 'bg-green-500' : 'bg-red-400'}`}></span>
          </button>

          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
              <svg 
                className="w-5 h-5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
                />
              </svg>
            </span>
            <input 
              type="text" 
              placeholder="Cari menu..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full pl-10 pr-10 h-12 border border-gray-200 rounded-xl bg-white shadow-sm outline-none focus:ring-2 focus:ring-green-500 transition" 
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')} 
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <svg 
                  className="w-5 h-5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M6 18L18 6M6 6l12 12" 
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* KATEGORI PILLS */}
        <div className="flex overflow-x-auto gap-2 pb-3 hide-scrollbar sticky top-2 z-20">
          {categories.map(cat => (
            <button 
              key={cat.id} 
              onClick={() => setActiveCategory(cat.id)} 
              className={`px-4 py-2 rounded-xl text-sm font-bold border whitespace-nowrap transition-all ${
                activeCategory === cat.id 
                  ? 'bg-green-500 text-white border-green-500 shadow-md' 
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {cat.nama}
            </button>
          ))}
        </div>

        {/* LIST MENU ITEM */}
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : filteredMenu.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm mt-4">
            <p className="text-gray-500 text-sm font-medium">Menu tidak ditemukan.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 mt-2">
            {filteredMenu.map(menu => {
              const qty = keranjang.find(item => item.id === menu.id)?.qty || 0;
              return (
                <div 
                  key={menu.id} 
                  className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-sm border border-gray-100 transition-all hover:shadow-md"
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 rounded-xl overflow-hidden shrink-0">
                    {menu.image_url ? (
                      <img 
                        src={menu.image_url} 
                        alt={menu.nama} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <svg 
                          className="w-8 h-8" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth="1.5" 
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-800 text-sm sm:text-base truncate">
                      {menu.nama}
                    </h4>
                    <span className="text-[11px] sm:text-xs text-gray-400 block mt-0.5 truncate">
                      {categories.find(c => c.id === menu.kategori_id)?.nama || 'Tanpa Kategori'}
                    </span>
                    <div className="font-extrabold text-green-600 mt-1 sm:mt-2 text-sm">
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
                          className="w-8 h-8 flex items-center justify-center bg-green-500 text-white rounded-md shadow-sm active:scale-95 transition"
                        >
                          <span className="text-lg leading-none mb-0.5">+</span>
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => tambahKeKeranjang(menu)} 
                        className="px-5 py-2 border border-green-500 text-green-600 rounded-xl font-bold text-xs hover:bg-green-50 active:scale-95 transition"
                      >
                        Tambah
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* FLOATING CART BAR */}
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
              onClick={() => {
                setIsModalPembayaranOpen(true); 
                setMetodePembayaran('Tunai');
              }} 
              className="bg-green-500 hover:bg-green-600 text-white font-bold px-8 py-3.5 rounded-xl shadow-lg active:scale-95 transition"
            >
              Lanjut Bayar
            </button>
          </div>
        </div>
      </div>

      {/* MODAL PEMBAYARAN */}
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
               <h3 className="font-bold text-gray-800 text-xl">Metode Pembayaran</h3>
               <button 
                 onClick={() => setIsModalPembayaranOpen(false)} 
                 className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition"
               >
                 <svg 
                   className="w-5 h-5" 
                   fill="none" 
                   stroke="currentColor" 
                   viewBox="0 0 24 24"
                 >
                   <path 
                     strokeLinecap="round" 
                     strokeLinejoin="round" 
                     strokeWidth="2" 
                     d="M6 18L18 6M6 6l12 12" 
                   />
                 </svg>
               </button>
            </div>
            
            <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100">
               <span className="text-sm text-gray-500 block mb-1">
                 Total Tagihan ({totalItemKeranjang} Item)
               </span>
               <div className="text-2xl font-black text-green-600">
                 Rp {totalBelanja.toLocaleString('id-ID')}
               </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
               {['Tunai', 'QRIS'].map((m) => (
                 <button 
                   key={m} 
                   onClick={() => setMetodePembayaran(m)} 
                   className={`relative p-4 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${
                     metodePembayaran === m ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                   }`}
                 >
                    {metodePembayaran === m && (
                      <div className="absolute top-2 right-2 text-green-500">
                        <svg 
                          className="w-5 h-5 bg-white rounded-full" 
                          fill="currentColor" 
                          viewBox="0 0 20 20"
                        >
                          <path 
                            fillRule="evenodd" 
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
                            clipRule="evenodd" 
                          />
                        </svg>
                      </div>
                    )}
                    <img 
                      src={`/${m.toLowerCase()}.png`} 
                      alt={m} 
                      className="h-10 w-auto object-contain drop-shadow-sm" 
                      onError={(e) => { 
                        e.target.onerror = null; 
                        e.target.src = "https://cdn-icons-png.flaticon.com/512/2489/2489756.png" 
                      }} 
                    />
                    <span className={`font-bold text-sm ${
                      metodePembayaran === m ? 'text-green-700' : 'text-gray-600'
                    }`}>
                      {m}
                    </span>
                 </button>
               ))}
            </div>

            <button 
              onClick={prosesPembayaran} 
              disabled={isSaving} 
              className="w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold shadow-md active:scale-95 transition flex justify-center items-center"
            >
               {isSaving ? (
                 <svg 
                   className="animate-spin h-5 w-5 text-white" 
                   fill="none" 
                   viewBox="0 0 24 24"
                 >
                   <circle 
                     className="opacity-25" 
                     cx="12" 
                     cy="12" 
                     r="10" 
                     stroke="currentColor" 
                     strokeWidth="4"
                   ></circle>
                   <path 
                     className="opacity-75" 
                     fill="currentColor" 
                     d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                   ></path>
                 </svg>
               ) : 'Konfirmasi & Bayar'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL SUKSES & DETAIL STRUK */}
      {isModalSuksesOpen && transaksiTerakhir && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex justify-center items-end sm:items-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center flex flex-col">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 border-4 border-white shadow-sm">
              <svg 
                className="w-8 h-8 text-green-500" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="3" 
                  d="M5 13l4 4L19 7" 
                />
              </svg>
            </div>
            
            <h3 className="font-black text-gray-800 text-xl mb-1">Berhasil!</h3>
            <p className="text-xs text-gray-400 mb-4">
              {transaksiTerakhir.no_invoice} • {transaksiTerakhir.waktu}
            </p>
            
            <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100 text-left max-h-[160px] overflow-y-auto hide-scrollbar relative">
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
              <div className="border-t border-dashed border-gray-300 mt-3 pt-3 flex justify-between font-black text-green-600 sticky bottom-0 bg-gray-50">
                <span>TOTAL</span>
                <span>Rp {transaksiTerakhir.total.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="space-y-3">
               <button 
                 onClick={handleCetakStruk} 
                 className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-md active:scale-95 flex items-center justify-center gap-2 transition"
               >
                  <svg 
                    className="w-5 h-5" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth="2" 
                      d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" 
                    />
                  </svg>
                  Cetak Struk
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
      
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}