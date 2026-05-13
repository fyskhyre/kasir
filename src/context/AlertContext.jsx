import React, { createContext, useContext, useState } from 'react';

// 1. Buat Context
const AlertContext = createContext();

// 2. Buat Custom Hook agar mudah dipanggil di komponen lain
export const useAlert = () => useContext(AlertContext);

// 3. Buat Provider Component
export const AlertProvider = ({ children }) => {
  const [alertState, setAlertState] = useState({
    isOpen: false,
    message: '',
    type: 'warning', // 'warning' | 'success'
  });

  // Fungsi untuk memunculkan alert
  const showAlert = (message, type = 'warning') => {
    setAlertState({ isOpen: true, message, type });
  };

  // Fungsi untuk menutup alert
  const closeAlert = () => {
    setAlertState((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}

      {/* UI GLOBAL ALERT MODAL (Akan ter-render di atas seluruh aplikasi) */}
      {alertState.isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex justify-center items-center p-4 animate-fade-in" 
          onClick={closeAlert}
        >
          <div 
            className="bg-white max-w-sm w-full rounded-3xl p-6 shadow-2xl text-center flex flex-col items-center transform transition-all animate-slide-up" 
            onClick={(e) => e.stopPropagation()}
          >
            {alertState.type === 'success' ? (
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-sm">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-sm">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            )}
            
            <h3 className="text-xl font-black text-gray-800 mb-2">
              {alertState.type === 'success' ? 'Berhasil' : 'Perhatian'}
            </h3>
            
            <p className="text-gray-600 text-sm mb-6 leading-relaxed">
              {alertState.message}
            </p>
            
            <button
              onClick={closeAlert}
              className={`w-full py-3.5 rounded-xl font-bold text-white shadow-md transition active:scale-95 ${
                alertState.type === 'success' ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
};