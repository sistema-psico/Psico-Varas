import React, { useState, useEffect } from 'react';
import { ClientPortal } from './components/ClientPortal';
import { AdminPortal } from './components/AdminPortal';
import { Lock, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

// Firebase Auth
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

// Kill Switch
import { PROJECT_STATUS } from './config';
import { SuspendedView } from './components/SuspendedView';

export default function App() {
  // 1. VERIFICACIÓN DE LICENCIA (KILL SWITCH)
  if (!PROJECT_STATUS.isActive) {
    return <SuspendedView />;
  }

  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [authChecking, setAuthChecking] = useState(true); // Estado de carga inicial
  
  // Login Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // EFECTO PARA PERSISTENCIA DE SESIÓN
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      setAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // El observer onAuthStateChanged se encargará de setear isAdmin
      setShowLogin(false);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
        setError('Email o contraseña incorrectos.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Demasiados intentos. Espere un momento.');
      } else {
        setError('Error de conexión. Intente nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    auth.signOut();
    setIsAdmin(false);
    setEmail('');
    setPassword('');
  };

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

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
            <p className="text-gray-500 text-sm mt-1">Ingrese sus credenciales de Firebase</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="group">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 ml-1 group-focus-within:text-primary-600 transition-colors">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all duration-300"
                placeholder="doctor@email.com"
                required
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
                required
              />
            </div>
            
            {error && (
              <div className="bg-red-50 text-red-500 text-sm p-3 rounded-xl flex items-center gap-2 animate-pulse border border-red-100">
                <AlertCircle size={16} /> {error}
              </div>
            )}
            
            <button 
              type="submit" 
              disabled={loading}
              className="btn-modern w-full bg-gradient-to-r from-primary-600 to-primary-500 text-white py-3.5 rounded-xl font-medium shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : <>Ingresar <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/></>}
            </button>
            <button 
              type="button" 
              onClick={() => setShowLogin(false)}
              className="w-full text-gray-500 text-sm py-2 hover:text-gray-800 transition-colors"
            >
              Volver al sitio
            </button>
          </form>
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
