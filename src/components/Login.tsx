import { useState } from "react";
import { signInWithPopup, signInAnonymously } from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import { Shield, Compass, Lock, LogIn, AlertCircle } from "lucide-react";
import { motion } from "motion/react";

interface LoginProps {
  onLoginSuccess: (user: any, isMock?: boolean) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      onLoginSuccess(result.user, false);
    } catch (err: any) {
      console.error("Google Auth error:", err);
      // Give a clean, informative error message
      if (err.code === "auth/popup-blocked") {
        setError(
          "Brauzeringiz popup oynani blokladi. Sinov rejimidan foydalaning yoki popup oynaga ruxsat bering."
        );
      } else {
        setError("Gmail orqali kirishda xatolik yuz berdi. Iltimos qayta urinib ko'ring.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMockLogin = async (role: "parent" | "child") => {
    setLoading(true);
    setError(null);
    try {
      let uid = "";
      try {
        // Sign in anonymously to get a valid Firebase Auth session
        const result = await signInAnonymously(auth);
        uid = result.user.uid;
      } catch (authErr: any) {
        console.warn("Anonymous auth failed, falling back to client-side mock ID:", authErr);
        // Fallback to static mock ID if anonymous auth is restricted/disabled
        uid = `mock_${role}`;
      }
      
      // Construct a mock user profile with appropriate info
      const mockUser = {
        uid: uid,
        email: role === "parent" ? "otaona.sinov@gmail.com" : "bola.sinov@gmail.com",
        displayName: role === "parent" ? "Ota-ona (Sinov)" : "Farzand (Sinov)",
        photoURL: role === "parent" 
          ? "https://api.dicebear.com/7.x/adventurer/svg?seed=parent" 
          : "https://api.dicebear.com/7.x/adventurer/svg?seed=child",
        role: role
      };
      
      onLoginSuccess(mockUser, true);
    } catch (err: any) {
      console.error("Mock login error:", err);
      setError("Sinov rejimida kirishda xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12 relative overflow-hidden">
      {/* Dynamic abstract grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40"></div>

      {/* Decorative colored glow circles */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl"></div>
      <div className="absolute bottom-10 right-10 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md bg-white border border-slate-200/80 shadow-2xl rounded-3xl p-8 relative z-10"
      >
        {/* App Logo */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-xl shadow-indigo-200 mb-4">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black font-display text-slate-900 tracking-tight">
            SafePath Tracker
          </h1>
          <p className="text-xs text-slate-500 mt-2 max-w-xs leading-relaxed">
            Farzandlaringiz xavfsizligini ta'minlash va real vaqtda ularning joylashuvini kuzatish tizimi
          </p>
        </div>

        {/* Error Panel */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Authentication Options */}
        <div className="flex flex-col gap-4">
          {/* Main Option: Google Sign-In */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg shadow-indigo-150 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
            <span className="text-xs">Gmail orqali kirish</span>
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-white px-3">
              Yoki (Iframe uchun sinov rejimi)
            </div>
          </div>

          {/* Fallback Option: Developer/Demo Login Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleMockLogin("parent")}
              disabled={loading}
              className="h-14 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all flex flex-col items-center justify-center gap-1.5 shadow-sm hover:border-slate-300 cursor-pointer"
            >
              <Compass className="w-4 h-4 text-indigo-600" />
              <span>Ota-ona (Sinov)</span>
            </button>
            <button
              onClick={() => handleMockLogin("child")}
              disabled={loading}
              className="h-14 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all flex flex-col items-center justify-center gap-1.5 shadow-sm hover:border-slate-300 cursor-pointer"
            >
              <Lock className="w-4 h-4 text-indigo-600" />
              <span>Bola (Sinov)</span>
            </button>
          </div>
        </div>

        <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-center gap-2 text-[10px] text-slate-400">
          <Shield className="w-3.5 h-3.5 text-indigo-500" />
          <span>Xavfsiz ulanish & Shifrlangan ma'lumotlar</span>
        </div>
      </motion.div>
    </div>
  );
}
