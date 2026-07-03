import { useState, useEffect, useRef } from "react";
import { UserProfile } from "../types";
import { db } from "../lib/firebase";
import { doc, onSnapshot, updateDoc, addDoc, collection } from "firebase/firestore";
import {
  Shield,
  LogOut,
  Copy,
  Check,
  Share2,
  Compass,
  Battery,
  MapPin,
  AlertCircle,
  Navigation,
  Zap,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ChildDashboardProps {
  userProfile: UserProfile;
  onLogout: () => void;
}

export default function ChildDashboard({ userProfile, onLogout }: ChildDashboardProps) {
  const [profile, setProfile] = useState<UserProfile>(userProfile);
  const [copied, setCopied] = useState(false);
  
  // Simulated Coordinates (defaults to Tashkent center if GPS is unavailable)
  const [simulatedLat, setSimulatedLat] = useState(41.311081);
  const [simulatedLng, setSimulatedLng] = useState(69.240562);
  const [batteryLevel, setBatteryLevel] = useState(87);
  const [useRealGPS, setUseRealGPS] = useState(false);
  const [autoWalk, setAutoWalk] = useState(false);
  
  // Real GPS tracking reference
  const watchIdRef = useRef<number | null>(null);
  const autoWalkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Listen to child's own profile changes in real-time
  useEffect(() => {
    const childRef = doc(db, "users", userProfile.uid);
    const unsubscribe = onSnapshot(childRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setProfile(data);
        
        // If there are coordinates in Firestore already, sync local simulated coordinates with them on initial load
        if (data.currentLatitude && data.currentLongitude && simulatedLat === 41.311081) {
          setSimulatedLat(data.currentLatitude);
          setSimulatedLng(data.currentLongitude);
        }
      }
    });

    return unsubscribe;
  }, [userProfile.uid]);

  // 2. Trigger Real GPS Tracking when useRealGPS is enabled OR when Parent requests tracking
  useEffect(() => {
    if (!useRealGPS) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!("geolocation" in navigator)) {
      alert("Sizning qurilmangizda Geolocation (GPS) xizmati qo'llab-quvvatlanmaydi.");
      setUseRealGPS(false);
      return;
    }

    // Start watching position
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed, accuracy } = position.coords;
        setSimulatedLat(latitude);
        setSimulatedLng(longitude);
        updateLocationInDB(latitude, longitude, accuracy || 10, speed || 0);
      },
      (error) => {
        console.error("GPS error:", error);
        alert("GPS koordinatalarni olishda xatolik yuz berdi. Iltimos brauzerda joylashuv ruxsatlarini tekshiring yoki simulyatordan foydalaning.");
        setUseRealGPS(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [useRealGPS]);

  // 3. React to Parent tracking request (Auto-trigger real GPS or push simulated coords on activation)
  useEffect(() => {
    if (profile.isTrackingActive) {
      // If tracking was activated by parent, write current location to database immediately as initial ping
      updateLocationInDB(simulatedLat, simulatedLng, 5, 0);

      // Also trigger browser alert permission check or attempt real GPS as backup if allowed
      if ("geolocation" in navigator && !useRealGPS) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setSimulatedLat(pos.coords.latitude);
            setSimulatedLng(pos.coords.longitude);
            updateLocationInDB(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy || 10, pos.coords.speed || 0);
          },
          (err) => console.log("Silent GPS check failed, using simulated coords")
        );
      }
    }
  }, [profile.isTrackingActive]);

  // 4. Handle auto-walking simulation
  useEffect(() => {
    if (!autoWalk) {
      if (autoWalkIntervalRef.current) {
        clearInterval(autoWalkIntervalRef.current);
        autoWalkIntervalRef.current = null;
      }
      return;
    }

    autoWalkIntervalRef.current = setInterval(() => {
      setSimulatedLat((prev) => {
        const nextLat = prev + (Math.random() - 0.4) * 0.00015;
        setSimulatedLng((prevLng) => {
          const nextLng = prevLng + (Math.random() - 0.5) * 0.00015;
          // Push location update to Firebase
          updateLocationInDB(nextLat, nextLng, 5, 4.2);
          return nextLng;
        });
        return nextLat;
      });
    }, 4000); // Walk and sync every 4 seconds

    return () => {
      if (autoWalkIntervalRef.current) {
        clearInterval(autoWalkIntervalRef.current);
      }
    };
  }, [autoWalk]);

  // Update location in Firestore and write to history log subcollection
  const updateLocationInDB = async (lat: number, lng: number, accuracy: number, speed: number) => {
    try {
      const childRef = doc(db, "users", profile.uid);
      const timestamp = new Date().toISOString();

      // 1. Update child profile
      await updateDoc(childRef, {
        currentLatitude: lat,
        currentLongitude: lng,
        lastLocationTime: timestamp,
        batteryLevel: batteryLevel,
        isOnline: true
      });

      // 2. Add log to history if tracking is active
      if (profile.isTrackingActive) {
        const historyCollection = collection(db, "users", profile.uid, "history");
        await addDoc(historyCollection, {
          latitude: lat,
          longitude: lng,
          accuracy: accuracy,
          speed: speed,
          batteryLevel: batteryLevel,
          timestamp: timestamp
        });
      }
    } catch (err) {
      console.error("Firestore location update error:", err);
    }
  };

  // Joystick manual movement controls
  const handleMove = (direction: "N" | "S" | "E" | "W") => {
    let newLat = simulatedLat;
    let newLng = simulatedLng;
    const offset = 0.00025; // Sizable movement step on map

    switch (direction) {
      case "N":
        newLat += offset;
        break;
      case "S":
        newLat -= offset;
        break;
      case "E":
        newLng += offset;
        break;
      case "W":
        newLng -= offset;
        break;
    }

    setSimulatedLat(newLat);
    setSimulatedLng(newLng);
    updateLocationInDB(newLat, newLng, 8, 5.5);
  };

  // Copy Connection ID
  const handleCopyCode = () => {
    navigator.clipboard.writeText(profile.connectionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 relative">
      {/* 5. OVERLAY SAFETY NOTIFICATION - TRIGGERS IN REAL-TIME WHEN ACTIVE */}
      <AnimatePresence>
        {profile.isTrackingActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 180 }}
              className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-amber-100 relative"
            >
              {/* Pulsing hazard lights background effects */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-amber-500/5 blur-2xl"></div>

              <div className="flex flex-col p-6">
                <div className="flex items-center gap-5 mb-6">
                  <div className="flex-shrink-0 w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-100">
                    <div className="relative">
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping"></span>
                      <Navigation className="w-6 h-6 text-amber-500 fill-amber-500" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-amber-800 font-extrabold uppercase text-[10px] tracking-widest">Xavfsizlik bildirishnomasi</h4>
                      <span className="text-[10px] text-slate-400 font-medium">Hozirgina</span>
                    </div>
                    <p className="text-slate-800 text-base font-bold leading-snug">
                      Ota-onangiz xavfsizligingiz uchun qayerdaligingizni tekshirmoqda. Yoʻlda ehtiyot boʻling!
                    </p>
                  </div>
                </div>

                {/* Mini coordinates tracking logs inside overlay */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center gap-2 mb-6">
                  <div className="flex justify-between w-full text-[9px] text-slate-400 uppercase font-bold tracking-wider">
                    <span>GPS Koordinatalar</span>
                    <span>Batareya</span>
                  </div>
                  <div className="flex justify-between w-full items-center">
                    <span className="text-xs font-bold text-indigo-600 font-mono">
                      {simulatedLat.toFixed(6)}, {simulatedLng.toFixed(6)}
                    </span>
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Battery className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{batteryLevel}%</span>
                    </span>
                  </div>
                </div>

                {/* Simulate movement buttons while inside overlay! */}
                <div className="flex flex-col gap-3">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider text-center">Harakatlanishni simulyatsiya qilish</p>
                  
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => handleMove("N")}
                      className="w-10 h-10 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm text-slate-700 rounded-xl flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                      title="Shimolga"
                    >
                      <ChevronUp className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex justify-center gap-6">
                    <button
                      onClick={() => handleMove("W")}
                      className="w-10 h-10 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm text-slate-700 rounded-xl flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                      title="G'arbga"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleMove("E")}
                      className="w-10 h-10 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm text-slate-700 rounded-xl flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                      title="Sharqqa"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex justify-center gap-2 mb-2">
                    <button
                      onClick={() => handleMove("S")}
                      className="w-10 h-10 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm text-slate-700 rounded-xl flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                      title="Janubga"
                    >
                      <ChevronDown className="w-5 h-5" />
                    </button>
                  </div>

                  <button
                    onClick={() => setAutoWalk(!autoWalk)}
                    className={`w-full h-11 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                      autoWalk
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm"
                        : "bg-slate-900 text-white hover:bg-slate-800 shadow-md"
                    }`}
                  >
                    <Compass className={`w-4 h-4 ${autoWalk ? 'animate-spin' : ''}`} />
                    <span>{autoWalk ? "Avto-Harakat Faol" : "Avto-Harakatni Yoqish"}</span>
                  </button>
                </div>
              </div>
              <div className="h-1 bg-amber-500 w-full animate-pulse"></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <Compass className="w-5.5 h-5.5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-900 font-display">SafePath Tracker</h1>
            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-bold rounded-md uppercase tracking-wider">
              Farzand rejimi
            </span>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-indigo-600 transition-all cursor-pointer shadow-sm"
          title="Chiqish"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* Main Panel content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Column: Code and status (5 columns) */}
        <div className="md:col-span-5 flex flex-col gap-6">
          
          {/* Connection Code Card */}
          <div className="bg-white border border-slate-200 shadow-md rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-indigo-50 blur-xl"></div>
            
            <div className="flex items-center gap-2 mb-4 relative z-10">
              <Share2 className="w-5 h-5 text-indigo-600" />
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Mening Ulanish Kodim</h2>
            </div>

            <p className="text-xs text-slate-500 mb-5 relative z-10 leading-relaxed">
              Ota-onangiz sizning joylashuvingizni ulay olishi uchun quyidagi maxsus ulanish kodini ularga yuboring.
            </p>

            {/* Display code box */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-3 mb-5">
              <span className="font-mono text-2xl font-bold text-slate-800 tracking-wider">
                {profile.connectionCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 hover:text-indigo-600 transition-all text-slate-400 active:scale-95 cursor-pointer shadow-sm"
                title="Kodni nusxalash"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Connection Status Badge */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ulanish holati</span>
              {profile.connectedUserId ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 rounded-full text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Ulangan ({profile.connectedName})</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 rounded-full text-amber-700 text-[10px] font-bold uppercase tracking-wider">
                  <span>Kutilmoqda...</span>
                </span>
              )}
            </div>
          </div>

          {/* Device status card */}
          <div className="bg-white border border-slate-200 shadow-md rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Battery className="w-5 h-5 text-indigo-600" />
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Qurilma Holati</h2>
            </div>

            <div className="flex flex-col gap-4">
              {/* Battery slider simulator */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-2">
                  <span>Simulyatsiya qilingan batareya zaryadi</span>
                  <span className="font-mono text-indigo-600">{batteryLevel}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={batteryLevel}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setBatteryLevel(val);
                    updateLocationInDB(simulatedLat, simulatedLng, 5, 0);
                  }}
                  className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                />
                <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                  Batareyani 15% dan tushirib, ota-ona panelidagi favqulodda vaziyat (low battery) ko'rinishini sinab ko'ring.
                </p>
              </div>

              {/* Real GPS vs Simulated Toggle */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Haqiqiy GPS dan foydalanish</h4>
                  <p className="text-[10px] text-slate-400 leading-tight">Telefoningizning haqiqiy navigatsiya sensorini yoqish</p>
                </div>
                <button
                  onClick={() => setUseRealGPS(!useRealGPS)}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer ${
                    useRealGPS ? "bg-indigo-600" : "bg-slate-200"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
                      useRealGPS ? "translate-x-5" : ""
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Simulated GPS Joystick controls (7 columns) */}
        <div className="md:col-span-7 bg-white border border-slate-200 shadow-md rounded-2xl p-6 flex flex-col justify-between min-h-[350px]">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-indigo-600" />
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Joylashuv Joystigi</h2>
              </div>
              <span className="text-[9px] text-slate-400 font-mono bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 font-bold uppercase tracking-wider">
                Simulyator
              </span>
            </div>
            
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Siz harakatlanayotganingizda ota-onangiz xaritada ko'rishi uchun ushbu joystik tugmalari yordamida simulated harakatlaning.
            </p>

            {/* Coordinates displays */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Kenglik (Latitude)</p>
                <p className="text-xs font-mono font-bold text-indigo-600 mt-1">{simulatedLat.toFixed(6)}</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Uzunlik (Longitude)</p>
                <p className="text-xs font-mono font-bold text-indigo-600 mt-1">{simulatedLng.toFixed(6)}</p>
              </div>
            </div>

            {/* Joystick buttons */}
            <div className="flex flex-col items-center gap-2 mb-6">
              <button
                onClick={() => handleMove("N")}
                disabled={useRealGPS}
                className="w-12 h-12 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:pointer-events-none rounded-2xl flex items-center justify-center active:scale-90 transition-all border border-slate-200 shadow-sm cursor-pointer"
                title="Shimolga harakatlanish"
              >
                <ChevronUp className="w-6 h-6" />
              </button>
              
              <div className="flex gap-12">
                <button
                  onClick={() => handleMove("W")}
                  disabled={useRealGPS}
                  className="w-12 h-12 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:pointer-events-none rounded-2xl flex items-center justify-center active:scale-90 transition-all border border-slate-200 shadow-sm cursor-pointer"
                  title="G'arbga harakatlanish"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() => handleMove("E")}
                  disabled={useRealGPS}
                  className="w-12 h-12 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:pointer-events-none rounded-2xl flex items-center justify-center active:scale-90 transition-all border border-slate-200 shadow-sm cursor-pointer"
                  title="Sharqqa harakatlanish"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>

              <button
                onClick={() => handleMove("S")}
                disabled={useRealGPS}
                className="w-12 h-12 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:pointer-events-none rounded-2xl flex items-center justify-center active:scale-90 transition-all border border-slate-200 shadow-sm cursor-pointer"
                title="Janubga harakatlanish"
              >
                <ChevronDown className="w-6 h-6" />
              </button>
            </div>
          </div>

          <button
            onClick={() => setAutoWalk(!autoWalk)}
            disabled={useRealGPS}
            className={`w-full h-11 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 border cursor-pointer ${
              autoWalk
                ? "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm"
                : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200 shadow-sm"
            }`}
          >
            <Compass className={`w-4 h-4 ${autoWalk ? 'animate-spin' : ''}`} />
            <span>{autoWalk ? "Avto-harakat faol (simulyatsiya qilinmoqda)" : "Avto-harakatlanishni yoqish"}</span>
          </button>
        </div>

      </main>
    </div>
  );
}
