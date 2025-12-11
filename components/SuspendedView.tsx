import React from 'react';
import { PROJECT_STATUS } from '../config';
import { Lock, Smartphone, Mail, AlertTriangle } from 'lucide-react';

export const SuspendedView: React.FC = () => {
  const wsMessage = `Hola, necesito regularizar el estado de mi licencia de software (PsicoGestión).`;
  const wsLink = `https://wa.me/${PROJECT_STATUS.providerWhatsapp}?text=${encodeURIComponent(wsMessage)}`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900 p-4">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none opacity-20">
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-red-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse animation-delay-2000"></div>
      </div>

      <div className="bg-white/95 backdrop-blur-xl border border-white/20 rounded-3xl max-w-md w-full p-8 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 to-orange-500"></div>
        
        <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
          <Lock size={40} className="text-red-500" />
        </div>

        <h1 className="text-2xl font-bold text-slate-800 mb-2">Servicio Pausado</h1>
        <p className="text-slate-500 mb-8 text-sm leading-relaxed">
          La licencia de uso ha expirado o requiere atención administrativa para continuar operando.
        </p>

        <div className="space-y-4">
          <a 
            href={wsLink} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center justify-center gap-2 w-full py-4 bg-gray-900 hover:bg-black text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl active:scale-95"
          >
            <Smartphone size={20} />
            Contactar Soporte
          </a>
          
          <div className="flex items-center justify-center gap-2 text-sm text-slate-400 pt-2">
            <Mail size={14} />
            <span>{PROJECT_STATUS.providerEmail}</span>
          </div>
        </div>
        
        <div className="mt-8 bg-orange-50 border border-orange-100 p-4 rounded-xl flex items-start gap-3 text-left">
            <AlertTriangle className="text-orange-500 shrink-0 mt-0.5" size={18}/>
            <p className="text-xs text-orange-800 leading-relaxed">
                <strong>Importante:</strong> Sus datos clínicos y agenda están seguros. El acceso se restablecerá inmediatamente al regularizar la situación.
            </p>
        </div>
      </div>
    </div>
  );
};
