export enum AppointmentStatus {
  PENDING = 'Pendiente',
  CONFIRMED = 'Confirmado',
  COMPLETED = 'Completado',
  CANCELLED = 'Cancelado'
}

export enum PaymentMethod {
  CASH = 'Efectivo',
  TRANSFER = 'Transferencia',
  INSURANCE = 'Obra Social/Prepaga',
  CARD = 'Tarjeta de Crédito/Débito',
  PENDING = 'Pendiente'
}

export enum PaymentStatus {
  PAID = 'Pagado',
  UNPAID = 'No Pagado',
  PARTIAL = 'Parcial'
}

export interface PatientProfile {
  id: string; // Matches appointment patientId
  firstName: string;
  lastName: string;
  dni: string;
  phone?: string; // Added for manual registration
  email?: string; // Added for manual registration
  birthDate: string;
  insurance: string; // Obra Social
  diagnosis: string;
  notes: string;
}

export interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface Appointment {
  id: string;
  patientId: string; // Linking to Patient
  patientName: string; // Denormalized for simpler list view
  patientPhone?: string;
  date: string; // ISO Date YYYY-MM-DD
  time: string; // HH:mm
  status: AppointmentStatus;
  notes?: string; // Patient provided notes
  clinicalObservations?: string; // Doctor's clinical notes
  cost: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
}

export interface WorkingHours {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  isEnabled: boolean; // Is the doctor working this day?
  // We keep start/end for backward compat or simple summaries, 
  // but activeHours is the source of truth for the DVR grid
  activeHours: number[]; // e.g. [9, 10, 11, 16, 17, 18]
}

export interface DayStats {
  date: string;
  totalAppointments: number;
  totalIncome: number;
}

export interface ProfessionalConfig {
  name: string;
  specialty: string;
  address: string;
}