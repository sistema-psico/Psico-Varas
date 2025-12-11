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
  id: string; 
  firstName: string;
  lastName: string;
  dni: string;
  phone: string; // NUEVO CAMPO
  birthDate: string;
  insurance: string;
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
  patientId: string;
  patientName: string;
  patientPhone?: string;
  date: string; // ISO Date YYYY-MM-DD
  time: string; // HH:mm
  status: AppointmentStatus;
  notes?: string; // Motivo de consulta (del paciente)
  clinicalObservations?: string; // Notas del doctor
  cost: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
}

export interface WorkingHours {
  dayOfWeek: number;
  isEnabled: boolean;
  activeHours: number[];
}

export interface DayStats {
  date: string;
  totalAppointments: number;
  totalIncome: number;
}
