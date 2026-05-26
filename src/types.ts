export interface Worker {
  id: string;
  name: string;
  dailyRate: number;
  otRate: number;
  siteId: string; // The site the worker is registered to
  createdAt: string;
  paymentCycle: 'daily' | 'weekly' | 'monthly'; // Payroll cycle
  archived?: boolean; // Archived toggle status
  phone?: string;
  nationalId?: string;
  notes?: string;
  avatarEmoji?: string;
}

export interface AttendanceRecord {
  date: string; // "YYYY-MM-DD"
  workerId: string;
  isPresent: boolean;
  otHours: number;
  advance: number;
  notes: string;
}

export interface PaymentRecord {
  id: string;
  workerId: string;
  amount: number;
  date: string; // "YYYY-MM-DD"
  notes?: string;
  isSettlement?: boolean;
}

export interface WorkSite {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface AppSettings {
  pinEnabled: boolean;
  pinCode: string; // Default: '1234'
  darkMode: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  defaultDailyRate: number;
  defaultOvertimeRate: number;
}
