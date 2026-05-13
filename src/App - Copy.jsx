import React, { useState } from 'react';

// --- DATA DUMMY ---
const DUMMY_MENU = [
  { id: 1, nama: 'Kopi Susu Gula Aren', harga: 18000, kategori: 'Minuman' },
  { id: 2, nama: 'Americano', harga: 15000, kategori: 'Minuman' },
  { id: 3, nama: 'Matcha Latte', harga: 22000, kategori: 'Minuman' },
  { id: 4, nama: 'Es Teh Manis', harga: 8000, kategori: 'Minuman' },
  { id: 5, nama: 'Nasi Goreng Spesial', harga: 25000, kategori: 'Makanan' },
  { id: 6, nama: 'Mie Goreng Telur', harga: 20000, kategori: 'Makanan' },
  { id: 7, nama: 'Nasi Putih', harga: 6000, kategori: 'Makanan' },
  { id: 8, nama: 'Ayam Goreng', harga: 15000, kategori: 'Lauk' },
  { id: 9, nama: 'Telur Dadar', harga: 5000, kategori: 'Lauk' },
  { id: 10, nama: 'Tempe Mendoan', harga: 8000, kategori: 'Lauk' },
];

// --- DATA DUMMY DASHBOARD BARU ---
const SALES_DATA = {
  Harian: [
    { label: '08:00', total: 150000 }, { label: '10:00', total: 350000 },
    { label: '12:00', total: 850000 }, { label: '14:00', total: 450000 },
    { label: '16:00', total: 600000 }, { label: '18:00', total: 950000 },
    { label: '20:00', total: 1250000 }
  ],
  Mingguan: [
    { label: 'Sen', total: 850000 }, { label: 'Sel', total: 920000 },
    { label: 'Rab', total: 780000 }, { label: 'Kam', total: 1050000 },
    { label: 'Jum', total: 1250000 }, { label: 'Sab', total: 1850000 },
    { label: 'Min', total: 1500000 }
  ],
  Bulanan: [
    { label: 'Mg 1', total: 5500000 }, { label: 'Mg 2', total: 7200000 },
    { label: 'Mg 3', total: 6800000 }, { label: 'Mg 4', total: 8500000 }
  ]
};

const SUMMARY_STATS = {
  Harian: { pengeluaran: 450000, transaksi: 34 },
  Mingguan: { pengeluaran: 1200000, transaksi: 245 },
  Bulanan: { pengeluaran: 5500000, transaksi: 980 }
};

const TOP_MENU = [
  { nama: 'Nasgor Spesial', terjual: 145 },
  { nama: 'Kopi Susu Aren', terjual: 120 },
  { nama: 'Mie Goreng', terjual: 95 },
  { nama: 'Matcha Latte', terjual: 80 },
  { nama: 'Americano', terjual: 65 },
  { nama: 'Kentang Goreng', terjual: 55 },
  { nama: 'Es Teh Manis', terjual: 45 },
  { nama: 'Ayam Geprek', terjual: 38 },
  { nama: 'Roti Bakar', terjual: 30 },
  { nama: 'Dimsum Udang', terjual: 25 },
];

