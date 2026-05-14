import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../config/supabaseClient';
import EscPosEncoder from 'esc-pos-encoder';

// Import react-date-range untuk kalender ganda
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css'; 
import 'react-date-range/dist/theme/default.css'; 

// IMPORT HOOK GLOBAL
import { useAlert } from '../../context/AlertContext'; 
import { usePrinter } from '../../context/PrinterContext'; 

export default function History() {
  // INISIALISASI HOOK GLOBAL
  const { showAlert } = useAlert();
  const { printerDevice, printCharacteristic, connectPrinter } = usePrinter();

  const [riwayat, setRiwayat] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storeInfo, setStoreInfo] = useState(null);
  
  // State Filter & Kalender
  const [filter, setFilter] = useState('today');
  const [showCalendar, setShowCalendar] = useState(false);
  const [dateRange, setDateRange] = useState([
    {
      startDate: new Date(),
      endDate: new Date(),
      key: 'selection',
      color: '#3b82f6'
    }
  ]);
  const calendarRef = useRef(null);
  
  // State Modal Detail
  const [selectedTrx, setSelectedTrx] = useState(null);
  const [detailItems, setDetailItems] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Menutup kalender saat klik di luar
  useEffect(() => {
    function handleClickOutside(event) {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [calendarRef]);

  // Ambil Data Toko dari tabel store_settings
  useEffect(() => {
    const fetchStoreInfo = async () => {
      try {
        const { data } = await supabase.from('store_settings').select('*').eq('id', 1).single();
        setStoreInfo(data);
      } catch (error) {
        console.error('Gagal mengambil data toko:', error.message);
      }
    };
    fetchStoreInfo();
  }, []);

  // Fetch riwayat saat filter berubah
  useEffect(() => {
    fetchRiwayat();
  }, [filter, dateRange]); 

  const fetchRiwayat = async () => {
    try {
      setLoading(true);

      // --- TAMBAHAN RBAC: Pengecekan Sesi Kasir ---
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        showAlert("Sesi tidak valid. Harap login kembali.", "warning");
        setLoading(false);
        return;
      }

      let query = supabase.from('transactions').select('*').order('tanggal', { ascending: false });

      const now = new Date();
      let start, end;

      if (filter === 'today') {
        start = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        end = new Date(now.setHours(23, 59, 59, 999)).toISOString();
      } else if (filter === 'week') {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        start = new Date(new Date().setDate(diff));
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        start = start.toISOString();
        end = end.toISOString();
      } else if (filter === 'month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
      } else if (filter === 'custom') {
        start = new Date(dateRange[0].startDate);
        start.setHours(0, 0, 0, 0);
        end = new Date(dateRange[0].endDate);
        end.setHours(23, 59, 59, 999);
        start = start.toISOString();
        end = end.toISOString();
      }

      if (start && end) {
        query = query.gte('tanggal', start).lte('tanggal', end);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRiwayat(data || []);
    } catch (error) {
      console.error('Gagal mengambil riwayat transaksi:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const lihatDetail = async (trx) => {
    setSelectedTrx(trx);
    setDetailItems([]);
    setLoadingDetail(true);

    try {
      const { data, error } = await supabase
        .from('transaction_items')
        .select('*')
        .eq('transaksi_id', trx.id);
      if (error) throw error;
      setDetailItems(data || []);
    } catch (error) {
      console.error('Gagal mengambil detail item:', error.message);
    } finally {
      setLoadingDetail(false);
    }
  };

  const tutupDetail = () => {
    setSelectedTrx(null);
    setDetailItems([]);
  };

  const formatTanggal = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('id-ID', { 
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).replace(/\./g, ':');
  };

  const formatDateSingkat = (date) => {
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // =================================================================
  // LOGIKA CETAK ULANG STRUK THERMAL
  // =================================================================
  const cetakUlangStruk = async () => {
    if (!printCharacteristic) {
      return showAlert("Printer belum terhubung! Silakan klik ikon printer di kanan atas.", 'warning');
    }
    
    if (!selectedTrx || detailItems.length === 0) {
      return showAlert("Data transaksi belum siap dicetak.", 'warning');
    }
    
    try {
      if (typeof EscPosEncoder === 'undefined') {
         return showAlert("Cetak sukses! (Mode Simulasi)", 'success');
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
        
        // Perbaikan Bug Printer: Hapus newline setelah logo
        result = result
          .align('center')
          .image(loadedImg, 384, 128, 'atkinson');
      } catch (err) { 
        console.warn("Skip logo cetak:", err.message); 
      }

      // Perbaikan Bug Printer: Susunan align yang benar agar garis putus-putus tidak bergeser
      result = result
        .align('left')
        .line('--------------------------------')
        .align('center')
        .line('*** CETAK ULANG ***')
        .align('left')
        .line('--------------------------------')
        .line(`Resi  : ${selectedTrx.no_invoice}`)
        .line(`Tgl   : ${formatTanggal(selectedTrx.tanggal)}`)
        .line(`Metode: ${selectedTrx.metode_pembayaran}`)
        .line('--------------------------------');

      detailItems.forEach(item => {
        result = result.line(item.nama_produk.substring(0, 32));
        const priceLine = `${item.qty} x ${item.harga_satuan.toLocaleString('id-ID')}`;
        const subtotal = item.subtotal.toLocaleString('id-ID');
        result = result.line(priceLine.padEnd(32 - subtotal.length) + subtotal);
      });

      const strTotal = `Rp ${selectedTrx.total_belanja.toLocaleString('id-ID')}`;
      
      result = result
        .line('--------------------------------')
        .bold(true)
        .line('TOTAL:'.padEnd(32 - strTotal.length) + strTotal)
        .bold(false)
        .line('--------------------------------')
        .align('center')
        .line('~ Terimakasih banyak atas pesanannya ~') // Footer statis
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
      showAlert("Terjadi kesalahan saat mencetak: " + error.message, 'warning'); 
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full h-full flex flex-col bg-gray-50 animate-fade-in relative">
      
      {/* HEADER */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Riwayat Transaksi</h2>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">Daftar transaksi penjualan terakhir toko Anda.</p>
        </div>
        <button 
          onClick={connectPrinter} 
          className={`relative p-2.5 sm:p-3 rounded-xl border shadow-sm transition-all flex items-center gap-2 ${
            printerDevice ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
          }`}
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          <span className="hidden sm:inline font-semibold text-sm">
            {printerDevice ? 'Terhubung' : 'Printer'}
          </span>
          <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${printerDevice ? 'bg-blue-500' : 'bg-red-400'}`}></span>
        </button>
      </div>

      {/* FILTER BAR & CUSTOM DATE-RANGE */}
      <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 mb-4 flex flex-col sm:flex-row gap-3 relative z-20">
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-w-[150px]"
        >
          <option value="today">Hari Ini</option>
          <option value="week">Minggu Ini</option>
          <option value="month">Bulan Ini</option>
          <option value="custom">Pilih Tanggal</option>
        </select>

        {filter === 'custom' && (
          <div className="relative flex-1 max-w-md" ref={calendarRef}>
            <button 
              onClick={() => setShowCalendar(!showCalendar)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
            >
              <span>{formatDateSingkat(dateRange[0].startDate)} - {formatDateSingkat(dateRange[0].endDate)}</span>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </button>

            {showCalendar && (
              <div className="absolute top-12 left-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 overflow-hidden z-50">
                <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <DateRange
                    editableDateInputs={true}
                    onChange={item => setDateRange([item.selection])}
                    moveRangeOnFirstSelection={false}
                    ranges={dateRange}
                    months={2}
                    direction="horizontal"
                    className="custom-calendar"
                    rangeColors={['#3b82f6']}
                  />
                </div>
                <div className="p-2 border-t border-gray-100 text-right mt-1">
                  <button 
                    onClick={() => setShowCalendar(false)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition"
                  >
                    Terapkan
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* DAFTAR TRANSAKSI */}
      <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 pb-20 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : riwayat.length === 0 ? (
          <div className="text-center bg-white p-10 rounded-2xl border border-gray-100 shadow-sm">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            <p className="text-gray-500">Tidak ada transaksi untuk periode ini.</p>
          </div>
        ) : (
          riwayat.map((trx) => (
            <div 
              key={trx.id} 
              onClick={() => lihatDetail(trx)}
              className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center cursor-pointer hover:border-blue-300 hover:shadow-md transition active:scale-[0.99]"
            >
              <div>
                <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">{formatTanggal(trx.tanggal)}</p>
                <p className="font-bold text-sm sm:text-base text-gray-800">{trx.no_invoice}</p>
                <div className="flex items-center mt-1 space-x-2">
                  <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded font-semibold bg-blue-100 text-blue-700`}>
                    {trx.metode_pembayaran}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-blue-600 text-sm sm:text-base mb-1 sm:mb-2">
                  Rp {trx.total_belanja.toLocaleString('id-ID')}
                </p>
                <button className="text-[10px] sm:text-xs bg-gray-50 text-gray-600 px-2 py-1 sm:px-3 sm:py-1.5 rounded-md font-semibold border border-gray-200 hover:bg-gray-100 transition">
                  Lihat Detail
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL DETAIL TRANSAKSI */}
      {selectedTrx && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center items-end sm:items-center p-4 animate-fade-in" onClick={tutupDetail}>
          <div className="bg-white w-full max-w-md rounded-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 sm:p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="font-bold text-gray-800 text-base sm:text-lg">Detail Transaksi</h3>
                <p className="text-xs text-gray-500">{selectedTrx.no_invoice}</p>
              </div>
              <button onClick={tutupDetail} className="p-2 bg-gray-200 hover:bg-gray-300 rounded-full text-gray-600 transition">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-4 sm:p-5 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="flex justify-between items-center text-sm mb-4 border-b border-dashed border-gray-300 pb-3">
                <span className="text-gray-500">Tanggal</span>
                <span className="font-semibold text-gray-800">{formatTanggal(selectedTrx.tanggal)}</span>
              </div>
              <div className="mb-2"><span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Item Pesanan</span></div>

              {loadingDetail ? (
                <div className="flex justify-center py-6"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div></div>
              ) : (
                <div className="space-y-3">
                  {detailItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-start text-sm">
                      <div className="flex-1 pr-2">
                        <p className="font-medium text-gray-800">{item.nama_produk}</p>
                        <p className="text-xs text-gray-500">{item.qty} x Rp {item.harga_satuan.toLocaleString('id-ID')}</p>
                      </div>
                      <div className="font-semibold text-gray-800">Rp {item.subtotal.toLocaleString('id-ID')}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-100">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-500">Metode</span>
                <span className="text-sm font-semibold text-gray-800">{selectedTrx.metode_pembayaran}</span>
              </div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200 mb-4">
                <span className="text-base font-bold text-gray-800">Total</span>
                <span className="text-xl font-bold text-blue-600">Rp {selectedTrx.total_belanja.toLocaleString('id-ID')}</span>
              </div>
              <button 
                onClick={cetakUlangStruk}
                disabled={loadingDetail || detailItems.length === 0}
                className={`w-full py-3.5 rounded-xl font-bold shadow-sm flex items-center justify-center gap-2 transition ${loadingDetail || detailItems.length === 0 ? 'bg-blue-300 text-white cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95'}`}
              >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                 Cetak Ulang Struk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
