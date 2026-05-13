import React from 'react';

export default function CartDrawer({
  isOpen,
  onClose,
  keranjang,
  tambahKeKeranjang,
  kurangiKeranjang,
  onCheckout
}) {
  // Menghitung total item dan total harga
  const totalItem = keranjang.reduce((acc, item) => acc + item.qty, 0);
  const totalBelanja = keranjang.reduce((total, item) => total + item.harga * item.qty, 0);

  return (
    <>
      {/* Backdrop (Layar Gelap) - Muncul jika keranjang terbuka */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm transition-opacity"
          onClick={onClose}
        ></div>
      )}
      
      {/* Panel Laci (Drawer) - Muncul dari Kanan */}
      <div 
        className={`fixed inset-y-0 right-0 w-full sm:w-[400px] bg-white shadow-2xl flex flex-col z-[70] transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header Drawer */}
        <div className="p-4 sm:p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">Keranjang</h2>
            <p className="text-xs sm:text-sm text-gray-500">{totalItem} item pesanan</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-gray-200 hover:bg-gray-300 rounded-full text-gray-600 transition active:scale-90"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Daftar Isi Keranjang */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 sm:space-y-4">
          {keranjang.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <svg className="w-12 h-12 sm:w-16 sm:h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-sm">Belum ada pesanan</p>
            </div>
          ) : (
            keranjang.map((item) => (
              <div key={item.id} className="flex justify-between items-center p-2 sm:p-3 rounded-xl border border-gray-100 shadow-sm bg-white">
                <div className="flex-1 pr-2">
                  <h4 className="font-semibold text-gray-800 text-xs sm:text-sm line-clamp-1">{item.nama}</h4>
                  <div className="text-blue-600 font-bold text-xs sm:text-sm mt-0.5 sm:mt-1">
                    Rp {(item.harga * item.qty).toLocaleString('id-ID')}
                  </div>
                </div>
                {/* Kontrol Jumlah Item (+ dan -) */}
                <div className="flex items-center space-x-2 sm:space-x-3 bg-gray-50 rounded-lg p-1 border border-gray-200">
                  <button 
                    onClick={() => kurangiKeranjang(item.id)} 
                    className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-red-500 font-bold hover:bg-red-100 rounded-md transition active:scale-90"
                  >
                    -
                  </button>
                  <span className="text-xs sm:text-sm font-bold w-3 sm:w-4 text-center">{item.qty}</span>
                  <button 
                    onClick={() => tambahKeKeranjang(item)} 
                    className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-blue-600 font-bold hover:bg-blue-100 rounded-md transition active:scale-90"
                  >
                    +
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer: Total & Tombol Bayar */}
        <div className="p-4 sm:p-5 border-t border-gray-200 bg-white">
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <span className="text-sm sm:text-base text-gray-600">Total Pembayaran</span>
            <span className="text-xl sm:text-2xl font-bold text-gray-900">
              Rp {totalBelanja.toLocaleString('id-ID')}
            </span>
          </div>
          <button 
            onClick={onCheckout} 
            disabled={keranjang.length === 0} 
            className={`w-full py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition shadow-md ${
              keranjang.length === 0 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]'
            }`}
          >
            Proses Pembayaran
          </button>
        </div>
      </div>
    </>
  );
}