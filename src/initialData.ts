import { Worker, WorkSite, AttendanceRecord, AppSettings } from './types';

export const INITIAL_SITES: WorkSite[] = [
  {
    id: 'default',
    name: 'موقع المشروع الرئيسي 🏗️',
    description: 'العاصمة الإدارية الجديدة - الحي السكني الثالث',
    createdAt: new Date().toISOString()
  },
  {
    id: 'site-2',
    name: 'موقع التجمع الخامس 📍',
    description: 'كمبوند النرجس - فيلا 41',
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_WORKERS: Worker[] = [
  { id: '1', name: 'أحمد محمود (أبو فارس)', dailyRate: 290, otRate: 38, siteId: 'default', createdAt: new Date().toISOString(), paymentCycle: 'daily', archived: false },
  { id: '2', name: 'محمود عبد العزيز (عم أحمد)', dailyRate: 150, otRate: 20, siteId: 'default', createdAt: new Date().toISOString(), paymentCycle: 'daily', archived: false },
  { id: '3', name: 'أبو أنس السوهاجي', dailyRate: 290, otRate: 38, siteId: 'default', createdAt: new Date().toISOString(), paymentCycle: 'daily', archived: false },
  { id: '4', name: 'جاسر محمد علي', dailyRate: 290, otRate: 38, siteId: 'default', createdAt: new Date().toISOString(), paymentCycle: 'daily', archived: false },
  { id: '5', name: 'علي الشناوي المقاول', dailyRate: 350, otRate: 45, siteId: 'site-2', createdAt: new Date().toISOString(), paymentCycle: 'weekly', archived: false },
  { id: '6', name: 'كريم حسن الديزل', dailyRate: 200, otRate: 25, siteId: 'site-2', createdAt: new Date().toISOString(), paymentCycle: 'daily', archived: false }
];

export const INITIAL_ATTENDANCE = (today: string, yesterday: string): AttendanceRecord[] => [
  { date: today, workerId: '1', isPresent: true, otHours: 2, advance: 50, notes: 'بدأ مع الوردية الصباحية' },
  { date: today, workerId: '2', isPresent: true, otHours: 0, advance: 0, notes: '' },
  { date: today, workerId: '3', isPresent: true, otHours: 1.5, advance: 20, notes: 'إضافي عمل بالسطح' },
  { date: today, workerId: '4', isPresent: false, otHours: 0, advance: 0, notes: 'غياب بدون إذن' },
  { date: today, workerId: '5', isPresent: true, otHours: 0, advance: 100, notes: 'طلب سلفة للمواصلات' },
  
  // Yesterday backup records
  { date: yesterday, workerId: '1', isPresent: true, otHours: 1, advance: 0, notes: '' },
  { date: yesterday, workerId: '2', isPresent: true, otHours: 0, advance: 20, notes: '' },
  { date: yesterday, workerId: '3', isPresent: true, otHours: 2, advance: 0, notes: '' },
  { date: yesterday, workerId: '4', isPresent: true, otHours: 0, advance: 0, notes: '' },
  { date: yesterday, workerId: '5', isPresent: true, otHours: 3, advance: 50, notes: '' }
];

export const INITIAL_SETTINGS: AppSettings = {
  pinEnabled: false,
  pinCode: '1234',
  darkMode: false,
  fontSize: 'medium',
  defaultDailyRate: 250,
  defaultOvertimeRate: 35
};
