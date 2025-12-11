import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Check, User, ChevronRight, ChevronLeft, AlertCircle, Search, CalendarCheck, Sparkles, MapPin } from 'lucide-react';
import { DataService } from '../services/dataService';
import { AppointmentStatus, PaymentMethod, PaymentStatus, Appointment, ProfessionalConfig } from '../types';

export const ClientPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'book' | 'list'>('book');
  
  // Professional Data
  const [professionalConfig, setProfessionalConfig] = useState<ProfessionalConfig>({
    name: 'Lic. Gabriel Medina',
    specialty: 'Psicología Clínica',
    address: 'Av. Corrientes 1234, Piso 5, CABA'
  });

  // Booking State
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  const [formData, setFormData] = useState({ name: '', phone: '', notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isHoliday, setIsHoliday] = useState(false);

  // My Appointments State
  const [searchPhone, setSearchPhone] = useState('');
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      if (DataService.isHoliday(selectedDate)) {
        setIsHoliday(true);
        setSlots([]);
      } else {
        setIsHoliday(false);
        loadSlots(selectedDate);
      }
    }
  }, [selectedDate]);

  const loadData = async () => {
      const config = await DataService.getProfessionalConfig();
      setProfessionalConfig(config);
  };

  const loadSlots = async (date: string) => {
    setSlots([]); // clear old
    const available = await DataService.getAvailableSlots(date);
    setSlots(available);
  };

  const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
    setSelectedTime('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    await DataService.addAppointment({
      patientId: 'web-' + Date.now(),
      patientName: formData.name,
      patientPhone: formData.phone,
      date: selectedDate,
      time: selectedTime,
      status: AppointmentStatus.PENDING,
      cost: 5000,
      paymentStatus: PaymentStatus.UNPAID,
      paymentMethod: PaymentMethod.PENDING,
      notes: formData.notes
    });

    setIsSubmitting(false);
    setSuccess(true);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
    const all = await DataService.getAppointments();
    const found = all.filter(a => a.patientPhone && a.patientPhone.includes(searchPhone));
    setMyAppointments(found.sort((a,b) => new Date(a.date + 'T' + a.time).getTime() - new Date(b.date + 'T' + b.time).getTime()));
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-green-50 to-teal-100 z-0"></div>
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>

        <div className="glass-panel p-10 rounded-3xl shadow-2xl max-w-md w-full text-center relative z-10 animate-slide-up border border-white/50">
          <div className="w-20 h-20 bg-gradient-to-tr from-green-400 to-teal-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
            <Check size={40} className="animate-bounce-soft" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">¡Reserva Exitosa!</h2>
          <p className="text-gray-600 mb-8 leading-relaxed">Su turno ha sido reservado para el <br/><span className="font-bold text-teal-700">{formatDate(selectedDate)}</span> a las <span className="font-bold text-teal-700">{selectedTime} hs</span>.</p>
          <button 
            onClick={() => window.location.reload()}
            className="btn-modern w-full bg-gray-900 text-white py-4 rounded-2xl font-medium hover:bg-black shadow-xl transition"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Decorative background elements */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-5%] right-[-5%] w-96 h-96 bg-blue-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-70"></div>
        <div className="absolute bottom-[-5%] left-[-5%] w-96 h-96 bg-teal-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-70"></div>
      </div>

      {/* Header */}
      <header className="sticky top-4 z-20 px-4 mb-8">
        <div className="max-w-3xl mx-auto glass-panel rounded-2xl shadow-lg shadow-gray-200/50 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-tr from-teal-500 to-emerald-400 rounded-xl flex items-center justify-center text-white font-bold shadow-md shadow-teal-500/20">{professionalConfig.name.charAt(0) || 'P'}</div>
              <div>
                <span className="font-bold text-gray-800 block leading-tight">{professionalConfig.name}</span>
                <span className="text-xs text-gray-500 font-medium">{professionalConfig.specialty}</span>
              </div>
            </div>
            {/* Simple Tab Switcher for Desktop/Mobile */}
            <div className="flex bg-gray-100/50 p-1 rounded-xl">
               <button onClick={() => setActiveTab('book')} className={`p-2 rounded-lg transition-all ${activeTab === 'book' ? 'bg-white shadow-sm text-teal-600' : 'text-gray-400'}`}><CalendarIcon size={20}/></button>
               <button onClick={() => setActiveTab('list')} className={`p-2 rounded-lg transition-all ${activeTab === 'list' ? 'bg-white shadow-sm text-teal-600' : 'text-gray-400'}`}><Search size={20}/></button>
            </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pb-20">
        
        {activeTab === 'book' && (
          <div className="animate-fade-in">
             <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">Reserve su turno</h1>
                <p className="text-gray-500">Gestione su bienestar en simples pasos.</p>
             </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-4 mb-8">
               <div className={`transition-all duration-500 flex items-center gap-2 px-4 py-2 rounded-full border ${step === 1 ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-400 border-gray-200'}`}>
                  <span className="font-bold">1</span> <span className="text-sm">Fecha</span>
               </div>
               <div className="w-8 h-px bg-gray-300"></div>
               <div className={`transition-all duration-500 flex items-center gap-2 px-4 py-2 rounded-full border ${step === 2 ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-400 border-gray-200'}`}>
                  <span className="font-bold">2</span> <span className="text-sm">Datos</span>
               </div>
            </div>

            <div className="glass-panel rounded-3xl shadow-xl overflow-hidden border border-white/60">
              
              {/* Step 1: Date Selection */}
              {step === 1 && (
                <div className="p-6 md:p-10 animate-slide-up">
                  <div className="grid md:grid-cols-2 gap-8">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-3 ml-1">Seleccione el día</label>
                        <div className="relative group">
                          <input 
                            type="date" 
                            min={new Date().toISOString().split('T')[0]}
                            onChange={handleDateSelect}
                            value={selectedDate}
                            className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl px-5 py-4 text-lg focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none transition-all shadow-inner"
                          />
                          <CalendarIcon className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-teal-500 transition-colors" size={20} />
                        </div>
                        <div className="mt-6 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                           <div className="flex items-start gap-3">
                              <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><MapPin size={18}/></div>
                              <div>
                                <h4 className="font-bold text-blue-900 text-sm">Consultorio Central</h4>
                                <p className="text-xs text-blue-700/80 mt-1">{professionalConfig.address}<br/>Argentina</p>
                              </div>
                           </div>
                        </div>
                      </div>

                      <div className="border-t md:border-t-0 md:border-l border-gray-100 md:pl-8 pt-6 md:pt-0">
                         <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                           <Clock size={18} className="text-teal-500"/> Horarios Disponibles
                         </h3>
                         
                         {!selectedDate ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 py-8 min-h-[150px] border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                               <Sparkles size={24} className="mb-2 opacity-50"/>
                               <p className="text-sm">Seleccione una fecha primero</p>
                            </div>
                         ) : isHoliday ? (
                            <div className="p-4 bg-orange-50 text-orange-700 rounded-2xl text-sm border border-orange-100 flex items-start gap-3">
                              <AlertCircle size={20} className="shrink-0 mt-0.5" />
                              <p>Este día es <strong>feriado o no laborable</strong>. Por favor seleccione otra fecha.</p>
                            </div>
                         ) : slots.length > 0 ? (
                           <div className="grid grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                             {slots.map(time => (
                               <button
                                 key={time}
                                 onClick={() => setSelectedTime(time)}
                                 className={`btn-modern py-3 px-2 rounded-xl text-sm font-medium border transition-all relative overflow-hidden
                                   ${selectedTime === time 
                                     ? 'bg-gray-900 text-white border-gray-900 shadow-lg scale-[1.02]' 
                                     : 'bg-white text-gray-600 border-gray-200 hover:border-teal-400 hover:text-teal-600 hover:shadow-md'}`}
                               >
                                 {time}
                               </button>
                             ))}
                           </div>
                         ) : (
                           <div className="p-6 bg-gray-50 text-gray-500 rounded-2xl text-sm border border-gray-200 text-center">
                             No hay turnos disponibles.
                           </div>
                         )}
                      </div>
                  </div>

                  <div className="mt-10 flex justify-end">
                    <button 
                      disabled={!selectedDate || !selectedTime || isHoliday}
                      onClick={() => setStep(2)}
                      className="btn-modern bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 disabled:opacity-50 disabled:grayscale shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50 group"
                    >
                      Continuar <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform"/>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Details */}
              {step === 2 && (
                <div className="p-6 md:p-10 animate-slide-up">
                  <div className="mb-8 flex items-end justify-between border-b border-gray-100 pb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Sus Datos</h2>
                      <p className="text-sm text-gray-500">Complete para confirmar</p>
                    </div>
                    <div className="text-right">
                       <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Turno seleccionado</p>
                       <p className="text-teal-600 font-bold text-lg">{formatDate(selectedDate)}</p>
                       <p className="text-gray-900 font-mono text-xl">{selectedTime} hs</p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="group">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1 group-focus-within:text-teal-600 transition-colors">Nombre Completo</label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-teal-500 transition-colors" size={20} />
                          <input 
                            required
                            type="text" 
                            className="w-full pl-12 pr-4 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none transition-all"
                            placeholder="Ej: Juan Pérez"
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                          />
                        </div>
                      </div>

                      <div className="group">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1 group-focus-within:text-teal-600 transition-colors">Teléfono</label>
                        <input 
                          required
                          type="tel" 
                          className="w-full px-5 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none transition-all"
                          placeholder="Ej: 11 1234 5678"
                          value={formData.phone}
                          onChange={e => setFormData({...formData, phone: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="group">
                       <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1 group-focus-within:text-teal-600 transition-colors">Motivo de consulta (Opcional)</label>
                       <textarea 
                          className="w-full px-5 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none transition-all resize-none"
                          rows={3}
                          placeholder="Breve descripción..."
                          value={formData.notes}
                          onChange={e => setFormData({...formData, notes: e.target.value})}
                       />
                    </div>

                    <div className="flex gap-4 pt-6">
                      <button 
                        type="button"
                        onClick={() => setStep(1)}
                        className="btn-modern px-8 py-4 border border-gray-200 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 hover:border-gray-300 transition-colors"
                      >
                        Atrás
                      </button>
                      <button 
                        type="submit"
                        disabled={isSubmitting}
                        className="btn-modern flex-1 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black shadow-xl shadow-gray-900/20 transition-all flex justify-center items-center gap-3"
                      >
                        {isSubmitting ? (
                          <span className="animate-pulse">Procesando...</span>
                        ) : (
                          <>Confirmar Reserva <Check size={20}/></>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

            </div>
          </div>
        )}

        {activeTab === 'list' && (
          <div className="animate-fade-in space-y-8">
            <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Mis Turnos</h1>
                <p className="text-gray-500">Consulte el estado de sus reservas</p>
             </div>

            <div className="glass-panel p-8 rounded-3xl shadow-lg border border-white/60">
               <form onSubmit={handleSearch} className="flex gap-3">
                  <input 
                    type="tel" 
                    required
                    placeholder="Ingrese su número de teléfono" 
                    className="flex-1 bg-white/80 border border-gray-200 rounded-2xl px-5 py-3 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                    value={searchPhone}
                    onChange={(e) => setSearchPhone(e.target.value)}
                  />
                  <button type="submit" className="btn-modern bg-teal-500 text-white px-6 py-3 rounded-2xl font-bold hover:bg-teal-600 shadow-lg shadow-teal-500/30 flex items-center gap-2">
                    <Search size={20} /> <span className="hidden sm:inline">Buscar</span>
                  </button>
               </form>
            </div>

            {hasSearched && (
              <div className="space-y-4">
                 {myAppointments.length === 0 ? (
                   <div className="text-center py-16 text-gray-400 glass-card rounded-3xl border border-dashed border-gray-300">
                     <CalendarCheck size={48} className="mx-auto mb-4 opacity-20" />
                     No se encontraron turnos asociados a este número.
                   </div>
                 ) : (
                   myAppointments.map(appt => (
                     <div key={appt.id} className="glass-card p-6 rounded-3xl shadow-sm border border-white/50 flex justify-between items-center hover:shadow-md hover:scale-[1.01] transition-all duration-300 group">
                        <div className="flex gap-4 items-center">
                           <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex flex-col items-center justify-center border border-white shadow-inner">
                              <span className="text-xs font-bold text-gray-500 uppercase">{new Date(appt.date + 'T00:00:00').toLocaleDateString('es-AR', {month: 'short'})}</span>
                              <span className="text-2xl font-black text-gray-800 leading-none">{new Date(appt.date + 'T00:00:00').getDate()}</span>
                           </div>
                           <div>
                              <div className="text-2xl font-bold text-gray-800 mb-1 group-hover:text-teal-600 transition-colors">
                                {appt.time} hs
                              </div>
                              <div className="flex items-center gap-2">
                                 <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wide border
                                   ${appt.status === AppointmentStatus.CONFIRMED ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                     appt.status === AppointmentStatus.PENDING ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                                     appt.status === AppointmentStatus.CANCELLED ? 'bg-red-50 text-red-600 border-red-100' : 
                                     'bg-green-50 text-green-600 border-green-100'
                                   }`}>
                                   {appt.status}
                                 </span>
                              </div>
                           </div>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-300 group-hover:bg-teal-500 group-hover:text-white group-hover:border-teal-500 transition-all shadow-sm">
                           <ChevronRight size={20} />
                        </div>
                     </div>
                   ))
                 )}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
};