export default function App() {
  // --- STATE MANAJEMEN ---
  const [activeTab, setActiveTab] = useState('home'); // Default ke Home
  const [dashboardFilter, setDashboardFilter] = useState('Mingguan'); // Filter Dashboard
  const [keranjang, setKeranjang] = useState([]);
  const [modalPembayaran, setModalPembayaran] = useState(false);
  const [metodePembayaran, setMetodePembayaran] = useState('');
  
  // State Baru untuk UI Kasir
  const [kategoriCollapse, setKategoriCollapse] = useState({}); // Mengontrol extend/collapse kategori
  const [isKeranjangOpen, setIsKeranjangOpen] = useState(false); // Mengontrol laci keranjang

  // State untuk Fitur Edit Posisi (Drag and Drop)
  const [isEditMode, setIsEditMode] = useState(false);
  const [menuData, setMenuData] = useState(DUMMY_MENU);
  const [kategoriOrder, setKategoriOrder] = useState(['Minuman', 'Makanan', 'Lauk']);
  const [draggedCat, setDraggedCat] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);

  // State Uang Keluar
  const [keteranganKeluar, setKeteranganKeluar] = useState('');
  const [nominalKeluar, setNominalKeluar] = useState('');
  const [riwayatPengeluaran, setRiwayatPengeluaran] = useState([
    { id: 1, tanggal: '06 Mei 2026', keterangan: 'Beli Es Batu', nominal: 15000 },
    { id: 2, tanggal: '05 Mei 2026', keterangan: 'Iuran Sampah', nominal: 50000 }
  ]);

  // --- FUNGSI KASIR ---
  const tambahKeKeranjang = (menu) => {
    const itemAda = keranjang.find((item) => item.id === menu.id);
    if (itemAda) {
      setKeranjang(keranjang.map((item) => item.id === menu.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setKeranjang([...keranjang, { ...menu, qty: 1 }]);
    }
  };

  const kurangiKeranjang = (id) => {
    const itemAda = keranjang.find((item) => item.id === id);
    if (itemAda.qty === 1) {
      const keranjangBaru = keranjang.filter((item) => item.id !== id);
      setKeranjang(keranjangBaru);
      // Tutup keranjang jika kosong
      if (keranjangBaru.length === 0) setIsKeranjangOpen(false);
    } else {
      setKeranjang(keranjang.map((item) => item.id === id ? { ...item, qty: item.qty - 1 } : item));
    }
  };

  const totalBelanja = keranjang.reduce((total, item) => total + item.harga * item.qty, 0);
  const totalItemKeranjang = keranjang.reduce((acc, item) => acc + item.qty, 0);

  const handleCheckout = () => {
    if (keranjang.length === 0) return alert('Keranjang masih kosong!');
    setIsKeranjangOpen(false); // Tutup laci keranjang saat mau bayar
    setModalPembayaran(true);
  };

  const konfirmasiPembayaran = () => {
    if (!metodePembayaran) return alert('Pilih metode pembayaran terlebih dahulu!');
    alert(`Transaksi Berhasil!\nTotal: Rp ${totalBelanja.toLocaleString('id-ID')}\nMetode: ${metodePembayaran}\n\nMencetak struk...`);
    setKeranjang([]);
    setModalPembayaran(false);
    setMetodePembayaran('');
  };

  const simpanUangKeluar = (e) => {
    e.preventDefault();
    if (!keteranganKeluar || !nominalKeluar) return alert('Harap isi keterangan dan nominal!');
    
    // Menambah riwayat pengeluaran baru ke dalam daftar (state)
    const pengeluaranBaru = {
      id: Date.now(),
      tanggal: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
      keterangan: keteranganKeluar,
      nominal: parseInt(nominalKeluar)
    };

    setRiwayatPengeluaran([pengeluaranBaru, ...riwayatPengeluaran]);
    alert(`Berhasil mencatat pengeluaran:\n${keteranganKeluar} - Rp ${parseInt(nominalKeluar).toLocaleString('id-ID')}`);
    
    // Reset Form Input
    setKeteranganKeluar('');
    setNominalKeluar('');
  };

  // --- HANDLER DRAG AND DROP (EDIT MODE) ---
  const handleDragStartCat = (e, cat) => {
    if (!isEditMode) return;
    setDraggedCat(cat);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDropCat = (e, targetCat) => {
    e.stopPropagation();
    if (!isEditMode || !draggedCat || draggedCat === targetCat) return;
    const newOrder = [...kategoriOrder];
    const draggedIdx = newOrder.indexOf(draggedCat);
    const targetIdx = newOrder.indexOf(targetCat);
    newOrder.splice(draggedIdx, 1);
    newOrder.splice(targetIdx, 0, draggedCat);
    setKategoriOrder(newOrder);
    setDraggedCat(null);
  };

  const handleDragStartItem = (e, menu) => {
    if (!isEditMode) return;
    e.stopPropagation();
    setDraggedItem(menu);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDropItem = (e, targetMenu, targetKategori) => {
    e.stopPropagation();
    if (!isEditMode || !draggedItem || draggedItem.id === targetMenu.id) return;
    
    const newData = [...menuData];
    const draggedIdx = newData.findIndex(m => m.id === draggedItem.id);
    const targetIdx = newData.findIndex(m => m.id === targetMenu.id);

    // Hapus item yang ditarik dari posisi awal
    const [removed] = newData.splice(draggedIdx, 1);
    // Pastikan kategori diperbarui jika dipindah lintas tab (walau fokusnya menukar dalam tab yang sama)
    removed.kategori = targetKategori; 
    // Sisipkan di posisi baru
    newData.splice(targetIdx, 0, removed);
    
    setMenuData(newData);
    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedCat(null);
    setDraggedItem(null);
  };

  // --- KOMPONEN HALAMAN (VIEWS) ---

  // 1. Halaman Home (Dashboard)
  const renderHome = () => {
    // Ambil data sesuai filter yang dipilih
    const currentChartData = SALES_DATA[dashboardFilter];
    const currentStats = SUMMARY_STATS[dashboardFilter];
    const maxSales = Math.max(...currentChartData.map(d => d.total));
    const maxTopMenu = Math.max(...TOP_MENU.map(m => m.terjual));

    // Membuat titik koordinat SVG untuk Grafik Garis
    const linePoints = currentChartData.map((d, index) => {
      const x = (index / (currentChartData.length - 1)) * 100;
      const y = 100 - ((d.total / maxSales) * 100);
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header Dashboard & Filter */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Halo, Admin! 👋</h2>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">Berikut adalah ringkasan penjualan Anda.</p>
          </div>
          
          {/* Tombol Filter */}
          <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg w-full sm:w-auto overflow-x-auto">
            {['Harian', 'Mingguan', 'Bulanan'].map(filter => (
              <button
                key={filter}
                onClick={() => setDashboardFilter(filter)}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-md transition duration-200 whitespace-nowrap ${dashboardFilter === filter ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
        
        {/* 3 Tiles Ringkasan Cepat */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 sm:p-5 rounded-2xl shadow-sm text-white">
            <p className="text-xs sm:text-sm opacity-80 mb-1">Total Pendapatan</p>
            <h3 className="text-xl sm:text-2xl font-bold">
              Rp {(currentChartData.reduce((sum, item) => sum + item.total, 0)).toLocaleString('id-ID')}
            </h3>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-red-600 p-4 sm:p-5 rounded-2xl shadow-sm text-white">
            <p className="text-xs sm:text-sm opacity-80 mb-1">Total Pengeluaran</p>
            <h3 className="text-xl sm:text-2xl font-bold">
              Rp {currentStats.pengeluaran.toLocaleString('id-ID')}
            </h3>
          </div>
          <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-xs sm:text-sm text-gray-500 mb-1">Total Transaksi</p>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800">
              {currentStats.transaksi} <span className="text-xs sm:text-sm font-normal text-gray-500">Nota</span>
            </h3>
          </div>
        </div>

        {/* Grafik Garis (Line Chart) Interaktif */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <h3 className="text-sm sm:text-md font-bold text-gray-800 mb-4 sm:mb-6">Tren Penjualan</h3>
          
          <div className="relative w-full h-40 sm:h-48 lg:h-56 mt-4 pt-4">
            {/* SVG Pembentuk Garis & Gradasi */}
            <svg className="absolute inset-0 h-full w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="lineGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4"/>
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <polygon points={`0,100 ${linePoints} 100,100`} fill="url(#lineGradient)" />
              <polyline points={linePoints} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>

            {/* Titik Data (Dots) dan Tooltip Hover */}
            {currentChartData.map((d, i) => {
              const x = (i / (currentChartData.length - 1)) * 100;
              const y = 100 - ((d.total / maxSales) * 100);
              return (
                <div key={i} className="absolute flex flex-col items-center group cursor-pointer" style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}>
                  {/* Tooltip Angka */}
                  <div className="opacity-0 group-hover:opacity-100 absolute bottom-4 sm:bottom-5 bg-gray-800 text-white text-[10px] sm:text-xs font-semibold py-1 px-2 rounded-md whitespace-nowrap z-10 transition-opacity pointer-events-none shadow-lg">
                    Rp {(d.total / 1000).toLocaleString('id-ID')}k
                    {/* Segitiga kecil dibawah tooltip */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                  </div>
                  {/* Titik Lingkaran */}
                  <div className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 bg-white border-2 border-blue-600 rounded-full group-hover:scale-150 group-hover:bg-blue-50 transition-all shadow-sm"></div>
                </div>
              );
            })}
          </div>

          {/* Label Sumbu X (Bawah) */}
          <div className="flex justify-between w-full mt-4 text-[10px] sm:text-xs font-medium text-gray-400 relative">
            {currentChartData.map((d, i) => (
              <span key={i} className="flex-1 text-center" style={{marginLeft: i === 0 ? '-2%' : '0', marginRight: i === currentChartData.length - 1 ? '-2%' : '0'}}>
                {d.label}
              </span>
            ))}
          </div>
        </div>

        {/* Grafik Batang Top 10 Menu (Vertikal) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto scroll-smooth">
          <h3 className="text-sm sm:text-md font-bold text-gray-800 mb-4 sm:mb-5 whitespace-nowrap">Top 10 Menu Terlaris</h3>
          <div className="flex items-end justify-between min-w-[500px] sm:min-w-full h-48 sm:h-56 gap-1 md:gap-2 pt-8 pb-2">
            {TOP_MENU.map((menu, index) => {
              const heightPercentage = (menu.terjual / maxTopMenu) * 100;
              return (
                <div key={index} className="flex flex-col items-center flex-1 h-full justify-end group cursor-pointer relative">
                  {/* Tooltip Angka */}
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-gray-800 text-white text-[10px] sm:text-xs font-semibold py-1 px-2 rounded-md whitespace-nowrap z-10 transition-opacity pointer-events-none shadow-lg">
                    {menu.terjual} porsi
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                  </div>
                  
                  {/* Nilai di atas batang */}
                  <span className="text-[10px] sm:text-xs text-gray-500 mb-1 font-semibold">{menu.terjual}</span>
                  
                  {/* Batang Vertikal */}
                  <div
                    className={`w-full max-w-[16px] sm:max-w-[24px] md:max-w-[32px] rounded-t-md transition-all duration-500 ease-in-out ${index < 3 ? 'bg-blue-500 group-hover:bg-blue-600' : 'bg-blue-300 group-hover:bg-blue-400'}`}
                    style={{ height: `${Math.max(heightPercentage, 5)}%` }}
                  ></div>
                  
                  {/* Nama Menu di bawah batang */}
                  <span className="text-[8px] sm:text-[10px] text-gray-500 mt-2 font-medium text-center line-clamp-2 h-6 flex items-start justify-center leading-tight px-1 w-full max-w-[50px] sm:max-w-none">
                    {menu.nama}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        
      </div>
    );
  };

  // 2. Halaman Kasir (POS) - Mode Tiles, Kategori Collapsible, Keranjang Tersembunyi & Edit Mode
  const renderKasir = () => {
    // Kelompokkan menu berdasarkan data dinamis (agar efek drag&drop berfungsi)
    const menuPerKategori = menuData.reduce((acc, menu) => {
      if (!acc[menu.kategori]) acc[menu.kategori] = [];
      acc[menu.kategori].push(menu);
      return acc;
    }, {});

    const toggleKategori = (kategori) => {
      setKategoriCollapse((prev) => ({ ...prev, [kategori]: !prev[kategori] }));
    };

    return (
      <div className="relative flex flex-col h-full overflow-hidden bg-gray-50">
        
        {/* Popup Floating Indicator Keranjang */}
        {keranjang.length > 0 && !isKeranjangOpen && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 w-[92%] sm:w-11/12 max-w-sm md:max-w-md">
            <div 
              onClick={() => setIsKeranjangOpen(true)}
              className="bg-blue-600 text-white rounded-xl shadow-xl p-3 sm:p-4 flex justify-between items-center cursor-pointer hover:bg-blue-700 transition animate-bounce-short"
              style={{ animation: 'bounce 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}
            >
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="relative">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full">{totalItemKeranjang}</span>
                </div>
                <span className="font-semibold text-xs sm:text-sm">{totalItemKeranjang} item dipilih</span>
              </div>
              <span className="bg-white text-blue-600 text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1.5 rounded-lg shadow-sm">Lihat Keranjang</span>
          </div>
        </div>
      )}

      {/* Daftar Menu per Kategori */}
      <div className="flex-1 overflow-y-auto w-full pb-24">
        <div className="p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto w-full">
          {/* Header Kasir dengan Tombol Edit Mode */}
          <div className="flex justify-between items-center mb-4 sm:mb-6 px-1 mt-2 sm:mt-0">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">Pilih Menu</h2>
            <button 
              onClick={() => setIsEditMode(!isEditMode)}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition shadow-sm active:scale-95 ${isEditMode ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              <span>{isEditMode ? 'Selesai Edit' : 'Edit Posisi'}</span>
            </button>
          </div>
          
          <div className="space-y-4 sm:space-y-6">
            {kategoriOrder.map((kategori) => {
              if (!menuPerKategori[kategori]) return null; // Skip jika kategori kosong
              
              return (
                <div 
                  key={kategori} 
                  draggable={isEditMode}
                  onDragStart={(e) => handleDragStartCat(e, kategori)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDropCat(e, kategori)}
                  onDragEnd={handleDragEnd}
                  className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all duration-300 ${isEditMode ? 'border-dashed border-2 border-gray-400 opacity-90 hover:opacity-100 cursor-move transform hover:-translate-y-1' : 'border-gray-100'}`}
                >
                  {/* Header Kategori (Collapsible & Draggable) */}
                  <div 
                    onClick={() => !isEditMode && toggleKategori(kategori)}
                    className={`bg-gray-50/80 p-3 sm:p-4 flex justify-between items-center transition ${isEditMode ? 'bg-gray-100 cursor-move' : 'cursor-pointer hover:bg-gray-100 active:bg-gray-200'}`}
                  >
                    <div className="flex items-center space-x-3">
                      {isEditMode && <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" /></svg>}
                      <h3 className="font-bold text-gray-700 text-xs sm:text-sm uppercase tracking-wide">{kategori}</h3>
                    </div>
                    {!isEditMode && (
                      <svg className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-500 transition-transform duration-300 ${kategoriCollapse[kategori] ? '-rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </div>

                  {/* Grid Menu Tiles */}
                  {(!kategoriCollapse[kategori] || isEditMode) && (
                    <div className={`p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 ${isEditMode ? 'bg-gray-50/50' : ''}`}>
                      {menuPerKategori[kategori].map((menu) => {
                        const cartItem = keranjang.find(i => i.id === menu.id);
                        const isSelected = !!cartItem;

                        return (
                          <div 
                            key={menu.id} 
                            draggable={isEditMode}
                            onDragStart={(e) => handleDragStartItem(e, menu)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDropItem(e, menu, kategori)}
                            onDragEnd={handleDragEnd}
                            onClick={() => { if (!isEditMode && !isSelected) tambahKeKeranjang(menu); }} 
                            className={`aspect-square bg-white border rounded-xl shadow-sm cursor-pointer transition-all duration-300 relative group overflow-hidden
                              ${isEditMode ? 'border-dashed border-2 border-gray-300 cursor-move hover:border-gray-500 opacity-80 hover:opacity-100' : 'hover:border-blue-400 hover:shadow-md'}
                              ${isSelected && !isEditMode ? 'scale-95 border-blue-500 bg-blue-50/50 shadow-inner' : 'border-gray-200'}
                            `}
                          >
                            {/* Grip Icon (Hanya di Edit Mode) */}
                            {isEditMode && (
                              <div className="absolute top-2 right-2 text-gray-300">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" /></svg>
                              </div>
                            )}

                            {/* Konten Utama Menu (Nama & Harga) - Bergeser naik jika dipilih */}
                            <div className={`flex flex-col justify-center items-center text-center h-full w-full p-2 sm:p-3 transition-transform duration-300 ${isSelected && !isEditMode ? '-translate-y-4' : ''}`}>
                              <h4 className="font-semibold text-gray-800 text-xs sm:text-sm mb-1.5 sm:mb-2 line-clamp-2 px-1">{menu.nama}</h4>
                              <div className="text-blue-600 font-bold text-xs sm:text-sm">Rp {menu.harga.toLocaleString('id-ID')}</div>
                            </div>

                            {/* Kontrol Kuantitas (Muncul di bawah jika dipilih) */}
                            {isSelected && !isEditMode && (
                              <div className="absolute bottom-2 inset-x-0 mx-auto w-max flex items-center space-x-2 sm:space-x-3 bg-white rounded-lg p-1 border border-gray-200 shadow-md">
                                <button onClick={(e) => { e.stopPropagation(); kurangiKeranjang(menu.id); }} className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-red-500 font-bold hover:bg-red-100 rounded-md transition active:scale-90">-</button>
                                <span className="text-xs sm:text-sm font-bold w-4 sm:w-5 text-center text-gray-800">{cartItem.qty}</span>
                                <button onClick={(e) => { e.stopPropagation(); tambahKeKeranjang(menu); }} className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-blue-600 font-bold hover:bg-blue-100 rounded-md transition active:scale-90">+</button>
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
          </div>
        </div>
      </div>

      {/* Laci Keranjang (Drawer) - Muncul dari Kanan */}
      {/* Backdrop (Layar Gelap) */}
        {isKeranjangOpen && (
          <div 
            className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm transition-opacity"
            onClick={() => setIsKeranjangOpen(false)}
          ></div>
        )}
        
        {/* Panel Laci */}
        <div className={`fixed inset-y-0 right-0 w-full sm:w-[400px] bg-white shadow-2xl flex flex-col z-[70] transform transition-transform duration-300 ease-in-out ${isKeranjangOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-4 sm:p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">Keranjang</h2>
              <p className="text-xs sm:text-sm text-gray-500">{totalItemKeranjang} item pesanan</p>
            </div>
            <button 
              onClick={() => setIsKeranjangOpen(false)}
              className="p-2 bg-gray-200 hover:bg-gray-300 rounded-full text-gray-600 transition active:scale-90"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 sm:space-y-4">
            {keranjang.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <svg className="w-12 h-12 sm:w-16 sm:h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                <p className="text-sm">Belum ada pesanan</p>
              </div>
            ) : (
              keranjang.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-2 sm:p-3 rounded-xl border border-gray-100 shadow-sm bg-white">
                  <div className="flex-1 pr-2">
                    <h4 className="font-semibold text-gray-800 text-xs sm:text-sm line-clamp-1">{item.nama}</h4>
                    <div className="text-blue-600 font-bold text-xs sm:text-sm mt-0.5 sm:mt-1">Rp {(item.harga * item.qty).toLocaleString('id-ID')}</div>
                  </div>
                  <div className="flex items-center space-x-2 sm:space-x-3 bg-gray-50 rounded-lg p-1 border border-gray-200">
                    <button onClick={() => kurangiKeranjang(item.id)} className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-red-500 font-bold hover:bg-red-100 rounded-md transition active:scale-90">-</button>
                    <span className="text-xs sm:text-sm font-bold w-3 sm:w-4 text-center">{item.qty}</span>
                    <button onClick={() => tambahKeKeranjang(item)} className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-blue-600 font-bold hover:bg-blue-100 rounded-md transition active:scale-90">+</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 sm:p-5 border-t border-gray-200 bg-white">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <span className="text-sm sm:text-base text-gray-600">Total Pembayaran</span>
              <span className="text-xl sm:text-2xl font-bold text-gray-900">Rp {totalBelanja.toLocaleString('id-ID')}</span>
            </div>
            <button 
              onClick={handleCheckout} 
              disabled={keranjang.length === 0} 
              className={`w-full py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition shadow-md ${keranjang.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]'}`}
            >
              Proses Pembayaran
            </button>
          </div>
        </div>

      </div>
    );
  };

  // 3. Halaman Uang Keluar (Berdiri Sendiri)
  const renderPengeluaran = () => (
    <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col bg-gray-50 overflow-y-auto max-w-7xl mx-auto w-full">
      <div className="mb-4 sm:mb-6 flex-shrink-0">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Uang Keluar</h2>
        <p className="text-gray-500 text-xs sm:text-sm mt-1">Catat dan pantau pengeluaran operasional Anda.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 flex-1 items-start">
        {/* Kiri: Form Input */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 lg:sticky lg:top-0">
          <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 border-b pb-2">Catat Pengeluaran Baru</h3>
          <form onSubmit={simpanUangKeluar} className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Keterangan / Keperluan</label>
              <input 
                type="text" 
                value={keteranganKeluar}
                onChange={(e) => setKeteranganKeluar(e.target.value)}
                placeholder="Misal: Beli es batu 2 bungkus" 
                className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none transition" 
                required
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Nominal (Rp)</label>
              <input 
                type="number" 
                value={nominalKeluar}
                onChange={(e) => setNominalKeluar(e.target.value)}
                placeholder="0" 
                className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none transition" 
                required
              />
            </div>
            <button type="submit" className="w-full bg-red-500 text-white font-bold py-2.5 sm:py-3 rounded-lg mt-2 sm:mt-4 shadow-sm hover:bg-red-600 transition active:scale-[0.98]">
              Simpan Pengeluaran
            </button>
          </form>
        </div>

        {/* Kanan: Riwayat Uang Keluar */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 mb-20 lg:mb-0">
          <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 border-b pb-2">Riwayat Uang Keluar</h3>
          <div className="space-y-3 sm:space-y-4">
            {riwayatPengeluaran.length === 0 ? (
              <p className="text-gray-400 text-xs sm:text-sm text-center py-4">Belum ada catatan pengeluaran.</p>
            ) : (
              riwayatPengeluaran.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-2.5 sm:p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div>
                    <p className="font-semibold text-xs sm:text-sm text-gray-800">{item.keterangan}</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">{item.tanggal}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm sm:text-base text-red-600">- Rp {item.nominal.toLocaleString('id-ID')}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // 4. Halaman Kelola Menu
  const renderKelolaMenu = () => (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Kelola Menu</h2>
        <button className="bg-blue-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold shadow-sm active:scale-95 transition">+ Tambah Menu</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {DUMMY_MENU.map((menu, index) => (
          <div key={menu.id} className={`p-3 sm:p-4 flex justify-between items-center ${index !== DUMMY_MENU.length - 1 ? 'border-b border-gray-100' : ''}`}>
            <div>
              <p className="font-semibold text-sm sm:text-base">{menu.nama}</p>
              <p className="text-xs sm:text-sm text-gray-500">{menu.kategori} • Rp {menu.harga.toLocaleString('id-ID')}</p>
            </div>
            <div className="flex space-x-1 sm:space-x-2">
              <button className="text-blue-500 text-[10px] sm:text-xs px-2 py-1 sm:px-3 sm:py-1.5 rounded bg-blue-50 active:bg-blue-100">Edit</button>
              <button className="text-red-500 text-[10px] sm:text-xs px-2 py-1 sm:px-3 sm:py-1.5 rounded bg-red-50 active:bg-red-100">Hapus</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // 5. Halaman Riwayat Transaksi
  const renderRiwayat = () => (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-800">Riwayat Transaksi</h2>
      <div className="space-y-3 sm:space-y-4">
        {[1, 2, 3].map((trx) => (
          <div key={trx} className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">06 Mei 2026 • 14:30</p>
              <p className="font-bold text-sm sm:text-base">INV-00{trx}</p>
              <p className="text-xs sm:text-sm text-gray-600">QRIS • 2 Item</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-green-600 text-sm sm:text-base mb-1 sm:mb-2">Rp 45.000</p>
              <button className="text-[10px] sm:text-xs bg-gray-100 text-gray-700 px-2 py-1 sm:px-3 sm:py-1.5 rounded-md font-semibold active:bg-gray-200">Cetak Ulang</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // 6. Halaman Profil
  const renderProfil = () => (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-800">Profil Usaha</h2>
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 space-y-3 sm:space-y-4">
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Nama Toko</label>
          <input type="text" className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" defaultValue="Kopi Senja Utama" />
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Alamat (Untuk Struk)</label>
          <textarea className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" rows="3" defaultValue="Jl. Sudirman No. 45, Jakarta Pusat"></textarea>
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Pesan Footer Struk</label>
          <input type="text" className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" defaultValue="Terima kasih atas kunjungan Anda!" />
        </div>
        <button className="w-full bg-blue-600 text-white font-bold py-2.5 sm:py-3 rounded-lg mt-2 sm:mt-4 shadow-sm hover:bg-blue-700 active:scale-[0.98] transition">Simpan Perubahan</button>
      </div>
    </div>
  );


  // --- RENDER UTAMA ---
  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-800 font-sans">
      
      {/* Topbar Global */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 flex justify-between items-center z-40 shrink-0">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-lg sm:text-xl shadow-sm">K</div>
          <h1 className="text-base sm:text-lg font-bold text-gray-800">Kasir Pintar</h1>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button className="relative p-1.5 sm:p-2 text-gray-500 hover:bg-gray-100 rounded-full transition active:scale-90">
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            <span className="absolute top-1 sm:top-1.5 right-1.5 sm:right-1.5 w-2 sm:w-2.5 h-2 sm:h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
          </button>
          <div className="h-5 sm:h-6 border-l border-gray-300"></div>
          <div className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 pr-2 rounded-full transition">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold border border-blue-200">A</div>
            <span className="text-xs sm:text-sm font-semibold text-gray-700 hidden sm:block">Admin Toko</span>
          </div>
        </div>
      </header>

      {/* Area Konten Dinamis */}
      <main className="flex-1 overflow-y-auto pb-[76px] sm:pb-[84px]"> {/* pb disesuaikan dengan tinggi navigasi bawah yg lebih ramah sentuhan */}
        {activeTab === 'home' && renderHome()}
        {activeTab === 'kasir' && renderKasir()}
        {activeTab === 'pengeluaran' && renderPengeluaran()}
        {activeTab === 'menu' && renderKelolaMenu()}
        {activeTab === 'riwayat' && renderRiwayat()}
        {activeTab === 'profil' && renderProfil()}
      </main>

      {/* Bottom Navigation - Lebih ramah sentuhan (Touch-friendly) */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 px-1 sm:px-4 py-2 sm:py-3 flex justify-between items-center z-50 shadow-[0_-4px_15px_rgba(0,0,0,0.03)] pb-safe">
        
        {/* Tab: Home */}
        <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center flex-1 py-1 sm:py-2 rounded-xl transition active:scale-95 ${activeTab === 'home' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
          <svg className="w-5 h-5 sm:w-6 sm:h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          <span className="text-[9px] sm:text-[10px] font-semibold">Home</span>
        </button>

        {/* Tab: Kasir */}
        <button onClick={() => setActiveTab('kasir')} className={`flex flex-col items-center flex-1 py-1 sm:py-2 rounded-xl transition active:scale-95 ${activeTab === 'kasir' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
          <div className="relative">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
            {keranjang.length > 0 && (
              <span className="absolute -top-1 -right-1.5 sm:-right-2 bg-red-500 text-white text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-full">{keranjang.reduce((acc, item) => acc + item.qty, 0)}</span>
            )}
          </div>
          <span className="text-[9px] sm:text-[10px] font-semibold">Kasir</span>
        </button>

        {/* Tab: Uang Keluar */}
        <button onClick={() => setActiveTab('pengeluaran')} className={`flex flex-col items-center flex-1 py-1 sm:py-2 rounded-xl transition active:scale-95 ${activeTab === 'pengeluaran' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
          <svg className="w-5 h-5 sm:w-6 sm:h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="text-[9px] sm:text-[10px] font-semibold">Keluar</span>
        </button>

        {/* Tab: Menu */}
        <button onClick={() => setActiveTab('menu')} className={`flex flex-col items-center flex-1 py-1 sm:py-2 rounded-xl transition active:scale-95 ${activeTab === 'menu' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
          <svg className="w-5 h-5 sm:w-6 sm:h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
          <span className="text-[9px] sm:text-[10px] font-semibold">Menu</span>
        </button>

        {/* Tab: Riwayat */}
        <button onClick={() => setActiveTab('riwayat')} className={`flex flex-col items-center flex-1 py-1 sm:py-2 rounded-xl transition active:scale-95 ${activeTab === 'riwayat' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
          <svg className="w-5 h-5 sm:w-6 sm:h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="text-[9px] sm:text-[10px] font-semibold">Riwayat</span>
        </button>

        {/* Tab: Profil */}
        <button onClick={() => setActiveTab('profil')} className={`flex flex-col items-center flex-1 py-1 sm:py-2 rounded-xl transition active:scale-95 ${activeTab === 'profil' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
          <svg className="w-5 h-5 sm:w-6 sm:h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          <span className="text-[9px] sm:text-[10px] font-semibold">Profil</span>
        </button>
      </nav>

      {/* MODAL PEMBAYARAN */}
      {modalPembayaran && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-5 sm:p-7 w-full max-w-sm transform transition-all">
            <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-5 text-center text-gray-800">Metode Pembayaran</h2>
            <div className="text-center mb-6 sm:mb-8">
              <p className="text-gray-500 text-xs sm:text-sm mb-1">Total Tagihan:</p>
              <p className="text-2xl sm:text-3xl font-bold text-blue-600">Rp {totalBelanja.toLocaleString('id-ID')}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
              <button onClick={() => setMetodePembayaran('Cash')} className={`p-3 sm:p-4 rounded-2xl border-2 font-bold flex flex-col items-center justify-center transition active:scale-95 ${metodePembayaran === 'Cash' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                {/* Ganti src="/cash-icon.png" dengan path gambar Anda (simpan di folder public) */}
                <img src="/cash.png" alt="Cash" className="w-10 h-10 sm:w-12 sm:h-12 mb-2 object-contain" />
                <span className="text-sm sm:text-base">Cash</span>
              </button>
              <button onClick={() => setMetodePembayaran('QRIS')} className={`p-3 sm:p-4 rounded-2xl border-2 font-bold flex flex-col items-center justify-center transition active:scale-95 ${metodePembayaran === 'QRIS' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                {/* Ganti src="/qris-icon.png" dengan path gambar Anda (simpan di folder public) */}
                <img src="/qris.png" alt="QRIS" className="w-10 h-10 sm:w-12 sm:h-12 mb-2 object-contain" />
                <span className="text-sm sm:text-base">QRIS</span>
              </button>
            </div>

            <div className="flex space-x-3">
              <button onClick={() => { setModalPembayaran(false); setMetodePembayaran(''); }} className="flex-1 py-3 sm:py-3.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm sm:text-base hover:bg-gray-200 transition active:scale-95">Batal</button>
              <button onClick={konfirmasiPembayaran} className="flex-1 py-3 sm:py-3.5 bg-green-500 text-white rounded-xl font-bold text-sm sm:text-base hover:bg-green-600 transition shadow-md active:scale-95">Konfirmasi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}