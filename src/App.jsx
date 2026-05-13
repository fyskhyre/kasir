import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';
// 1. IMPORT AlertProvider
import { AlertProvider } from './context/AlertContext'; 
// 2. IMPORT PrinterProvider
import { PrinterProvider } from './context/PrinterContext'; 

import MainLayout from './components/layout/MainLayout';
import Login from './pages/Auth/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import POS from './pages/POS/POS';
import Expense from './pages/Expense/Expense';
import MenuManager from './pages/MenuManager/MenuManager';
import History from './pages/History/History';
import Profile from './pages/Profile/Profile';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, role, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (requireAdmin && role !== 'admin') return <Navigate to="/kasir" replace />;
  return children;
};

export default function App() {
  return (
    <AuthProvider>
      {/* BUNGKUS DENGAN AlertProvider */}
      <AlertProvider> 
        {/* BUNGKUS DENGAN PrinterProvider (Harus di dalam AlertProvider) */}
        <PrinterProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route 
                  index 
                  element={
                    <ProtectedRoute requireAdmin={true}>
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route path="kasir" element={<POS />} />
                <Route path="pengeluaran" element={<Expense />} />
                <Route path="menu" element={<MenuManager />} />
                <Route path="riwayat" element={<History />} />
                <Route path="profil" element={<Profile />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </PrinterProvider>
      </AlertProvider>
    </AuthProvider>
  );
}