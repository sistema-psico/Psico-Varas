import React from 'react';
import { Lock, AlertTriangle, Phone } from 'lucide-react';

export const ServiceSuspended: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex items-center justify-center p-4">
      {/* Fondo decorativo */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-red-600/20 rounded-full mix-blend-overlay filter blur-3xl opacity-50 animate-pulse"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-600/10 rounded-full mix-blend-overlay filter blur-3xl opacity-50"></div>
      </div>
      
      <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-8 md:p-12 rounded-3xl shadow-2xl max-w-lg w-full text-center relative z-10 animate-fade-in">
        <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20 shadow-lg shadow-red-900/30">
          <Lock size={48} className="text-red-500" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-3">Acceso Suspendido</h1>
        <p className="text-slate-400 mb-8 leading-relaxed">
          La licencia operativa de este sistema ha sido pausada temporalmente por el administrador.
        </p>

        <div className="bg-slate-950/60 rounded-2xl p-5 border border-white/5 text-left mb-8 flex gap-4">
          <div className="bg-amber-500/10 p-2 rounded-lg h-fit text-amber-500">
             <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-200 text-sm">Información Importante</h3>
            <p className="text-xs text-slate-500 mt-1">
              Sus datos y los de sus pacientes están seguros y encriptados. El acceso se restablecerá automáticamente al regularizar el estado de la cuenta.
            </p>
          </div>
        </div>

        <a 
          href="#" // Aquí podrías poner tu link de WhatsApp si quisieras
          className="w-full bg-white text-slate-900 hover:bg-slate-200 py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all"
        >
          <Phone size={20} /> 
          Contactar Soporte Técnico
        </a>
        
        <div className="mt-8 text-[10px] text-slate-600 font-mono tracking-widest uppercase">
          System ID: LIC-VARAS-001
        </div>
      </div>
    </div>
  );
};
