import React, { useState } from 'react';
import { WorkSite, Worker } from '../types';
import { MapPin, Plus, Trash2, Calendar, HardHat, FileText, Settings, X, PlusCircle } from 'lucide-react';
import { useUIFeedback } from './UIFeedbackProvider';

interface SitesListProps {
  sites: WorkSite[];
  setSites: React.Dispatch<React.SetStateAction<WorkSite[]>>;
  workers: Worker[];
  setWorkers: React.Dispatch<React.SetStateAction<Worker[]>>;
  onAddSite: (name: string, description: string) => void;
  onDeleteSite: (id: string) => void;
}

export default function SitesList({
  sites,
  setSites,
  workers,
  setWorkers,
  onAddSite,
  onDeleteSite
}: SitesListProps) {
  const { showConfirm } = useUIFeedback();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddSite(name, description);
    setName('');
    setDescription('');
    setIsAddOpen(false);
  };

  const getWorkerCountForSite = (siteId: string) => {
    return workers.filter(w => w.siteId === siteId).length;
  };

  return (
    <div className="space-y-4">
      {/* Upper header */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <HardHat className="text-amber-500 w-6 h-6 animate-pulse" />
            إدارة مواقع المشاريع الإنشائية
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            أنشئ وتابع مواقع البناء، وأسند العمال لمواقعهم لمتابعة كشوف التوريد اليومية لكل مشروع
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="btn btn-primary bg-amber-500 hover:bg-amber-400 text-slate-900 border-none flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold cursor-pointer transform active:scale-95 transition"
        >
          <PlusCircle className="w-5 h-5 text-slate-900" />
          إنشاء موقع جديد
        </button>
      </div>

      {/* Sites Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sites.map((site) => {
          const headcount = getWorkerCountForSite(site.id);
          const isDefault = site.id === 'default';

          return (
            <div
              key={site.id}
              className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm relative overflow-hidden group hover:shadow-md transition duration-250 flex flex-col justify-between min-h-[160px]"
            >
              {/* Card visual accent helper */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition"></div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black px-2.5 py-1 bg-amber-400/10 text-amber-600 dark:text-amber-400 rounded-full flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    موقع نشط
                  </span>

                  {/* Disable deletion for default main site for platform safety */}
                  {!isDefault && (
                    <button
                      onClick={() => {
                        showConfirm({
                          title: 'حذف موقع العمل',
                          message: `هل أنت متأكد من حذف موقع المشروع "${site.name}"؟ سيتم إعادة توجيه كافة عمال هذا الموقع إلى الموقع الرئيسي بشكل تلقائي.`,
                          onConfirm: () => onDeleteSite(site.id)
                        });
                      }}
                      className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl text-rose-500 hover:text-rose-600 transition cursor-pointer"
                      title="حذف الموقع"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  )}
                </div>

                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 mb-1">
                  {site.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {site.description || 'لا يوجد وصف مضاف لهذا الموقع حالياً'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-dashed border-slate-100 dark:border-slate-700/50 flex justify-between items-center text-xs">
                <span className="font-extrabold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/20 px-3 py-1 rounded-xl">
                  🔋 {headcount} عمال مسجلين
                </span>
                <span className="text-slate-400 font-semibold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  بتاريخ: {new Date(site.createdAt).toLocaleDateString('ar-EG', {month: 'numeric', day: 'numeric'})}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Site modal overlay */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white dark:bg-slate-800 rounded-[28px] p-6 w-full max-w-sm shadow-2xl border border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <HardHat className="text-amber-500 w-5 h-5" />
                إنشاء موقع عمل جديد
              </h3>
              <button onClick={() => setIsAddOpen(false)} className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">اسم موقع العمل</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: مشروع البرج الأيقوني بالحي المالي"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">الوصف أو العنوان التفصيلي</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="مثال: كمبوند زايد جاردنز، بجوار مستشفى الجولف، العمل يشمل الهيكل الخرساني بالكامل."
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-xl font-bold active:scale-95 transition cursor-pointer"
                >
                  حفظ إضافة الموقع
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-750 dark:hover:bg-slate-700 dark:text-slate-200 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
