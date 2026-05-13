import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Topbar() {
  const navigate = useNavigate();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 flex justify-between items-center z-40 shrink-0">
      
      {/* Bagian Kiri: Logo & Nama Aplikasi */}
      <div className="flex items-center space-x-2">
        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-lg sm:text-xl shadow-sm">
          K
        </div>
        <h1 className="text-base sm:text-lg font-bold text-gray-800">Kasir Pintar</h1>
      </div>
      
      {/* Bagian Kanan: Notifikasi & Profil */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        
        {/* Tombol Notifikasi */}
        <button className="relative p-1.5 sm:p-2 text-gray-500 hover:bg-gray-100 rounded-full transition active:scale-90">
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {/* Indikator Merah Notifikasi */}
          <span className="absolute top-1 sm:top-1.5 right-1.5 sm:right-1.5 w-2 sm:w-2.5 h-2 sm:h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
        </button>
        
        {/* Garis Pemisah */}
        <div className="h-5 sm:h-6 border-l border-gray-300"></div>
        
        {/* Tombol Profil Admin */}
        <div 
          onClick={() => navigate('/profil')}
          className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 pr-2 rounded-full transition"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold border border-blue-200">
            A
          </div>
          <span className="text-xs sm:text-sm font-semibold text-gray-700 hidden sm:block">
            Admin Toko
          </span>
        </div>

      </div>
    </header>
  );
}