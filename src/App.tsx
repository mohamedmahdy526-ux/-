import { useState, useEffect } from 'react';
import { useUIFeedback } from './components/UIFeedbackProvider';
import { 
  Worker, 
  AttendanceRecord, 
  WorkSite, 
  AppSettings,
  PaymentRecord
} from './types';
import { 
  INITIAL_SITES, 
  INITIAL_WORKERS, 
  INITIAL_ATTENDANCE, 
  INITIAL_SETTINGS 
} from './initialData';

// Component Views
import Dashboard from './components/Dashboard';
import WorkersList from './components/WorkersList';
import AttendanceTracker from './components/AttendanceTracker';
import Reports from './components/Reports';
import SitesList from './components/SitesList';
import SettingsPanel from './components/SettingsPanel';
import PinLockModal from './components/PinLockModal';

// Icons
import { 
  LayoutDashboard, 
  Users, 
  ClipboardList, 
  FileSpreadsheet, 
  HardHat, 
  Settings as SettingsIcon,
  Lock, 
  Unlock,
  AlertCircle
} from 'lucide-react';

export default function App() {
  // --- Date Initialization Helpers ---
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getYesterdayString = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayString();
  const yesterdayStr = getYesterdayString();

  // --- Core States ---
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [sites, setSites] = useState<WorkSite[]>([]);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [activeTab, setActiveTab] = useState<string>('dashboardTab');
  const [isAppLocked, setIsAppLocked] = useState<boolean>(false);
  const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);

  // --- Load Local Storage Data ---
  useEffect(() => {
    try {
      // 1. Settings
      const savedSettings = localStorage.getItem('construction_settings_v3');
      let currentSettings = INITIAL_SETTINGS;
      if (savedSettings) {
        currentSettings = { ...INITIAL_SETTINGS, ...JSON.parse(savedSettings) };
        setSettings(currentSettings);
      }

      // 2. Work Sites
      const savedSites = localStorage.getItem('construction_sites_v3');
      if (savedSites) {
        setSites(JSON.parse(savedSites));
      } else {
        setSites(INITIAL_SITES);
        localStorage.setItem('construction_sites_v3', JSON.stringify(INITIAL_SITES));
      }

      // 3. Workers List
      const savedWorkers = localStorage.getItem('construction_workers_v3');
      if (savedWorkers) {
        setWorkers(JSON.parse(savedWorkers));
      } else {
        setWorkers(INITIAL_WORKERS);
        localStorage.setItem('construction_workers_v3', JSON.stringify(INITIAL_WORKERS));
      }

      // 4. Attendance list
      const savedAttendance = localStorage.getItem('construction_attendance_v3');
      if (savedAttendance) {
        setAttendance(JSON.parse(savedAttendance));
      } else {
        const dummyAttendance = INITIAL_ATTENDANCE(todayStr, yesterdayStr);
        setAttendance(dummyAttendance);
        localStorage.setItem('construction_attendance_v3', JSON.stringify(dummyAttendance));
      }

      // 5. Payments List
      const savedPayments = localStorage.getItem('construction_payments_v3');
      if (savedPayments) {
        setPayments(JSON.parse(savedPayments));
      } else {
        setPayments([]);
        localStorage.setItem('construction_payments_v3', JSON.stringify([]));
      }

      // If PIN is enabled, lock app on start
      if (currentSettings.pinEnabled) {
        setIsAppLocked(true);
      }
      
      setIsDataLoaded(true);
    } catch (err) {
      console.error('Failed to load local storage data', err);
      // Fallback fallback recovery
      setSites(INITIAL_SITES);
      setWorkers(INITIAL_WORKERS);
      setAttendance(INITIAL_ATTENDANCE(todayStr, yesterdayStr));
      setPayments([]);
      setSettings(INITIAL_SETTINGS);
      setIsDataLoaded(true);
    }
  }, []);

  // --- Save to Local Storage ---
  useEffect(() => {
    if (!isDataLoaded) return;
    localStorage.setItem('construction_settings_v3', JSON.stringify(settings));
  }, [settings, isDataLoaded]);

  useEffect(() => {
    if (!isDataLoaded) return;
    localStorage.setItem('construction_sites_v3', JSON.stringify(sites));
  }, [sites, isDataLoaded]);

  useEffect(() => {
    if (!isDataLoaded) return;
    localStorage.setItem('construction_workers_v3', JSON.stringify(workers));
  }, [workers, isDataLoaded]);

  useEffect(() => {
    if (!isDataLoaded) return;
    localStorage.setItem('construction_attendance_v3', JSON.stringify(attendance));
  }, [attendance, isDataLoaded]);

  useEffect(() => {
    if (!isDataLoaded) return;
    localStorage.setItem('construction_payments_v3', JSON.stringify(payments));
  }, [payments, isDataLoaded]);

  // --- Theme Controller ---
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  // --- Application Handlers ---
  const handleAddWorker = (
    name: string,
    dailyRate: number,
    otRate: number,
    siteId: string,
    paymentCycle: 'daily' | 'weekly' | 'monthly' = 'daily',
    phone?: string,
    nationalId?: string,
    notes?: string
  ) => {
    const newWorker: Worker = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
      name,
      dailyRate,
      otRate,
      siteId,
      createdAt: new Date().toISOString(),
      paymentCycle,
      archived: false,
      phone,
      nationalId,
      notes
    };
    setWorkers(prev => [...prev, newWorker]);
  };

  const handleEditWorker = (
    id: string,
    name: string,
    dailyRate: number,
    otRate: number,
    siteId: string,
    paymentCycle?: 'daily' | 'weekly' | 'monthly',
    phone?: string,
    nationalId?: string,
    notes?: string
  ) => {
    setWorkers(prev => prev.map(w => 
      w.id === id 
        ? { 
            ...w, 
            name, 
            dailyRate, 
            otRate, 
            siteId, 
            ...(paymentCycle ? { paymentCycle } : {}),
            phone,
            nationalId,
            notes
          } 
        : w
    ));
  };

  const handleArchiveWorker = (id: string) => {
    setWorkers(prev => prev.map(w => 
      w.id === id ? { ...w, archived: true } : w
    ));
  };

  const handleRestoreWorker = (id: string) => {
    setWorkers(prev => prev.map(w => 
      w.id === id ? { ...w, archived: false } : w
    ));
  };

  const handleDeleteWorker = (id: string) => {
    setWorkers(prev => prev.filter(w => w.id !== id));
    // Prune corresponding attendance/payments records as well
    setAttendance(prev => prev.filter(r => r.workerId !== id));
    // Support correct v3 backup keys on reset in a later step
    setPayments(prev => prev.filter(p => p.workerId !== id));
  };

  const handleAddPayment = (workerId: string, amount: number, date: string, notes?: string, isSettlement?: boolean) => {
    const newPayment: PaymentRecord = {
      id: "pay-" + Date.now().toString() + Math.random().toString(36).substring(2, 4),
      workerId,
      amount,
      date,
      notes,
      isSettlement
    };
    setPayments(prev => [...prev, newPayment]);
  };

  const handleDeletePayment = (paymentId: string) => {
    setPayments(prev => prev.filter(p => p.id !== paymentId));
  };

  const handleAddSite = (name: string, description: string) => {
    const newSite: WorkSite = {
      id: "site-" + Date.now().toString(),
      name,
      description,
      createdAt: new Date().toISOString()
    };
    setSites(prev => [...prev, newSite]);
  };

  const handleDeleteSite = (siteId: string) => {
    // Delete target site
    setSites(prev => prev.filter(s => s.id !== siteId));
    // Move any workers associated with this site to the 'default' main site seamlessly
    setWorkers(prev => prev.map(w => 
      w.siteId === siteId 
        ? { ...w, siteId: 'default' } 
        : w
    ));
  };

  // Add hook
  const { showToast, showConfirm } = useUIFeedback();

  // Smart feature: Copy status from yesterday
  const handleCopyYesterday = () => {
    // Collect active attendance records for yesterday
    const recordsYesterday = attendance.filter(r => r.date === yesterdayStr);
    
    if (recordsYesterday.length === 0) {
      showToast('لا توجد سجلات حضور مسجلة ليوم أمس في قاعدة البيانات لنسخها!', 'error');
      return;
    }

    setAttendance(prev => {
      // 1. Remove any pre-existing records for Today
      const filtered = prev.filter(r => r.date !== selectedDate);
      
      // 2. Copy yesterday's record states to today, initializing OTs and advances back to 0
      const copied = recordsYesterday.map(r => ({
        date: selectedDate,
        workerId: r.workerId,
        isPresent: r.isPresent,
        otHours: 0,
        advance: 0,
        notes: `نسخ مجمّع من كشف أمس`
      }));

      return [...filtered, ...copied];
    });

    showToast('تم نسخ حالة الحضور لليوم بنجاح! تم تعيين ساعات الإضافي والسلف إلى صفر في الوردية الجديدة.', 'success');
  };

  // Reset entire application database
  const handleResetAppData = () => {
    localStorage.removeItem('construction_settings_v3');
    localStorage.removeItem('construction_sites_v3');
    localStorage.removeItem('construction_workers_v3');
    localStorage.removeItem('construction_attendance_v3');
    localStorage.removeItem('construction_payments_v3');

    setWorkers(INITIAL_WORKERS);
    setSites(INITIAL_SITES);
    setAttendance(INITIAL_ATTENDANCE(todayStr, yesterdayStr));
    setPayments([]);
    setSettings(INITIAL_SETTINGS);
    setSelectedDate(todayStr);
    setActiveTab('dashboardTab');
    setIsAppLocked(false);
    showToast('تمت إعادة ضبط المصنع ومسح كافة الكشوفات والنسخ المحلية بنجاح.', 'info');
  };

  // Lockscreen manual click trigger
  const triggerManualLock = () => {
    if (settings.pinEnabled) {
      setIsAppLocked(true);
    } else {
      showToast('يرجى تمكين القفل الأمني السري من الإعدادات أولاً لإغلاق شاشتك!', 'warning');
    }
  };

  // Active tabbing layout compiler
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboardTab':
        return (
          <Dashboard
            workers={workers}
            attendance={attendance}
            sites={sites}
            payments={payments}
            selectedDate={selectedDate}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onCopyYesterday={handleCopyYesterday}
            onQuickAddWorker={() => setActiveTab('workersTab')}
          />
        );
      case 'workersTab':
        return (
          <WorkersList
            workers={workers}
            setWorkers={setWorkers}
            sites={sites}
            payments={payments}
            attendance={attendance}
            settings={settings}
            onAddWorker={handleAddWorker}
            onEditWorker={handleEditWorker}
            onDeleteWorker={handleDeleteWorker}
            onArchiveWorker={handleArchiveWorker}
            onRestoreWorker={handleRestoreWorker}
            onAddPayment={handleAddPayment}
            onDeletePayment={handleDeletePayment}
          />
        );
      case 'attendanceTab':
        return (
          <AttendanceTracker
            workers={workers}
            attendance={attendance}
            setAttendance={setAttendance}
            sites={sites}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            onCopyYesterday={handleCopyYesterday}
          />
        );
      case 'reportsTab':
        return (
          <Reports
            workers={workers}
            attendance={attendance}
            sites={sites}
            payments={payments}
            selectedDate={selectedDate}
            onAddPayment={handleAddPayment}
            onDeletePayment={handleDeletePayment}
          />
        );
      case 'sitesTab':
        return (
          <SitesList
            sites={sites}
            setSites={setSites}
            workers={workers}
            setWorkers={setWorkers}
            onAddSite={handleAddSite}
            onDeleteSite={handleDeleteSite}
          />
        );
      case 'settingsTab':
        return (
          <SettingsPanel
            settings={settings}
            setSettings={setSettings}
            workers={workers}
            setWorkers={setWorkers}
            attendance={attendance}
            setAttendance={setAttendance}
            sites={sites}
            setSites={setSites}
            onResetAppData={handleResetAppData}
          />
        );
      default:
        return null;
    }
  };

  // Apply typography classes based on Settings state
  const getFontSizeClass = () => {
    switch (settings.fontSize) {
      case 'small': return 'text-xs md:text-xs [&_*]:text-xs';
      case 'medium': return 'text-sm md:text-sm';
      case 'large': return 'text-base md:text-base';
      case 'xlarge': return 'text-lg md:text-lg';
      default: return 'text-sm';
    }
  };

  if (!isDataLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 text-center">
        <div className="space-y-4">
          <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-extrabold text-slate-700 dark:text-slate-300">جاري تحميل سجلات نظام الرواتب اليومية...</p>
        </div>
      </div>
    );
  }

  // Render Custom PIN Pad lockscreen overlay if locked
  if (isAppLocked) {
    return (
      <PinLockModal
        correctPin={settings.pinCode}
        onSuccess={() => setIsAppLocked(false)}
      />
    );
  }

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors pb-24 ${getFontSizeClass()}`} dir="rtl">
      {/* Centered Mobile-first responsive containment bar */}
      <div className="max-w-[620px] mx-auto bg-slate-50 dark:bg-slate-900 min-h-screen shadow-2xl shadow-slate-300/10 dark:shadow-none flex flex-col">
        
        {/* Main Sticky Title Header */}
        <header className="bg-white dark:bg-slate-800 px-5 py-4 border-b border-slate-100 dark:border-slate-700/50 sticky top-0 z-40 flex items-center justify-between shadow-sm">
          <div className="space-y-0.5">
            <h1 className="text-lg font-black text-sky-600 dark:text-sky-400 flex items-center gap-1.5 font-sans">
              🏗️ المهتدي للمقاولات
            </h1>
            <p className="text-[10px] text-slate-400 dark:text-slate-400 font-bold flex items-center gap-1">
              <span>نظام الرواتب وتسيير الحضور والورش</span>
              <span>•</span>
              <span className="text-slate-500">{selectedDate}</span>
            </p>
          </div>

          {/* Quick Lock option lock toggler */}
          {settings.pinEnabled && (
            <button
              onClick={triggerManualLock}
              className="p-2.5 bg-sky-50 hover:bg-sky-100 dark:bg-slate-700 rounded-2xl text-sky-600 dark:text-sky-450 border border-sky-100 dark:border-transparent transition transform active:scale-95 cursor-pointer flex items-center gap-1 text-[10px] font-bold"
              title="إغلاق فوري للشاشة لحماية البيانات"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>قفل الكشف</span>
            </button>
          )}
        </header>

        {/* Dynamic Interactive Render Region */}
        <main className="flex-1 p-4 space-y-4">
          {renderTabContent()}
        </main>

        {/* Bottom Navigation drawer items */}
        <nav className="fixed bottom-0 left-0 right-0 max-w-[620px] mx-auto bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-700/50 p-2 grid grid-cols-6 gap-1 z-30 shadow-lg">
          
          {/* 1. Dashboard */}
          <button
            onClick={() => setActiveTab('dashboardTab')}
            className={`flex flex-col items-center justify-center py-2.5 rounded-2xl transition cursor-pointer ${
              activeTab === 'dashboardTab'
                ? 'text-sky-600 dark:text-sky-400 font-extrabold bg-sky-500/5'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-1" />
            <span className="text-[9px] block">لوحة التحكم</span>
          </button>

          {/* 2. Workers */}
          <button
            onClick={() => setActiveTab('workersTab')}
            className={`flex flex-col items-center justify-center py-2.5 rounded-2xl transition cursor-pointer ${
              activeTab === 'workersTab'
                ? 'text-sky-600 dark:text-sky-400 font-extrabold bg-sky-500/5'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Users className="w-5 h-5 mb-1" />
            <span className="text-[9px] block">كشف العمال</span>
          </button>

          {/* 3. Daily Attendance Tracker */}
          <button
            onClick={() => setActiveTab('attendanceTab')}
            className={`flex flex-col items-center justify-center py-2.5 rounded-2xl transition cursor-pointer ${
              activeTab === 'attendanceTab'
                ? 'text-sky-600 dark:text-sky-400 font-extrabold bg-sky-500/5'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <ClipboardList className="w-5 h-5 mb-1" />
            <span className="text-[9px] block">دفتر التحضير</span>
          </button>

          {/* 4. Reports database */}
          <button
            onClick={() => setActiveTab('reportsTab')}
            className={`flex flex-col items-center justify-center py-2.5 rounded-2xl transition cursor-pointer ${
              activeTab === 'reportsTab'
                ? 'text-sky-600 dark:text-sky-400 font-extrabold bg-sky-500/5'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <FileSpreadsheet className="w-5 h-5 mb-1" />
            <span className="text-[9px] block">الأجور والتقارير</span>
          </button>

          {/* 5. Construction sites */}
          <button
            onClick={() => setActiveTab('sitesTab')}
            className={`flex flex-col items-center justify-center py-2.5 rounded-2xl transition cursor-pointer ${
              activeTab === 'sitesTab'
                ? 'text-sky-600 dark:text-sky-400 font-extrabold bg-sky-500/5'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <HardHat className="w-5 h-5 mb-1" />
            <span className="text-[9px] block">مواقع المشروعات</span>
          </button>

          {/* 6. Settings */}
          <button
            onClick={() => setActiveTab('settingsTab')}
            className={`flex flex-col items-center justify-center py-2.5 rounded-2xl transition cursor-pointer ${
              activeTab === 'settingsTab'
                ? 'text-sky-600 dark:text-sky-400 font-extrabold bg-sky-500/5'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <SettingsIcon className="w-5 h-5 mb-1" />
            <span className="text-[9px] block">الإعدادات</span>
          </button>

        </nav>

      </div>
    </div>
  );
}
