import { useState } from 'react';
import { Worker, AttendanceRecord, WorkSite, PaymentRecord } from '../types';
import { useUIFeedback } from './UIFeedbackProvider';
import { 
  FileSpreadsheet, Download, Search, SlidersHorizontal, Calendar, 
  TrendingUp, DollarSign, Clock, Users, Printer, FileText, Wallet, Check, ChevronDown, ChevronUp
} from 'lucide-react';

interface ReportsProps {
  workers: Worker[];
  attendance: AttendanceRecord[];
  sites: WorkSite[];
  payments: PaymentRecord[];
  selectedDate: string;
  onAddPayment: (workerId: string, amount: number, date: string, notes?: string) => void;
  onDeletePayment: (paymentId: string) => void;
}

export default function Reports({ 
  workers, 
  attendance, 
  sites, 
  payments, 
  selectedDate,
  onAddPayment,
  onDeletePayment
}: ReportsProps) {
  const { showToast, showConfirm } = useUIFeedback();
  const [reportType, setReportType] = useState<'daily' | 'cumulative' | 'receipts'>('daily');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>('all');

  // Individual Receipt printing state
  const [targetWorkerId, setTargetWorkerId] = useState<string>('');
  const [customReceiptAmount, setCustomReceiptAmount] = useState<string>('');
  const [customReceiptNotes, setCustomReceiptNotes] = useState<string>('صرف دفعة تحت الحساب');
  const [customReceiptDate, setCustomReceiptDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  // Daily statistics
  const dailyRecords = attendance.filter(r => r.date === selectedDate);
  const presentDailyRecords = dailyRecords.filter(r => r.isPresent);

  let totalDailyBasic = 0;
  let totalDailyOT = 0;
  let totalDailyAdvances = 0;

  presentDailyRecords.forEach(r => {
    const worker = workers.find(w => w.id === r.workerId);
    if (worker) {
      totalDailyBasic += worker.dailyRate;
      totalDailyOT += r.otHours * worker.otRate;
      totalDailyAdvances += r.advance;
    }
  });

  const totalDailyNet = (totalDailyBasic + totalDailyOT) - totalDailyAdvances;

  // Cumulative calculation helpers
  const getCumulativeStats = (worker: Worker) => {
    const records = attendance.filter(r => r.workerId === worker.id);
    const presentRecords = records.filter(r => r.isPresent);

    const totalDaysWorked = presentRecords.length;
    let earnedBasic = 0;
    let earnedOT = 0;
    let totalAdvances = 0;
    let totalOtHours = 0;

    presentRecords.forEach(r => {
      earnedBasic += worker.dailyRate;
      earnedOT += r.otHours * worker.otRate;
      totalOtHours += r.otHours;
      totalAdvances += r.advance;
    });

    const workerPayments = payments.filter(p => p.workerId === worker.id);
    const totalPaid = workerPayments.reduce((sum, p) => sum + p.amount, 0);
    const balance = (earnedBasic + earnedOT) - totalAdvances - totalPaid;

    let lastSeenDate = presentRecords.length > 0 ? presentRecords[presentRecords.length - 1].date : '-';
    let lastPayDate = workerPayments.length > 0 ? [...workerPayments].sort((a,b) => b.date.localeCompare(a.date))[0].date : 'لا يوجد';

    return {
      totalDaysWorked,
      earnedBasic,
      earnedOT,
      earned: earnedBasic + earnedOT,
      totalOtHours,
      totalAdvances,
      totalPaid,
      balance,
      lastSeenDate,
      lastPayDate
    };
  };

  const activeWorkers = workers.filter(w => !w.archived);

  // Filter Workers lists based on search
  const filteredWorkersForReport = (reportType === 'daily' ? workers : activeWorkers).filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSite = selectedSiteFilter === 'all' || w.siteId === selectedSiteFilter;
    return matchesSearch && matchesSite;
  });

  // Calculate Cumulative totals
  const totalCumulativeNetDues = activeWorkers
    .filter(w => selectedSiteFilter === 'all' || w.siteId === selectedSiteFilter)
    .reduce((sum, w) => sum + getCumulativeStats(w).balance, 0);

  // Quick Action: Print Daily payroll sheet
  const handlePrintDailyReport = () => {
    window.print();
  };

  // CSV Exporter daily sheet
  const exportDailyCSV = () => {
    let csv = "\uFEFFاسم العامل,الحالة,يومية أساسية,ساعات إضافي,مبلغ إضافي,سلفيات مسحوبة,صافي اليومية (ج.م),ملاحظات\n";
    
    filteredWorkersForReport.forEach(w => {
      const rec = dailyRecords.find(r => r.workerId === w.id);
      const isPresent = rec?.isPresent ?? false;
      const otHours = rec?.otHours ?? 0;
      const advance = rec?.advance ?? 0;
      const notes = rec?.notes ?? '';
      const otPay = otHours * w.otRate;
      const net = isPresent ? (w.dailyRate + otPay) - advance : 0;

      csv += `"${w.name}",${isPresent ? 'حاضر' : 'غائب'},${w.dailyRate},${otHours},${otPay},${advance},${net},"${notes}"\n`;
    });

    downloadCSV(csv, `تقرير_التحضير_اليومي_المهتدي_${selectedDate}.csv`);
  };

  // CSV Exporter cumulative sheet
  const exportCumulativeCSV = () => {
    let csv = "\uFEFFاسم العامل,الموقع,أيام الحضور الكلية,إجمالي الأجر الأساسي,إجمالي الإضافي,سلفيات كشوف اليومية,إجمالي الدفعات المسلمة,الأمانة الصافية المتبقية (ج.م)\n";
    
    filteredWorkersForReport.forEach(w => {
      const stats = getCumulativeStats(w);
      const siteName = sites.find(s => s.id === w.siteId)?.name || '';
      csv += `"${w.name}","${siteName}",${stats.totalDaysWorked},${stats.earnedBasic},${stats.earnedOT},${stats.totalAdvances},${stats.totalPaid},${stats.balance}\n`;
    });

    downloadCSV(csv, `مسير_الأرصدة_التراكمي_المهتدي_${selectedDate}.csv`);
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Build printing components based on selection
  const targetWorker = workers.find(w => w.id === targetWorkerId);
  const targetWorkerStats = targetWorker ? getCumulativeStats(targetWorker) : null;
  const computedReceiptVal = targetWorkerStats ? (customReceiptAmount ? parseFloat(customReceiptAmount) : targetWorkerStats.balance) : 0;

  return (
    <div className="space-y-4">
      
      {/* Upper Tab Switcher Header */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FileSpreadsheet className="text-sky-600 dark:text-sky-400 w-5.5 h-5.5" />
            التقارير المالية ودفاتر الأجور
          </h2>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            تتبع يوميات المقاولة، السلف، الدفعات المستلمة، وتوليد إيصالات الدفع والطباعة PDF الفورية
          </p>
        </div>

        {/* Change report type toggles */}
        <div className="bg-slate-100 dark:bg-slate-750 p-1 rounded-2xl flex gap-1 self-start sm:self-auto box-border">
          <button
            onClick={() => { setReportType('daily'); setSearchTerm(''); }}
            className={`px-3 py-1.5 text-xs font-black rounded-xl transition cursor-pointer ${
              reportType === 'daily'
                ? 'bg-white dark:bg-slate-600 text-sky-600 dark:text-sky-300 shadow-sm'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            كشف حضور اليوم 📅
          </button>
          <button
            onClick={() => { setReportType('cumulative'); setSearchTerm(''); }}
            className={`px-3 py-1.5 text-xs font-black rounded-xl transition cursor-pointer ${
              reportType === 'cumulative'
                ? 'bg-white dark:bg-slate-600 text-sky-600 dark:text-sky-300 shadow-sm'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            كشف الحساب التراكمي 📊
          </button>
          <button
            onClick={() => { setReportType('receipts'); setTargetWorkerId(workers[0]?.id || ''); }}
            className={`px-3 py-1.5 text-xs font-black rounded-xl transition cursor-pointer ${
              reportType === 'receipts'
                ? 'bg-white dark:bg-slate-600 text-sky-600 dark:text-sky-300 shadow-sm'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            إيصالات الدفع والقبض 🧾
          </button>
        </div>
      </div>

      {/* Numerical Quick Highlights cards depending on active sub-tab */}
      {reportType === 'daily' ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-xs text-center">
            <DollarSign className="w-5 h-5 text-emerald-500 mx-auto mb-1 animate-pulse" />
            <span className="text-[9px] text-slate-400 font-extrabold block">صافي يوميات اليوم</span>
            <span className="text-xs font-black text-slate-800 dark:text-slate-100">{totalDailyNet.toFixed(0)} ج.م</span>
          </div>
          <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-xs text-center">
            <Users className="w-5 h-5 text-sky-500 mx-auto mb-1" />
            <span className="text-[9px] text-slate-400 font-extrabold block">الحاضرون اليوم</span>
            <span className="text-xs font-black text-slate-800 dark:text-slate-100">{presentDailyRecords.length} عمال</span>
          </div>
          <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-xs text-center">
            <Clock className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <span className="text-[9px] text-slate-400 font-extrabold block">الإضافي المسجل اليوم</span>
            <span className="text-xs font-black text-slate-800 dark:text-slate-100">
              {presentDailyRecords.reduce((sum, r) => sum + r.otHours, 0)} ساعة
            </span>
          </div>
          <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-xs text-center">
            <TrendingUp className="w-5 h-5 text-rose-500 mx-auto mb-1" />
            <span className="text-[9px] text-slate-400 font-extrabold block">إجمالي سلفيات اليوم</span>
            <span className="text-xs font-black text-slate-800 dark:text-slate-100">
              {presentDailyRecords.reduce((sum, r) => sum + r.advance, 0)} ج.م
            </span>
          </div>
        </div>
      ) : reportType === 'cumulative' ? (
        <div className="bg-sky-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-sky-100/60 dark:border-slate-700/40 flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black text-sky-700 dark:text-sky-400 block">إجمالي الأمانة الصافية المستحقة والرواتب المتبقية</span>
            <span className="text-lg font-black text-slate-800 dark:text-slate-100">{totalCumulativeNetDues.toFixed(0)} ج.م</span>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 block mt-0.5">المرتبات وساعات الإضافي مخصومة منها سلف دفاتر اليوم وكافة الدفعات الصادرة للمقاولين</span>
          </div>
          <div className="bg-sky-600/10 p-3 rounded-2xl">
            <DollarSign className="w-6 h-6 text-sky-600 dark:text-sky-400" />
          </div>
        </div>
      ) : null}

      {/* Receipts configuration builder layout */}
      {reportType === 'receipts' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Builder Form */}
          <div className="md:col-span-1 bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm space-y-3">
            <strong className="text-xs font-black text-slate-800 dark:text-slate-200 block border-b pb-1.5 flex items-center gap-1">
              <FileText className="w-4 h-4 text-sky-500" />
              تكوين إيصال صرف وتصفية حساب
            </strong>

            <div>
              <label className="block text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1">اختر العامل</label>
              <select
                value={targetWorkerId}
                onChange={(e) => {
                  setTargetWorkerId(e.target.value);
                  setCustomReceiptAmount('');
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-sky-500 text-right"
              >
                <option value="">-- اختر من قائمة عمالك --</option>
                {activeWorkers.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            {targetWorker && targetWorkerStats && (
              <>
                <div className="p-3 bg-sky-500/5 rounded-2xl border border-sky-500/10 space-y-1">
                  <span className="text-[9px] text-slate-400 block font-bold">ملخص الحساب الحالي اللحظي:</span>
                  <div className="flex justify-between text-[11px] font-bold">
                    <span>مجموع مستحقات العمل:</span>
                    <span>{targetWorkerStats.earned.toFixed(0)} ج.م</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-bold text-rose-550">
                    <span>مخصوم السلف والعهد:</span>
                    <span>-{targetWorkerStats.totalAdvances.toFixed(0)} ج.م</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-bold text-emerald-600">
                    <span>مستلم دفعات سابقة:</span>
                    <span>-{targetWorkerStats.totalPaid.toFixed(0)} ج.م</span>
                  </div>
                  <div className="flex justify-between text-xs font-black text-sky-600 pt-1.5 border-t">
                    <span>المتبقي الصافي الآن:</span>
                    <span>{targetWorkerStats.balance.toFixed(0)} ج.م</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1">البيان وطبيعة المعاملة</label>
                  <input
                    type="text"
                    value={customReceiptNotes}
                    onChange={(e) => setCustomReceiptNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-755 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1">تاريخ الصرف</label>
                  <input
                    type="date"
                    value={customReceiptDate}
                    onChange={(e) => setCustomReceiptDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-755 rounded-xl text-xs font-black text-slate-800 dark:text-slate-200 outline-none h-max"
                  />
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      if (computedReceiptVal <= 0) {
                        showToast('مبلغ الصرف فارغ أو غير صالح!', 'error');
                        return;
                      }
                      showConfirm({
                        title: 'تسجيل دفعة أجور',
                        message: `هل ترغب بإنهاء تسوية هذا الصرف فورياً وتسجيل دفعة أجور بقيمة [${computedReceiptVal} ج.م] في سجل وحفظ الفاتورة؟`,
                        onConfirm: () => {
                          onAddPayment(targetWorkerId, computedReceiptVal, customReceiptDate, customReceiptNotes);
                          showToast('تم إدراج الدفعة الفورية بنجاح في مسير الأجور التاريخي للعامل!', 'success');
                          setCustomReceiptAmount('');
                        }
                      });
                    }}
                    className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 font-black text-white rounded-xl text-[10px] transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    تسجيل المعاملة وطباعة الإيصال الفوري PDF
                  </button>
                </div>
              </>
            )}

            {!targetWorker && (
              <p className="text-[10px] text-slate-400 text-center py-6 font-bold">الرجاء تحديد عامل كشف من الأعلى لتوليد سند الصرف التفصيلي وطباعته</p>
            )}
          </div>

          {/* Visual Invoice Paystub Rendering (Print Mockup) */}
          <div className="md:col-span-2 bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm relative space-y-4">
            <strong className="text-xs font-black text-slate-800 dark:text-slate-200 block border-b pb-1.5 flex items-center gap-1">
              <Printer className="w-4 h-4 text-emerald-500" />
              سند الصرف المالي الفعلي (نماذج إيصالات المهتدي)
            </strong>

            {targetWorker && targetWorkerStats ? (
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl p-6 space-y-4 bg-slate-50/50 dark:bg-transparent relative text-right text-xs text-slate-800 dark:text-slate-200">
                
                {/* Header stamp */}
                <div className="flex justify-between items-start border-b pb-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-sky-600 dark:text-sky-400">🏗️ المهتدي للمقاولات العامة</h4>
                    <p className="text-[9px] text-slate-400 font-bold">أعمال التشييد، الخرسانات وتشطيبات المباني</p>
                  </div>
                  <div className="text-left">
                    <span className="font-mono text-[9px] bg-slate-250 dark:bg-slate-700 px-3 py-1 rounded-full text-slate-600 dark:text-slate-350 font-black">سند مستحقات رقم EP-{targetWorker.id.slice(-4)}-{Date.now().toString().slice(-4)}</span>
                    <span className="text-[9px] text-slate-400 block mt-1">تاريخ المعاينة: {customReceiptDate}</span>
                  </div>
                </div>

                {/* Patient / Worker Meta Details */}
                <div className="grid grid-cols-2 gap-4 py-2 border-b">
                  <div>
                    <span className="text-slate-400 text-[9px] font-bold block">يصرف لصالح السيد العامل /</span>
                    <strong className="text-sm font-black text-slate-900 dark:text-white block">{targetWorker.name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[9px] font-bold block">موقع تعيين الورشة /</span>
                    <strong className="text-xs font-black block">{sites.find(s => s.id === targetWorker.siteId)?.name || 'موقع المشروع الرئيسي'}</strong>
                  </div>
                </div>

                {/* Calculation breakdown */}
                <div className="space-y-2 border-b pb-4">
                  <span className="text-slate-400 text-[9px] font-extrabold block">جدول تفاصيل المرتب والمستحقات والعمل الإضافي:</span>
                  <div className="grid grid-cols-5 text-center font-bold text-[10px] bg-white dark:bg-slate-900/50 p-2 rounded-xl border">
                    <div>عقد اليومية</div>
                    <div>أيام العمل</div>
                    <div>ساعات إضافي</div>
                    <div>المجموع الأولي</div>
                    <div>إجمالي السلف</div>
                  </div>
                  <div className="grid grid-cols-5 text-center font-bold text-xs py-1">
                    <div>{targetWorker.dailyRate}ج</div>
                    <div className="text-sky-600">{targetWorkerStats.totalDaysWorked} يوم</div>
                    <div className="text-amber-600">{targetWorkerStats.totalOtHours} س</div>
                    <div>{targetWorkerStats.earned.toFixed(0)} ج</div>
                    <td className="text-rose-500">-{targetWorkerStats.totalAdvances.toFixed(0)} ج</td>
                  </div>
                </div>

                {/* Large Amount Field Box */}
                <div className="bg-emerald-500/10 dark:bg-slate-950 p-4 rounded-2xl border border-emerald-500/15 flex justify-between items-center">
                  <div className="space-y-0.5">
                    <span className="text-emerald-700 dark:text-emerald-400 text-[9px] font-black block">المبلغ المدفوع الحالي نقداً:</span>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">البيان: {customReceiptNotes}</p>
                  </div>
                  <strong className="text-xl font-black text-emerald-600 dark:text-emerald-400">{computedReceiptVal.toFixed(0)} ج.م</strong>
                </div>

                {/* Signatures section */}
                <div className="grid grid-cols-2 gap-8 pt-6">
                  <div className="border-t border-slate-250 border-dotted text-center pt-2 space-y-1">
                    <span className="text-[9px] text-slate-400 block font-bold">توقيع المستلم (العامل)</span>
                    <div className="h-6"></div>
                    <span className="text-[10px] font-bold block text-slate-350">........................................</span>
                  </div>
                  <div className="border-t border-slate-250 border-dotted text-center pt-2 space-y-1">
                    <span className="text-[9px] text-slate-400 block font-bold">إمضاء واعتماد المشرف المالي</span>
                    <div className="h-6"></div>
                    <span className="text-[10px] font-bold block text-slate-350">........................................</span>
                  </div>
                </div>

                <div className="pt-2 text-center">
                  <button
                    onClick={() => window.print()}
                    className="py-1 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/60 dark:hover:bg-slate-700 font-bold text-[9px] rounded-lg transition"
                  >
                    🖨️ معاينة وطباعة الفوليو النقدي
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl p-12 text-center text-slate-400">
                الرجاء تحديد عامل لعرض إيصاله في هذه المنطقة المصممة للطباعة الفورية.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Exporter and filters layout for Interactive sheets */}
      {reportType !== 'receipts' && (
        <>
          <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-440" />
                <input
                  type="text"
                  placeholder="البحث بالاسم لتصفية المقاولين..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-4 pr-10 py-1.5 bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs font-semibold text-slate-755 dark:text-slate-200"
                />
              </div>
              <div className="flex items-center gap-2 min-w-[130px]">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedSiteFilter}
                  onChange={(e) => setSelectedSiteFilter(e.target.value)}
                  className="w-full py-1.5 px-3 bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-[10px] font-bold text-slate-600 dark:text-slate-350"
                >
                  <option value="all">كل مواقع العمل 🗺️</option>
                  {sites.map(site => (
                    <option key={site.id} value={site.id}>{site.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-1.5">
              <button
                onClick={handlePrintDailyReport}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black cursor-pointer transition transform active:scale-95"
              >
                <Printer className="w-4 h-4" />
                طباعة PDF للتقرير 🖨️
              </button>

              <button
                onClick={reportType === 'daily' ? exportDailyCSV : exportCumulativeCSV}
                className="bg-sky-600 hover:bg-sky-500 text-white flex items-center justify-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-black cursor-pointer transition transform active:scale-95 shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4" />
                تصدير Excel
              </button>
            </div>
          </div>

          {/* Interactive Report Datatable */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm overflow-hidden pb-1">
            <div className="overflow-x-auto">
              {reportType === 'daily' ? (
                /* Daily table reports */
                <table className="w-full border-collapse text-right text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-700/60 font-extrabold text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-600">
                      <th className="p-3">اسم العامل</th>
                      <th className="p-3">موقع العمل</th>
                      <th className="p-3 text-center">حالة الحضور</th>
                      <th className="p-3">اليومية فردية</th>
                      <th className="p-3">إضافي الساعاتي</th>
                      <th className="p-3">السلفيات</th>
                      <th className="p-3">صافي المستحق</th>
                      <th className="p-3">الملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-semibold text-slate-650 dark:text-slate-350">
                    {filteredWorkersForReport.map(w => {
                      const rec = dailyRecords.find(r => r.workerId === w.id);
                      const isPresent = rec?.isPresent ?? false;
                      const otHours = rec?.otHours ?? 0;
                      const advance = rec?.advance ?? 0;
                      const notes = rec?.notes ?? '';
                      const otPay = otHours * w.otRate;
                      const net = isPresent ? (w.dailyRate + otPay) - advance : 0;
                      const sName = sites.find(s => s.id === w.siteId)?.name || 'موقع مجهول';

                      return (
                        <tr key={w.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750">
                          <td className="p-3 font-extrabold text-slate-800 dark:text-slate-100">{w.name}</td>
                          <td className="p-3 text-slate-400 dark:text-slate-500">{sName}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                              isPresent 
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' 
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-450'
                            }`}>
                              {isPresent ? 'حاضر ✔' : 'غائب ✖'}
                            </span>
                          </td>
                          <td className="p-3">{w.dailyRate} ج.م</td>
                          <td className="p-3">
                            {otHours > 0 ? (
                              <span className="text-amber-600 font-bold">{otHours} س (+{otPay}ج)</span>
                            ) : '0'}
                          </td>
                          <td className="p-3">
                            {advance > 0 ? (
                              <span className="text-rose-500 font-extrabold">{advance} ج.م</span>
                            ) : '0'}
                          </td>
                          <td className="p-3 font-black text-slate-800 dark:text-slate-100 text-xs">
                            {isPresent ? `${net.toFixed(0)} ج.م` : '0 ج.م'}
                          </td>
                          <td className="p-3 text-slate-400 dark:text-slate-500 max-w-[120px] truncate" title={notes}>
                            {notes || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                /* Cumulative balances reports folder */
                <table className="w-full border-collapse text-right text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-700/60 font-extrabold text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-600">
                      <th className="p-3">اسم العامل</th>
                      <th className="p-3">الموقع الحالي</th>
                      <th className="p-3">الحضور الكلي</th>
                      <th className="p-3">إجمالي الأجر</th>
                      <th className="p-3">مجموع السلف</th>
                      <th className="p-3">المسدد ليد العامل</th>
                      <th className="p-3">المتبقي الأمانة</th>
                      <th className="p-3">تاريخ آخر حضور</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-semibold text-slate-655 dark:text-slate-350">
                    {filteredWorkersForReport.map(w => {
                      const stats = getCumulativeStats(w);
                      const siteName = sites.find(s => s.id === w.siteId)?.name || 'موقع مجهول';

                      return (
                        <tr key={w.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750">
                          <td className="p-3 font-extrabold text-slate-800 dark:text-slate-100">{w.name}</td>
                          <td className="p-3 text-slate-400 dark:text-slate-500">{siteName}</td>
                          <td className="p-3 font-bold text-sky-600 dark:text-sky-400">{stats.totalDaysWorked} أيام</td>
                          <td className="p-3">{(stats.earnedBasic + stats.earnedOT).toFixed(0)} ج.م</td>
                          <td className="p-3 text-rose-500">
                            {stats.totalAdvances > 0 ? `-${stats.totalAdvances.toFixed(0)} ج` : '0'}
                          </td>
                          <td className="p-3 text-emerald-600">
                            {stats.totalPaid > 0 ? `+${stats.totalPaid.toFixed(0)} ج` : '0'}
                          </td>
                          <td className="p-3 font-black text-[13px]">
                            <span className={stats.balance >= 0 ? "text-sky-600 dark:text-sky-450" : "text-rose-500"}>
                              {stats.balance.toFixed(0)} ج.م
                            </span>
                          </td>
                          <td className="p-3 text-slate-400 text-[10px]">{stats.lastSeenDate}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* PERFECT ARABIC RTL PRINT DESIGN (HIDDEN SCREEN ONLY ACTIVATED VIA @MEDIA PRINT) */}
      {/* ========================================================================= */}
      <div className="hidden print:block text-slate-900 bg-white font-sans p-10 min-h-screen text-right" dir="rtl">
        
        {/* Print Option A: Daily attendance and wages report */}
        {reportType === 'daily' && (
          <div className="space-y-6">
            {/* Report Title */}
            <div className="flex justify-between items-center border-b-4 border-sky-600 pb-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight">🏗️ شركة المهتدي للمقاولات العامة والتشييد</h1>
                <p className="text-[11px] text-slate-500 mt-1">نظام حوكمة الحضور اليومي واستحقاقات العمال والموردين</p>
              </div>
              <div className="text-left">
                <p className="text-xs font-bold bg-slate-100 px-4 py-1.5 rounded-full inline-block">صفة التقرير: كشف الحضور واليوميات اليومي</p>
                <p className="text-[10px] text-slate-500 mt-1">تاريخ الكشف: {selectedDate}</p>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 border rounded-2xl text-center">
              <div>
                <span className="text-[10px] text-slate-500 block">إجمالي عُهد وصافي اليوميات:</span>
                <strong className="text-base font-black">{totalDailyNet.toFixed(0)} ج.م</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">عدد الحاضرين بالعملاء:</span>
                <strong className="text-base font-black">{presentDailyRecords.length} عمال</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">مجموع ساعات الإضافي:</span>
                <strong className="text-base font-black">
                  {presentDailyRecords.reduce((sum, r) => sum + r.otHours, 0)} ساعة
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">مجموع المأخوذ سلفيات:</span>
                <strong className="text-base font-black">
                  {presentDailyRecords.reduce((sum, r) => sum + r.advance, 0)} ج.م
                </strong>
              </div>
            </div>

            {/* Main printed table */}
            <table className="w-full border border-collapse text-xs mt-4">
              <thead>
                <tr className="bg-slate-100 font-bold border-b text-center">
                  <th className="p-2.5 border text-right">اسم العامل الفعلي</th>
                  <th className="p-2.5 border">موقع الورشة</th>
                  <th className="p-2.5 border">حالة الحضور</th>
                  <th className="p-2.5 border">عقد اليومية أساسي</th>
                  <th className="p-2.5 border">إضافي الساعات</th>
                  <th className="p-2.5 border">السلفيات المخصومة</th>
                  <th className="p-2.5 border">صافي اليوم المتبقي</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkersForReport.map((w, index) => {
                  const rec = dailyRecords.find(r => r.workerId === w.id);
                  const isPresent = rec?.isPresent ?? false;
                  const otHours = rec?.otHours ?? 0;
                  const advance = rec?.advance ?? 0;
                  const otPay = otHours * w.otRate;
                  const net = isPresent ? (w.dailyRate + otPay) - advance : 0;
                  const sName = sites.find(s => s.id === w.siteId)?.name || 'الافتراضي';

                  return (
                    <tr key={w.id} className="border-b text-center">
                      <td className="p-2.5 border text-right font-bold">{index + 1}. {w.name}</td>
                      <td className="p-2.5 border">{sName}</td>
                      <td className="p-2.5 border font-bold">{isPresent ? 'حاضر ✔' : 'غائب ✖'}</td>
                      <td className="p-2.5 border">{w.dailyRate} ج.م</td>
                      <td className="p-2.5 border">{otHours > 0 ? `${otHours} س (+${otPay}ج)` : '0'}</td>
                      <td className="p-2.5 border text-red-600">{advance > 0 ? `${advance} ج.م` : '0'}</td>
                      <td className="p-2.5 border font-bold text-sm">{isPresent ? `${net.toFixed(0)} ج.م` : '0.0'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* printed footer stamps */}
            <div className="grid grid-cols-3 gap-8 pt-10 mt-8">
              <div className="border-t border-dotted border-slate-400 text-center pt-2">
                <span className="text-[10px] text-slate-500 font-bold">توقيع مهندس المشروعات للموقع</span>
                <div className="h-10"></div>
                <span className="text-xs">..............................................</span>
              </div>
              <div className="border-t border-dotted border-slate-400 text-center pt-2">
                <span className="text-[10px] text-slate-500 font-bold">توقيع المراجع المالي للمؤسسة</span>
                <div className="h-10"></div>
                <span className="text-xs">..............................................</span>
              </div>
              <div className="border-t border-dotted border-slate-400 text-center pt-2">
                <span className="text-[10px] text-slate-500 font-bold">خاتم وتصديق المدير التنفيذي</span>
                <div className="h-10"></div>
                <span className="text-xs">..............................................</span>
              </div>
            </div>
          </div>
        )}

        {/* Print Option B: Cumulative balance record */}
        {reportType === 'cumulative' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b-4 border-sky-600 pb-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight">🏗️ شركة المهتدي للمقاولات العامة والتشييد</h1>
                <p className="text-[11px] text-slate-500 mt-1">مسير كشف الأرصدة الشامل والذمم والتسويات المالية التراكمية</p>
              </div>
              <div className="text-left">
                <p className="text-xs font-bold bg-slate-100 px-4 py-1.5 rounded-full inline-block">صفة التقرير: كشف الأرصدة التراكمي الشامل</p>
                <p className="text-[10px] text-slate-500 mt-1">تاريخ توليد الكشف: {selectedDate}</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border rounded-2xl flex justify-between items-center">
              <div>
                <span className="text-[10px] text-slate-500 block">إجمالي الذمم والأرصدة المستحقة تصفيتها للأطقم:</span>
                <strong className="text-lg font-black">{totalCumulativeNetDues.toFixed(0)} ج.م</strong>
              </div>
              <div className="text-left text-xs font-semibold text-slate-400">
                مشمول المظهر والتوليد التراكمي حتى {selectedDate}
              </div>
            </div>

            <table className="w-full border border-collapse text-xs mt-4">
              <thead>
                <tr className="bg-slate-100 font-bold border-b text-center">
                  <th className="p-2.5 border text-right">اسم العامل بالكامل</th>
                  <th className="p-2.5 border">موقع التكليف</th>
                  <th className="p-2.5 border">الحضور الكلي</th>
                  <th className="p-2.5 border">إجمالي المستحقات</th>
                  <th className="p-2.5 border">إجمالي السلف</th>
                  <th className="p-2.5 border">المبالغ المسلمة يدّاً</th>
                  <th className="p-2.5 border">الأمانة المتبقية لتصفيتها</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkersForReport.map((w, index) => {
                  const stats = getCumulativeStats(w);
                  const siteName = sites.find(s => s.id === w.siteId)?.name || 'موقع مجهول';

                  return (
                    <tr key={w.id} className="border-b text-center">
                      <td className="p-2.5 border text-right font-bold">{index + 1}. {w.name}</td>
                      <td className="p-2.5 border">{siteName}</td>
                      <td className="p-2.5 border font-bold">{stats.totalDaysWorked} أيام</td>
                      <td className="p-2.5 border">{(stats.earnedBasic + stats.earnedOT).toFixed(0)} ج.م</td>
                      <td className="p-2.5 border text-red-600">-{stats.totalAdvances.toFixed(0)} ج</td>
                      <td className="p-2.5 border text-emerald-600">+{stats.totalPaid.toFixed(0)} ج</td>
                      <td className="p-2.5 border font-black text-sm">{stats.balance.toFixed(0)} ج.م</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="grid grid-cols-3 gap-8 pt-10 mt-8">
              <div className="border-t border-dotted border-slate-400 text-center pt-2">
                <span className="text-[10px] text-slate-500 font-bold font-sans">توقيع مهندس المشروعات للموقع</span>
                <div className="h-10"></div>
                <span className="text-xs">..............................................</span>
              </div>
              <div className="border-t border-dotted border-slate-400 text-center pt-2">
                <span className="text-[10px] text-slate-500 font-bold">توقيع المراجع المالي للمؤسسة</span>
                <div className="h-10"></div>
                <span className="text-xs">..............................................</span>
              </div>
              <div className="border-t border-dotted border-slate-400 text-center pt-2">
                <span className="text-[10px] text-slate-500 font-bold">خاتم وتصديق رئيس مجلس الإدارة</span>
                <div className="h-10"></div>
                <span className="text-xs">..............................................</span>
              </div>
            </div>
          </div>
        )}

        {/* Print Option C: Salary receipt and voucher slip */}
        {reportType === 'receipts' && targetWorker && targetWorkerStats && (
          <div className="space-y-6 max-w-lg mx-auto border-3 border-slate-900/60 p-8 rounded-3xl" dir="rtl">
            <div className="text-center space-y-1 pb-4 border-b border-slate-300">
              <h1 className="text-lg font-bold">🏗️ شركة المهتدي للمقاولات العامة والتشييد</h1>
              <p className="text-[10px] text-slate-500 font-bold">سند صرف وتصفية مستحقات أجور عمالة موقعية</p>
            </div>

            <div className="space-y-3 py-4 text-xs">
              <div className="flex justify-between">
                <span>اسم المقاول / السيد العامل:</span>
                <strong className="text-sm font-black">{targetWorker.name}</strong>
              </div>
              <div className="flex justify-between">
                <span>الموقع المخصص:</span>
                <strong className="text-xs font-bold">{sites.find(s => s.id === targetWorker.siteId)?.name || 'الافتراضي'}</strong>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>تاريخ المعاملة والتسجيل:</span>
                <span className="font-bold">{customReceiptDate}</span>
              </div>

              <div className="space-y-1.5 pt-2">
                <span className="text-[9px] text-slate-400 block font-bold">ملخص الاستحقاقات التراكمية المحتسبة:</span>
                <div className="flex justify-between">
                  <span>إجمالي أجر العمل والتحضير الفعلي:</span>
                  <span>{targetWorkerStats.earned.toFixed(0)} ج.م</span>
                </div>
                <div className="flex justify-between text-red-650">
                  <span>مخصوم العهد وسحب السلف:</span>
                  <span>-{targetWorkerStats.totalAdvances.toFixed(0)} ج.م</span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>مجموع دفعات الدفاتر المستلمة سابقاً:</span>
                  <span>-{targetWorkerStats.totalPaid.toFixed(0)} ج.م</span>
                </div>
              </div>

              {/* Amount being paid right now in this slip */}
              <div className="p-4 bg-slate-100 border rounded-2xl flex justify-between items-center mt-4">
                <div>
                  <span className="text-[9px] text-slate-500 font-bold block">المبلغ المدفوع المقبوض بموجب هذا السند:</span>
                  <p className="text-[9px] text-slate-500 mt-0.5">البيان: {customReceiptNotes}</p>
                </div>
                <strong className="text-lg font-black text-emerald-700">{computedReceiptVal.toFixed(0)} ج.م</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 pt-8 border-t">
              <div className="text-center space-y-8">
                <span className="text-[10px] text-slate-400 block font-bold">توقيع المستلم (العامل المقاول)</span>
                <span className="text-xs block">...................................................</span>
              </div>
              <div className="text-center space-y-8">
                <span className="text-[10px] text-slate-400 block font-bold">إمضاء واعتماد مهندس الموقع</span>
                <span className="text-xs block">...................................................</span>
              </div>
            </div>
            
            <p className="text-[8px] text-slate-400 text-center pt-6">نسخة المسير المالي وتصفية الحسابات - شركة المهتدي</p>
          </div>
        )}

      </div>

    </div>
  );
}
