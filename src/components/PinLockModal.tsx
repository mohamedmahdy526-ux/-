import { useState, useEffect } from 'react';
import { Lock, Unlock, ShieldAlert, Check } from 'lucide-react';

interface PinLockModalProps {
  onSuccess: () => void;
  correctPin: string;
  cancelable?: boolean;
  onCancel?: () => void;
}

export default function PinLockModal({ onSuccess, correctPin, cancelable = false, onCancel }: PinLockModalProps) {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);

  const handleKeyPress = (num: string) => {
    setError('');
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      
      // Auto-submit if reaches 4 characters
      if (nextPin === correctPin) {
        setIsUnlocked(true);
        setTimeout(() => {
          onSuccess();
        }, 600);
      } else if (nextPin.length === 4) {
        setTimeout(() => {
          setError('رمز سري غير صحيح! حاول مجدداً');
          setPin('');
        }, 150);
      }
    }
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-fade-in" dir="rtl">
      <div className="bg-white dark:bg-slate-800 rounded-[32px] p-6 w-full max-w-[360px] shadow-2xl border border-slate-100 dark:border-slate-700/50 text-center relative overflow-hidden">
        
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/4 w-32 h-32 bg-sky-500/10 dark:bg-sky-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-amber-500/10 dark:bg-amber-500/5 rounded-full blur-3xl"></div>

        <div className="flex flex-col items-center mb-6">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 transition-all duration-500 ${
            isUnlocked 
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rotate-12 scale-110' 
              : error 
                ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 animate-bounce' 
                : 'bg-sky-50 dark:bg-slate-700/60 text-sky-600 dark:text-sky-400'
          }`}>
            {isUnlocked ? <Unlock className="w-8 h-8" /> : <Lock className="w-8 h-8" />}
          </div>
          
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
            {isUnlocked ? 'تم التحقق بنجاح' : 'الحماية الأمنية نشطة'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            {isUnlocked ? 'مرحباً بك يا هندسة، جاري الفتح...' : 'يرجى إدخال الرمز السري المكون من 4 أرقام'}
          </p>
        </div>

        {/* Pin indicators */}
        <div className="flex justify-center gap-4 mb-4">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`w-4 h-4 rounded-full transition-all duration-200 border-2 ${
                index < pin.length
                  ? isUnlocked
                    ? 'bg-emerald-500 border-emerald-500 scale-125'
                    : 'bg-sky-600 border-sky-600 dark:bg-sky-400 dark:border-sky-400 scale-125'
                  : 'bg-transparent border-slate-300 dark:border-slate-600'
              }`}
            />
          ))}
        </div>

        {/* Error message */}
        <div className="h-6 mb-4">
          {error && (
            <span className="text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center justify-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              {error}
            </span>
          )}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              disabled={isUnlocked}
              className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-700/30 active:bg-slate-200 dark:active:bg-slate-600 text-lg font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition shadow-sm border border-slate-100 dark:border-transparent flex items-center justify-center cursor-pointer"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            disabled={isUnlocked}
            className="h-14 rounded-2xl bg-rose-50/50 dark:bg-rose-900/10 active:bg-rose-100 text-xs font-bold text-rose-600 dark:text-rose-400 transition flex items-center justify-center cursor-pointer"
          >
            مسح
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            disabled={isUnlocked}
            className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-700/30 active:bg-slate-200 dark:active:bg-slate-600 text-lg font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition shadow-sm border border-slate-100 dark:border-transparent flex items-center justify-center cursor-pointer"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            disabled={isUnlocked}
            className="h-14 rounded-2xl bg-amber-50/50 dark:bg-amber-900/10 active:bg-amber-100 text-xs font-bold text-amber-600 dark:text-amber-400 transition flex items-center justify-center cursor-pointer"
          >
            حذف
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {cancelable && (
            <button
              onClick={onCancel}
              className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 underline font-medium cursor-pointer"
            >
              إلغاء وإغلاق
            </button>
          )}
          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            الرمز الافتراضي للتجربة هو <span className="font-bold font-mono">1234</span>
          </p>
        </div>
      </div>
    </div>
  );
}
