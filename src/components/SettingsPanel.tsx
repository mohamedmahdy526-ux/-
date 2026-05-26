import React, { useState, useRef } from 'react';
import { AppSettings, Worker, AttendanceRecord, WorkSite } from '../types';
import { useUIFeedback } from './UIFeedbackProvider';
import { 
  Settings, Lock, Moon, Sun, Type, Download, Upload, ShieldCheck, Heart, 
  Info, RefreshCw, DollarSign, Clock, Users, Check 
} from 'lucide-react';

interface SettingsPanelProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  workers: Worker[];
  setWorkers: React.Dispatch<React.SetStateAction<Worker[]>>;
  attendance: AttendanceRecord[];
  setAttendance: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  sites: WorkSite[];
  setSites: React.Dispatch<React.SetStateAction<WorkSite[]>>;
  onResetAppData: () => void;
}

export default function SettingsPanel({
  settings,
  setSettings,
  workers,
  setWorkers,
  attendance,
  setAttendance,
  sites,
  setSites,
  onResetAppData
}: SettingsPanelProps) {
  const { showToast, showConfirm } = useUIFeedback();

  const [editingPin, setEditingPin] = useState(false);
  const [pinInput, setPinInput] = useState(settings.pinCode);
  const [pinError, setPinError] = useState('');
  
  // Salary default states
  const [tempDailyRate, setTempDailyRate] = useState<number>(settings.defaultDailyRate || 250);
  const [tempOtRate, setTempOtRate] = useState<number>(settings.defaultOvertimeRate || 35);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toggle Security pin
  const handlePinToggle = (checked: boolean) => {
    if (checked) {
      setSettings(prev => ({ ...prev, pinEnabled: true }));
      setEditingPin(true);
    } else {
      setSettings(prev => ({ ...prev, pinEnabled: false }));
      setEditingPin(false);
    }
  };

  const savePin = () => {
    if (pinInput.length !== 4 || isNaN(Number(pinInput))) {
      setPinError('يجب أن يتكون الرمز السري من 4 أرقام فقط!');
      return;
    }
    setSettings(prev => ({ ...prev, pinCode: pinInput }));
    setEditingPin(false);
    setPinError('');
    showToast('تم تعيين وحفظ رمز الحماية السري بنجاح!', 'success');
  };

  // Change font size
  const handleFontSizeChange = (size: 'small' | 'medium' | 'large' | 'xlarge') => {
    setSettings(prev => ({ ...prev, fontSize: size }));
  };

  // Bulk Apply Rates to Active Workers
  const handleBulkApplyRates = () => {
    if (tempDailyRate < 0 || tempOtRate < 0) {
      showToast('الرجاء إدخال أجور عادلة مقبولة أكبر من الصفر!', 'error');
      return;
    }

    const activeCount = workers.filter(w => !w.archived).length;
    if (activeCount === 0) {
      showToast('لا توجد عمال نشطين لتطبيق الأجور عليهم حالياً!', 'warning');
      return;
    }

    showConfirm({
      title: 'تطبيق الأجور بالمجموعة',
      message: `هل ترغب فعلياً بتحديث الأجور وتحديث الأجر اليومي (${tempDailyRate} ج.م) والعمل الإضافي (${tempOtRate} ج.م) وتطبيقها مجمّعاً على جميع العمال النشطين (${activeCount} عمال) دفعة واحدة؟`,
      onConfirm: () => {
        setWorkers(prev => prev.map(w => 
          w.archived 
            ? w 
            : { ...w, dailyRate: tempDailyRate, otRate: tempOtRate }
        ));
        
        setSettings(prev => ({
          ...prev,
          defaultDailyRate: tempDailyRate,
          defaultOvertimeRate: tempOtRate
        }));
        
        showToast(`تم بنجاح تطبيق الأسعار الجديدة وتحديث ملفات الأجر لـ ${activeCount} عامل نشط!`, 'success');
      }
    });
  };

  // Export full JSON backup
  const exportFullBackup = () => {
    try {
      const backupData = {
        version: '3.0',
        exportedAt: new Date().toISOString(),
        workers,
        attendance,
        sites,
        settings
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const d = new Date();
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `نسخة_احتياطية_المهتدي_للمقاولات_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('تم تصدير وحفظ النسخة الاحتياطية بنجاح!', 'success');
    } catch (err: any) {
      showToast('فشل تصدير الملف: ' + err.message, 'error');
    }
  };

  // Import JSON backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (parsed && Array.isArray(parsed.workers) && Array.isArray(parsed.attendance)) {
          setWorkers(parsed.workers);
          setAttendance(parsed.attendance);
          if (Array.isArray(parsed.sites)) setSites(parsed.sites);
          if (parsed.settings) {
            setSettings(parsed.settings);
            setTempDailyRate(parsed.settings.defaultDailyRate || 250);
            setTempOtRate(parsed.settings.defaultOvertimeRate || 35);
          }
          
          showToast('🎉 تم استيراد واستعادة كافة البيانات والنسخ الاحتياطية بنجاح لمؤسسة المهتدي للمقاولات!', 'success');
        } else {
          showToast('صيغة ملف الاستيراد غير صحيحة أو البيانات المعطية لا تتطابق مع الهيكلية!', 'error');
        }
      } catch (err: any) {
        showToast('فشل استيراد النسخة الاحتياطية. الرجاء التأكد من اختيار ملف JSON صحيح.', 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Upper Header */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm">
        <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Settings className="text-slate-600 dark:text-slate-400 w-5.5 h-5.5 rotate-45" />
          إقران الإعدادات والتحكم
        </h2>
        <p className="text-[11px] text-slate-400 dark:text-slate-400 mt-0.5">
          شاشات أمن الدخول وتعديل مظهر الموقع وتعيين جداول الأجور والرواتب على مستوى المؤسسة مجمّعاً
        </p>
      </div>

      {/* Main Settings Card */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm space-y-6">
        
        {/* Global Salary Settings Section (Workers Management) */}
        <div className="pb-4 border-b border-dashed border-slate-100 dark:border-slate-700/50 space-y-4">
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <DollarSign className="w-4.5 h-4.5 text-sky-600" />
              إعدادات الأجور والرواتب الافتراضية
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              تحديد فئات الأجر الافتراضية عند إضافة عمال جدد، مع إمكانية تحديث الكل مجمّعاً دفعة واحدة
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-755/50">
            <div>
              <label className="block text-[10px] text-slate-500 font-bold mb-1">صافي اليومية الافتراضي (ج.م)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={tempDailyRate}
                  onChange={(e) => setTempDailyRate(Number(e.target.value))}
                  className="w-full pl-3 pr-8 py-1.5 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                />
                <DollarSign className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 font-bold mb-1">أجر الساعة الإضافي الافتراضي</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={tempOtRate}
                  onChange={(e) => setTempOtRate(Number(e.target.value))}
                  className="w-full pl-3 pr-8 py-1.5 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                />
                <Clock className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
              </div>
            </div>
          </div>

          <button
            onClick={handleBulkApplyRates}
            type="button"
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-black rounded-xl text-[10px] transition transform active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1 shadow-sm"
          >
            <Check className="w-4 h-4" />
            تحديث وتطبيق هذه الرواتب مجمّعاً على جميع العمال النشطين
          </button>
        </div>

        {/* Dark Mode Switcher */}
        <div className="flex items-center justify-between pb-4 border-b border-dashed border-slate-100 dark:border-slate-700/50">
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              {settings.darkMode ? <Sun className="w-4.5 h-4.5 text-amber-500 animate-pulse" /> : <Moon className="w-4.5 h-4.5 text-sky-600" />}
              المظهر الداكن بالكامل للتشغيل الليلي
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              تباين ألوان متكامل لسهولة رصد حضور المهندسين في المواقع والمشاريع ليلاً
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.darkMode}
              onChange={(e) => setSettings(prev => ({ ...prev, darkMode: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full dark:bg-slate-700 peer peer-checked:after:-translate-x-full pr-1 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:right-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:width-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-sky-600"></div>
          </label>
        </div>

        {/* PIN lock verification toggle */}
        <div className="pb-4 border-b border-dashed border-slate-100 dark:border-slate-700/50 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Lock className="w-4.5 h-4.5 text-sky-600" />
                حماية التطبيق برمز سري PIN
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                إغلاق فوري للتطبيق بـ قفل أمني عند فتحه لمنع مراجعة الحضور واليوميات من غير المصرح لهم
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.pinEnabled}
                onChange={(e) => handlePinToggle(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full dark:bg-slate-700 peer peer-checked:after:-translate-x-full pr-1 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:right-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:width-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-sky-600"></div>
            </label>
          </div>

          {/* Setup screen pin */}
          {settings.pinEnabled && (
            <div className="p-3 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-755 space-y-2 animate-slide-up">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">رمز الدخول الحالي:</span>
                {editingPin ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="1234"
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                      className="w-16 text-center py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-black text-slate-800 dark:text-white outline-none"
                    />
                    <button
                      onClick={savePin}
                      className="px-2.5 py-1 bg-sky-600 text-white text-[10px] font-bold rounded-lg hover:bg-sky-500 transition cursor-pointer"
                    >
                      حفظ الرمز
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-slate-800 dark:text-slate-100">{settings.pinCode}</span>
                    <button
                      onClick={() => { setPinInput(settings.pinCode); setEditingPin(true); }}
                      className="text-[10px] text-sky-600 hover:underline font-black cursor-pointer"
                    >
                      تغيير الرمز
                    </button>
                  </div>
                )}
              </div>
              {pinError && <p className="text-[10px] text-rose-500 font-extrabold">{pinError}</p>}
            </div>
          )}
        </div>

        {/* Change font-size scaler */}
        <div className="pb-4 border-b border-dashed border-slate-100 dark:border-slate-700/50 space-y-2">
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <Type className="w-4.5 h-4.5 text-amber-500" />
              حجم خط نصوص وجداول التطبيق بالكشوفات
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              لتسهيل قراءة الكشوفات والتفاصيل لمهندسي المواقع تحت ضوء الشمس المباشر
            </p>
          </div>

          <div className="grid grid-cols-4 gap-1.5 bg-slate-50 dark:bg-slate-900/40 p-1 rounded-xl">
            {(['small', 'medium', 'large', 'xlarge'] as const).map((sz) => {
              const label = sz === 'small' ? 'صغير' : sz === 'medium' ? 'متوسط' : sz === 'large' ? 'كبير' : 'ضخم';
              const isActive = settings.fontSize === sz;
              return (
                <button
                  key={sz}
                  onClick={() => handleFontSizeChange(sz)}
                  className={`py-1.5 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-slate-650 text-slate-850 dark:text-white shadow-sm font-black'
                      : 'text-slate-400 hover:text-slate-650 dark:hover:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Offline local storage backup actions */}
        <div className="pb-2 space-y-3">
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-600" />
              تأمين وحفظ جرد البيانات الاحتياطي للمؤسسة
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              يتم حفظ مسيرات الرواتب وسلف العمال محلياً بالكامل. يمكنك ترحيلها وحفظها على هاتفك وتصديرها كـ ملف مستودع مشفر
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={exportFullBackup}
              className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-105 text-slate-700 dark:text-slate-250 hover:text-slate-950 font-bold text-[10px] rounded-xl border border-slate-200 dark:border-slate-700/50 cursor-pointerSecurity transform active:scale-95 transition"
            >
              <Download className="w-3.5 h-3.5 text-sky-600" />
              تصدير نسخة جرد كاملة (.JSON)
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-105 text-slate-705 dark:text-slate-250 hover:text-slate-950 font-bold text-[10px] rounded-xl border border-slate-200 dark:border-slate-700/50 cursor-pointer transform active:scale-95 transition"
            >
              <Upload className="w-3.5 h-3.5 text-amber-500" />
              استيراد وإعادة جرد كامل
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportBackup}
              accept=".json"
              className="hidden"
            />
          </div>

          <button
            onClick={() => {
              showConfirm({
                title: '☠️ تصفير النظام بالكامل!',
                message: 'تحذير مالي حرج للغاية! هل أنت متأكد من مسح جميع عمال مواقع المهتدي للمقاولات وكشوف الحضور وسجل المدفوعات كلياً وإعادة التطبيق إلى ضبط المصنع؟ سيتم تدمير كامل البيانات المخزنة نهائياً ولا توجد طريقة مدمجة للتراجع!',
                onConfirm: onResetAppData
              });
            }}
            className="w-full py-2 bg-rose-500/15 hover:bg-rose-500/20 text-rose-600 text-[10px] font-black rounded-xl border border-rose-500/10 transition cursor-pointer flex items-center justify-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            تصفير النظام ومسح الكشوفات بالكامل
          </button>
        </div>
      </div>

      {/* Footer system details info card */}
      <div className="bg-slate-50 dark:bg-slate-800/10 p-4 rounded-3xl border border-slate-100/50 dark:border-slate-800 text-center space-y-1">
        <Info className="w-5 h-5 text-slate-400 mx-auto" />
        <span className="text-xs font-black text-slate-755 dark:text-slate-300 block">نظام المهتدي للمقاولات الذكي v2.0</span>
        <span className="text-[10px] text-slate-405 dark:text-slate-500 block font-black">إدارة مسيرات حضور ورواتب المواقع والمشروعات 🏗️</span>
        <span className="text-[9px] text-slate-405 flex items-center justify-center gap-0.5 mt-2 font-semibold">
          صنع بكل <Heart className="w-3 text-rose-500 animate-pulse" /> للمهندسين والمشرفين والعمال بمواقع البناء
        </span>
      </div>
    </div>
  );
}
