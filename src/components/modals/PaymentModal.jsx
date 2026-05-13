import React, { useState, useEffect } from 'react';

export default function PaymentModal({ isOpen, onClose, totalBelanja, onConfirm }) {
  // State lokal untuk menyimpan pilihan metode pembayaran sementara
  const [metode, setMetode] = useState('');

  // Reset pilihan metode setiap kali modal dibuka/ditutup
  useEffect(() => {
    if (!isOpen) {
      setMetode('');
    }
  }, [isOpen]);

  // Jika modal sedang tidak dibuka (isOpen = false), jangan render apa-apa
  if (!isOpen) return null;

  // Fungsi yang dipanggil saat tombol "Konfirmasi" ditekan
  const handleConfirm = () => {
    if (!metode) {
      alert('Pilih metode pembayaran terlebih dahulu!');
      return;
    }
    // Meneruskan metode yang dipilih ke komponen induk (halaman Kasir)
    onConfirm(metode);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-5 sm:p-7 w-full max-w-sm transform transition-all">
        <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-5 text-center text-gray-800">Metode Pembayaran</h2>
        
        <div className="text-center mb-6 sm:mb-8">
          <p className="text-gray-500 text-xs sm:text-sm mb-1">Total Tagihan:</p>
          <p className="text-2xl sm:text-3xl font-bold text-blue-600">
            Rp {totalBelanja.toLocaleString('id-ID')}
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {/* Tombol Metode: Cash */}
          <button 
            onClick={() => setMetode('Cash')} 
            className={`p-3 sm:p-4 rounded-2xl border-2 font-bold flex flex-col items-center justify-center transition active:scale-95 ${
              metode === 'Cash' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <img src="/cash-icon.png" alt="Cash" className="w-10 h-10 sm:w-12 sm:h-12 mb-2 object-contain" />
            <span className="text-sm sm:text-base">Cash</span>
          </button>

          {/* Tombol Metode: QRIS */}
          <button 
            onClick={() => setMetode('QRIS')} 
            className={`p-3 sm:p-4 rounded-2xl border-2 font-bold flex flex-col items-center justify-center transition active:scale-95 ${
              metode === 'QRIS' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <img src="/qris-icon.png" alt="QRIS" className="w-10 h-10 sm:w-12 sm:h-12 mb-2 object-contain" />
            <span className="text-sm sm:text-base">QRIS</span>
          </button>
        </div>

        <div className="flex space-x-3">
          <button 
            onClick={onClose} 
            className="flex-1 py-3 sm:py-3.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm sm:text-base hover:bg-gray-200 transition active:scale-95"
          >
            Batal
          </button>
          <button 
            onClick={handleConfirm} 
            className="flex-1 py-3 sm:py-3.5 bg-green-500 text-white rounded-xl font-bold text-sm sm:text-base hover:bg-green-600 transition shadow-md active:scale-95"
          >
            Konfirmasi
          </button>
        </div>
      </div>
    </div>
  );
}