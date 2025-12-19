import React, { useState } from 'react';
import { ClientPortal } from './components/ClientPortal';
import { AdminPortal } from './components/AdminPortal';
import { Lock, ArrowRight } from 'lucide-react';

// --- NUEVAS IMPORTACIONES ---
import { useLicense } from './hooks/useLicense';
import { ServiceSuspended } from './components/ServiceSuspended';
// ----------------------------

export default function App() {
  // 1. ACTIVAMOS EL VIGILANTE
  const { isLocked, loading } = useLicense();

  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  
  // Login Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // 2. PANTALLA DE CARGA (Para que no parpadee)
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // 3. ¡BLOQUEO! SI LA LICENCIA ESTÁ INACTIVA, MOSTRAMOS ESTO Y NADA MÁS
  if (isLocked) {
    return <ServiceSuspended />;
  }

  // --- A PARTIR DE AQUÍ, EL CÓDIGO SIGUE NORMAL ---

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin') {
      setIsAdmin(true);
      setShowLogin(false);
      setError('');
    } else {
      setError('Credenciales inválidas');
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    setUsername('');
    setPassword('');
  };

  if (isAdmin) {
    return <AdminPortal onLogout={handleLogout} />;
  }

  if (showLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background decorative blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

        <div className="glass-panel p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-sm relative z-10 animate-slide-up border border-white/40">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-tr from-primary-600 to-teal-400 rounded-2xl mx-auto flex items-center justify-center text-white mb-4 shadow-lg shadow-primary-500/30 transform hover:rotate-6 transition-transform duration-500">
              <Lock size={28} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Acceso Profesional</h2>
            <p className="text-gray-500 text-sm mt-1">Ingrese sus credenciales</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="group">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 ml-1 group-focus-within:text-primary-600 transition-colors">Usuario</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-5 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all duration-300"
                placeholder="Ej: admin"
              />
            </div>
            <div className="group">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 ml-1 group-focus-within:text-primary-600 transition-colors">Contraseña</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all duration-300"
                placeholder="••••••••"
              />
            </div>
            
            {error && (
              <div className="bg-red-50 text-red-500 text-sm p-3 rounded-xl flex items-center justify-center animate-pulse">
                {error}
              </div>
            )}
            
            <button type="submit" className="btn-modern w-full bg-gradient-to-r from-primary-600 to-primary-500 text-white py-3.5 rounded-xl font-medium shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 flex items-center justify-center gap-2 group">
              Ingresar <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/>
            </button>
            <button 
              type="button" 
              onClick={() => setShowLogin(false)}
              className="w-full text-gray-500 text-sm py-2 hover:text-gray-800 transition-colors"
            >
              Volver al sitio
            </button>
          </form>
          <div className="mt-8 text-center text-[10px] text-gray-400 font-mono bg-gray-50 rounded-lg py-2">
             Demo: admin / admin
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <ClientPortal />
      
      {/* Footer / Admin Link */}
      <footer className="py-8 mt-12 relative z-10">
        <div className="max-w-3xl mx-auto text-center px-4">
          <div className="flex justify-center items-center gap-2 mb-4">
            <div className="h-px w-10 bg-gray-300"></div>
            <div className="w-2 h-2 rounded-full bg-gray-300"></div>
            <div className="h-px w-10 bg-gray-300"></div>
          </div>
          <p className="text-gray-500 text-sm mb-4">© 2024 Consultorio Psicológico Integral.</p>
          <button 
            onClick={() => setShowLogin(true)}
            className="text-xs text-primary-600/70 hover:text-primary-800 transition-colors flex items-center justify-center gap-1 mx-auto px-3 py-1 rounded-full hover:bg-primary-50"
          >
            <Lock size={12} /> Acceso Médicos
          </button>
        </div>
      </footer>
    </div>
  );
}
