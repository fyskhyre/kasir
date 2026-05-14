import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../config/supabaseClient';

// Import komponen kalender
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css'; 
import 'react-date-range/dist/theme/default.css'; 

// Import komponen grafik
import { 
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

export default function Dashboard() {
  const [isAdmin, setIsAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // State untuk menyimpan daftar Kasir/Toko dan pilihan aktif
  const [cashiers, setCashiers] = useState([]);
  const [selectedCashier, setSelectedCashier] = useState('all');

  // State untuk menyimpan ringkasan data
  const [stats, setStats] = useState({
    pendapatanPeriode: 0,
    pengeluaranPeriode: 0,
    totalTransaksi: 0,
  });

  // State Grafik & Top Produk
  const [chartData, setChartData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);

  // State Filter & Kalender
  const [filter, setFilter] = useState('today');
  const [showCalendar, setShowCalendar] = useState(false);
  
  // Pisahkan state UI Kalender dan state yang memicu Fetch
  const [dateRange, setDateRange] = useState([
    { startDate: new Date(), endDate: new Date(), key: 'selection', color: '#3b82f6' }
  ]);
  const [appliedDateRange, setAppliedDateRange] = useState([
    { startDate: new Date(), endDate: new Date(), key: 'selection' }
  ]);
  
  const calendarRef = useRef(null);

  // Menutup kalender saat klik di luar
  useEffect(() => {
    function handleClickOutside(event) {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cek Role Admin saat komponen dimuat
  useEffect(() => {
    checkAdminRole();
  }, []);

  // Fetch data setiap kali filter kalender, toko, atau status admin berubah
  useEffect(() => {
    if (isAdmin) {
      fetchDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, appliedDateRange, isAdmin, selectedCashier]);

  const checkAdminRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Pengguna tidak terautentikasi');

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      setIsAdmin(true);

      // --- AMBIL DAFTAR TOKO / KASIR ---
      // Admin berhak mengambil daftar semua profil untuk ditampilkan di dropdown
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', 'admin'); // Abaikan admin agar dropdown hanya berisi kasir/toko
        
      if (profilesData) {
        setCashiers(profilesData);
      }

    } catch (error) {
      setErrorMsg(error.message);
      setLoading(false);
    }
  };

  // Fungsi Pembantu: Membuat kerangka waktu dengan nilai 0
  const getChartSkeleton = (selectedFilter, startDate, endDate) => {
    let skeleton = [];
    if (selectedFilter === 'today') {
      for (let i = 0; i <= 23; i++) {
        skeleton.push({ key: i, name: `${i.toString().padStart(2, '0')}:00`, Penjualan: 0, Pengeluaran: 0 });
      }
    } else if (selectedFilter === 'week') {
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const weekOrder = [1, 2, 3, 4, 5, 6, 0]; // Mulai dari Senin s/d Minggu
      weekOrder.forEach(d => {
        skeleton.push({ key: d, name: days[d], Penjualan: 0, Pengeluaran: 0 });
      });
    } else if (selectedFilter === 'month' || selectedFilter === 'custom') {
      let curr = new Date(startDate);
      curr.setHours(0, 0, 0, 0);
      let end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      while (curr <= end) {
        const y = curr.getFullYear();
        const m = String(curr.getMonth() + 1).padStart(2, '0');
        const d = String(curr.getDate()).padStart(2, '0');
        const key = `${y}-${m}-${d}`;
        const name = curr.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        skeleton.push({ key: key, name: name, Penjualan: 0, Pengeluaran: 0 });
        curr.setDate(curr.getDate() + 1);
      }
    }
    return skeleton;
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // 1. Siapkan rentang waktu berdasarkan filter
      const now = new Date();
      let start, end;

      if (filter === 'today') {
        start = new Date(now.setHours(0, 0, 0, 0));
        end = new Date(now.setHours(23, 59, 59, 999));
      } else if (filter === 'week') {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Geser ke Senin
        start = new Date(new Date().setDate(diff));
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
      } else if (filter === 'month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      } else if (filter === 'custom') {
        start = new Date(appliedDateRange[0].startDate);
        start.setHours(0, 0, 0, 0);
        end = new Date(appliedDateRange[0].endDate);
        end.setHours(23, 59, 59, 999);
      }

      const startISO = start.toISOString();
      const endISO = end.toISOString();

      // 2. Siapkan Kueri Transaksi & Pengeluaran
      let trxQuery = supabase
        .from('transactions')
        .select('*, transaction_items(*)')
        .gte('tanggal', startISO)
        .lte('tanggal', endISO);

      let expQuery = supabase
        .from('expenses')
        .select('*')
        .gte('tanggal', startISO)
        .lte('tanggal', endISO);

      // --- FILTER SPESIFIK TOKO (Jika bukan "Semua Toko") ---
      if (selectedCashier !== 'all') {
        trxQuery = trxQuery.eq('user_id', selectedCashier);
        expQuery = expQuery.eq('user_id', selectedCashier);
      }

      // Eksekusi Kueri
      const { data: trxData, error: trxError } = await trxQuery;
      if (trxError) throw trxError;

      const { data: expData, error: expError } = await expQuery;
      if (expError) throw expError;

      // 3. Kalkulasi Ringkasan Kartu
      const totalPendapatan = trxData.reduce((sum, trx) => sum + trx.total_belanja, 0);
      const totalPengeluaran = expData.reduce((sum, exp) => sum + exp.nominal, 0);

      setStats({
        pendapatanPeriode: totalPendapatan,
        pengeluaranPeriode: totalPengeluaran,
        totalTransaksi: trxData.length,
      });

      // 4. Kalkulasi Top 5 Produk
      const productMap = {};
      trxData.forEach(trx => {
        if (trx.transaction_items) {
          trx.transaction_items.forEach(item => {
            if (!productMap[item.nama_produk]) {
              productMap[item.nama_produk] = { nama: item.nama_produk, qty: 0, total: 0 };
            }
            productMap[item.nama_produk].qty += item.qty;
            productMap[item.nama_produk].total += item.subtotal;
          });
        }
      });
      const sortedProducts = Object.values(productMap)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5);
      setTopProducts(sortedProducts);

      // 5. Pembuatan Grafik Dinamis
      const chartSkeleton = getChartSkeleton(filter, start, end);
      const chartMap = {};
      chartSkeleton.forEach(item => { chartMap[item.key] = item; });

      // Pemetaan data penjualan ke kerangka waktu
      trxData.forEach(trx => {
        const d = new Date(trx.tanggal);
        let key;
        if (filter === 'today') key = d.getHours();
        else if (filter === 'week') key = d.getDay();
        else {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          key = `${y}-${m}-${day}`;
        }
        if (chartMap[key]) chartMap[key].Penjualan += trx.total_belanja;
      });

      // Pemetaan data pengeluaran ke kerangka waktu
      expData.forEach(exp => {
        const d = new Date(exp.tanggal);
        let key;
        if (filter === 'today') key = d.getHours();
        else if (filter === 'week') key = d.getDay();
        else {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          key = `${y}-${m}-${day}`;
        }
        if (chartMap[key]) chartMap[key].Pengeluaran += exp.nominal;
      });

      setChartData(chartSkeleton);

    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCalendar = () => {
    setAppliedDateRange(dateRange);
    setShowCalendar(false);
  };

  const formatDateSingkat = (date) => {
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // --- TAMPILAN LOADING ---
  if (loading && isAdmin === null) {
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
  const labaBersih = stats.pendapatanPeriode - stats.pengeluaranPeriode;

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in pb-24">
      
      {/* HEADER & FILTER BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Ringkasan Dashboard</h2>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">Pantau performa penjualan dan pengeluaran toko.</p>
        </div>

        {/* Posisi Filter di dorong ke kanan */}
        <div className="flex flex-col sm:flex-row justify-end items-end sm:items-center gap-2 relative w-full sm:w-auto">
          
          {/* --- DROPDOWN PILIH TOKO / KASIR --- */}
          <select 
            value={selectedCashier} 
            onChange={(e) => setSelectedCashier(e.target.value)}
            className="px-4 py-2.5 bg-white border border-gray-200 shadow-sm rounded-xl text-sm font-bold text-blue-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-w-[150px] w-full sm:w-auto"
          >
            <option value="all">🌐 Semua Toko</option>
            {cashiers.map(c => (
              <option key={c.id} value={c.id}>
                {/* Gunakan c.nama_lengkap sesuai database Anda */}
                🏪 {c.nama_lengkap || `Toko/Kasir (${c.id.substring(0,5)})`}
              </option>
            ))}
          </select>

          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2.5 bg-white border border-gray-200 shadow-sm rounded-xl text-sm font-semibold text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-w-[150px] w-full sm:w-auto"
          >
            <option value="today">Hari Ini</option>
            <option value="week">Minggu Ini</option>
            <option value="month">Bulan Ini</option>
            <option value="custom">Pilih Tanggal</option>
          </select>

          {filter === 'custom' && (
            <div className="relative w-full sm:w-auto sm:min-w-[220px]" ref={calendarRef}>
              <button 
                onClick={() => setShowCalendar(!showCalendar)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-gray-200 shadow-sm rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                <span>{formatDateSingkat(dateRange[0].startDate)} - {formatDateSingkat(dateRange[0].endDate)}</span>
                <svg className="w-5 h-5 text-gray-400 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </button>

              {showCalendar && (
                /* Posisi Kalender mekar ke kiri (right-0) */
                <div className="absolute top-12 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 overflow-hidden z-50">
                  <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <DateRange
                      editableDateInputs={true}
                      onChange={item => setDateRange([item.selection])}
                      moveRangeOnFirstSelection={false}
                      ranges={dateRange}
                      months={1}
                      direction="horizontal"
                      className="custom-calendar"
                      rangeColors={['#3b82f6']}
                    />
                  </div>
                  <div className="p-2 border-t border-gray-100 text-right mt-1">
                    <button 
                      onClick={handleApplyCalendar}
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
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 border border-red-100">
          Gagal memuat data: {errorMsg}
        </div>
      )}

      {loading && isAdmin ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Grid Kartu Statistik */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6">
            
            {/* Kartu: Pendapatan Kotor */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 transition hover:shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-500 text-sm font-medium">Pendapatan Kotor</h3>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  {/* Ikon Tas Belanja Baru */}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                Rp {stats.pendapatanPeriode.toLocaleString('id-ID')}
              </div>
              <p className="text-xs text-gray-400 mt-2">Dari {stats.totalTransaksi} transaksi</p>
            </div>

            {/* Kartu: Pengeluaran */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 transition hover:shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-500 text-sm font-medium">Pengeluaran</h3>
                <div className="p-2 bg-red-50 text-red-500 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                Rp {stats.pengeluaranPeriode.toLocaleString('id-ID')}
              </div>
              <p className="text-xs text-gray-400 mt-2">Uang keluar periode ini</p>
            </div>

            {/* Kartu: Laba Bersih */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden transition hover:shadow-md">
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

          {/* Grid Bawah: Grafik Terpisah & Top Produk */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            
            {/* CONTAINER DUA GRAFIK VERTIKAL */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2 flex flex-col gap-8">
              
              {/* Grafik 1: Penjualan */}
              <div className="w-full">
                <h3 className="font-bold text-gray-800 mb-4">Trend Penjualan</h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(val) => `${val/1000}k`} />
                      <Tooltip formatter={(value) => `Rp ${value.toLocaleString('id-ID')}`} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                      
                      <Bar dataKey="Penjualan" fill="#93c5fd" radius={[4, 4, 0, 0]} barSize={24} />
                      <Line type="monotone" dataKey="Penjualan" stroke="#2563eb" strokeWidth={2} dot={{ r: 3, fill: '#2563eb', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Garis Pemisah (Opsional) */}
              <hr className="border-gray-100" />

              {/* Grafik 2: Pengeluaran */}
              <div className="w-full">
                <h3 className="font-bold text-gray-800 mb-4">Trend Pengeluaran</h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(val) => `${val/1000}k`} />
                      <Tooltip formatter={(value) => `Rp ${value.toLocaleString('id-ID')}`} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                      
                      <Bar dataKey="Pengeluaran" fill="#fca5a5" radius={[4, 4, 0, 0]} barSize={24} />
                      <Line type="monotone" dataKey="Pengeluaran" stroke="#dc2626" strokeWidth={2} dot={{ r: 3, fill: '#dc2626', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* DAFTAR TOP 5 PRODUK */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col max-h-[630px]">
              <h3 className="font-bold text-gray-800 mb-6">Top 5 Terlaris</h3>
              
              <div className="flex-1 overflow-y-auto pr-1">
                {topProducts.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 py-10">
                     <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                     <span className="text-sm">Belum ada item terjual.</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {topProducts.map((prod, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-blue-50 transition border border-transparent hover:border-blue-100">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg font-bold flex items-center justify-center text-sm shadow-sm
                            ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : 
                              idx === 1 ? 'bg-gray-200 text-gray-700' : 
                              idx === 2 ? 'bg-orange-100 text-orange-800' : 'bg-white border text-gray-500'}`}
                          >
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800 text-sm">{prod.nama}</p>
                            <p className="text-[11px] text-gray-500 font-medium">{prod.qty} Terjual</p>
                          </div>
                        </div>
                        <div className="font-bold text-blue-600 text-sm">
                          Rp {(prod.total / 1000).toLocaleString('id-ID')}k
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}
