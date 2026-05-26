import React, { useState, useMemo } from 'react';
import { Worker, WorkSite, AttendanceRecord, PaymentRecord } from '../types';
import { useUIFeedback } from './UIFeedbackProvider';
import { 
  X, Calendar, Clock, DollarSign, Phone, FileText, User, 
  Trash2, AlertCircle, MessageSquare, Printer, Check, Wallet, ChevronLeft
} from 'lucide-react';

interface WorkerProfileModalProps {
  worker: Worker;
  sites: WorkSite[];
  attendance: AttendanceRecord[];
  payments: PaymentRecord[];
  onClose: () => void;
  onAddPayment: (workerId: string, amount: number, date: string, notes?: string, isSettlement?: boolean) => void;
  onDeletePayment: (paymentId: string) => void;
  onEditWorker: (id: string, name: string, dailyRate: number, otRate: number, siteId: string, paymentCycle: 'daily' | 'weekly' | 'monthly', phone?: string, nationalId?: string, notes?: string) => void;
}

export default function WorkerProfileModal({
  worker,
  sites,
  attendance,
  payments,
  onClose,
  onAddPayment,
  onDeletePayment,
  onEditWorker
}: WorkerProfileModalProps) {
  const { showToast, showConfirm } = useUIFeedback();

  // Range Filters
  const [filterType, setFilterType] = useState<'all' | 'week' | 'month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Edit details inside profile switcher
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(worker.name);
  const [editDailyRate, setEditDailyRate] = useState(worker.dailyRate);
  const [editOtRate, setEditOtRate] = useState(worker.otRate);
  const [editSiteId, setEditSiteId] = useState(worker.siteId);
  const [editPhone, setEditPhone] = useState(worker.phone || '');
  const [editNationalId, setEditNationalId] = useState(worker.nationalId || '');
  const [editCycle, setEditCycle] = useState<'daily' | 'weekly' | 'monthly'>(worker.paymentCycle || 'daily');
  const [editNotes, setEditNotes] = useState(worker.notes || '');

  // Settlement Form notes
  const [settlementNotes, setSettlementNotes] = useState('');
  const [isSettlingOpen, setIsSettlingOpen] = useState(false);

  // Computed Date Bounds
  const dateBounds = useMemo(() => {
    const now = new Date();
    if (filterType === 'week') {
      const start = new Date();
      start.setDate(now.getDate() - 7);
      return { start: start.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
    } else if (filterType === 'month') {
      const start = new Date();
      start.setDate(now.getDate() - 30);
      return { start: start.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
    } else if (filterType === 'custom') {
      return { start: customStartDate, end: customEndDate };
    }
    return { start: '1970-01-01', end: '2099-12-31' };
  }, [filterType, customStartDate, customEndDate]);

  // Filtered lists
  const filteredAttendance = useMemo(() => {
    return attendance
      .filter(r => r.workerId === worker.id && r.date >= dateBounds.start && r.date <= dateBounds.end)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [attendance, worker.id, dateBounds]);

  const filteredPayments = useMemo(() => {
    return payments
      .filter(p => p.workerId === worker.id && p.date >= dateBounds.start && p.date <= dateBounds.end)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [payments, worker.id, dateBounds]);

  // Overall calculations (for balance, always use LIFETIME to avoid partial-settlement errors)
  const stats = useMemo(() => {
    const allWorkerAttendance = attendance.filter(r => r.workerId === worker.id);
    const allWorkerPayments = payments.filter(p => p.workerId === worker.id);

    // Lifetime values
    let lifetimeEarned = 0;
    let lifetimeAdvances = 0;
    let totalPresentDays = 0;
    let totalRegularEarned = 0;
    let totalOtEarned = 0;
    let totalOtHours = 0;

    allWorkerAttendance.forEach(r => {
      if (r.isPresent) {
        const basic = worker.dailyRate;
        const ot = r.otHours * worker.otRate;
        lifetimeEarned += basic + ot;
        totalRegularEarned += basic;
        totalOtEarned += ot;
        totalPresentDays += 1;
        totalOtHours += r.otHours;
      }
      lifetimeAdvances += r.advance;
    });

    const lifetimePaid = allWorkerPayments.reduce((sum, p) => sum + p.amount, 0);
    const lifetimeBalance = lifetimeEarned - lifetimeAdvances - lifetimePaid;

    // Filtered Period values
    let periodEarned = 0;
    let periodAdvances = 0;
    let periodDaysPresent = 0;

    filteredAttendance.forEach(r => {
      if (r.isPresent) {
        periodEarned += worker.dailyRate + (r.otHours * worker.otRate);
        periodDaysPresent += 1;
      }
      periodAdvances += r.advance;
    });

    const periodPaid = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

    return {
      lifetimeEarned,
      lifetimeAdvances,
      lifetimePaid,
      lifetimeBalance,
      totalPresentDays,
      totalOtHours,
      periodEarned,
      periodAdvances,
      periodPaid,
      periodDaysPresent
    };
  }, [attendance, payments, worker, filteredAttendance, filteredPayments]);

  const siteName = useMemo(() => {
    return sites.find(s => s.id === worker.siteId)?.name || 'موقع المشروع الرئيسي 🏗️';
  }, [sites, worker.siteId]);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    onEditWorker(
      worker.id,
      editName,
      editDailyRate,
      editOtRate,
      editSiteId,
      editCycle,
      editPhone,
      editNationalId,
      editNotes
    );
    setIsEditing(false);
    showToast('تم تحديث ملف العامل بنجاح!', 'success');
  };

  // Settle Payroll Account ("تم القبض")
  const handleSettlementSubmit = () => {
    if (stats.lifetimeBalance <= 0) {
      showToast('حساب هذا العامل متزن أو به زيادة، لا يوجد مستحق للتسوية!', 'warning');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const notesStr = settlementNotes.trim() || 'تسوية وحساب الرواتب الكلي - تم القبض';
    const originalBal = stats.lifetimeBalance;

    // Register a full settlement payment
    onAddPayment(worker.id, originalBal, todayStr, notesStr, true);
    setSettlementNotes('');
    setIsSettlingOpen(false);
    showToast(`تمت تسوية حساب العامل "${worker.name}" بنجاح! تم تسجيل دفعة بقيمة ${originalBal} ج.م`, 'success');

    // Automatically trigger visual stamp
  };

  // WhatsApp formatted string generator
  const getWhatsAppShareLink = () => {
    const header = `*إمبراطورية المهتدي للمقاولات* 🏗️\n`;
    const title = `*مستند تسوية راتب وأجور عمالية*\n`;
    const details = `*الاسم:* ${worker.name}\n` +
                    `*الموقع:* ${siteName}\n` +
                    `*التاريخ:* ${new Date().toLocaleDateString('ar-EG')}\n` +
                    `*دورة الصرف:* ${worker.paymentCycle === 'daily' ? 'يومي' : worker.paymentCycle === 'weekly' ? 'أسبوعي' : 'شهري'}\n` +
                    `--------------------------------------\n` +
                    `*العمل وورش الحضور:* عمل ${stats.totalPresentDays} يومية\n` +
                    `*ساعات الإضافي الكلية:* ${stats.totalOtHours} ساعة\n` +
                    `*أجر اليومية:* ${worker.dailyRate} ج.م\n` +
                    `*إجمالي مستحق العمل:* ${stats.lifetimeEarned.toFixed(0)} ج.م\n` +
                    `*السلف والخصومات:* -${stats.lifetimeAdvances.toFixed(0)} ج.م\n` +
                    `*المقبوض المسبق:* -${(stats.lifetimePaid - (payments.filter(p => p.workerId === worker.id && p.isSettlement).reduce((acc, current) => acc + current.amount, 0))).toFixed(0)} ج.م\n` +
                    `--------------------------------------\n` +
                    `*المبلغ المدفوع للتسوية:* ${stats.lifetimeBalance.toFixed(0)} ج.م\n` +
                    `*حالة الحساب المالي المتبقي:* 0.00 ج.م (تم السداد والتسوية بالكامل ✅)\n` +
                    `--------------------------------------\n` +
                    `مع تحيات الإدارة المالية لشركة المهتدي للمقاولات 👷🌾`;
    
    const encoded = encodeURIComponent(details);
    const phoneNum = worker.phone ? worker.phone.replace(/[^0-9]/g, '') : '';
    // Format appropriately
    if (phoneNum) {
      // support international prefix fallback
      const finalPhone = phoneNum.startsWith('01') ? '2' + phoneNum : phoneNum;
      return `https://wa.me/${finalPhone}?text=${encoded}`;
    }
    return `https://wa.me/?text=${encoded}`;
  };

  // Trigger browser print to generate pristine RTL PDF receipt
  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4 overflow-y-auto" dir="rtl">
      {/* Printable Area - Only visible at media print */}
      <div className="print-only bg-white text-black p-5 space-y-6 select-none" style={{ direction: 'rtl' }}>
        <div className="flex justify-between items-center border-b-2 border-slate-900 pb-3">
          <div>
            <h1 className="text-xl font-black">شركة المهتدي للمقاولات 🏗️</h1>
            <p className="text-xs text-slate-600">سجل تسوية رواتب وأجور العمالة الموسمية واليومية</p>
          </div>
          <div className="text-left">
            <p className="text-xs">الموقع الفني: {siteName}</p>
            <p className="text-xs">تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</p>
          </div>
        </div>

        <div className="my-4 p-4 border rounded-xl bg-slate-50 space-y-2">
          <p className="font-extrabold text-sm">بيانات العامل المكلف:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>الاسم الكامل: <strong>{worker.name}</strong></div>
            <div>رقم الهوية الوطنية: <strong>{worker.nationalId || 'لا يوجد تسجيل في الكشف'}</strong></div>
            <div>رقم الهاتف المحمول: <strong>{worker.phone || 'لا يوجد'}</strong></div>
            <div>نظام ودورة صرف الأجر: <strong>{worker.paymentCycle === 'daily' ? 'يومي' : worker.paymentCycle === 'weekly' ? 'أسبوعي' : 'شهري'}</strong></div>
          </div>
        </div>

        <div className="my-4">
          <p className="font-bold text-xs mb-2 text-slate-800">تفاصيل الكشف المالي والحسابي التاريخي:</p>
          <table className="w-full text-center text-xs border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100">
                <th className="border p-2">البند</th>
                <th className="border p-2">الكمية / العدد</th>
                <th className="border p-2">القيمة الفردية</th>
                <th className="border p-2">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border p-2 text-right">أيام الحضور والعمل باليوميات</td>
                <td className="border p-2">{stats.totalPresentDays} وردية</td>
                <td className="border p-2">{worker.dailyRate} ج.م</td>
                <td className="border p-2">{(stats.totalPresentDays * worker.dailyRate).toFixed(0)} ج.م</td>
              </tr>
              <tr>
                <td className="border p-2 text-right">ساعات العمل الإضافية (سعر الساعة)</td>
                <td className="border p-2">{stats.totalOtHours} ساعة</td>
                <td className="border p-2">{worker.otRate} ج.م</td>
                <td className="border p-2">{(stats.totalOtHours * worker.otRate).toFixed(0)} ج.m</td>
              </tr>
              <tr className="text-rose-650 font-bold">
                <td className="border p-2 text-right">إجمالي السلف والمسحوبات المستقطعة</td>
                <td className="border p-2">-</td>
                <td className="border p-2">-</td>
                <td className="border p-2">-{stats.lifetimeAdvances.toFixed(0)} ج.م</td>
              </tr>
              <tr className="text-emerald-650 font-bold">
                <td className="border p-2 text-right">إجمالي المبالغ المدفوعة السابقة بالكامل</td>
                <td className="border p-2">-</td>
                <td className="border p-2">-</td>
                <td className="border p-2">-{stats.lifetimePaid.toFixed(0)} ج.م</td>
              </tr>
              <tr className="bg-sky-50 font-black text-sm">
                <td className="border p-2 text-right" colSpan={3}>صافي المستحق المدفوع حالياً للتسوية</td>
                <td className="border p-2">{stats.lifetimeBalance.toFixed(0)} ج.م</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center pt-8 border-t border-dashed mt-8">
          <div className="text-center space-y-4">
            <p className="text-xs">توقيع المستلم (العامل)</p>
            <div className="w-32 border-b border-black"></div>
            <p className="text-[10px] text-slate-400">البصمة أو التوقيع</p>
          </div>
          <div className="text-center space-y-4">
            <p className="text-xs">مشرف الموقع الفني</p>
            <div className="w-32 border-b border-black"></div>
            <p className="text-[10px] text-slate-400">موقع المهندس</p>
          </div>
          <div className="text-center space-y-4">
            <p className="text-xs">الختم المالي للشركة</p>
            <div className="w-24 h-24 rounded-full border border-dashed border-sky-400 flex items-center justify-center text-[10px] text-sky-500 font-bold text-wrap select-all">
              المهتدي <br/> للمقاولات
            </div>
          </div>
        </div>
      </div>

      {/* Main UI Dialog Screen */}
      <div className="no-print bg-white dark:bg-slate-800 rounded-[32px] w-full max-w-2xl shadow-2xl border border-slate-100 dark:border-slate-700/50 flex flex-col max-h-[96vh] animate-scale-up overflow-hidden">
        {/* Modal Upper Header */}
        <header className="bg-slate-50 dark:bg-slate-900 px-5 py-4 border-b border-slate-100 dark:border-slate-700/60 sticky top-0 z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-sky-100 dark:bg-slate-800 flex items-center justify-center text-xl shrink-0 scale-95 border border-sky-200">
              🛠️
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                {worker.name}
              </h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold flex items-center gap-1.5">
                <span>{siteName}</span>
                <span>•</span>
                <span>سجل أجور: {worker.paymentCycle === 'daily' ? 'يومي' : worker.paymentCycle === 'weekly' ? 'أسبوعي' : 'شهري'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-105 dark:hover:bg-slate-800/80 rounded-full text-slate-450 dark:text-slate-300 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Modal Dynamic Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isEditing ? (
            /* Editing Worker Details Subsection */
            <form onSubmit={handleSaveEdit} className="space-y-4 animate-fade-in bg-slate-50 dark:bg-slate-900/10 p-4 border dark:border-slate-700 rounded-3xl">
              <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 border-b pb-2 mb-2 flex items-center gap-1">
                <User className="w-4 h-4 text-sky-500" />
                تعديل بيانات وملف حساب العامل بـ كشف "المهتدي"
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-450 font-black mb-1">اسم العامل بالكامل</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-xs font-black text-slate-800 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-450 font-black mb-1">رقم الهاتف الجوال</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="رقم الهاتف (اختياري)"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-450 font-black mb-1">الأجر اليومي الافتراضي (ج.م)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editDailyRate}
                    onChange={(e) => setEditDailyRate(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-xs font-black text-slate-800 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-450 font-black mb-1">سعر الساعة الإضافية</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editOtRate}
                    onChange={(e) => setEditOtRate(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-xs font-black text-slate-800 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-450 font-black mb-1">رقم الهوية الوطنية</label>
                  <input
                    type="text"
                    value={editNationalId}
                    maxLength={14}
                    onChange={(e) => setEditNationalId(e.target.value.replace(/\D/g, ''))}
                    placeholder="14 رقم قومي (اختياري)"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-450 font-black mb-1">دورة أو نظام الراتب</label>
                  <select
                    value={editCycle}
                    onChange={(e) => setEditCycle(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-[11px] font-black text-slate-700 dark:text-slate-200 outline-none"
                  >
                    <option value="daily">يومي 💵</option>
                    <option value="weekly">أسبوعي 📅</option>
                    <option value="monthly">شهري 🏢</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-450 font-black mb-1">ورشة وموقع المشروع المخصص</label>
                  <select
                    value={editSiteId}
                    onChange={(e) => setEditSiteId(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-[11px] font-black text-slate-700 dark:text-slate-200 outline-none"
                  >
                    {sites.map(site => (
                      <option key={site.id} value={site.id}>{site.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-450 font-black mb-1">ملاحظات إضافية أو مهنة</label>
                  <input
                    type="text"
                    placeholder="مثل: حداد مسلح، نجار كباري..."
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-sky-600 text-white font-extrabold rounded-xl text-xs cursor-pointer hover:bg-sky-500 transform active:scale-95 transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  حفظ التعديلات
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs cursor-pointer font-bold hover:bg-slate-300"
                >
                  تراجع
                </button>
              </div>
            </form>
          ) : (
            /* Profile Statistics Breakdown and Summary Views */
            <div className="space-y-4 animate-fade-in">
              {/* Profile card metadata header */}
              <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-3xl border border-slate-100 dark:border-slate-700/50 flex flex-col sm:flex-row justify-between items-start gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-450">
                    <span>الهاتف:</span>
                    <strong className="text-slate-800 dark:text-white">{worker.phone || 'غير مسجل'}</strong>
                    {worker.phone && (
                      <a
                        href={`tel:${worker.phone}`}
                        className="p-1 bg-sky-50 text-sky-600 dark:bg-slate-800 rounded-md hover:scale-105 active:scale-95"
                        title="اتصال جوال مباشراً"
                      >
                        <Phone className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-455">
                    الهوية الوطنية: <strong className="text-slate-800 dark:text-white">{worker.nationalId || 'لا يوجد'}</strong>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-455">
                    المهنة / المهام: <strong className="text-slate-800 dark:text-white">{worker.notes || 'غير محددة'}</strong>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 dark:bg-slate-800 dark:text-sky-300 dark:hover:bg-slate-750 text-[10px] font-black rounded-lg transition shrink-0 self-end border border-sky-100 dark:border-slate-700 cursor-pointer"
                >
                  🔧 تعديل الملف التعريفي والمهنة
                </button>
              </div>

              {/* Financial Settlement Prompt Trigger Panel ("تم القبض") */}
              <div className="bg-emerald-500/10 border-2 border-emerald-500/20 dark:border-emerald-500/10 p-4 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-right">
                  <span className="text-[10px] font-black text-emerald-500 tracking-wider block">صافي الحساب والرواتب المستحقة (أمانة عامل)</span>
                  <strong className="text-xl font-black text-slate-800 dark:text-emerald-400 block">
                    {stats.lifetimeBalance.toFixed(0)} <span className="text-xs">ج.م</span>
                  </strong>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">مستند تسوية أعمم يشمل {stats.totalPresentDays} وردية حضور مطروحة السلف</p>
                </div>

                <div className="flex gap-2 w-full sm:w-auto shrink-0">
                  <button
                    onClick={() => setIsSettlingOpen(true)}
                    disabled={stats.lifetimeBalance <= 0}
                    className="flex-1 sm:flex-none px-5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-250 disabled:text-slate-450 dark:disabled:bg-slate-850 dark:disabled:text-slate-500 text-white font-black text-xs rounded-2xl cursor-pointer transition transform active:scale-95 flex items-center justify-center gap-2 shadow-md shadow-emerald-550/10"
                    title="تسجيل استلام الراتب وتصفير الحساب لليوم"
                  >
                    <Wallet className="w-4 h-4" />
                    تم القبض (تسوية وصرف الراتب)
                  </button>
                  
                  <button
                    onClick={handlePrintReceipt}
                    className="p-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-2xl text-slate-700 dark:text-slate-205 transition cursor-pointer"
                    title="تحضير وطباعة إيصال استلام الرواتب PDF"
                  >
                    <Printer className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>

              {/* Advanced date-bound calculations & filter tabs */}
              <div className="space-y-3">
                <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-2xl gap-1">
                  {(['all', 'week', 'month', 'custom'] as const).map((type) => {
                    const label = type === 'all' ? 'كامل الأرشيف' : type === 'week' ? 'آخر 7 أيام' : type === 'month' ? 'آخر 30 يوم' : 'تاريخ مخصص 📅';
                    return (
                      <button
                        key={type}
                        onClick={() => setFilterType(type)}
                        className={`flex-1 py-1.5 text-[10px] font-black rounded-xl transition ${
                          filterType === type
                            ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-455 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Datepicker custom row */}
                {filterType === 'custom' && (
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-905/30 p-2.5 rounded-2xl border dark:border-slate-800 animate-slide-up">
                    <div>
                      <span className="block text-[8px] text-slate-400 font-bold mb-0.5">البداية:</span>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full text-[10px] font-bold px-2 py-1 bg-white dark:bg-slate-850 border rounded-md outline-none"
                      />
                    </div>
                    <div>
                      <span className="block text-[8px] text-slate-400 font-bold mb-0.5">النهاية:</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full text-[10px] font-bold px-2 py-1 bg-white dark:bg-slate-850 border rounded-md outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Structured details ledger metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  <div className="bg-slate-50 dark:bg-slate-900/30 p-3 rounded-2xl border dark:border-slate-800">
                    <span className="text-[8px] text-slate-450 block font-black">أيام الحضور بالوردية</span>
                    <strong className="text-xs text-slate-700 dark:text-slate-200 block mt-0.5">{stats.periodDaysPresent} أيام عمل</strong>
                    <span className="text-[7.5px] text-slate-400 block mt-0.5">من أصل سجلات هذه الفترة</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/30 p-3 rounded-2xl border dark:border-slate-800">
                    <span className="text-[8px] text-slate-450 block font-black">مستحقات العمل المفتوحة</span>
                    <strong className="text-xs text-slate-700 dark:text-slate-200 block mt-0.5">{stats.periodEarned.toFixed(0)} ج.م</strong>
                    <span className="text-[7.5px] text-slate-400 block mt-0.5">يوميات وإضافي عمال مجهولين</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/30 p-3 rounded-2xl border dark:border-slate-800">
                    <span className="text-[8px] text-slate-450 block font-black">السلف المخصومة</span>
                    <strong className="text-xs text-rose-500 block mt-0.5">-{stats.periodAdvances.toFixed(0)} ج.م</strong>
                    <span className="text-[7.5px] text-slate-400 block mt-0.5">صرف عاجل موقع الحفر</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/30 p-3 rounded-2xl border dark:border-slate-800">
                    <span className="text-[8px] text-slate-450 block font-black">المقبوضات المسلمة</span>
                    <strong className="text-xs text-emerald-500 block mt-0.5">+{stats.periodPaid.toFixed(0)} ج.م</strong>
                    <span className="text-[7.5px] text-slate-400 block mt-0.5">دفع يدوي مسجل بالدفتر</span>
                  </div>
                </div>
              </div>

              {/* Two Column Layout: Attendance logs vs Payment history */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Regular Calendar log */}
                <div className="bg-white dark:bg-slate-805 border dark:border-slate-700 p-3 rounded-2xl space-y-2">
                  <h4 className="text-[11px] font-black text-slate-700 dark:text-slate-300 flex items-center gap-1 border-b pb-1.5 mb-2">
                    <Calendar className="w-3.5 h-3.5 text-sky-500" />
                    مسير وتاريخ الحضور واليوميات ({filteredAttendance.length})
                  </h4>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 text-[9px] pr-1">
                    {filteredAttendance.length === 0 ? (
                      <p className="text-center text-slate-400 dark:text-slate-500 font-bold py-6">لم يتم تسجيل حضور للوردية خلال هذه الفترة.</p>
                    ) : (
                      filteredAttendance.map(r => (
                        <div
                          key={r.date}
                          className={`flex items-center justify-between p-2 rounded-lg border ${
                            r.isPresent
                              ? 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800'
                              : 'bg-rose-50/40 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/20'
                          }`}
                        >
                          <div>
                            <span className="font-extrabold text-slate-700 dark:text-slate-205 block">{r.date}</span>
                            {r.notes && <span className="text-[7.5px] block text-slate-405">{r.notes}</span>}
                          </div>
                          
                          <div className="text-left font-bold">
                            {r.isPresent ? (
                              <div className="space-y-0.5">
                                <span className="text-emerald-600 block">يوم كامل حضر</span>
                                {(r.otHours > 0 || r.advance > 0) && (
                                  <span className="text-[7.5px] text-amber-600 dark:text-amber-450 block">
                                    {r.otHours > 0 && `إضافي: ${r.otHours}س `}
                                    {r.advance > 0 && `سلفة: -${r.advance}ج`}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-rose-500 block">غياب عطلة / عازل</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Payment History Log */}
                <div className="bg-white dark:bg-slate-805 border dark:border-slate-700 p-3 rounded-2xl space-y-2">
                  <h4 className="text-[11px] font-black text-slate-700 dark:text-slate-300 flex items-center gap-1 border-b pb-1.5 mb-2">
                    <Wallet className="w-3.5 h-3.5 text-emerald-500" />
                    جدول وحافظة الدفعات المستلمة لليد ({filteredPayments.length})
                  </h4>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 text-[9px] pr-1">
                    {filteredPayments.length === 0 ? (
                      <p className="text-center text-slate-400 dark:text-slate-500 font-bold py-6">لم يتم تسليم دفعات لليد أو أجور في هذه الفترة.</p>
                    ) : (
                      filteredPayments.map(p => (
                        <div
                          key={p.id}
                          className={`flex justify-between items-center p-2 rounded-lg border ${
                            p.isSettlement
                              ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30'
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800'
                          }`}
                        >
                          <div>
                            <span className="font-black text-slate-850 dark:text-white block">
                              {p.amount.toFixed(0)} ج.م
                              {p.isSettlement && <span className="mr-1.5 text-[7.5px] bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-1 py-0.5 rounded">تسوية شاملة ✅</span>}
                            </span>
                            <span className="text-[8px] text-slate-400 dark:text-slate-500 block">{p.date} • {p.notes || 'لا يوجد تفاصيل'}</span>
                          </div>
                          
                          <button
                            onClick={() => {
                              showConfirm({
                                title: 'إلغاء المعاملة المالية',
                                message: `هل أنت متأكد تماماً من رغبتك في إلغاء سحب هذه الدفعة البالغة [${p.amount} ج.م]؟ سيتم إعادة خصمها فورياً من حساب العامل.`,
                                onConfirm: () => {
                                  onDeletePayment(p.id);
                                  showToast('تم إلغاء سحب الدفعة المالية بنجاح.', 'info');
                                }
                              });
                            }}
                            className="bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 text-slate-500 hover:text-rose-600 block text-[8px] px-2 py-1 rounded transition border cursor-pointer font-black"
                          >
                            مسح
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal footer navigation drawer buttons */}
        <footer className="bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700/60 p-3 flex justify-between gap-2.5">
          <div className="flex gap-2.5">
            <a
              href={getWhatsAppShareLink()}
              target="_blank"
              referrerPolicy="no-referrer"
              className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-500 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              مشاركة الإيصال واتساب
            </a>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs cursor-pointer"
          >
            إغلاق المراجعة
          </button>
        </footer>
      </div>

      {/* Embedded Settlement Action note sheet ("تم القبض") */}
      {isSettlingOpen && (
        <div className="fixed inset-0 bg-slate-905/75 backdrop-blur-md flex items-center justify-center z-55 p-4" dir="rtl">
          <div className="bg-white dark:bg-slate-800 rounded-[28px] p-6 w-full max-w-sm shadow-2xl border border-slate-100 dark:border-slate-700">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-150 flex items-center gap-2 mb-2">
              <Check className="text-emerald-500 w-5 h-5 animate-bounce" />
              تأكيد "تم القبض" وصرف الراتب
            </h3>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed mb-4">
              أنت على وشك تصفير المديونية وصرف المستحق المالي المتبقي للعامل <strong className="text-sky-600 dark:text-sky-400">"{worker.name}"</strong> والبالغ قيمته:
              <span className="block text-center text-lg font-black text-emerald-600 dark:text-emerald-400 bg-slate-50 dark:bg-slate-900 border rounded-xl py-2 my-2 select-all">
                {stats.lifetimeBalance.toFixed(0)} ج.م
              </span>
              سيتم تسجيل دفعة مالية بقيمة المسير الكلي، مّما يجعله يسحب مديونيته بالكامل لتصبح [0 ج.م]. هل تقر بالصرف النقدي لليد؟
            </p>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-[10px] text-slate-405 font-bold mb-1">ملاحظات وراية كشف الأجور (اختياري)</label>
                <input
                  type="text"
                  placeholder="مثال: تسوية مرتب شهر مارس بالكامل"
                  value={settlementNotes}
                  onChange={(e) => setSettlementNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border dark:border-slate-705 rounded-lg text-xs font-semibold outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSettlementSubmit}
                className="flex-1 py-2.5 bg-emerald-600 text-white font-black text-xs rounded-xl hover:bg-emerald-500 active:scale-95 transition cursor-pointer"
              >
                تأكيد تسوية "تم القبض" ✅
              </button>
              <button
                onClick={() => setIsSettlingOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-705 dark:text-slate-200 rounded-xl font-bold cursor-pointer text-xs"
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
