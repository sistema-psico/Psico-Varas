import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Users, 
  DollarSign, 
  Settings, 
  LogOut, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Plus,
  CreditCard,
  FileText,
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Save,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  Check,
  Moon,
  Sun,
  History,
  X,
  Search,
  LayoutDashboard,
  Wallet,
  Smartphone,
  Trash2,
  UserCog
} from 'lucide-react';
import { Appointment, AppointmentStatus, PaymentMethod, PaymentStatus, WorkingHours, PatientProfile } from '../types';
import { DataService } from '../services/dataService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

interface AdminPortalProps {
  onLogout: () => void;
}

const COLORS = ['#3b82f6', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6'];
const BAR_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#a4de6c'];

export const AdminPortal: React.FC<AdminPortalProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'finances' | 'settings' | 'patients'>('dashboard');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [schedule, setSchedule] = useState<WorkingHours[]>([]);
  const [loading, setLoading] = useState(true);

  // Configuration State
  const [professionalName, setProfessionalName] = useState('');

  // Search State
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [allProfiles, setAllProfiles] = useState<Record<string, PatientProfile>>({});

  // Filter State for Calendar
  const [filterDate, setFilterDate] = useState<string | null>(null);

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Manual Booking State
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({ name: '', date: '', time: '', phone: '' });

  // Edit Appointment State
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  // Payment Processing State
  const [paymentAppointment, setPaymentAppointment] = useState<Appointment | null>(null);

  // Patient Detail State
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [isProfileExpanded, setIsProfileExpanded] = useState(true);
  
  // Note State
  const [unsavedNotes, setUnsavedNotes] = useState<Set<string>>(new Set());
  
  // AI State
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  useEffect(() => {
    loadData();
    const savedTheme = localStorage.getItem('psico_theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const appts = await DataService.getAppointments();
      const sched = await DataService.getScheduleConfig();
      const profiles = await DataService.getAllPatientProfiles();
      const profName = await DataService.getProfessionalName(); // CORREGIDO
      
      setAppointments(appts);
      setSchedule(sched);
      setAllProfiles(profiles);
      setProfessionalName(profName);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('psico_theme', newMode ? 'dark' : 'light');
  };

  const handleStatusChange = async (id: string, newStatus: AppointmentStatus) => {
    const updated = await DataService.updateAppointment(id, { status: newStatus });
    setAppointments(updated);
  };

  const handleDeleteAppointment = async (id: string) => {
    if (window.confirm('¿Está seguro de que desea eliminar este turno permanentemente? Esta acción no se puede deshacer.')) {
        const updated = await DataService.deleteAppointment(id);
        setAppointments(updated);
    }
  };

  const processPayment = async (method: PaymentMethod) => {
    if (!paymentAppointment) return;
    
    const updated = await DataService.updateAppointment(paymentAppointment.id, { 
      paymentMethod: method, 
      paymentStatus: PaymentStatus.PAID 
    });
    setAppointments(updated);
    setPaymentAppointment(null); 
  };

  const handleProfessionalNameSave = async (e: React.FormEvent) => {
      e.preventDefault();
      await DataService.saveProfessionalName(professionalName); // CORREGIDO
      alert('Nombre actualizado correctamente');
  };

  const handleNoteChange = (id: string, note: string) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, clinicalObservations: note } : a));
    setUnsavedNotes(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handleSaveNote = async (id: string, note: string) => {
    await DataService.updateAppointment(id, { clinicalObservations: note });
    setUnsavedNotes(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await DataService.addAppointment({
      patientName: manualForm.name,
      patientPhone: manualForm.phone,
      patientId: 'manual-' + Date.now(),
      date: manualForm.date,
      time: manualForm.time,
      status: AppointmentStatus.CONFIRMED,
      cost: 5000,
      paymentStatus: PaymentStatus.UNPAID,
      paymentMethod: PaymentMethod.PENDING
    });
    setShowManualModal(false);
    setManualForm({ name: '', date: '', time: '', phone: '' });
    loadData();
  };

  const handleEditAppointmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAppointment) return;
    
    await DataService.updateAppointment(editingAppointment.id, {
      date: editingAppointment.date,
      time: editingAppointment.time,
      status: editingAppointment.status
    });
    setEditingAppointment(null);
    loadData();
  };

  const saveSchedule = async (newSchedule: WorkingHours[]) => {
    await DataService.saveScheduleConfig(newSchedule);
    setSchedule(newSchedule);
  };

  const handlePatientSelect = async (patientId: string, name: string) => {
    setSelectedPatientId(patientId);
    setAiSummary('');
    setIsProfileExpanded(true);
    const existing = await DataService.getPatientProfile(patientId);
    setPatientProfile(existing || {
      id: patientId,
      firstName: name.split(' ')[0],
      lastName: name.split(' ').slice(1).join(' '),
      dni: '',
      birthDate: '',
      insurance: '',
      diagnosis: '',
      notes: ''
    });
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (patientProfile) {
      await DataService.savePatientProfile(patientProfile);
      setAllProfiles(prev => ({...prev, [patientProfile.id]: patientProfile}));
      setIsProfileExpanded(false);
    }
  };

  const generateAiSummary = async (patientName: string, patientAppointments: Appointment[]) => {
    setIsGeneratingAi(true);
    setAiSummary('');

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey });
      
      let historyText = `Historial clínico de ${patientName}:\n`;
      patientAppointments
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .forEach(appt => {
          if (appt.clinicalObservations || appt.notes) {
            historyText += `- Fecha: ${appt.date}. Notas del paciente: ${appt.notes || 'Ninguna'}. Observaciones clínicas: ${appt.clinicalObservations || 'Ninguna'}\n`;
          }
        });

      if (!historyText.includes('Fecha')) {
        setAiSummary("No hay suficientes notas clínicas guardadas para generar un resumen.");
        setIsGeneratingAi(false);
        return;
      }

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Actúa como un asistente clínico profesional para un psicólogo. 
        Analiza las siguientes notas cronológicas de sesiones y genera un resumen clínico conciso.
        Incluye: 1) Temas principales tratados, 2) Evolución del paciente, 3) Sugerencias generales si las hubiera.
        Usa formato Markdown.
        
        ${historyText}`,
      });

      const text = response.text;
      if (typeof text === 'string') {
        setAiSummary(text);
      } else {
        setAiSummary("No se pudo generar el resumen.");
      }

    } catch (error: any) {
      console.error("Error generating summary", error);
      setAiSummary("Ocurrió un error al contactar a la IA. Verifique su conexión o la clave API.");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const renderDashboard = () => {
    const today = new Date().toISOString().split('T')[0];
    const todaysAppts = appointments.filter(a => a.date === today && a.status !== AppointmentStatus.CANCELLED);
    const pendingPayment = appointments.filter(a => a.paymentStatus === PaymentStatus.UNPAID && a.status === AppointmentStatus.COMPLETED).length;

    return (
      <div className="space-y-8 animate-fade-in">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Panel General</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div 
            onClick={() => {
              setFilterDate(today);
              setActiveTab('calendar');
            }}
            className="glass-panel p-6 rounded-3xl shadow-lg border-t border-white/60 relative overflow-hidden group cursor-pointer hover:-translate-y-1 transition-all duration-300"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
            <div className="flex items-center space-x-4 relative z-10">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform"><CalendarIcon size={24} /></div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Turnos Hoy</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{todaysAppts.length}</p>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-3xl shadow-lg border-t border-white/60 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
            <div className="flex items-center space-x-4 relative z-10">
              <div className="p-4 bg-gradient-to-br from-red-500 to-pink-600 text-white rounded-2xl shadow-lg shadow-red-500/30"><DollarSign size={24} /></div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pendientes de Cobro</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{pendingPayment}</p>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-3xl shadow-lg border-t border-white/60 relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-teal-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
             <div className="flex items-center space-x-4 relative z-10">
              <div className="p-4 bg-gradient-to-br from-teal-500 to-emerald-600 text-white rounded-2xl shadow-lg shadow-teal-500/30"><Users size={24} /></div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Pacientes</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{new Set(appointments.map(a => a.patientName)).size}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-3xl shadow-lg overflow-hidden border border-white/40">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white/30 dark:bg-gray-800/50">
            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">Agenda de Hoy ({today})</h3>
            <button 
              onClick={() => setShowManualModal(true)}
              className="bg-gray-900 dark:bg-white dark:text-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-black dark:hover:bg-gray-200 transition shadow-lg"
            >
              <Plus size={16} /> Nuevo Turno
            </button>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {todaysAppts.length === 0 ? (
              <div className="p-12 text-center text-gray-400 dark:text-gray-500">
                <CalendarIcon size={48} className="mx-auto mb-3 opacity-20"/>
                No hay turnos para hoy.
              </div>
            ) : (
              todaysAppts.sort((a,b) => a.time.localeCompare(b.time)).map(appt => (
                <div key={appt.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/40 dark:hover:bg-gray-700/30 transition-colors">
                  <div className="flex items-center gap-5">
                    <div className="bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 px-4 py-2 rounded-xl text-gray-800 dark:text-gray-200 font-mono font-bold text-lg shadow-sm">
                      {appt.time}
                    </div>
                    <div>
                      <p className="font-bold text-lg text-gray-900 dark:text-white">{appt.patientName}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1"><Users size={12}/> {appt.patientPhone || 'Sin teléfono'}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {appt.status === AppointmentStatus.CONFIRMED && (
                      <button onClick={() => handleStatusChange(appt.id, AppointmentStatus.COMPLETED)} className="px-4 py-2 text-xs font-bold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full hover:bg-green-200 dark:hover:bg-green-900/60 transition-colors">Marcar Asistió</button>
                    )}
                    <button onClick={() => setEditingAppointment(appt)} className="px-4 py-2 text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-1 transition-colors"><Edit2 size={12} /> Editar</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCalendar = () => {
    let displayAppts = appointments;
    if (filterDate) {
      displayAppts = appointments.filter(a => a.date === filterDate);
    }
    const sortedAppts = [...displayAppts].sort((a,b) => new Date(b.date + 'T' + b.time).getTime() - new Date(a.date + 'T' + a.time).getTime());

    return (
      <div className="space-y-8 animate-fade-in">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
              <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Gestión de Turnos</h2>
              {filterDate && (
                  <button 
                      onClick={() => setFilterDate(null)}
                      className="flex items-center gap-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-4 py-1.5 rounded-full text-sm font-bold transition-colors shadow-sm"
                  >
                      <span>Filtro: {filterDate}</span>
                      <X size={14} />
                  </button>
              )}
          </div>
          <button onClick={() => setShowManualModal(true)} className="btn-modern bg-gray-900 dark:bg-white dark:text-gray-900 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 shadow-lg hover:shadow-xl"><Plus size={18} /> Reserva Manual</button>
        </div>

        <div className="glass-panel rounded-3xl shadow-lg overflow-hidden border border-white/40">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">
                <th className="p-5 border-b dark:border-gray-700">Fecha/Hora</th>
                <th className="p-5 border-b dark:border-gray-700">Paciente</th>
                <th className="p-5 border-b dark:border-gray-700">Estado</th>
                <th className="p-5 border-b dark:border-gray-700">Pago</th>
                <th className="p-5 border-b dark:border-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {sortedAppts.length === 0 ? (
                  <tr>
                      <td colSpan={5} className="p-12 text-center text-gray-400 dark:text-gray-500">
                          {filterDate ? 'No hay turnos para esta fecha.' : 'No hay turnos registrados.'}
                      </td>
                  </tr>
              ) : (
                sortedAppts.map(appt => (
                    <tr key={appt.id} className="hover:bg-blue-50/30 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="p-5 text-sm">
                        <div className="font-bold text-gray-900 dark:text-white">{appt.date}</div>
                        <div className="text-gray-500 dark:text-gray-400 font-mono">{appt.time} hs</div>
                    </td>
                    <td className="p-5">
                        <div className="font-semibold text-gray-800 dark:text-gray-200">{appt.patientName}</div>
                    </td>
                    <td className="p-5">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                        ${appt.status === AppointmentStatus.CONFIRMED ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 
                            appt.status === AppointmentStatus.COMPLETED ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                            appt.status === AppointmentStatus.CANCELLED ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                        {appt.status}
                        </span>
                    </td>
                    <td className="p-5 text-sm">
                        {appt.paymentStatus === PaymentStatus.PAID ? (
                          <span className="text-green-600 dark:text-green-400 font-bold flex items-center gap-1"><Check size={14}/> {appt.paymentMethod}</span>
                        ) : (
                          <button 
                            onClick={() => setPaymentAppointment(appt)}
                            className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center gap-1 shadow-sm border border-red-100 dark:border-red-900"
                          >
                            <DollarSign size={14} /> Cobrar
                          </button>
                        )}
                    </td>
                    <td className="p-5 flex gap-2">
                        <button onClick={() => setEditingAppointment(appt)} className="text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 p-2 rounded-lg transition-colors"><Edit2 size={18} /></button>
                        <button onClick={() => handleDeleteAppointment(appt.id)} className="text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors"><Trash2 size={18} /></button>
                    </td>
                    </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderPatients = () => {
    let uniquePatients = Array.from(new Set(appointments.map(a => a.patientId)))
      .map(id => {
        const patientAppts = appointments.filter(a => a.patientId === id);
        const lastAppt = patientAppts.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        return {
          id,
          name: lastAppt?.patientName || 'Desconocido',
          phone: lastAppt?.patientPhone,
          totalVisits: patientAppts.length,
          lastVisit: lastAppt?.date,
          appointments: patientAppts
        };
      });

    if (patientSearchTerm) {
      const term = patientSearchTerm.toLowerCase();
      uniquePatients = uniquePatients.filter(p => {
        const profile = allProfiles[p.id];
        const matchesName = p.name.toLowerCase().includes(term);
        const matchesDni = profile?.dni?.toLowerCase().includes(term);
        const matchesInsurance = profile?.insurance?.toLowerCase().includes(term);
        return matchesName || matchesDni || matchesInsurance;
      });
    }

    if (selectedPatientId && patientProfile) {
      const patientData = uniquePatients.find(p => p.id === selectedPatientId) || {
        id: selectedPatientId,
        name: patientProfile.firstName + ' ' + patientProfile.lastName,
        appointments: appointments.filter(a => a.patientId === selectedPatientId)
      };
      
      const sortedHistory = (patientData.appointments || []).sort((a,b) => new Date(b.date + 'T' + b.time).getTime() - new Date(a.date + 'T' + a.time).getTime());
      const paymentHistory = (patientData.appointments || []).filter(a => a.paymentStatus === PaymentStatus.PAID);

      return (
        <div className="space-y-6 animate-slide-up">
           <div className="flex items-center gap-4 mb-2">
              <button onClick={() => { setSelectedPatientId(null); setPatientProfile(null); }} className="p-3 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 transition-all"><ChevronLeft size={24} /></button>
              <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Ficha: <span className="text-primary-600 dark:text-primary-400">{patientData.name}</span></h2>
           </div>

           <div className="glass-panel rounded-3xl shadow-sm border border-white/60 overflow-hidden">
              <div 
                className="flex items-center justify-between p-6 cursor-pointer hover:bg-white/40 dark:hover:bg-gray-800/40 border-b border-gray-100 dark:border-gray-700 transition-colors"
                onClick={() => setIsProfileExpanded(!isProfileExpanded)}
              >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg text-primary-600 dark:text-primary-400"><FileText size={20} /></div>
                    <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">Datos Personales y Diagnóstico</h3>
                </div>
                {isProfileExpanded ? <ChevronUp size={20} className="text-gray-400"/> : <ChevronDown size={20} className="text-gray-400"/>}
              </div>

              {isProfileExpanded && (
                <div className="p-8 pt-4 animate-fade-in bg-white/30 dark:bg-gray-800/30">
                  <form onSubmit={handleProfileSave} className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                    <div>
                       <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1 mb-1 block">Nombre</label>
                       <input type="text" className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500" value={patientProfile.firstName} onChange={e => setPatientProfile({...patientProfile!, firstName: e.target.value})} />
                    </div>
                    <div>
                       <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1 mb-1 block">Apellido</label>
                       <input type="text" className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500" value={patientProfile.lastName} onChange={e => setPatientProfile({...patientProfile!, lastName: e.target.value})} />
                    </div>
                    <div>
                       <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1 mb-1 block">DNI</label>
                       <input type="text" className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500" value={patientProfile.dni} onChange={e => setPatientProfile({...patientProfile!, dni: e.target.value})} />
                    </div>
                    <div>
                       <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1 mb-1 block">Fecha Nacimiento</label>
                       <input type="date" className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500" value={patientProfile.birthDate} onChange={e => setPatientProfile({...patientProfile!, birthDate: e.target.value})} />
                    </div>
                    <div>
                       <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1 mb-1 block">Obra Social / Prepaga</label>
                       <input type="text" className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500" value={patientProfile.insurance} onChange={e => setPatientProfile({...patientProfile!, insurance: e.target.value})} />
                    </div>
                     <div className="md:col-span-2">
                       <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1 mb-1 block">Diagnóstico Principal</label>
                       <input type="text" className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500" value={patientProfile.diagnosis} onChange={e => setPatientProfile({...patientProfile!, diagnosis: e.target.value})} />
                    </div>
                    <div className="md:col-span-2 flex justify-end">
                       <button type="submit" className="bg-gray-900 dark:bg-white dark:text-gray-900 text-white px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 hover:bg-black shadow-lg"><Save size={18} /> Guardar Datos</button>
                    </div>
                  </form>
                </div>
              )}
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                 <div className="space-y-4">
                   <h3 className="font-bold text-gray-800 dark:text-gray-100 text-xl">Historia Clínica</h3>
                   {sortedHistory.map(appt => {
                     const isUnsaved = unsavedNotes.has(appt.id);
                     return (
                     <div key={appt.id} className="glass-panel p-6 rounded-2xl shadow-sm border border-white/60 relative group hover:shadow-md transition-all">
                        <div className="flex justify-between items-center mb-3">
                           <span className="font-bold text-gray-900 dark:text-white">{appt.date} <span className="text-gray-400 font-light mx-1">|</span> {appt.time} hs</span>
                           <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wide border ${appt.status === AppointmentStatus.COMPLETED ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 border-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>{appt.status}</span>
                        </div>
                        <textarea 
                          className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 text-sm bg-white/50 dark:bg-gray-700/50 focus:bg-white dark:focus:bg-gray-600 dark:text-white transition-colors outline-none focus:ring-2 focus:ring-blue-200"
                          rows={4} 
                          placeholder="Escriba las observaciones de la sesión..."
                          value={appt.clinicalObservations || ''}
                          onChange={(e) => handleNoteChange(appt.id, e.target.value)}
                        />
                        <div className="flex justify-end mt-3">
                           {isUnsaved ? (
                             <button 
                                onClick={() => handleSaveNote(appt.id, appt.clinicalObservations || '')}
                                className="bg-primary-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary-700 flex items-center gap-2 shadow-md animate-pulse"
                             >
                                <Save size={14} /> Guardar Nota
                             </button>
                           ) : (
                             <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-bold px-3 py-1 bg-green-50 dark:bg-green-900/20 rounded-lg">
                               <Check size={14} /> Guardado
                             </div>
                           )}
                        </div>
                     </div>
                   )})}
                 </div>
              </div>

              <div className="lg:col-span-1 space-y-6">
                 <div className="glass-panel p-6 rounded-3xl shadow-lg border border-white/60">
                    <div className="flex justify-between items-center mb-4">
                       <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2"><Clock size={18} /> Cronología</h3>
                       <button 
                          onClick={() => {
                              const phone = 'phone' in patientData ? (patientData as any).phone : ''; 
                              setManualForm({ 
                                  name: patientData.name, 
                                  phone: phone || '', 
                                  date: '', 
                                  time: '' 
                              });
                              setShowManualModal(true);
                          }}
                          className="bg-gray-900 dark:bg-white dark:text-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-md hover:bg-black dark:hover:bg-gray-200"
                       >
                          <Plus size={14} /> Nuevo Turno
                       </button>
                    </div>
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                       {sortedHistory.map(appt => {
                          const isFuture = new Date(appt.date + 'T' + appt.time) > new Date();
                          return (
                          <div key={appt.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all hover:scale-[1.02] ${isFuture ? 'bg-blue-50/50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-900' : 'bg-white/40 border-gray-100 dark:bg-gray-700/30 dark:border-gray-700'}`}>
                             <div>
                                <div className="flex items-center gap-2">
                                   <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{appt.date}</span>
                                   <span className="text-xs text-gray-500 dark:text-gray-400">{appt.time}hs</span>
                                </div>
                                {isFuture && <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wide">Próximo</span>}
                             </div>
                             <span className={`w-2 h-2 rounded-full ${
                                appt.status === AppointmentStatus.CONFIRMED ? 'bg-blue-500' :
                                appt.status === AppointmentStatus.COMPLETED ? 'bg-green-500' :
                                appt.status === AppointmentStatus.CANCELLED ? 'bg-red-500' :
                                'bg-gray-400'
                             }`}></span>
                          </div>
                       )})}
                    </div>
                 </div>

                 <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-3xl shadow-xl text-white relative overflow-hidden group">
                    <div className="absolute top-[-20%] right-[-20%] w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4 font-bold text-indigo-100"><BrainCircuit size={20} /> <h3>Resumen IA</h3></div>
                        {!aiSummary ? (
                           <button onClick={() => generateAiSummary(patientData.name, patientData.appointments)} disabled={isGeneratingAi} className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/20 py-3 rounded-xl text-sm font-bold shadow-lg transition-all disabled:opacity-50">{isGeneratingAi ? 'Analizando...' : 'Generar Resumen'}</button>
                        ) : (
                           <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl text-xs text-indigo-50 max-h-60 overflow-y-auto leading-relaxed custom-scrollbar"><div dangerouslySetInnerHTML={{ __html: aiSummary.replace(/\n/g, '<br/>') }} /></div>
                        )}
                    </div>
                 </div>

                 <div className="glass-panel p-6 rounded-3xl shadow-lg border border-white/60">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2"><DollarSign size={18} /> Pagos</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b dark:border-gray-700 text-gray-500 dark:text-gray-400"><th className="pb-2">Fecha</th><th className="pb-2">Método</th><th className="pb-2 text-right">Monto</th></tr>
                        </thead>
                        <tbody className="divide-y dark:divide-gray-700 text-gray-700 dark:text-gray-300">
                          {paymentHistory.map(p => (
                            <tr key={p.id}><td className="py-2">{p.date}</td><td className="py-2">{p.paymentMethod}</td><td className="py-2 text-right font-bold">${p.cost}</td></tr>
                          ))}
                          {paymentHistory.length === 0 && <tr><td colSpan={3} className="py-4 text-center text-gray-400">Sin pagos registrados</td></tr>}
                        </tbody>
                      </table>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      );
    }

    return (
      <div className="space-y-8 animate-fade-in">
         <div className="flex flex-col gap-4">
             <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Pacientes</h2>
             <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar por nombre, DNI o obra social..."
                  className="w-full pl-12 pr-4 py-4 border-none shadow-lg rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  value={patientSearchTerm}
                  onChange={(e) => setPatientSearchTerm(e.target.value)}
                />
             </div>
         </div>

         {uniquePatients.length === 0 ? (
             <div className="text-center py-20 text-gray-400 dark:text-gray-500">
               <Users size={48} className="mx-auto mb-4 opacity-20"/>
               No se encontraron pacientes que coincidan con la búsqueda.
             </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {uniquePatients.map((patient, idx) => {
                  const profile = allProfiles[patient.id];
                  return (
                  <div key={idx} onClick={() => handlePatientSelect(patient.id, patient.name)} className="glass-panel p-6 rounded-3xl shadow-sm border border-white/60 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary-100 to-transparent rounded-bl-full opacity-50 group-hover:opacity-100 transition-opacity"></div>
                      
                      <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary-500/30 group-hover:scale-110 transition-transform">{patient.name.charAt(0).toUpperCase()}</div>
                        <span className="text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 px-3 py-1 rounded-full">{patient.totalVisits} visitas</span>
                      </div>
                      
                      <h3 className="font-bold text-gray-900 dark:text-white text-xl mb-2 relative z-10">{patient.name}</h3>
                      
                      {profile && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-4 space-y-1 relative z-10">
                            {profile.insurance && <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>{profile.insurance}</div>}
                            {profile.dni && <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>DNI: {profile.dni}</div>}
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-4 flex justify-between items-center relative z-10">
                        <span>Última visita: {patient.lastVisit}</span>
                        <ChevronRight size={16} className="text-primary-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all"/>
                      </div>
                  </div>
                )})}
            </div>
         )}
      </div>
    );
  };

  const renderFinances = () => {
    const totalIncome = appointments
      .filter(a => a.status === AppointmentStatus.COMPLETED || a.status === AppointmentStatus.CONFIRMED)
      .reduce((sum, a) => sum + (a.cost || 0), 0);

    const paidIncome = appointments
      .filter(a => a.paymentStatus === PaymentStatus.PAID)
      .reduce((sum, a) => sum + (a.cost || 0), 0);
    
    const pendingIncome = totalIncome - paidIncome;

    const data = [
      { name: 'Cobrado', value: paidIncome },
      { name: 'Pendiente', value: pendingIncome },
    ];

    const paymentMethodsStats = appointments
      .filter(a => a.paymentStatus === PaymentStatus.PAID)
      .reduce((acc, curr) => {
        const method = curr.paymentMethod || 'Desconocido';
        acc[method] = (acc[method] || 0) + curr.cost;
        return acc;
      }, {} as Record<string, number>);

    const barData = Object.entries(paymentMethodsStats).map(([name, value]) => ({
      name,
      value
    }));

    return (
      <div className="space-y-8 animate-fade-in">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Finanzas</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="glass-panel p-6 rounded-3xl shadow-lg border border-white/60 flex items-center justify-between">
              <div>
                 <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Cobrado</p>
                 <p className="text-3xl font-black text-green-600 dark:text-green-400">${paidIncome}</p>
              </div>
              <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-2xl text-green-600 dark:text-green-400">
                 <DollarSign size={24} />
              </div>
           </div>
           <div className="glass-panel p-6 rounded-3xl shadow-lg border border-white/60 flex items-center justify-between">
              <div>
                 <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Pendiente de Cobro</p>
                 <p className="text-3xl font-black text-red-500 dark:text-red-400">${pendingIncome}</p>
              </div>
              <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-2xl text-red-500 dark:text-red-400">
                 <AlertCircle size={24} />
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="glass-panel p-8 rounded-3xl shadow-lg border border-white/60 h-96 flex flex-col">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6">Estado de Pagos</h3>
               <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', backgroundColor: 'rgba(255,255,255,0.9)'}}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
               </div>
           </div>

           <div className="glass-panel p-8 rounded-3xl shadow-lg border border-white/60 h-96 flex flex-col">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6">Métodos de Pago</h3>
               <div className="flex-1 min-h-0">
                {barData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                      <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {barData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    No hay datos de pagos aún
                  </div>
                )}
               </div>
           </div>
        </div>
      </div>
    );
  };

  const renderSettings = () => {
    const days: string[] = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const hours: number[] = Array.from({ length: 15 }, (_, i) => i + 8); 

    const toggleHour = (dayIndex: number, hour: number) => {
      const newSchedule = [...schedule];
      const dayConfig = newSchedule.find(s => s.dayOfWeek === dayIndex);
      if (dayConfig) {
        if (!dayConfig.activeHours) dayConfig.activeHours = [];
        
        if (dayConfig.activeHours.includes(hour)) {
          dayConfig.activeHours = dayConfig.activeHours.filter(h => h !== hour);
        } else {
          dayConfig.activeHours.push(hour);
        }
        dayConfig.isEnabled = dayConfig.activeHours.length > 0;
        
        saveSchedule(newSchedule);
      }
    };

    return (
      <div className="space-y-8 animate-fade-in">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Configuración</h2>

         <div className="glass-panel p-8 rounded-3xl shadow-lg border border-white/60">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-800 dark:text-white"><UserCog size={20} /> Perfil Profesional</h3>
            <form onSubmit={handleProfessionalNameSave} className="flex flex-col md:flex-row gap-4 items-end">
               <div className="flex-1 w-full">
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Nombre y Título (Visible en Portal Cliente)</label>
                  <input 
                    type="text" 
                    value={professionalName}
                    onChange={(e) => setProfessionalName(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Ej: Lic. Gabriel Medina"
                  />
               </div>
               <button type="submit" className="bg-gray-900 dark:bg-white dark:text-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-black shadow-lg">Guardar Cambios</button>
            </form>
         </div>

         <div>
             <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 rounded-3xl text-white shadow-lg mb-6">
                <h3 className="font-bold text-lg mb-2">Configuración de Horarios (Modo DVR)</h3>
                <p className="text-blue-100 text-sm opacity-90">
                  Haga clic en los bloques para habilitar o deshabilitar horas de atención. Los bloques azules indican disponibilidad.
                </p>
              </div>

            <div className="glass-panel rounded-3xl shadow-xl border border-white/60 overflow-hidden p-8">
               <div className="flex mb-6">
                  <div className="w-28 shrink-0"></div>
                  <div className="flex-1 flex justify-between text-xs text-gray-400 font-bold uppercase tracking-wider">
                    {hours.map(h => <div key={h} className="w-full text-center">{h}</div>)}
                  </div>
               </div>
               
               <div className="space-y-3">
                {days.map((dayName, dayIndex) => {
                  const config = schedule.find(s => s.dayOfWeek === dayIndex) || { dayOfWeek: dayIndex, isEnabled: false, activeHours: [] };
                  const activeHours = config.activeHours || [];

                  return (
                    <div key={dayIndex} className="flex items-center h-12">
                       <div className="w-28 shrink-0 font-bold text-gray-700 dark:text-gray-300 text-sm">{dayName}</div>
                       <div className="flex-1 grid grid-cols-15 gap-1.5 h-full">
                          {hours.map(hour => {
                            const isActive = activeHours.includes(hour);
                            return (
                              <div 
                                 key={hour}
                                 onClick={() => toggleHour(dayIndex, hour)}
                                 className={`rounded-lg cursor-pointer transition-all duration-300 transform hover:scale-110 ${isActive ? 'bg-gradient-to-b from-blue-500 to-blue-600 shadow-md shadow-blue-500/30' : 'bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                 title={`${dayName} ${hour}:00`}
                                 style={{ flex: 1 }}
                              />
                            )
                          })}
                       </div>
                    </div>
                  );
                })}
               </div>
               <style>{`.grid-cols-15 { display: grid; grid-template-columns: repeat(15, minmax(0, 1fr)); }`}</style>
            </div>
         </div>
      </div>
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  );

  return (
    <div className={isDarkMode ? 'dark' : ''}>
    <div className="flex h-screen bg-transparent transition-colors duration-200">
      {/* Sidebar */}
      <aside className="w-20 md:w-72 glass-panel border-r border-white/50 flex flex-col hidden md:flex transition-all z-20 shadow-2xl">
        <div className="p-8 border-b border-gray-100 dark:border-gray-700/50">
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-teal-500 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-teal-500 rounded-xl flex items-center justify-center text-white text-xl shadow-lg shadow-primary-500/30">P</div>
            <span className="hidden md:block">PsicoAdmin</span>
          </h1>
        </div>
        
        <nav className="flex-1 p-6 space-y-3 overflow-y-auto">
          <button onClick={() => { setActiveTab('dashboard'); setFilterDate(null); }} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${activeTab === 'dashboard' ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30 transform scale-105' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            <LayoutDashboard size={22} className={activeTab === 'dashboard' ? 'text-white' : 'group-hover:text-primary-600'}/> <span className="hidden md:block font-bold">Inicio</span>
          </button>
          <button onClick={() => { setActiveTab('patients'); setFilterDate(null); }} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${activeTab === 'patients' ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30 transform scale-105' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            <Users size={22} className={activeTab === 'patients' ? 'text-white' : 'group-hover:text-primary-600'}/> <span className="hidden md:block font-bold">Pacientes</span>
          </button>
          <button onClick={() => { setActiveTab('calendar'); setFilterDate(null); }} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${activeTab === 'calendar' ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30 transform scale-105' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            <CalendarIcon size={22} className={activeTab === 'calendar' ? 'text-white' : 'group-hover:text-primary-600'}/> <span className="hidden md:block font-bold">Agenda</span>
          </button>
          <button onClick={() => { setActiveTab('finances'); setFilterDate(null); }} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${activeTab === 'finances' ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30 transform scale-105' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            <DollarSign size={22} className={activeTab === 'finances' ? 'text-white' : 'group-hover:text-primary-600'}/> <span className="hidden md:block font-bold">Contabilidad</span>
          </button>
          <button onClick={() => { setActiveTab('settings'); setFilterDate(null); }} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${activeTab === 'settings' ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30 transform scale-105' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            <Settings size={22} className={activeTab === 'settings' ? 'text-white' : 'group-hover:text-primary-600'}/> <span className="hidden md:block font-bold">Configuración</span>
          </button>
        </nav>
        
        <div className="p-6 border-t border-gray-100 dark:border-gray-700/50 space-y-3">
            <button onClick={toggleDarkMode} className="w-full flex items-center gap-4 px-5 py-3 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-all font-medium">
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                <span className="hidden md:block">{isDarkMode ? 'Modo Claro' : 'Modo Oscuro'}</span>
            </button>
            <button onClick={onLogout} className="w-full flex items-center gap-4 px-5 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all font-medium"><LogOut size={20} /> <span className="hidden md:block">Cerrar Sesión</span></button>
        </div>
      </aside>

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 glass-panel rounded-2xl shadow-2xl z-50 flex justify-around p-2 border border-white/50">
         <button onClick={() => setActiveTab('dashboard')} className={`p-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/40' : 'text-gray-400'}`}><LayoutDashboard size={24}/></button>
         <button onClick={() => setActiveTab('patients')} className={`p-3 rounded-xl transition-all ${activeTab === 'patients' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/40' : 'text-gray-400'}`}><Users size={24}/></button>
         <button onClick={() => setActiveTab('calendar')} className={`p-3 rounded-xl transition-all ${activeTab === 'calendar' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/40' : 'text-gray-400'}`}><CalendarIcon size={24}/></button>
         <button onClick={() => setActiveTab('finances')} className={`p-3 rounded-xl transition-all ${activeTab === 'finances' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/40' : 'text-gray-400'}`}><DollarSign size={24}/></button>
         <button onClick={onLogout} className="p-3 text-red-400"><LogOut size={24}/></button>
      </div>

      <main className="flex-1 overflow-y-auto p-4 md:p-10 pb-28 md:pb-10 relative">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-300/30 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -z-10 animate-blob pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-300/30 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -z-10 animate-blob animation-delay-2000 pointer-events-none"></div>

         <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'calendar' && renderCalendar()}
            {activeTab === 'patients' && renderPatients()}
            {activeTab === 'finances' && renderFinances()}
            {activeTab === 'settings' && renderSettings()}
         </div>
      </main>

      {/* Manual Booking Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel bg-white/95 p-8 rounded-3xl shadow-2xl max-w-md w-full animate-slide-up">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Reserva Manual</h3>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Paciente</label><input required type="text" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50" value={manualForm.name} onChange={e => setManualForm({...manualForm, name: e.target.value})} /></div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Teléfono</label><input type="tel" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50" value={manualForm.phone} onChange={e => setManualForm({...manualForm, phone: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha</label><input required type="date" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50" value={manualForm.date} onChange={e => setManualForm({...manualForm, date: e.target.value})} /></div>
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hora</label><input required type="time" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50" value={manualForm.time} onChange={e => setManualForm({...manualForm, time: e.target.value})} /></div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowManualModal(false)} className="px-4 py-2 text-gray-500 hover:text-gray-800 font-medium">Cancelar</button>
                <button type="submit" className="bg-gray-900 text-white px-6 py-2 rounded-xl font-bold hover:bg-black shadow-lg">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Appointment Modal */}
      {editingAppointment && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel bg-white/95 p-8 rounded-3xl shadow-2xl max-w-md w-full animate-slide-up">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Editar Turno</h3>
            <div className="mb-6 p-4 bg-blue-50/50 rounded-2xl text-sm border border-blue-100 flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">{editingAppointment.patientName.charAt(0)}</div>
               <div>
                 <p className="text-xs text-blue-400 font-bold uppercase">Paciente</p>
                 <strong className="text-blue-900 text-lg">{editingAppointment.patientName}</strong>
               </div>
            </div>
            <form onSubmit={handleEditAppointmentSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha</label><input required type="date" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50" value={editingAppointment.date} onChange={e => setEditingAppointment({...editingAppointment, date: e.target.value})} /></div>
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hora</label><input required type="time" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50" value={editingAppointment.time} onChange={e => setEditingAppointment({...editingAppointment, time: e.target.value})} /></div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estado</label>
                <select className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50" value={editingAppointment.status} onChange={e => setEditingAppointment({...editingAppointment, status: e.target.value as AppointmentStatus})}>
                   <option value={AppointmentStatus.PENDING}>Pendiente</option>
                   <option value={AppointmentStatus.CONFIRMED}>Confirmado</option>
                   <option value={AppointmentStatus.COMPLETED}>Completado</option>
                   <option value={AppointmentStatus.CANCELLED}>Cancelado</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setEditingAppointment(null)} className="px-4 py-2 text-gray-500 hover:text-gray-800 font-medium">Cancelar</button>
                <button type="submit" className="bg-gray-900 text-white px-6 py-2 rounded-xl font-bold hover:bg-black shadow-lg">Actualizar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Processing Modal */}
      {paymentAppointment && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel bg-white/95 p-8 rounded-3xl shadow-2xl max-w-sm w-full animate-slide-up relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-teal-500"></div>
            
            <div className="flex justify-between items-start mb-6">
               <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Registrar Cobro</h3>
               <button onClick={() => setPaymentAppointment(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={24}/></button>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl mb-6 text-center border border-gray-100 dark:border-gray-700">
               <p className="text-xs font-bold text-gray-500 uppercase mb-1">Monto a cobrar</p>
               <p className="text-4xl font-black text-gray-900 dark:text-white">${paymentAppointment.cost}</p>
               <p className="text-sm text-gray-500 mt-2">{paymentAppointment.patientName}</p>
            </div>

            <div className="space-y-3">
               <button onClick={() => processPayment(PaymentMethod.CASH)} className="w-full flex items-center justify-between p-4 rounded-xl border hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 group transition-all">
                  <div className="flex items-center gap-3">
                     <div className="bg-green-100 text-green-600 p-2 rounded-lg group-hover:bg-green-500 group-hover:text-white transition-colors"><Wallet size={20} /></div>
                     <span className="font-bold text-gray-700 dark:text-gray-200">Efectivo</span>
                  </div>
                  <ChevronRight size={18} className="text-gray-400 group-hover:text-green-500"/>
               </button>

               <button onClick={() => processPayment(PaymentMethod.TRANSFER)} className="w-full flex items-center justify-between p-4 rounded-xl border hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 group transition-all">
                  <div className="flex items-center gap-3">
                     <div className="bg-blue-100 text-blue-600 p-2 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors"><Smartphone size={20} /></div>
                     <span className="font-bold text-gray-700 dark:text-gray-200">Transferencia</span>
                  </div>
                  <ChevronRight size={18} className="text-gray-400 group-hover:text-blue-500"/>
               </button>

               <button onClick={() => processPayment(PaymentMethod.CARD)} className="w-full flex items-center justify-between p-4 rounded-xl border hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 group transition-all">
                  <div className="flex items-center gap-3">
                     <div className="bg-purple-100 text-purple-600 p-2 rounded-lg group-hover:bg-purple-500 group-hover:text-white transition-colors"><CreditCard size={20} /></div>
                     <span className="font-bold text-gray-700 dark:text-gray-200">Débito / Crédito</span>
                  </div>
                  <ChevronRight size={18} className="text-gray-400 group-hover:text-purple-500"/>
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};
