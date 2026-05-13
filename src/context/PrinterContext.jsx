import React, { createContext, useContext, useState } from 'react';
import { useAlert } from './AlertContext'; // Memanggil global alert

// 1. Buat Context
const PrinterContext = createContext();

// 2. Buat Custom Hook
export const usePrinter = () => useContext(PrinterContext);

// 3. Buat Provider Component
export const PrinterProvider = ({ children }) => {
  const { showAlert } = useAlert();
  
  // State Bluetooth disimpan di sini (Global)
  const [printerDevice, setPrinterDevice] = useState(null);
  const [printCharacteristic, setPrintCharacteristic] = useState(null);

  // Logika koneksi dipindah ke sini
  const connectPrinter = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
      });

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      const characteristics = await service.getCharacteristics();
      const characteristic = characteristics.find(c => c.properties.write || c.properties.writeWithoutResponse);

      if (!characteristic) {
        throw new Error("Jalur penulisan ke printer tidak ditemukan.");
      }

      setPrinterDevice(device);
      setPrintCharacteristic(characteristic);

      // Event listener jika printer mati/putus tiba-tiba
      device.addEventListener('gattserverdisconnected', () => {
        setPrinterDevice(null);
        setPrintCharacteristic(null);
        showAlert('Koneksi printer terputus!', 'warning');
      });

      showAlert(`Sukses terhubung dengan printer: ${device.name}`, 'success');
    } catch (e) {
      console.warn("Bluetooth Error:", e);
      // Pengecualian: Code 8 berarti user menekan tombol 'Batal' pada popup browser
      if (e.code !== 8) {
        showAlert("Gagal menghubungkan: " + e.message, 'warning');
      }
    }
  };

  // Kumpulkan data dan fungsi yang ingin dibagikan ke seluruh halaman
  const value = {
    printerDevice,
    printCharacteristic,
    connectPrinter
  };

  return (
    <PrinterContext.Provider value={value}>
      {children}
    </PrinterContext.Provider>
  );
};