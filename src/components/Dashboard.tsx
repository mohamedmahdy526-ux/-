import { Worker, AttendanceRecord, WorkSite, PaymentRecord } from '../types';
import { LayoutDashboard, Users, Clock, DollarSign, Wallet, ClipboardCheck, ArrowLeft, ArrowRight, ShieldAlert, Sparkles, PlusCircle } from 'lucide-react';

interface DashboardProps {
  workers: Worker[];
  attendance: AttendanceRecord[];
  sites: WorkSite[];
  payments: PaymentRecord[];
  selectedDate: string;
  onNavigateToTab: (tab: string) => void;
  onCopyYesterday: () => void;
  onQuickAddWorker: () => void;
}

export default function Dashboard({
  workers,
  attendance,
  sites,
  payments,
  selectedDate,
  onNavigateToTab,
  onCopyYesterday,
  onQuickAddWorker
}: DashboardProps) {
  
  // Daily logic stats
  const dailyRecords = attendance.filter(r => !workers.find(w => w.id === r.workerId)?.archived).filter(r => r.date === selectedDate);
  const presentRecords = dailyRecords.filter(r => r.isPresent);
  const activeWorkers = workers.filter(w => !w.archived);
  const totalWorkersCount = activeWorkers.length;
  const presentCount = presentRecords.length;

  let totalDailyBasic = 0;
  let totalDailyOT = 0;
  let totalDailyAdvances = 0;

  presentRecords.forEach(r => {
    const worker = workers.find(w => w.id === r.workerId);
    if (worker) {
      totalDailyBasic += worker.dailyRate;
      totalDailyOT += r.otHours * worker.otRate;
      totalDailyAdvances += r.advance;
    }
  });

  const totalDailyNet = (totalDailyBasic + totalDailyOT) - totalDailyAdvances;

  // --- Historic Financial Cumulative Stats ---
  let totalHistoricEarned = 0;
  let totalHistoricAdvances = 0;

  attendance.forEach(r => {
    const worker = workers.find(w => w.id === r.workerId);
    if (worker) {
      if (r.isPresent) {
        totalHistoricEarned += worker.dailyRate + (r.otHours * worker.otRate);
      }
      totalHistoricAdvances += r.advance;
    }
  });

  const totalPaymentsMade = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalRemainingBalance = totalHistoricEarned - totalHistoricAdvances - totalPaymentsMade;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Dynamic stats cards list */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total daily net wage */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition"></div>
          <div className="flex items-center justify-between mb-1.55">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold block">صافي رواتب اليوم</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg font-black text-emerald-600 dark:text-emerald-450">{totalDailyNet.toFixed(0)} ج.م</div>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 font-semibold">شامل الإضافي مخصوم السلف</p>
        </div>

        {/* Present workers today */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl group-hover:bg-sky-500/10 transition"></div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold block">الحاضرون اليوم</span>
            <Users className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-lg font-black text-sky-600 dark:text-sky-450">
            {presentCount} <span className="text-xs text-slate-400 font-normal">من {totalWorkersCount}</span>
          </div>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 font-semibold">المقرر توريدهم بالمواقع</p>
        </div>

        {/* Active Overall Remaining Balance */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition"></div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold block">مستحقات العمال المتبقية</span>
            <Wallet className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-lg font-black text-rose-600 dark:text-rose-400">{totalRemainingBalance.toFixed(0)} ... ج.م</div>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 font-semibold">إجمالي المتبقي بعد السلف والدفعات</p>
        </div>

        {/* Paid Wages Today/History */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition"></div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold block">إجمالي الدفعات المسددة</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg font-black text-slate-800 dark:text-slate-100">{totalPaymentsMade.toFixed(0)} ج.م</div>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 font-semibold">تنزيلات الدفعات اليدوية الصادرة</p>
        </div>
      </div>

      {/* Quick Quick action toolbar buttons */}
      <div className="flex flex-wrap gap-2 py-1">
        <button
          onClick={() => onNavigateToTab('reportsTab')}
          className="flex-1 min-w-[110px] py-2 px-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-755 text-slate-700 dark:text-slate-300 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 transform active:scale-95 cursor-pointer shadow-sm"
        >
          📈 التقارير المالية
        </button>
        <button
          onClick={() => onNavigateToTab('sitesTab')}
          className="flex-1 min-w-[110px] py-2 px-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-755 text-slate-700 dark:text-slate-300 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 transform active:scale-95 cursor-pointer shadow-sm"
        >
          🏗️ موقع جديد
        </button>
        <button
          onClick={onCopyYesterday}
          className="flex-1 min-w-[110px] py-2 px-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-755 text-slate-700 dark:text-slate-300 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 transform active:scale-95 cursor-pointer shadow-sm"
        >
          📋 نسخ حضور الأمس
        </button>
        <button
          onClick={onQuickAddWorker}
          className="flex-1 min-w-[110px] py-2 px-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-755 text-slate-700 dark:text-slate-300 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 transform active:scale-95 cursor-pointer shadow-sm"
        >
          👷 إضافة عامل
        </button>
      </div>

      {/* Primary prominent Call to Action visual card */}
      <div className="bg-gradient-to-br from-sky-600 to-sky-700 text-white p-5 rounded-3xl shadow-lg relative overflow-hidden group">
        {/* Glow backdrop design */}
        <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition duration-500"></div>
        <div className="absolute bottom-[-30%] left-[-20%] w-48 h-48 bg-sky-400/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex justify-between items-start">
          <div className="space-y-1 z-10">
            <span className="text-[10px] bg-sky-500/45 text-sky-100 font-extrabold px-3 py-1 rounded-full flex items-center gap-1 w-max">
              <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
              الآن في الوردية النشطة
            </span>
            <h3 className="text-base font-extrabold pt-1">
              جاهز لبدء تحضير عمالك اليوم؟
            </h3>
            <p className="text-[11px] text-sky-100 max-w-[90%] leading-relaxed font-semibold">
              سجل حالة المقاولين والعمال اليومية، ساعات العمل الإضافي للتأجير، مبالغ السلفية اليومية وتوريدات عهد المشاريع بسهولة تامة.
            </p>
          </div>
          <ClipboardCheck className="w-12 h-12 text-white/30 shrink-0" />
        </div>

        <button
          onClick={() => onNavigateToTab('attendanceTab')}
          className="mt-4 w-full bg-white hover:bg-sky-50 text-sky-700 font-black text-xs py-2.5 rounded-2xl shadow-sm transition transform active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
        >
          بدء تحضير العمال اليومي ✔
          <ArrowLeft className="w-4 h-4 animation-bounce-horizontal" />
        </button>
      </div>

      {/* Latest Logging Logs / Activity notifications panel */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <strong className="text-xs font-extrabold text-slate-800 dark:text-slate-200">📌 آخر النشاطات المسجلة اليوم</strong>
          <span className="text-[10px] text-sky-600 dark:text-sky-400 font-bold hover:underline cursor-pointer" onClick={() => onNavigateToTab('reportsTab')}>
            عرض التقارير الشاملة
          </span>
        </div>

        <div className="space-y-2">
          {presentCount > 0 ? (
            <div className="flex items-start gap-2.5 p-2 bg-slate-50 dark:bg-slate-900/10 rounded-xl text-xs font-semibold text-slate-650 dark:text-slate-355">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5"></span>
              <div>
                <span>تم إثبات حضور عدد <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{presentCount} عامل</span> في كشف تاريخ اليوم {selectedDate}.</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5">سجلت العوائد الإجمالية {totalDailyNet.toFixed(0)} ج.م شاملة كل الاستقطاعات.</span>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 p-2.5 bg-amber-500/5 rounded-xl text-xs font-semibold text-amber-700 dark:text-amber-400 border border-amber-500/10">
              <ShieldAlert className="w-4 h-4 mt-0.5 text-amber-500 shrink-0" />
              <div>
                <span>كشف الحضور اليومي لتاريخ {selectedDate} فارغ حالياً أو لم يتم تسجيل حضور أي عامل.</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5">انقر على الزر الرئيسي أعلاه لبدء رصد الحضور الفعلي.</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2.5 p-2 bg-slate-50 dark:bg-slate-900/10 rounded-xl text-xs font-semibold text-slate-650 dark:text-slate-355">
            <span className="w-2 h-2 rounded-full bg-sky-500"></span>
            <div>
              <span>مواقع عمل مسجلة نشطة: <span className="font-extrabold text-sky-600 dark:text-sky-400">{sites.length} مواقع</span></span>
              <span className="text-[10px] text-slate-405 block mt-0.5">الموقع الحالي: {sites[0]?.name || 'موقع المشروع الرئيسي'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
