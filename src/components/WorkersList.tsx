import React, { useState, useRef, useMemo } from 'react';
import { Worker, WorkSite, PaymentRecord, AppSettings, AttendanceRecord } from '../types';
import { useUIFeedback } from './UIFeedbackProvider';
import WorkerProfileModal from './WorkerProfileModal';
import { 
  Users, UserPlus, UserCheck, Search, Edit2, Trash2, SlidersHorizontal, MapPin, 
  Upload, FileSpreadsheet, X, Check, FileDown, Archive, RotateCcw, 
  Plus, History, DollarSign, Wallet, Calendar, ChevronDown, ChevronUp, Phone, FileText
} from 'lucide-react';

interface WorkersListProps {
  workers: Worker[];
  setWorkers: React.Dispatch<React.SetStateAction<Worker[]>>;
  sites: WorkSite[];
  payments: PaymentRecord[];
  attendance: AttendanceRecord[];
  settings: AppSettings;
  onAddWorker: (
    name: string,
    dailyRate: number,
    otRate: number,
    siteId: string,
    paymentCycle: 'daily' | 'weekly' | 'monthly',
    phone?: string,
    nationalId?: string,
    notes?: string
  ) => void;
  onEditWorker: (
    id: string,
    name: string,
    dailyRate: number,
    otRate: number,
    siteId: string,
    paymentCycle?: 'daily' | 'weekly' | 'monthly',
    phone?: string,
    nationalId?: string,
    notes?: string
  ) => void;
  onDeleteWorker: (id: string) => void;
  onArchiveWorker: (id: string) => void;
  onRestoreWorker: (id: string) => void;
  onAddPayment: (workerId: string, amount: number, date: string, notes?: string, isSettlement?: boolean) => void;
  onDeletePayment: (paymentId: string) => void;
}

