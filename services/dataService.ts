import { Appointment, AppointmentStatus, PaymentMethod, PaymentStatus, WorkingHours, PatientProfile, ProfessionalConfig } from '../types';

// Argentine Holidays 2024-2025 (Simplified List)
const HOLIDAYS = [
  '2024-01-01', '2024-02-12', '2024-02-13', '2024-03-24', '2024-03-29', '2024-04-02', 
  '2024-05-01', '2024-05-25', '2024-06-17', '2024-06-20', '2024-07-09', '2024-08-17', 
  '2024-10-12', '2024-11-20', '2024-12-08', '2024-12-25',
  '2025-01-01', '2025-03-03', '2025-03-04', '2025-03-24' 
];

// Initial Mock Data
const INITIAL_SCHEDULE: WorkingHours[] = [
  { dayOfWeek: 1, isEnabled: true, activeHours: [14, 15, 16, 17, 18, 19] }, // Mon
  { dayOfWeek: 2, isEnabled: true, activeHours: [9, 10, 11, 12, 14, 15, 16, 17] }, // Tue
  { dayOfWeek: 3, isEnabled: false, activeHours: [] }, // Wed
  { dayOfWeek: 4, isEnabled: true, activeHours: [9, 10, 11, 12, 14, 15, 16, 17] }, // Thu
  { dayOfWeek: 5, isEnabled: true, activeHours: [9, 10, 11, 12, 13, 14, 15] }, // Fri
  { dayOfWeek: 6, isEnabled: false, activeHours: [] }, // Sat
  { dayOfWeek: 0, isEnabled: false, activeHours: [] }, // Sun
];

const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: '1',
    patientId: 'p1',
    patientName: 'Juan Pérez',
    patientPhone: '1122334455',
    date: new Date().toISOString().split('T')[0],
    time: '15:00',
    status: AppointmentStatus.CONFIRMED,
    cost: 5000,
    paymentStatus: PaymentStatus.UNPAID,
    paymentMethod: PaymentMethod.PENDING
  },
  {
    id: '2',
    patientId: 'p2',
    patientName: 'María García',
    date: new Date().toISOString().split('T')[0],
    time: '16:00',
    status: AppointmentStatus.COMPLETED,
    cost: 5000,
    paymentStatus: PaymentStatus.PAID,
    paymentMethod: PaymentMethod.CASH
  }
];

// Local Storage Keys
const KEYS = {
  APPOINTMENTS: 'psico_appointments',
  SCHEDULE: 'psico_schedule',
  PATIENTS: 'psico_patients', // New key for profiles
  CONFIG: 'psico_config' // New key for general config
};

// Helper to simulate delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const DEFAULT_CONFIG: ProfessionalConfig = {
  name: 'Lic. Gabriel Medina',
  specialty: 'Psicología Clínica',
  address: 'Av. Corrientes 1234, Piso 5, CABA'
};

export const DataService = {
  getArgentineHolidays: (): string[] => {
    return HOLIDAYS;
  },

  isHoliday: (dateStr: string): boolean => {
    return HOLIDAYS.includes(dateStr);
  },

  getScheduleConfig: async (): Promise<WorkingHours[]> => {
    const stored = localStorage.getItem(KEYS.SCHEDULE);
    if (stored) return JSON.parse(stored);
    return INITIAL_SCHEDULE;
  },

  saveScheduleConfig: async (schedule: WorkingHours[]): Promise<void> => {
    localStorage.setItem(KEYS.SCHEDULE, JSON.stringify(schedule));
  },

  getAppointments: async (): Promise<Appointment[]> => {
    const stored = localStorage.getItem(KEYS.APPOINTMENTS);
    if (stored) return JSON.parse(stored);
    return INITIAL_APPOINTMENTS;
  },

  addAppointment: async (appt: Omit<Appointment, 'id'>): Promise<Appointment> => {
    await delay(500); // Simulate network
    const appointments = await DataService.getAppointments();
    const newAppt: Appointment = {
      ...appt,
      id: Math.random().toString(36).substr(2, 9)
    };
    appointments.push(newAppt);
    localStorage.setItem(KEYS.APPOINTMENTS, JSON.stringify(appointments));
    return newAppt;
  },

  updateAppointment: async (id: string, updates: Partial<Appointment>): Promise<Appointment[]> => {
    const appointments = await DataService.getAppointments();
    const index = appointments.findIndex(a => a.id === id);
    if (index !== -1) {
      appointments[index] = { ...appointments[index], ...updates };
      localStorage.setItem(KEYS.APPOINTMENTS, JSON.stringify(appointments));
    }
    return appointments;
  },

  deleteAppointment: async (id: string): Promise<Appointment[]> => {
    const appointments = await DataService.getAppointments();
    const filtered = appointments.filter(a => a.id !== id);
    localStorage.setItem(KEYS.APPOINTMENTS, JSON.stringify(filtered));
    return filtered;
  },

  // Patient Profile Management
  getPatientProfile: async (id: string): Promise<PatientProfile | null> => {
    const stored = localStorage.getItem(KEYS.PATIENTS);
    const profiles: Record<string, PatientProfile> = stored ? JSON.parse(stored) : {};
    return profiles[id] || null;
  },

  getAllPatientProfiles: async (): Promise<Record<string, PatientProfile>> => {
    const stored = localStorage.getItem(KEYS.PATIENTS);
    return stored ? JSON.parse(stored) : {};
  },

  savePatientProfile: async (profile: PatientProfile): Promise<void> => {
    const stored = localStorage.getItem(KEYS.PATIENTS);
    const profiles: Record<string, PatientProfile> = stored ? JSON.parse(stored) : {};
    profiles[profile.id] = profile;
    localStorage.setItem(KEYS.PATIENTS, JSON.stringify(profiles));
  },

  // General Configuration (Professional Profile)
  getProfessionalConfig: async (): Promise<ProfessionalConfig> => {
    const stored = localStorage.getItem(KEYS.CONFIG);
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
    return DEFAULT_CONFIG;
  },

  saveProfessionalConfig: async (config: ProfessionalConfig): Promise<void> => {
    localStorage.setItem(KEYS.CONFIG, JSON.stringify(config));
  },

  // Logic to generate available slots based on configuration
  getAvailableSlots: async (dateStr: string): Promise<string[]> => {
    if (DataService.isHoliday(dateStr)) return [];

    const date = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = date.getDay();
    const schedule = await DataService.getScheduleConfig();
    const config = schedule.find(s => s.dayOfWeek === dayOfWeek);

    if (!config || !config.isEnabled) return [];

    // Fetch existing appointments for that day to exclude them
    const allAppointments = await DataService.getAppointments();
    const takenTimes = allAppointments
      .filter(a => a.date === dateStr && a.status !== AppointmentStatus.CANCELLED)
      .map(a => a.time);

    const slots: string[] = [];
    
    // Sort active hours to ensure order
    const sortedHours = (config.activeHours || []).sort((a,b) => a - b);

    for (const hour of sortedHours) {
      const timeStr = `${hour.toString().padStart(2, '0')}:00`;
      if (!takenTimes.includes(timeStr)) {
        slots.push(timeStr);
      }
    }

    return slots;
  }
};