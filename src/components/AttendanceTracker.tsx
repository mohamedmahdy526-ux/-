import React, { useState } from 'react';
import { Worker, AttendanceRecord, WorkSite } from '../types';
import { ClipboardList, Calendar, CheckSquare, XSquare, Search, SlidersHorizontal, MapPin, Save, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';

interface AttendanceTrackerProps {
  workers: Worker[];
  attendance: AttendanceRecord[];
  setAttendance: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  sites: WorkSite[];
  selectedDate: string; // "YYYY-MM-DD"
  setSelectedDate: (date: string) => void;
  onCopyYesterday: () => void;
}

export default function AttendanceTracker({
  workers,
  attendance,
  setAttendance,
  sites,
  selectedDate,
  setSelectedDate,
  onCopyYesterday
}: AttendanceTrackerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>('all');
  const [saveIndicator, setSaveIndicator] = useState<string>('');

  // Get or initialize record for a worker on the selected date
  const getRecord = (workerId: string): AttendanceRecord => {
    const existing = attendance.find(r => r.date === selectedDate && r.workerId === workerId);
    if (existing) return existing;

    // Default unrecorded / initial empty record
    return {
      date: selectedDate,
      workerId,
      isPresent: false,
      otHours: 0,
      advance: 0,
      notes: ''
    };
  };

  // Update a specific field for a worker's record
  const updateRecord = (workerId: string, updates: Partial<AttendanceRecord>) => {
    setAttendance(prev => {
      // Find the index of the existing record on this index
      const existingIndex = prev.findIndex(r => r.date === selectedDate && r.workerId === workerId);
      
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...updates };
        return updated;
      } else {
        // Create new record
        const newRecord: AttendanceRecord = {
          date: selectedDate,
          workerId,
          isPresent: updates.isPresent ?? false,
          otHours: updates.otHours ?? 0,
          advance: updates.advance ?? 0,
          notes: updates.notes ?? '',
          ...updates
        };
        return [...prev, newRecord];
      }
    });

    setSaveIndicator('جاري حفظ التغييرات تلقائياً...');
    setTimeout(() => {
      setSaveIndicator('✓ تم الحفظ تلقائياً في ذاكرة الجهاز');
    }, 400);
  };

  // Helper calculation for beautiful interactive UI
  const calculateNetDailyWage = (worker: Worker, record: AttendanceRecord) => {
    if (!record.isPresent) return 0;
    const otAmount = record.otHours * worker.otRate;
    return (worker.dailyRate + otAmount) - record.advance;
  };

  // Batch presence setter
  const setBatchPresence = (isPresent: boolean) => {
    const visibleWorkers = workers.filter(w => {
      const matchesSearch = w.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSite = selectedSiteFilter === 'all' || w.siteId === selectedSiteFilter;
      return matchesSearch && matchesSite;
    });

    setAttendance(prev => {
      const updated = [...prev];
      visibleWorkers.forEach(w => {
        const existingIndex = updated.findIndex(r => r.date === selectedDate && r.workerId === w.id);
        if (existingIndex > -1) {
          updated[existingIndex] = { ...updated[existingIndex], isPresent };
        } else {
          updated.push({
            date: selectedDate,
            workerId: w.id,
            isPresent,
            otHours: 0,
            advance: 0,
            notes: ''
          });
        }
      });
      return updated;
    });

    setSaveIndicator('✓ تم تسجيل دفعة الحضور بنجاح');
  };

  const filteredWorkers = workers.filter((w) => {
    const matchesSearch = w.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSite = selectedSiteFilter === 'all' || w.siteId === selectedSiteFilter;
    return matchesSearch && matchesSite;
  });

  // Count present/absent for current date
  const registeredCountForDate = workers.filter(w => getRecord(w.id).isPresent).length;

  return (
    <div className="space-y-4">
      {/* Upper header */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <ClipboardList className="text-emerald-600 dark:text-emerald-400 w-6 h-6" />
            دفتر الحضور والأجور اليومي
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            سجل حضور العمال، الساعات الإضافية، والسلف المسحوبة لكل موقع وتاريخ
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 p-2 rounded-2xl">
          <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
          />
        </div>
      </div>

      {/* Auto-save Status & Batch Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {saveIndicator ? (
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40 animate-pulse flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            {saveIndicator}
          </span>
        ) : (
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            التغييرات تحفظ تلقائياً بمجرد إدخالها
          </span>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => setBatchPresence(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/10 dark:text-emerald-400 text-xs font-bold rounded-xl border border-emerald-100 dark:border-emerald-900/30 transform active:scale-95 cursor-pointer"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            تحضير الكل حاضر
          </button>
          <button
            onClick={() => setBatchPresence(false)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-900/10 dark:text-rose-400 text-xs font-bold rounded-xl border border-rose-100 dark:border-rose-900/30 transform active:scale-95 cursor-pointer"
          >
            <XSquare className="w-3.5 h-3.5" />
            تصفير الكل غياب
          </button>
        </div>
      </div>

      {/* Bulk Fast Yesterday Copy Card */}
      <div className="bg-sky-50 dark:bg-slate-800/60 p-4 rounded-3xl border border-sky-100 dark:border-slate-700/50 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative overflow-hidden">
        <div className="absolute top-0 right-1 w-24 h-24 bg-sky-500/5 rounded-full blur-xl pointer-events-none"></div>
        <div>
          <span className="text-sky-800 dark:text-sky-450 font-extrabold text-xs flex items-center gap-1">
            <Sparkles className="w-4 h-4 text-sky-600" />
            ميزة ذكية لتوفير الوقت
          </span>
          <p className="text-slate-600 dark:text-slate-350 text-xs mt-1">
            هل حضور اليوم يشبه حضور الأمس؟ يمكنك نسخ حالة حضور العمال لتاريخ اليوم مع تصفير ساعات العمل الإضافية والسلف للبدء فوراً!
          </p>
        </div>
        <button
          onClick={onCopyYesterday}
          className="w-full sm:w-auto text-center px-4 py-2 bg-sky-600 text-white rounded-xl font-bold hover:bg-sky-500 active:scale-95 transition text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          نسخ حالة الحضور من الأمس
        </button>
      </div>

      {/* Filters & Search toolbar */}
      <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="البحث عن عمال في كشف الحضور..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-10 py-2 bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm font-semibold text-slate-700 dark:text-slate-200"
          />
        </div>
        <div className="flex items-center gap-2 min-w-[150px]">
          <SlidersHorizontal className="w-4 h-4 text-slate-400" />
          <select
            value={selectedSiteFilter}
            onChange={(e) => setSelectedSiteFilter(e.target.value)}
            className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs font-bold text-slate-600 dark:text-slate-300"
          >
            <option value="all">كل مواقع العمل 🗺️</option>
            {sites.map(site => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Attendance Cards Grid */}
      <div className="space-y-4">
        {filteredWorkers.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700/50 text-center text-slate-500 dark:text-slate-400">
            <ClipboardList className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="font-extrabold text-sm">كشف الحضور فارغ</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1"> لم يتم تسجيل عمال في قاعدة بيانات هذا الفلتر حالياً</p>
          </div>
        ) : (
          filteredWorkers.map((w) => {
            const record = getRecord(w.id);
            const netWage = calculateNetDailyWage(w, record);
            const siteName = sites.find(s => s.id === w.siteId)?.name || 'موقع مجهول';

            return (
              <div
                key={w.id}
                className={`bg-white dark:bg-slate-800 rounded-3xl border shadow-sm transition-all overflow-hidden ${
                  record.isPresent 
                    ? 'border-emerald-100 dark:border-emerald-900/40 ring-1 ring-emerald-500/10' 
                    : 'border-slate-100 dark:border-slate-700/50'
                }`}
              >
                {/* Worker Heading Row */}
                <div className="p-4 border-b border-dashed border-slate-100 dark:border-slate-700/50 flex items-center justify-between gap-3 bg-slate-50/20 dark:bg-slate-800/40">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-800 dark:text-slate-100 text-base">{w.name}</span>
                      <span className="text-[9px] px-2 py-0.5 bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 rounded-full font-bold">
                        {siteName}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 font-bold">
                      اليومية الأساسية: <span className="text-slate-700 dark:text-slate-300">{w.dailyRate}ج</span> | الإضافي: <span className="text-slate-700 dark:text-slate-300">{w.otRate}ج/ساعة</span>
                    </div>
                  </div>

                  {/* Presence Switcher Toggle */}
                  <button
                    onClick={() => updateRecord(w.id, { isPresent: !record.isPresent })}
                    className={`px-4 py-2 rounded-2xl text-xs font-bold transform active:scale-95 transition cursor-pointer ${
                      record.isPresent
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                        : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {record.isPresent ? '✓ حاضر اليوم' : '✗ غياب'}
                  </button>
                </div>

                {record.isPresent && (
                  <div className="p-4 space-y-4 animate-slide-up">
                    <div className="grid grid-cols-2 gap-3">
                      {/* OT hours input */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                          ساعات العمل الإضافي (س)
                        </label>
                        <div className="flex items-center">
                          <button
                            onClick={() => updateRecord(w.id, { otHours: Math.max(0, record.otHours - 0.5) })}
                            className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 p-2 rounded-r-xl text-slate-600 dark:text-slate-300 font-extrabold text-sm cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={record.otHours || ''}
                            onChange={(e) => updateRecord(w.id, { otHours: Math.max(0, parseFloat(e.target.value) || 0) })}
                            className="w-full text-center py-1.5 bg-slate-50 border-y border-slate-200 dark:bg-slate-900/30 dark:border-slate-700 text-sm font-black text-slate-800 dark:text-slate-100 focus:outline-none"
                            placeholder="0"
                          />
                          <button
                            onClick={() => updateRecord(w.id, { otHours: record.otHours + 0.5 })}
                            className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 p-2 rounded-l-xl text-slate-600 dark:text-slate-300 font-extrabold text-sm cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                        {record.otHours > 0 && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-1 block">
                            (+ {(record.otHours * w.otRate).toFixed(1)} ج.م إضافي)
                          </span>
                        )}
                      </div>

                      {/* Advance input */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                          السلفة اليومية المسحوبة (ج.م)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="5"
                          value={record.advance || ''}
                          onChange={(e) => updateRecord(w.id, { advance: Math.max(0, parseFloat(e.target.value) || 0) })}
                          className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black text-slate-800 dark:text-slate-100 text-center focus:outline-none"
                          placeholder="0.00"
                        />
                        {record.advance > 0 && (
                          <span className="text-[10px] text-rose-500 font-bold mt-1 block">
                            (- {record.advance} ج.م تخصم من الراتب)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Notes text input */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                        ملاحظات العهدة أو الإنتاجية
                      </label>
                      <input
                        type="text"
                        value={record.notes}
                        onChange={(e) => updateRecord(w.id, { notes: e.target.value })}
                        placeholder="مثل: تأخر ربع ساعة، كفاءة عالية، عمل بالدور الخامس..."
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-350 focus:outline-none"
                      />
                    </div>

                    {/* Final Net Wage Alert Card */}
                    <div className="grid grid-cols-3 items-center py-2.5 px-4 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-2xl border border-emerald-500/10">
                      <div className="col-span-2">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block">صافي مستحقات اليوم</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block">
                          ({w.dailyRate} الأساسي + {(record.otHours * w.otRate).toFixed(0)} الإضافي) - {record.advance} سلفة
                        </span>
                      </div>
                      <div className="text-left">
                        <span className="text-lg font-black text-emerald-600 dark:text-emerald-450">
                          {netWage.toFixed(1)} ج.م
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {!record.isPresent && (
                  <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-900/10 text-slate-400 text-xs font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                    محسوب كغائب لهذا اليوم، رواتبه وساعات العمل الإضافي ملغاة (0 ج.م).
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