export default function WorkersList({
  workers,
  setWorkers,
  sites,
  payments,
  attendance,
  settings,
  onAddWorker,
  onEditWorker,
  onDeleteWorker,
  onArchiveWorker,
  onRestoreWorker,
  onAddPayment,
  onDeletePayment
}: WorkersListProps) {
  const { showToast, showConfirm } = useUIFeedback();

  // Search, Filters & Tabs
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>('all');
  const [selectedCycleFilter, setSelectedCycleFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');

  // Currently Selected Worker for Profile Modal
  const [selectedWorkerProfile, setSelectedWorkerProfile] = useState<Worker | null>(null);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);

  // Form Fields for Manual CRUD
  const [name, setName] = useState('');
  const [dailyRate, setDailyRate] = useState<number>(settings.defaultDailyRate || 250);
  const [otRate, setOtRate] = useState<number>(settings.defaultOvertimeRate || 35);
  const [siteId, setSiteId] = useState<string>('default');
  const [paymentCycle, setPaymentCycle] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [notes, setNotes] = useState('');

  // Contact Multi-select importer state
  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<{ [key: string]: boolean }>({});
  const [importSite, setImportSite] = useState<string>('default');
  const [importDailyRate, setImportDailyRate] = useState<number>(settings.defaultDailyRate || 250);
  const [importOtRate, setImportOtRate] = useState<number>(settings.defaultOvertimeRate || 35);
  const [importCycle, setImportCycle] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Bulk CSV import structures
  const [bulkWorkers, setBulkWorkers] = useState<{name: string, dailyRate: number, otRate: number, phone?: string, nationalId?: string}[]>([]);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Enhanced Sample Contacts List with phone numbers
  const SAMPLE_CONTACTS = [
    { id: 'sc-1', name: 'الأسطى عبده المحلاوي (بنا)', phone: '01012435422' },
    { id: 'sc-2', name: 'المعلم رضا العسيلي (نجار مسلح)', phone: '01122339944' },
    { id: 'sc-3', name: 'جلال فوزي المرشدي (مساعد نجّار)', phone: '01233441122' },
    { id: 'sc-4', name: 'أبو العلا حامد (حداد مسلح)', phone: '01544558833' },
    { id: 'sc-5', name: 'سعيد عبد المولى (عامل حفر)', phone: '01022334455' },
    { id: 'sc-6', name: 'شريف عبد المنصف (مبيض محارة)', phone: '01188998844' },
    { id: 'sc-7', name: 'الأسطى محمود الجيزاوي (كهربائي)', phone: '01299887766' },
    { id: 'sc-8', name: 'مصطفى السوهاجي (حفار)', phone: '01035415234' }
  ];

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddWorker(name.trim(), dailyRate, otRate, siteId, paymentCycle, phone.trim(), nationalId.trim(), notes.trim());
    resetForm();
    setIsAddOpen(false);
    showToast('تم تسجيل وإدراج العامل بنجاح!', 'success');
  };

  const handleStartEdit = (w: Worker) => {
    setEditingWorker(w);
    setName(w.name);
    setDailyRate(w.dailyRate);
    setOtRate(w.otRate);
    setSiteId(w.siteId);
    setPaymentCycle(w.paymentCycle || 'daily');
    setPhone(w.phone || '');
    setNationalId(w.nationalId || '');
    setNotes(w.notes || '');
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorker || !name.trim()) return;
    onEditWorker(editingWorker.id, name.trim(), dailyRate, otRate, siteId, paymentCycle, phone.trim(), nationalId.trim(), notes.trim());
    resetForm();
    setEditingWorker(null);
    showToast('تم تحديث بيانات العامل بنجاح!', 'success');
  };

  const resetForm = () => {
    setName('');
    setDailyRate(settings.defaultDailyRate || 250);
    setOtRate(settings.defaultOvertimeRate || 35);
    setSiteId('default');
    setPaymentCycle('daily');
    setPhone('');
    setNationalId('');
    setNotes('');
  };

  const handleContactsImportSubmit = () => {
    const selectedList = SAMPLE_CONTACTS.filter(c => selectedContacts[c.name]);
    if (selectedList.length === 0) {
      showToast('الرجاء اختيار جهة اتصال واحدة على الأقل للاستيراد!', 'warning');
      return;
    }

    selectedList.forEach(c => {
      onAddWorker(c.name, importDailyRate, importOtRate, importSite, importCycle, c.phone, '', 'استيراد جهات الاتصال');
    });

    // Reset selection and close
    setSelectedContacts({});
    setIsContactsOpen(false);
    showToast(`تم بنجاح تحويل ${selectedList.length} جهة اتصال إلى ملفات عمال مخصصين بالموقع!`, 'success');
  };

  const toggleSelectAllContacts = () => {
    const allSelected = SAMPLE_CONTACTS.every(c => selectedContacts[c.name]);
    const next: { [key: string]: boolean } = {};
    if (!allSelected) {
      SAMPLE_CONTACTS.forEach(c => {
         next[c.name] = true;
      });
    }
    setSelectedContacts(next);
  };

  // CSV Import Parser
  const handleCsvSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/);
      const parsed: typeof bulkWorkers = [];
      
      lines.forEach((line) => {
        if (!line.trim()) return;
        const columns = line.split(',');
        const workerName = columns[0]?.trim();
        if (!workerName || workerName === 'الاسم' || workerName === 'اسم العامل') return; // Skip headers
        
        const rate = parseFloat(columns[1]) || settings.defaultDailyRate || 250;
        const ot = parseFloat(columns[2]) || settings.defaultOvertimeRate || 35;
        const phoneVal = columns[3]?.trim() || '';
        const natIdVal = columns[4]?.trim() || '';
        
        parsed.push({
          name: workerName,
          dailyRate: rate,
          otRate: ot,
          phone: phoneVal,
          nationalId: natIdVal
        });
      });

      if (parsed.length > 0) {
        setBulkWorkers(parsed);
        setIsBulkOpen(true);
      } else {
        showToast('لم يتم العثور على عمال في ملف CSV. التنسيق: الاسم,اليومية,سعر_الساعة,الهاتف,الهوية', 'error');
      }
    };
    reader.readAsText(file, "UTF-8");
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmBulkImport = () => {
    bulkWorkers.forEach(w => {
      onAddWorker(w.name, w.dailyRate, w.otRate, 'default', 'daily', w.phone, w.nationalId, 'استيراد CSV مجمّع');
    });
    setBulkWorkers([]);
    setIsBulkOpen(false);
    showToast(`تم بنجاح إدراج كشف العمال المجمّع (${bulkWorkers.length} عامل)!`, 'success');
  };

  const downloadSampleCsv = () => {
    const csvContent = "\uFEFFاسم العامل,الأجر اليومي,سعر ساعة الإضافي,رقم الهاتف,الهوية الوطنية\nحمدي أبو جبل,300,40,01012345678,29511122233344\nسعد الكردي,250,30,01122233344,29605556667778\nالأسطى منير,350,45,01299988877,29302221110009";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "تحميل_نموذج_كشف_العمال.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Lifetime Diagnostic calculations per worker (optimized via useMemo where possible)
  const getWorkerCalculatedStats = (workerId: string) => {
    const records = attendance.filter(r => r.workerId === workerId);
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return { earned: 0, advances: 0, paid: 0, balance: 0, totalDays: 0, totalOt: 0, lastPayDate: 'لا يوجد' };

    let earned = 0;
    let totalDays = 0;
    let totalOt = 0;
    let advances = 0;

    records.forEach(r => {
      if (r.isPresent) {
        earned += worker.dailyRate + (r.otHours * worker.otRate);
        totalDays += 1;
        totalOt += r.otHours;
      }
      advances += r.advance;
    });

    const workerPayments = payments.filter(p => p.workerId === workerId);
    const paid = workerPayments.reduce((sum, p) => sum + p.amount, 0);
    const balance = earned - advances - paid;

    let lastPayDate = 'لا يوجد';
    if (workerPayments.length > 0) {
      const sortedPayments = [...workerPayments].sort((a, b) => b.date.localeCompare(a.date));
      lastPayDate = sortedPayments[0].date;
    }

    return { earned, advances, paid, balance, totalDays, totalOt, lastPayDate };
  };

  const translateCycle = (c?: string) => {
    switch (c) {
      case 'daily': return 'يومي';
      case 'weekly': return 'أسبوعي';
      case 'monthly': return 'شهري';
      default: return 'يومي';
    }
  };

  // Filter & Search Workers (memoized for excellent responsiveness up to 100+ workers)
  const displayedWorkers = useMemo(() => {
    return workers.filter(w => {
      const isArchived = w.archived === true;
      const matchesArchiveTab = viewMode === 'archived' ? isArchived : !isArchived;
      const matchesSearch = w.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (w.phone && w.phone.includes(searchTerm)) ||
                            (w.notes && w.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesSite = selectedSiteFilter === 'all' || w.siteId === selectedSiteFilter;
      const matchesCycle = selectedCycleFilter === 'all' || w.paymentCycle === selectedCycleFilter;
      return matchesArchiveTab && matchesSearch && matchesSite && matchesCycle;
    });
  }, [workers, viewMode, searchTerm, selectedSiteFilter, selectedCycleFilter]);

  return (
    <div className="space-y-4">
      {/* Header Panel */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Users className="text-sky-600 dark:text-sky-400 w-5.5 h-5.5" />
            شؤون عمال المقاولات
          </h2>
          <p className="text-[11px] text-slate-400 dark:text-slate-455 mt-0.5">
            إدارة كاملة للمشروعات واليوميات والضمانات مع ملف مالي تفصيلي وتسويات فورية
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setIsAddOpen(true); }}
          className="bg-sky-600 hover:bg-sky-500 transform active:scale-95 text-white flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs cursor-pointer shadow-md"
        >
          <UserPlus className="w-4 h-4" />
          إضافة عامل جديد
        </button>
      </div>

      {/* Import & Tools Options */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          onClick={() => setIsContactsOpen(true)}
          className="flex items-center justify-center gap-2 py-2.5 px-4 bg-sky-50 hover:bg-sky-100 text-sky-700 dark:bg-sky-950/20 dark:text-sky-300 dark:hover:bg-slate-800 rounded-2xl border border-sky-100 dark:border-slate-700 text-[11px] font-black transition transform active:scale-95 cursor-pointer"
        >
          <UserCheck className="w-3.5 h-3.5" />
          استيراد وتحويل من الهاتف
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-50 hover:bg-amber-105 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300 dark:hover:bg-slate-800 rounded-2xl border border-amber-100 dark:border-slate-705 text-[11px] font-black transition transform active:scale-95 cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          تحميل كشف عمال مجمّع CSV
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleCsvSelected}
          accept=".csv"
          className="hidden"
        />

        <button
          onClick={downloadSampleCsv}
          className="flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-755 rounded-2xl border border-slate-200 dark:border-slate-700/50 text-[10px] font-black transition transform active:scale-95 cursor-pointer"
        >
          <FileDown className="w-3.5 h-3.5" />
          تنزيل نموذج كشف عمال (.CSV)
        </button>
      </div>

      {/* Tabs list Active vs Archived */}
      <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl gap-1">
        <button
          onClick={() => setViewMode('active')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition cursor-pointer ${
            viewMode === 'active'
              ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-400'
          }`}
        >
          👷 العمال النشطون ({workers.filter(w => !w.archived).length})
        </button>
        <button
          onClick={() => setViewMode('archived')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition cursor-pointer ${
            viewMode === 'archived'
              ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-455 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-400'
          }`}
        >
          📦 الأرشيف والمشطوبون ({workers.filter(w => w.archived).length})
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="البحث بالاسم، الهاتف، المهنة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-10 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs font-semibold text-slate-800 dark:text-white"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <select
            value={selectedSiteFilter}
            onChange={(e) => setSelectedSiteFilter(e.target.value)}
            className="py-1.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-[10px] sm:text-[11px] font-black text-slate-600 dark:text-slate-300"
          >
            <option value="all">كل المواقع 🗺️</option>
            {sites.map(site => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>

          <select
            value={selectedCycleFilter}
            onChange={(e) => setSelectedCycleFilter(e.target.value)}
            className="py-1.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-[10px] sm:text-[11px] font-black text-slate-600 dark:text-slate-300"
          >
            <option value="all">دورة الدفع 📅</option>
            <option value="daily">يومي 💵</option>
            <option value="weekly">أسبوعي 📅</option>
            <option value="monthly">شهري 🏢</option>
          </select>
        </div>
      </div>

      {/* Workers Cards List Rendering */}
      <div className="grid grid-cols-1 gap-2.5">
        {displayedWorkers.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700/50 text-center text-slate-500">
            <Users className="w-10 h-10 text-slate-300 dark:text-slate-650 mx-auto mb-2" />
            <p className="font-extrabold text-xs">لا يوجد عمال يطابقون شروط البحث حالياً</p>
            <p className="text-[10px] text-slate-400 mt-0.5">يمكنك إضافة عمال أو إعادة ملأ شروط البحث</p>
          </div>
        ) : (
          displayedWorkers.map((w) => {
            const siteName = sites.find(s => s.id === w.siteId)?.name || 'موقع المشروع الرئيسي 🏗️';
            const stats = getWorkerCalculatedStats(w.id);

            return (
              <div
                key={w.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 p-4 shadow-xs hover:border-sky-300 dark:hover:border-sky-900/40 transition-all flex flex-col xs:flex-row xs:items-center justify-between gap-3"
              >
                {/* Visual Metadata & Avatar Emoji preset */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-900 text-base flex items-center justify-center shrink-0 border dark:border-slate-755 shadow-xs">
                    👷
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h4 className="font-extrabold text-slate-800 dark:text-white text-xs sm:text-sm">{w.name}</h4>
                      {w.phone && (
                        <span className="text-[8px] text-slate-400 dark:text-slate-500 font-bold flex items-center gap-0.5">
                          <Phone className="w-2.5 h-2.5" />
                          {w.phone}
                        </span>
                      )}
                    </div>
                    {w.notes && <p className="text-[9px] text-sky-600 dark:text-sky-450 font-black tracking-tight">{w.notes}</p>}
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-405 dark:text-slate-450 font-bold">
                      <span className="flex items-center gap-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {siteName}
                      </span>
                      <span>•</span>
                      <span>دورة: {translateCycle(w.paymentCycle)}</span>
                      <span>•</span>
                      <span>اليومية: {w.dailyRate} ج.م</span>
                    </div>
                  </div>
                </div>

                {/* Ledger & Outstanding Balance */}
                <div className="flex items-center justify-between xs:justify-end gap-3 border-t xs:border-t-0 pt-2.5 xs:pt-0">
                  <div className="text-right space-y-0.5">
                    <span className="text-[8px] font-black text-slate-400 block uppercase">المتبقي</span>
                    <strong className={`text-xs font-black block ${stats.balance >= 0 ? 'text-sky-600 dark:text-sky-400' : 'text-rose-500'}`}>
                      {stats.balance.toFixed(0)} <span className="text-[9px]">ج.م</span>
                    </strong>
                  </div>

                  {/* Actions Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedWorkerProfile(w)}
                      className="px-3.5 py-2 bg-sky-50 hover:bg-sky-100 dark:bg-slate-700/60 text-sky-700 dark:text-sky-350 dark:hover:bg-slate-700 rounded-xl font-black text-[10px] flex items-center gap-1 cursor-pointer transition"
                      title="المراجعة المالية الكاملة للملف والسداد"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      الملف المالي والتسوية
                    </button>

                    <button
                      onClick={() => handleStartEdit(w)}
                      className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/60 dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-350 transition cursor-pointer"
                      title="تعديل ملف العامل"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {viewMode === 'active' ? (
                      <button
                        onClick={() => {
                          showConfirm({
                            title: 'أرشفة العامل',
                            message: `هل أنت متأكد تماماً من نقل العامل "${w.name}" إلى الأرشيف المالي؟ سيتم إخفاؤه من قوائم التحضير اليومية ولكن تظل سجلات حساباته محفوظة.`,
                            onConfirm: () => {
                              onArchiveWorker(w.id);
                              showToast('تمت أرشفة العامل وحجبه عن مسيرات التحضير اليومية.', 'info');
                            }
                          });
                        }}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 rounded-xl text-rose-600 transition cursor-pointer"
                        title="أرشفة الكشف"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          onRestoreWorker(w.id);
                          showToast(`تمت استعادة العامل "${w.name}" بنجاح للنشطين!`, 'success');
                        }}
                        className="p-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 rounded-xl text-emerald-600 transition cursor-pointer"
                        title="استرجاع الملف"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => {
                        showConfirm({
                          title: 'حذف مبرم نهائي',
                          message: `تحذير مالي حرج! هل أنت متأكد تماماً من رغبتك في حذف ملف العامل "${w.name}" وقاعدة بياناته نهائياً؟ سيتم محو حضور الأيام وتاريخ دفعاته وسلسلة سلفه بالكامل، هذا الإجراء مدمر ولا يمكن التراجع عنه!`,
                          onConfirm: () => {
                            onDeleteWorker(w.id);
                            showToast('تمت إزالة ملف العامل وسجل كافة الدفعات والمصروفات الخاصة به نهائياً.', 'error');
                          }
                        });
                      }}
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-500 rounded-xl transition cursor-pointer"
                      title="حذف نهائي مدمر"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Worker Profile Detail View (Modal overlay) */}
      {selectedWorkerProfile && (
        <WorkerProfileModal
          worker={selectedWorkerProfile}
          sites={sites}
          attendance={attendance}
          payments={payments}
          onClose={() => setSelectedWorkerProfile(null)}
          onAddPayment={onAddPayment}
          onDeletePayment={onDeletePayment}
          onEditWorker={onEditWorker}
        />
      )}

      {/* Manual Add Worker Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white dark:bg-slate-800 rounded-[28px] p-6 w-full max-w-sm shadow-2xl border border-slate-100 dark:border-slate-700/65">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <UserPlus className="text-sky-600 dark:text-sky-400 w-5 h-5" />
                إضافة عامل جديد
              </h3>
              <button onClick={() => setIsAddOpen(false)} className="p-1 rounded-full text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmitAdd} className="space-y-4 text-right">
              <div>
                <label className="block text-[10px] font-black text-slate-450 mb-1">الاسم الكامل للعامل</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: أحمد عبد الله المحلاوي"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none animate-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-450 mb-1">أجر اليومية (ج.م)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={dailyRate}
                    onChange={(e) => setDailyRate(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none animate-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-450 mb-1">سعر ساعة الإضافي</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={otRate}
                    onChange={(e) => setOtRate(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none animate-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-450 mb-1">موقع المشروع الأولي</label>
                  <select
                    value={siteId}
                    onChange={(e) => setSiteId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-sky-500 outline-none"
                  >
                    {sites.map(site => (
                      <option key={site.id} value={site.id}>{site.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-450 mb-1">دورة أو نظام الصرف</label>
                  <select
                    value={paymentCycle}
                    onChange={(e) => setPaymentCycle(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-sky-500 outline-none"
                  >
                    <option value="daily">يومي 💵</option>
                    <option value="weekly">أسبوعي 📅</option>
                    <option value="monthly">شهري 🏢</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-450 mb-1">رقم الهاتف الجوال (اختياري)</label>
                <input
                  type="text"
                  placeholder="رقم الهاتف (مثل: 010...)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-450 mb-1">الرقم القومي (هوية)</label>
                  <input
                    type="text"
                    maxLength={14}
                    placeholder="14 رقم"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-450 mb-1">ملاحظات أو المهنة والمهارات</label>
                  <input
                    type="text"
                    placeholder="مثل: حداد، بنا، مبيض..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-sky-600 text-white rounded-xl font-bold hover:bg-sky-500 active:scale-95 transition cursor-pointer text-xs"
                >
                  إدراج وحفظ العامل
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-250 rounded-xl font-bold cursor-pointer text-xs"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Edit Worker Modal */}
      {editingWorker && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white dark:bg-slate-800 rounded-[28px] p-6 w-full max-w-sm shadow-2xl border border-slate-100 dark:border-slate-700/65">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Edit2 className="text-sky-600 dark:text-sky-400 w-5 h-5" />
                تعديل ملف العامل
              </h3>
              <button onClick={() => setEditingWorker(null)} className="p-1 rounded-full text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmitEdit} className="space-y-4 text-right">
              <div>
                <label className="block text-[10px] font-black text-slate-455 mb-1">الاسم الكامل للعامل</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-455 mb-1">أجر اليومية (ج.م)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={dailyRate}
                    onChange={(e) => setDailyRate(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-455 mb-1">ساعة الإضافي</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={otRate}
                    onChange={(e) => setOtRate(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-455 mb-1">موقع المشروع</label>
                  <select
                    value={siteId}
                    onChange={(e) => setSiteId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] sm:text-[11px] font-bold text-slate-750 dark:text-slate-250 focus:ring-2 focus:ring-sky-500 outline-none"
                  >
                    {sites.map(site => (
                      <option key={site.id} value={site.id}>{site.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-455 mb-1">نظام الصرف المالي</label>
                  <select
                    value={paymentCycle}
                    onChange={(e) => setPaymentCycle(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-bold text-slate-750 dark:text-slate-250 focus:ring-2 focus:ring-sky-500 outline-none"
                  >
                    <option value="daily">يومي 💵</option>
                    <option value="weekly">أسبوعي 📅</option>
                    <option value="monthly">شهري 🏢</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-455 mb-1">رقم الهاتف الجوال</label>
                <input
                  type="text"
                  placeholder="رقم الهاتف"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none animate-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-455 mb-1">الرقم القومي (هوية)</label>
                  <input
                    type="text"
                    maxLength={14}
                    placeholder="14 رقم"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-455 mb-1">ملاحظات أو مهارة</label>
                  <input
                    type="text"
                    placeholder="حداد، مبيض، بنا..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-sky-600 text-white rounded-xl font-bold hover:bg-sky-500 active:scale-95 transition cursor-pointer text-xs"
                >
                  حفظ تعديلات العامل
                </button>
                <button
                  type="button"
                  onClick={() => setEditingWorker(null)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-250 rounded-xl font-bold cursor-pointer text-xs"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Multiple Contact Importer */}
      {isContactsOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white dark:bg-slate-800 rounded-[28px] p-6 w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-700 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b pb-3 mb-3">
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <UserCheck className="text-sky-600 dark:text-sky-400 w-5 h-5" />
                  استيراد متعدد من كشف الهاتف
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">اختر الأسماء التي ترغب بتحويلها وتعيينها فوراً</p>
              </div>
              <button onClick={() => setIsContactsOpen(false)} className="p-1 rounded-full text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick defaults for batch adding list */}
            <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl gap-2 space-y-2 mb-3 border dark:border-slate-755">
              <span className="text-[9.5px] text-sky-600 dark:text-sky-450 block font-black border-b pb-1">⚙️ الأسعار والمواقع التلقائية لعمال هذه الدفعة:</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[8.5px] text-slate-400 font-bold">صافي اليومية (ج.م)</label>
                  <input
                    type="number"
                    value={importDailyRate}
                    onChange={(e) => setImportDailyRate(Number(e.target.value))}
                    className="w-full px-2 py-1 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[8.5px] text-slate-400 font-bold">ساعة الإضافي (ج.م)</label>
                  <input
                    type="number"
                    value={importOtRate}
                    onChange={(e) => setImportOtRate(Number(e.target.value))}
                    className="w-full px-2 py-1 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-white outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[8.5px] text-slate-400 font-bold">ورشة التعيين الأولى</label>
                  <select
                    value={importSite}
                    onChange={(e) => setImportSite(e.target.value)}
                    className="w-full px-2 py-1 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-350 outline-none"
                  >
                    {sites.map(site => (
                      <option key={site.id} value={site.id}>{site.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[8.5px] text-slate-400 font-bold">نظام الأجر والصرف</label>
                  <select
                    value={importCycle}
                    onChange={(e) => setImportCycle(e.target.value as any)}
                    className="w-full px-2 py-1 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-355 outline-none"
                  >
                    <option value="daily">يومي</option>
                    <option value="weekly">أسبوعي</option>
                    <option value="monthly">شهري</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Checkboxes list of contacts */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 my-2 border border-slate-100 dark:border-slate-700 rounded-2xl p-2 bg-slate-50/50 dark:bg-slate-905/20">
              <div className="flex items-center justify-between text-[11px] font-black border-b pb-1 text-sky-600 dark:text-sky-400">
                <span>اختر جهات الاتصال ({Object.values(selectedContacts).filter(Boolean).length} محددة)</span>
                <button type="button" onClick={toggleSelectAllContacts} className="hover:underline cursor-pointer">تحديد الكل / إلغاء الجميع</button>
              </div>

              {SAMPLE_CONTACTS.map(contact => {
                const isChecked = !!selectedContacts[contact.name];
                return (
                  <label
                    key={contact.id}
                    className={`flex items-center justify-between p-2 rounded-xl border transition cursor-pointer ${
                      isChecked
                        ? 'bg-sky-50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-900 text-sky-800 dark:text-sky-305'
                        : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setSelectedContacts(prev => ({
                            ...prev,
                            [contact.name]: !prev[contact.name]
                          }));
                        }}
                        className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-black block">{contact.name}</span>
                        <span className="text-[10px] text-slate-400 block font-semibold">{contact.phone}</span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex gap-2 border-t pt-3 mt-2">
              <button
                type="button"
                onClick={handleContactsImportSubmit}
                className="flex-1 py-12 px-5 py-2.5 bg-sky-600 text-white rounded-xl font-bold hover:bg-sky-500 active:scale-95 transition cursor-pointer text-xs flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                تحويل وتأكيد وبدء البناء ({Object.values(selectedContacts).filter(Boolean).length} عمال)
              </button>
              <button
                type="button"
                onClick={() => { setSelectedContacts({}); setIsContactsOpen(false); }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-xl font-bold cursor-pointer text-xs"
              >
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Preview Modal */}
      {isBulkOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white dark:bg-slate-800 rounded-[28px] p-6 w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-700">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-2">
              <FileSpreadsheet className="text-amber-500 w-5 h-5" />
              معاينة استيراد العمال مجمّعاً من CSV
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              تم رصد <span className="text-sky-600 dark:text-sky-400 font-extrabold">{bulkWorkers.length} عامل في الملف</span>. يرجى تأكيد إضافتهم فورياً:
            </p>

            <div className="max-h-56 overflow-y-auto mb-4 border border-slate-150 dark:border-slate-700 rounded-2xl p-2 space-y-1 bg-slate-50 dark:bg-slate-900/40">
              {bulkWorkers.map((w, index) => (
                <div key={index} className="flex justify-between items-center text-xs p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                  <span className="font-extrabold text-slate-750 dark:text-slate-200">{index + 1}. {w.name}</span>
                  <span className="text-slate-500 font-semibold text-[10px]">
                    اليومية: <span className="text-slate-800 dark:text-slate-200 font-bold">{w.dailyRate}ج</span> | الهاتف: <span className="text-slate-800 dark:text-slate-200 font-bold">{w.phone || '-'}</span>
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={confirmBulkImport}
                className="flex-1 py-2.5 bg-sky-600 text-white rounded-xl font-bold hover:bg-sky-500 active:scale-95 transition flex items-center justify-center gap-1 text-xs cursor-pointer"
              >
                <Check className="w-4 h-4" />
                استيراد وإضافة الكل ({bulkWorkers.length}) عمال
              </button>
              <button
                onClick={() => { setBulkWorkers([]); setIsBulkOpen(false); }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-xl font-bold cursor-pointer text-xs"
              >
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
