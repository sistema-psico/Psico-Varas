import React, { useState, useEffect, useRef } from 'react';
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
  UserCog,
  UserPlus,
  Mail,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';
import { Appointment, AppointmentStatus, PaymentMethod, PaymentStatus, WorkingHours, PatientProfile, ProfessionalConfig } from '../types';
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
  const [professionalConfig, setProfessionalConfig] = useState<ProfessionalConfig>({
    name: '',
    specialty: '',
    address: ''
  });

  // Search State
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [allProfiles, setAllProfiles] = useState<Record<string, PatientProfile>>({});

  // Filter State for Calendar
  const [filterDate, setFilterDate] = useState<string | null>(null);

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Manual Booking State
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({ name: '', date: '', time: '', phone: '', patientId: '' });
  
  // Booking Autocomplete State
  const [bookingSuggestions, setBookingSuggestions] = useState<PatientProfile[]>([]);
  const [showBookingSuggestions, setShowBookingSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // New Patient State
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [newPatientForm, setNewPatientForm] = useState({ 
    firstName: '', 
    lastName: '', 
    phone: '', 
    email: '', 
    dni: '', 
    insurance: '',
    notes: '' 
  });

  // Edit Appointment State
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  // Payment Processing State
  const [paymentAppointment, setPaymentAppointment] = useState<Appointment | null>(null);

  // Patient Detail State
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  // View State for Patient Detail
  const [isPatientInfoCollapsed, setIsPatientInfoCollapsed] = useState(false);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  
  // Note State
  const [unsavedNotes, setUnsavedNotes] = useState<Set<string>>(new Set());
  
  // AI State
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  useEffect(() => {
    loadData();
    // Load Dark Mode Preference
    const savedTheme = localStorage.getItem('psico_theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
    }
    
    // Click outside handler for suggestions
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowBookingSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);

  }, []);

  const loadData = async () => {
    setLoading(true);
    const appts = await DataService.getAppointments();
    const sched = await DataService.getScheduleConfig();
    const profiles = await DataService.getAllPatientProfiles();
    const profConfig = await DataService.getProfessionalConfig();
    
    setAppointments(appts);
    setSchedule(sched);
    setAllProfiles(profiles);
    setProfessionalConfig(profConfig);
    setLoading(false);
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
    setPaymentAppointment(null); // Close modal
  };

  const handleProfessionalConfigSave = async (e: React.FormEvent) => {
      e.preventDefault();
      await DataService.saveProfessionalConfig(professionalConfig);
      alert('Configuración actualizada correctamente');
  };

  // Local state update for typing
  const handleNoteChange = (id: string, note: string) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, clinicalObservations: note } : a));
    setUnsavedNotes(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  // Persist to DataService
  const handleSaveNote = async (id: string, note: string) => {
    await DataService.updateAppointment(id, { clinicalObservations: note });
    setUnsavedNotes(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // --- Manual Booking Logic with Autocomplete ---

  const handleManualNameChange = (text: string) => {
    setManualForm({ ...manualForm, name: text, patientId: '' }); // Reset ID if typing manually
    
    if (text.length > 0) {
      const lowerText = text.toLowerCase();
      const matches = Object.values(allProfiles).filter((p: PatientProfile) => 
        p.firstName.toLowerCase().includes(lowerText) || 
        p.lastName.toLowerCase().includes(lowerText)
      );
      setBookingSuggestions(matches);
      setShowBookingSuggestions(matches.length > 0);
    } else {
      setShowBookingSuggestions(false);
    }
  };

  const selectBookingPatient = (patient: PatientProfile) => {
    setManualForm({
      ...manualForm,
      name: `${patient.firstName} ${patient.lastName}`,
      phone: patient.phone || '',
      patientId: patient.id
    });
    setShowBookingSuggestions(false);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await DataService.addAppointment({
      patientName: manualForm.name,
      patientPhone: manualForm.phone,
      patientId: manualForm.patientId || 'manual-' + Date.now(),
      date: manualForm.date,
      time: manualForm.time,
      status: AppointmentStatus.CONFIRMED,
      cost: 5000,
      paymentStatus: PaymentStatus.UNPAID,
      paymentMethod: PaymentMethod.PENDING
    });
    setShowManualModal(false);
    setManualForm({ name: '', date: '', time: '', phone: '', patientId: '' });
    loadData();
  };

  // ----------------------------------------------

  const handleCreatePatient = async (e: React.FormEvent) => {
      e.preventDefault();
      const newId = 'p-' + Date.now();
      const newProfile: PatientProfile = {
          id: newId,
          firstName: newPatientForm.firstName,
          lastName: newPatientForm.lastName,
          dni: newPatientForm.dni,
          phone: newPatientForm.phone,
          email: newPatientForm.email,
          birthDate: '', // Optional for now
          insurance: newPatientForm.insurance,
          diagnosis: '',
          notes: newPatientForm.notes
      };
      
      await DataService.savePatientProfile(newProfile);
      setAllProfiles(prev => ({ ...prev, [newId]: newProfile }));
      setShowNewPatientModal(false);
      setNewPatientForm({ firstName: '', lastName: '', phone: '', email: '', dni: '', insurance: '', notes: '' });
      alert('Paciente creado correctamente');
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
    setIsPatientInfoCollapsed(false); // Reset to open when selecting a new patient
    
    // Load existing profile or create scaffold
    const existing = await DataService.getPatientProfile(patientId);
    
    if (existing) {
        setPatientProfile(existing);
    } else {
        // Fallback if we only have appointment data but no profile yet
        setPatientProfile({
          id: patientId,
          firstName: name.split(' ')[0],
          lastName: name.split(' ').slice(1).join(' '),
          dni: '',
          birthDate: '',
          insurance: '',
          diagnosis: '',
          notes: ''
        });
    }

    // Auto-expand the most recent appointment for this patient
    const patientAppts = appointments
        .filter(a => a.patientId === patientId || a.patientName === name)
        .sort((a,b) => new Date(b.date + 'T' + b.time).getTime() - new Date(a.date + 'T' + a.time).getTime());
    
    if (patientAppts.length > 0) {
        setExpandedSessionId(patientAppts[0].id);
    } else {
        setExpandedSessionId(null);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (patientProfile) {
      await DataService.savePatientProfile(patientProfile);
      setAllProfiles(prev => ({...prev, [patientProfile.id]: patientProfile})); // Update local cache
      setIsPatientInfoCollapsed(true); // Auto collapse on save for cleaner view
      alert("Datos guardados correctamente.");
    }
  };

  const generateAiSummary = async (patientName: string, patientAppointments: Appointment[]) => {
    setIsGeneratingAi(true);
    setAiSummary('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      
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
        model: 'gemini-2.5-flash',
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
      setAiSummary("Ocurrió un error al contactar a la IA. Por favor intente nuevamente.");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const copyAiSummary = () => {
    if (aiSummary) {
      navigator.clipboard.writeText(aiSummary);
      alert('Resumen copiado al portapapeles');
    }
  };

  const toggleSessionExpansion = (apptId: string) => {
      setExpandedSessionId(expandedSessionId === apptId ? null : apptId);
  };

  // --- Views ---

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

  const renderSettings = () => {
    const days: string[] = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    // 8:00 to 22:00
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
        
        // Backward compatibility (approximate)
        if (dayConfig.activeHours && dayConfig.activeHours.length > 0) {
           const min = Math.min(...dayConfig.activeHours);
           const max = Math.max(...dayConfig.activeHours);
           (dayConfig as any).startTime = `${min}`.padStart(2,'0') + ':00';
           (dayConfig as any).endTime = `${max + 1}`.padStart(2,'0') + ':00';
        }
        
        saveSchedule(newSchedule);
      }
    };

    return (
      <div className="space-y-8 animate-fade-in">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Configuración</h2>

        {/* Professional Profile Settings */}
         <div className="glass-panel p-8 rounded-3xl shadow-lg border border-white/60">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-gray-800 dark:text-white"><UserCog size={20} /> Perfil Profesional</h3>
            <form onSubmit={handleProfessionalConfigSave} className="grid grid-cols-1 gap-6">
               <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Nombre y Título</label>
                  <input 
                    type="text" 
                    value={professionalConfig.name}
                    onChange={(e) => setProfessionalConfig({...professionalConfig, name: e.target.value})}
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Ej: Lic. Gabriel Medina"
                  />
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Especialidad</label>
                    <input 
                      type="text" 
                      value={professionalConfig.specialty}
                      onChange={(e) => setProfessionalConfig({...professionalConfig, specialty: e.target.value})}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Ej: Psicología Clínica"
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Dirección del Consultorio</label>
                    <input 
                      type="text" 
                      value={professionalConfig.address}
                      onChange={(e) => setProfessionalConfig({...professionalConfig, address: e.target.value})}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Ej: Av. Corrientes 1234, CABA"
                    />
                 </div>
               </div>

               <div className="flex justify-end pt-4">
                 <button type="submit" className="bg-gray-900 dark:bg-white dark:text-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-black shadow-lg">Guardar Cambios</button>
               </div>
            </form>
         </div>

         {/* Schedule Grid */}
         <div>
             <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 rounded-3xl text-white shadow-lg mb-6">
                <h3 className="font-bold text-lg mb-2">Configuración de Horarios</h3>
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

  const renderPatients = () => {
    // If a patient is selected, show detail view
    if (selectedPatientId && patientProfile) {
        // Filter appointments for this patient
        const patientAppts = appointments.filter(a => a.patientId === selectedPatientId || a.patientName === patientProfile.firstName + ' ' + patientProfile.lastName); // Fallback to name match if IDs don't align perfectly in mock data

        // Sort appointments desc
        const sortedHistory = patientAppts.sort((a,b) => new Date(b.date + 'T' + b.time).getTime() - new Date(a.date + 'T' + a.time).getTime());

        return (
            <div className="animate-fade-in space-y-6">
                <button onClick={() => setSelectedPatientId(null)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-4">
                    <ChevronLeft size={20} /> Volver a la lista
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Profile Column */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="glass-panel p-6 rounded-3xl shadow-lg border border-white/60 relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-32 h-32 bg-purple-400/20 rounded-full mix-blend-multiply filter blur-3xl"></div>
                             
                             {/* Header Toggleable */}
                             <div 
                                className="flex items-center justify-between mb-2 relative z-10 cursor-pointer"
                                onClick={() => setIsPatientInfoCollapsed(!isPatientInfoCollapsed)}
                             >
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-purple-500/30">
                                        {patientProfile.firstName.charAt(0)}{patientProfile.lastName.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{patientProfile.firstName} {patientProfile.lastName}</h2>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Paciente</p>
                                    </div>
                                </div>
                                <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full hover:bg-gray-200 transition">
                                    {isPatientInfoCollapsed ? <ChevronDown size={20}/> : <ChevronUp size={20}/>}
                                </div>
                             </div>
                             
                             {!isPatientInfoCollapsed && (
                                <form onSubmit={handleProfileSave} className="space-y-4 relative z-10 mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 animate-fade-in">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Teléfono</label>
                                        <input 
                                            className="w-full bg-white/50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2 text-sm mt-1" 
                                            value={patientProfile.phone || ''}
                                            onChange={e => setPatientProfile({...patientProfile, phone: e.target.value})}
                                            placeholder="No registrado"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Email</label>
                                        <input 
                                            className="w-full bg-white/50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2 text-sm mt-1" 
                                            value={patientProfile.email || ''}
                                            onChange={e => setPatientProfile({...patientProfile, email: e.target.value})}
                                            placeholder="No registrado"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Diagnóstico</label>
                                        <input 
                                            className="w-full bg-white/50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2 text-sm mt-1" 
                                            value={patientProfile.diagnosis}
                                            onChange={e => setPatientProfile({...patientProfile, diagnosis: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Obra Social</label>
                                        <input 
                                            className="w-full bg-white/50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2 text-sm mt-1" 
                                            value={patientProfile.insurance}
                                            onChange={e => setPatientProfile({...patientProfile, insurance: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Notas Generales / Historia Clínica</label>
                                        <textarea 
                                            className="w-full bg-white/50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2 text-sm mt-1" 
                                            rows={5}
                                            value={patientProfile.notes}
                                            onChange={e => setPatientProfile({...patientProfile, notes: e.target.value})}
                                        />
                                    </div>
                                    <button type="submit" className="w-full bg-gray-900 dark:bg-white dark:text-gray-900 text-white py-2 rounded-xl font-bold text-sm hover:bg-black transition shadow-lg">Guardar Perfil</button>
                                </form>
                             )}
                        </div>
                        
                        {/* AI Summary Card */}
                        <div className="glass-panel p-6 rounded-3xl shadow-lg border border-white/60 bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-gray-900">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold flex items-center gap-2 text-blue-900 dark:text-blue-300"><BrainCircuit size={18}/> Resumen IA</h3>
                                <div className="flex gap-2">
                                    {aiSummary && (
                                        <button 
                                            onClick={copyAiSummary}
                                            className="text-xs bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 p-1.5 rounded-lg transition-colors shadow-sm"
                                            title="Copiar resumen"
                                        >
                                            <Copy size={14}/>
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => generateAiSummary(patientProfile.firstName + ' ' + patientProfile.lastName, patientAppts)}
                                        disabled={isGeneratingAi}
                                        className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-full font-bold transition-colors disabled:opacity-50"
                                    >
                                        {isGeneratingAi ? 'Generando...' : 'Generar'}
                                    </button>
                                </div>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed min-h-[100px] bg-white/50 dark:bg-gray-700/50 p-4 rounded-xl border border-blue-100 dark:border-gray-600">
                                {aiSummary ? (
                                    <div dangerouslySetInnerHTML={{ __html: aiSummary.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }} />
                                ) : (
                                    <span className="text-gray-400 italic">Genere un resumen basado en el historial clínico...</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* History Column */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* Pinned General Notes / Alerts */}
                        {patientProfile.notes && (
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-5 rounded-r-xl shadow-sm mb-6 flex items-start gap-3">
                                <AlertCircle className="text-yellow-500 shrink-0 mt-0.5" size={24} />
                                <div>
                                    <h4 className="font-bold text-yellow-800 dark:text-yellow-500 uppercase text-xs mb-1 tracking-wider">Aviso Importante / Notas Generales</h4>
                                    <p className="text-gray-800 dark:text-gray-200 text-sm whitespace-pre-wrap leading-relaxed">{patientProfile.notes}</p>
                                </div>
                            </div>
                        )}

                        <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><History size={20}/> Historial de Sesiones</h3>
                        <div className="space-y-4">
                            {sortedHistory.length === 0 ? (
                                <div className="text-center py-12 text-gray-400 bg-white/30 dark:bg-gray-800/30 rounded-3xl border border-dashed border-gray-300 dark:border-gray-600">No hay historial de turnos.</div>
                            ) : (
                                sortedHistory.map(appt => {
                                    const isExpanded = expandedSessionId === appt.id;
                                    
                                    return (
                                        <div key={appt.id} className={`glass-panel rounded-2xl border border-white/50 hover:shadow-md transition-all duration-300 overflow-hidden ${isExpanded ? 'p-6' : 'p-4 cursor-pointer bg-white/40 hover:bg-white/60'}`}>
                                            <div 
                                                className="flex justify-between items-center"
                                                onClick={() => !isExpanded && toggleSessionExpansion(appt.id)}
                                            >
                                                <div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="font-bold text-gray-900 dark:text-white text-lg">{appt.date} <span className="text-sm font-normal text-gray-500 ml-2">{appt.time} hs</span></div>
                                                        {!isExpanded && (
                                                            <div className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${appt.clinicalObservations ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                                                                {appt.clinicalObservations ? 'Con Notas' : 'Sin Notas'}
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Compact View Summary */}
                                                    {!isExpanded && (
                                                        <p className="text-xs text-gray-500 mt-1 truncate max-w-md">
                                                            {appt.clinicalObservations || <span className="italic opacity-50">Clic para escribir observaciones...</span>}
                                                        </p>
                                                    )}
                                                </div>
                                                
                                                <div className="flex items-center gap-3">
                                                    <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase 
                                                        ${appt.status === AppointmentStatus.COMPLETED ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                        {appt.status}
                                                    </div>
                                                    <div className="text-gray-400">
                                                        {isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expanded Content */}
                                            {isExpanded && (
                                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-4 animate-fade-in">
                                                    {appt.notes && (
                                                        <div className="bg-yellow-50/50 dark:bg-yellow-900/10 p-3 rounded-xl border border-yellow-100 dark:border-yellow-900/30">
                                                            <p className="text-xs font-bold text-yellow-700 dark:text-yellow-500 uppercase mb-1">Nota del Paciente</p>
                                                            <p className="text-sm text-gray-700 dark:text-gray-300 italic">{appt.notes}</p>
                                                        </div>
                                                    )}
                                                    
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Observaciones Clínicas de la Sesión</p>
                                                        <textarea 
                                                            className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-inner"
                                                            rows={6}
                                                            placeholder="Escriba sus observaciones privadas aquí..."
                                                            value={appt.clinicalObservations || ''}
                                                            onChange={e => handleNoteChange(appt.id, e.target.value)}
                                                        />
                                                        
                                                        {unsavedNotes.has(appt.id) ? (
                                                            <div className="mt-3 animate-slide-up">
                                                                <button 
                                                                    onClick={() => handleSaveNote(appt.id, appt.clinicalObservations || '')} 
                                                                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all"
                                                                >
                                                                    <Save size={18}/> Guardar Observación
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex justify-end mt-2">
                                                                <button 
                                                                    onClick={() => toggleSessionExpansion(appt.id)}
                                                                    className="text-gray-400 hover:text-gray-600 text-xs flex items-center gap-1"
                                                                >
                                                                    Minimizar <ChevronUp size={12}/>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // List view
    // Create unique patients list from appointments + stored profiles
    
    // For simplicity in this demo, let's iterate over appointments to find unique patients
    const patientsMap = new Map<string, {id: string, name: string, phone: string, lastVisit: string}>();
    
    // 1. First, populate from existing appointments
    appointments.forEach(appt => {
        if (!patientsMap.has(appt.patientId)) {
            patientsMap.set(appt.patientId, {
                id: appt.patientId,
                name: appt.patientName,
                phone: appt.patientPhone || '',
                lastVisit: appt.date
            });
        } else {
            const current = patientsMap.get(appt.patientId)!;
            if (new Date(appt.date) > new Date(current.lastVisit)) {
                current.lastVisit = appt.date;
            }
        }
    });

    // 2. Then, populate from profiles that might NOT have appointments yet
    Object.values(allProfiles).forEach((profile: PatientProfile) => {
        if (!patientsMap.has(profile.id)) {
            patientsMap.set(profile.id, {
                id: profile.id,
                name: `${profile.firstName} ${profile.lastName}`,
                phone: profile.phone || '',
                lastVisit: 'Sin historial'
            });
        }
    });

    const patientList = Array.from(patientsMap.values()).filter(p => 
        p.name.toLowerCase().includes(patientSearchTerm.toLowerCase()) || 
        p.phone.includes(patientSearchTerm)
    );

    return (
      <div className="space-y-8 animate-fade-in">
        <div className="flex justify-between items-center">
             <div className="flex items-center gap-4">
               <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Pacientes</h2>
               <button 
                  onClick={() => setShowNewPatientModal(true)}
                  className="bg-primary-600 hover:bg-primary-700 text-white p-2 rounded-xl shadow-lg transition-colors"
                  title="Agregar Paciente Nuevo"
               >
                  <UserPlus size={20} />
               </button>
             </div>
             
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Buscar paciente..." 
                    className="pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                    value={patientSearchTerm}
                    onChange={e => setPatientSearchTerm(e.target.value)}
                />
             </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {patientList.length === 0 ? (
                <div className="col-span-3 text-center py-12 text-gray-400 bg-white/30 dark:bg-gray-800/30 rounded-3xl border border-dashed border-gray-300 dark:border-gray-600">
                    <Users size={48} className="mx-auto mb-3 opacity-20"/>
                    No se encontraron pacientes.
                </div>
            ) : (
                patientList.map(patient => (
                    <div key={patient.id} onClick={() => handlePatientSelect(patient.id, patient.name)} className="glass-panel p-6 rounded-3xl shadow-sm border border-white/60 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300 font-bold text-lg group-hover:from-primary-500 group-hover:to-teal-400 group-hover:text-white transition-all">
                                {patient.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white">{patient.name}</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><Smartphone size={10}/> {patient.phone || 'N/A'}</p>
                            </div>
                        </div>
                        <div className="text-xs text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-3 flex justify-between">
                            <span>Última visita:</span>
                            <span className="font-mono font-medium text-gray-600 dark:text-gray-300">{patient.lastVisit}</span>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>
    );
  };

  const renderFinances = () => {
    // Calculations
    const totalIncome = appointments
        .filter(a => a.paymentStatus === PaymentStatus.PAID)
        .reduce((sum, a) => sum + a.cost, 0);
    
    const pendingIncome = appointments
        .filter(a => a.paymentStatus === PaymentStatus.UNPAID && a.status !== AppointmentStatus.CANCELLED)
        .reduce((sum, a) => sum + a.cost, 0);

    // Chart Data - Monthly Income
    const monthlyIncome: Record<string, number> = {};
    appointments.filter(a => a.paymentStatus === PaymentStatus.PAID).forEach(a => {
        const month = a.date.substring(0, 7); // YYYY-MM
        monthlyIncome[month] = (monthlyIncome[month] || 0) + a.cost;
    });
    
    const barData = Object.keys(monthlyIncome).sort().map(month => ({
        name: month,
        amount: monthlyIncome[month]
    }));

    // Chart Data - Payment Methods
    const methodCounts: Record<string, number> = {};
    appointments.filter(a => a.paymentStatus === PaymentStatus.PAID).forEach(a => {
        methodCounts[a.paymentMethod] = (methodCounts[a.paymentMethod] || 0) + 1;
    });

    const pieData = Object.keys(methodCounts).map(method => ({
        name: method,
        value: methodCounts[method]
    }));

    return (
      <div className="space-y-8 animate-fade-in">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Finanzas</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel p-8 rounded-3xl shadow-lg border-t border-white/60 relative overflow-hidden bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20"></div>
                <p className="text-emerald-100 font-medium mb-1 flex items-center gap-2"><DollarSign size={16}/> Ingresos Totales</p>
                <p className="text-4xl font-black tracking-tight">${totalIncome.toLocaleString()}</p>
            </div>
            
            <div className="glass-panel p-8 rounded-3xl shadow-lg border-t border-white/60 relative overflow-hidden bg-gradient-to-br from-orange-400 to-red-500 text-white">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20"></div>
                <p className="text-orange-100 font-medium mb-1 flex items-center gap-2"><Clock size={16}/> Pendiente de Cobro</p>
                <p className="text-4xl font-black tracking-tight">${pendingIncome.toLocaleString()}</p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="glass-panel p-6 rounded-3xl shadow-lg border border-white/60">
                <h3 className="font-bold text-gray-800 dark:text-white mb-6">Ingresos Mensuales</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} tickFormatter={(value) => `$${value}`} />
                            <Tooltip 
                                contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}}
                                cursor={{fill: '#F3F4F6'}}
                            />
                            <Bar dataKey="amount" fill="#10B981" radius={[6, 6, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="glass-panel p-6 rounded-3xl shadow-lg border border-white/60">
                <h3 className="font-bold text-gray-800 dark:text-white mb-6">Métodos de Pago</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="flex h-screen bg-transparent">
        {/* Sidebar Skeleton */}
        <aside className="w-20 md:w-72 glass-panel border-r border-white/50 hidden md:flex flex-col p-6 space-y-6">
          <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse mb-4"></div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 w-full bg-gray-100/50 dark:bg-gray-700/50 rounded-2xl animate-pulse"></div>
          ))}
          <div className="mt-auto h-12 w-full bg-gray-100/50 dark:bg-gray-700/50 rounded-2xl animate-pulse"></div>
        </aside>

        {/* Main Content Skeleton */}
        <main className="flex-1 p-4 md:p-10 relative">
           <div className="max-w-7xl mx-auto space-y-8">
              {/* Header */}
              <div className="h-10 w-48 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {[1,2,3].map(i => (
                    <div key={i} className="h-32 rounded-3xl bg-white/40 dark:bg-gray-800/40 border border-white/30 animate-pulse"></div>
                 ))}
              </div>

              {/* Big List/Table */}
              <div className="h-96 rounded-3xl bg-white/40 dark:bg-gray-800/40 border border-white/30 animate-pulse"></div>
           </div>
        </main>
      </div>
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
            
            <div className="pt-4 text-center hidden md:block">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">Dev: Eduardo Ricci</p>
            </div>
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
          {/* Background Blobs for Dashboard */}
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
              <div className="relative" ref={suggestionsRef}>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Paciente</label>
                <div className="relative">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                   <input 
                      required 
                      type="text" 
                      className="w-full border border-gray-200 rounded-xl pl-10 pr-3 py-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none" 
                      value={manualForm.name} 
                      onChange={e => handleManualNameChange(e.target.value)} 
                      placeholder="Buscar o escribir nuevo..."
                      autoComplete="off"
                   />
                </div>
                {/* Autocomplete Suggestions */}
                {showBookingSuggestions && (
                   <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 max-h-48 overflow-y-auto">
                      {bookingSuggestions.map(p => (
                         <div 
                            key={p.id}
                            onClick={() => selectBookingPatient(p)}
                            className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer border-b border-gray-50 dark:border-gray-700/50 last:border-0 flex justify-between items-center"
                         >
                            <span className="font-medium text-gray-800 dark:text-gray-200">{p.firstName} {p.lastName}</span>
                            <span className="text-xs text-gray-400">{p.phone}</span>
                         </div>
                      ))}
                   </div>
                )}
              </div>
              
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

      {/* New Patient Modal */}
      {showNewPatientModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel bg-white/95 p-8 rounded-3xl shadow-2xl max-w-md w-full animate-slide-up">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Nuevo Paciente</h3>
            <form onSubmit={handleCreatePatient} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre</label><input required type="text" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50" value={newPatientForm.firstName} onChange={e => setNewPatientForm({...newPatientForm, firstName: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Apellido</label><input required type="text" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50" value={newPatientForm.lastName} onChange={e => setNewPatientForm({...newPatientForm, lastName: e.target.value})} /></div>
              </div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">DNI</label><input type="text" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50" value={newPatientForm.dni} onChange={e => setNewPatientForm({...newPatientForm, dni: e.target.value})} /></div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Teléfono</label><input type="tel" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50" value={newPatientForm.phone} onChange={e => setNewPatientForm({...newPatientForm, phone: e.target.value})} /></div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label><input type="email" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50" value={newPatientForm.email} onChange={e => setNewPatientForm({...newPatientForm, email: e.target.value})} /></div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Obra Social</label><input type="text" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50" value={newPatientForm.insurance} onChange={e => setNewPatientForm({...newPatientForm, insurance: e.target.value})} /></div>
              
              <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Historia Clínica / Notas Iniciales</label>
                  <textarea 
                      className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50" 
                      rows={4}
                      value={newPatientForm.notes} 
                      onChange={e => setNewPatientForm({...newPatientForm, notes: e.target.value})} 
                      placeholder="Ingrese antecedentes, motivo de consulta inicial, etc."
                  />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowNewPatientModal(false)} className="px-4 py-2 text-gray-500 hover:text-gray-800 font-medium">Cancelar</button>
                <button type="submit" className="bg-gray-900 text-white px-6 py-2 rounded-xl font-bold hover:bg-black shadow-lg">Crear Paciente</button>
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