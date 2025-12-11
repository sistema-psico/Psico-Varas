import { Appointment, AppointmentStatus, PaymentMethod, PaymentStatus, WorkingHours, PatientProfile } from '../types';
import { db } from '../firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc, 
  setDoc,
  query
} from 'firebase/firestore';

const HOLIDAYS = [
  '2024-01-01', '2024-02-12', '2024-02-13', '2024-03-24', '2024-03-29', '2024-04-02', 
  '2024-05-01', '2024-05-25', '2024-06-17', '2024-06-20', '2024-07-09', '2024-08-17', 
  '2024-10-12', '2024-11-20', '2024-12-08', '2024-12-25',
  '2025-01-01', '2025-03-03', '2025-03-04', '2025-03-24' 
];

const INITIAL_SCHEDULE: WorkingHours[] = [
  { dayOfWeek: 1, isEnabled: true, activeHours: [14, 15, 16, 17, 18, 19] },
  { dayOfWeek: 2, isEnabled: true, activeHours: [9, 10, 11, 12, 14, 15, 16, 17] },
  { dayOfWeek: 3, isEnabled: false, activeHours: [] },
  { dayOfWeek: 4, isEnabled: true, activeHours: [9, 10, 11, 12, 14, 15, 16, 17] },
  { dayOfWeek: 5, isEnabled: true, activeHours: [9, 10, 11, 12, 13, 14, 15] },
  { dayOfWeek: 6, isEnabled: false, activeHours: [] },
  { dayOfWeek: 0, isEnabled: false, activeHours: [] },
];

export interface ProfessionalProfile {
  name: string;
  specialty: string;
  address: string;
}

export const DataService = {
  getArgentineHolidays: (): string[] => HOLIDAYS,

  isHoliday: (dateStr: string): boolean => HOLIDAYS.includes(dateStr),

  // --- HORARIOS ---
  getScheduleConfig: async (): Promise<WorkingHours[]> => {
    try {
      const docRef = doc(db, 'settings', 'schedule');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().hours as WorkingHours[];
      }
      await setDoc(docRef, { hours: INITIAL_SCHEDULE });
      return INITIAL_SCHEDULE;
    } catch (e) {
      console.error("Error fetching schedule:", e);
      return INITIAL_SCHEDULE;
    }
  },

  saveScheduleConfig: async (schedule: WorkingHours[]): Promise<void> => {
    await setDoc(doc(db, 'settings', 'schedule'), { hours: schedule });
  },

  // --- TURNOS ---
  getAppointments: async (): Promise<Appointment[]> => {
    try {
      const q = query(collection(db, 'appointments'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
    } catch (e) {
      console.error("Error getting appointments:", e);
      return [];
    }
  },

  addAppointment: async (appt: Omit<Appointment, 'id'>): Promise<Appointment> => {
    try {
      const docRef = await addDoc(collection(db, 'appointments'), appt);
      return { id: docRef.id, ...appt };
    } catch (e) {
      console.error("Error adding appointment:", e);
      throw e;
    }
  },

  updateAppointment: async (id: string, updates: Partial<Appointment>): Promise<Appointment[]> => {
    try {
      const apptRef = doc(db, 'appointments', id);
      await updateDoc(apptRef, updates);
      return await DataService.getAppointments(); 
    } catch (e) {
      console.error("Error updating appointment:", e);
      return [];
    }
  },

  deleteAppointment: async (id: string): Promise<Appointment[]> => {
    try {
      await deleteDoc(doc(db, 'appointments', id));
      return await DataService.getAppointments();
    } catch (e) {
      console.error("Error deleting appointment:", e);
      return [];
    }
  },

  // --- PERFILES PACIENTES ---
  getPatientProfile: async (id: string): Promise<PatientProfile | null> => {
    try {
      const docRef = doc(db, 'patients', id);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? ({ id: docSnap.id, ...docSnap.data() } as PatientProfile) : null;
    } catch (e) {
      console.error("Error fetching patient:", e);
      return null;
    }
  },

  getAllPatientProfiles: async (): Promise<Record<string, PatientProfile>> => {
    try {
      const querySnapshot = await getDocs(collection(db, 'patients'));
      const profiles: Record<string, PatientProfile> = {};
      querySnapshot.forEach(doc => {
        profiles[doc.id] = { id: doc.id, ...doc.data() } as PatientProfile;
      });
      return profiles;
    } catch (e) {
      console.error("Error fetching profiles:", e);
      return {};
    }
  },

  savePatientProfile: async (profile: PatientProfile): Promise<void> => {
    await setDoc(doc(db, 'patients', profile.id), profile);
  },

  // --- CONFIGURACIÓN GENERAL (PERFIL PROFESIONAL) ---
  
  getProfessionalProfile: async (): Promise<ProfessionalProfile> => {
    try {
      const docRef = doc(db, 'settings', 'profile');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          name: data.name || 'Lic. Gabriel Medina',
          specialty: data.specialty || 'Psicología Clínica',
          address: data.address || 'Av. Corrientes 1234, Piso 5, CABA'
        };
      }
      return {
        name: 'Lic. Gabriel Medina',
        specialty: 'Psicología Clínica',
        address: 'Av. Corrientes 1234, Piso 5, CABA'
      };
    } catch (e) {
      return {
        name: 'Lic. Gabriel Medina',
        specialty: 'Psicología Clínica',
        address: 'Av. Corrientes 1234, Piso 5, CABA'
      };
    }
  },

  saveProfessionalProfile: async (profile: ProfessionalProfile): Promise<void> => {
    await setDoc(doc(db, 'settings', 'profile'), profile, { merge: true });
  },

  // --- LÓGICA DE TURNOS ---
  getAvailableSlots: async (dateStr: string): Promise<string[]> => {
    if (DataService.isHoliday(dateStr)) return [];

    const date = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = date.getDay();
    
    const schedule = await DataService.getScheduleConfig();
    const config = schedule.find(s => s.dayOfWeek === dayOfWeek);

    if (!config || !config.isEnabled) return [];

    const allAppointments = await DataService.getAppointments();
    const takenTimes = allAppointments
      .filter(a => a.date === dateStr && a.status !== AppointmentStatus.CANCELLED)
      .map(a => a.time);

    const slots: string[] = [];
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
