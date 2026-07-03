import { useState } from "react";
import { UserRole } from "../types";
import { ShieldCheck, Compass, ArrowRight, Sparkles } from "lucide-react";
import { motion } from "motion/react";

interface RoleSelectionProps {
  onSelectRole: (role: UserRole) => void;
  userName: string;
}

export default function RoleSelection({ onSelectRole, userName }: RoleSelectionProps) {
  const [selected, setSelected] = useState<UserRole | null>(null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12 relative overflow-hidden">
      {/* Dynamic grid backdrop */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40"></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl bg-white border border-slate-100 shadow-2xl rounded-3xl p-8 md:p-12 relative z-10"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 rounded-full text-indigo-700 text-xs font-semibold mb-3 animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Xush kelibsiz, {userName}!</span>
          </div>
          <h2 className="text-3xl font-black font-display text-slate-900 tracking-tight">
            Profilingiz turini tanlang
          </h2>
          <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
            Xavfsizlik tizimidan qaysi maqsadlarda foydalanmoqchisiz? Ushbu parametr keyinchalik o'zgartirilishi mumkin.
          </p>
        </div>

        {/* Role Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* Card 1: Parent */}
          <button
            onClick={() => setSelected("parent")}
            className={`flex flex-col text-left p-6 md:p-8 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden cursor-pointer ${
              selected === "parent"
                ? "border-indigo-600 bg-indigo-50/25 shadow-xl shadow-indigo-50"
                : "border-slate-200 hover:border-slate-300 bg-white shadow-sm"
            }`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-colors ${
                selected === "parent" ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "bg-slate-100 text-slate-700"
              }`}
            >
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Men Ota-onaman</h3>
            <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">
              Farzandlaringizni ulab, ularning real vaqtdagi xavfsizligi va joylashuvini xaritada kuzatib boring.
            </p>
            {selected === "parent" && (
              <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs">
                ✓
              </div>
            )}
          </button>

          {/* Card 2: Child */}
          <button
            onClick={() => setSelected("child")}
            className={`flex flex-col text-left p-6 md:p-8 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden cursor-pointer ${
              selected === "child"
                ? "border-indigo-600 bg-indigo-50/25 shadow-xl shadow-indigo-50"
                : "border-slate-200 hover:border-slate-300 bg-white shadow-sm"
            }`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-colors ${
                selected === "child" ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "bg-slate-100 text-slate-700"
              }`}
            >
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Men Farzandman</h3>
            <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">
              Ota-onangizga xavfsiz ekasizni ko'rsatish uchun ulanish kodi orqali ulashing va bildirishnomalar oling.
            </p>
            {selected === "child" && (
              <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs">
                ✓
              </div>
            )}
          </button>
        </div>

        {/* Actions */}
        <div className="flex justify-end">
          <button
            onClick={() => selected && onSelectRole(selected)}
            disabled={!selected}
            className="w-full md:w-auto h-12 px-8 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-100"
          >
            <span>Davom etish</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
