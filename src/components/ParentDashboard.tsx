import React, { useState, useEffect } from "react";
import { UserProfile, LocationLog } from "../types";
import { db } from "../lib/firebase";
import {
  doc,
  updateDoc,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  where,
  deleteDoc
} from "firebase/firestore";
import MapComponent from "./MapComponent";
import {
  Shield,
  LogOut,
  UserCheck,
  Battery,
  Navigation,
  Clock,
  History,
  AlertTriangle,
  Play,
  Square,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ParentDashboardProps {
  userProfile: UserProfile;
  onLogout: () => void;
}

export default function ParentDashboard({ userProfile, onLogout }: ParentDashboardProps) {
  const [parentData, setParentData] = useState<UserProfile>(userProfile);
  const [childData, setChildData] = useState<UserProfile | null>(null);
  const [locationHistory, setLocationHistory] = useState<LocationLog[]>([]);
  
  // Connection wizard state
  const [connectionCode, setConnectionCode] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionSuccess, setConnectionSuccess] = useState<string | null>(null);

  const [triggeringTrack, setTriggeringTrack] = useState(false);

  // 1. Listen to parent's own profile changes in real-time
  useEffect(() => {
    const parentRef = doc(db, "users", userProfile.uid);
    const unsubscribe = onSnapshot(parentRef, (docSnap) => {
      if (docSnap.exists()) {
        setParentData(docSnap.data() as UserProfile);
      }
    });
    return unsubscribe;
  }, [userProfile.uid]);

  // 2. Listen to child profile changes and historical locations in real-time when connected
  useEffect(() => {
    if (!parentData.connectedUserId) {
      setChildData(null);
      setLocationHistory([]);
      return;
    }

    const childId = parentData.connectedUserId;
    const childRef = doc(db, "users", childId);

    // Listen to child profile
    const unsubChildProfile = onSnapshot(childRef, (docSnap) => {
      if (docSnap.exists()) {
        setChildData(docSnap.data() as UserProfile);
      }
    });

    // Listen to child history logs
    const historyQuery = query(
      collection(db, "users", childId, "history"),
      orderBy("timestamp", "desc"),
      limit(20)
    );

    const unsubHistory = onSnapshot(historyQuery, (snap) => {
      const logs: LocationLog[] = [];
      snap.forEach((doc) => {
        logs.push({ id: doc.id, ...doc.data() } as LocationLog);
      });
      setLocationHistory(logs);
    });

    return () => {
      unsubChildProfile();
      unsubHistory();
    };
  }, [parentData.connectedUserId]);

  // Handle Child Connection
  const handleConnectChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectionCode.trim()) return;

    setConnecting(true);
    setConnectionError(null);
    setConnectionSuccess(null);

    try {
      // Find the user with this connection code
      const q = query(
        collection(db, "users"),
        where("connectionCode", "==", connectionCode.trim().toUpperCase())
      );
      
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setConnectionError("Ushbu ulanish kodi bo'yicha hech qanday farzand topilmadi. Kodingizni tekshirib ko'ring.");
        setConnecting(false);
        return;
      }

      let childDoc = querySnapshot.docs[0];
      let child = childDoc.data() as UserProfile;

      if (child.role !== "child") {
        setConnectionError("Ushbu foydalanuvchi bola sifatida ro'yxatdan o'tmagan.");
        setConnecting(false);
        return;
      }

      if (child.connectedUserId) {
        setConnectionError("Ushbu bola allaqachon boshqa ota-onaga ulangan.");
        setConnecting(false);
        return;
      }

      // Perform updates
      const parentRef = doc(db, "users", parentData.uid);
      const childRef = doc(db, "users", child.uid);

      await updateDoc(parentRef, {
        connectedUserId: child.uid,
        connectedName: child.displayName
      });

      await updateDoc(childRef, {
        connectedUserId: parentData.uid,
        connectedName: parentData.displayName
      });

      setConnectionSuccess(`${child.displayName} muvaffaqiyatli ulandi!`);
      setConnectionCode("");
    } catch (err: any) {
      console.error(err);
      setConnectionError("Ulanish jarayonida xatolik yuz berdi. Iltimos qayta urinib ko'ring.");
    } finally {
      setConnecting(false);
    }
  };

  // Disconnect Child
  const handleDisconnect = async () => {
    if (!parentData.connectedUserId) return;
    if (!confirm("Farzandingiz bilan ulanishni uzmoqchimisiz?")) return;

    const childId = parentData.connectedUserId;
    try {
      const parentRef = doc(db, "users", parentData.uid);
      const childRef = doc(db, "users", childId);

      await updateDoc(parentRef, {
        connectedUserId: null,
        connectedName: null
      });

      await updateDoc(childRef, {
        connectedUserId: null,
        connectedName: null,
        isTrackingActive: false
      });
      
      setChildData(null);
      setLocationHistory([]);
    } catch (err) {
      console.error("Disconnection error:", err);
    }
  };

  // Trigger Live Tracking (GET_LIVE_LOCATION Action)
  const handleStartTracking = async () => {
    if (!parentData.connectedUserId) return;
    setTriggeringTrack(true);

    try {
      const childRef = doc(db, "users", parentData.connectedUserId);
      await updateDoc(childRef, {
        isTrackingActive: true,
        alertMessage: "Ota-onangiz xavfsizligingiz uchun qayerdaligingizni tekshirmoqda. Yoʻlda ehtiyot boʻling!"
      });
    } catch (err) {
      console.error("Start tracking error:", err);
    } finally {
      setTriggeringTrack(false);
    }
  };

  // Stop Tracking
  const handleStopTracking = async () => {
    if (!parentData.connectedUserId) return;

    try {
      const childRef = doc(db, "users", parentData.connectedUserId);
      await updateDoc(childRef, {
        isTrackingActive: false
      });
    } catch (err) {
      console.error("Stop tracking error:", err);
    }
  };

  // Clear tracking history logs
  const handleClearHistory = async () => {
    if (!parentData.connectedUserId) return;
    if (!confirm("Harakatlanish tarixini tozalashni xohlaysizmi?")) return;

    try {
      const childId = parentData.connectedUserId;
      const historyCollectionRef = collection(db, "users", childId, "history");
      const snap = await getDocs(historyCollectionRef);
      
      const deletePromises = snap.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    } catch (err) {
      console.error("Error clearing history:", err);
    }
  };

  // Helper: Format relative timestamp
  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return "Noma'lum";
    const date = new Date(timeStr);
    return date.toLocaleTimeString();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Sleek Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10 shadow-sm sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <Shield className="w-5.5 h-5.5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-900 font-display">SafePath Tracker</h1>
            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-bold rounded-md uppercase tracking-wider">
              Ota-ona paneli
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3">
            <img
              src={parentData.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${parentData.displayName}`}
              alt={parentData.displayName}
              className="w-8 h-8 rounded-full border border-slate-200 bg-slate-50 object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="text-right">
              <p className="text-xs font-bold text-slate-800 leading-tight">{parentData.displayName}</p>
              <p className="text-[10px] text-slate-400 font-mono font-medium">ID: {parentData.connectionCode}</p>
            </div>
          </div>

          <div className="h-8 w-[1px] bg-slate-200"></div>

          <button
            onClick={onLogout}
            className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-indigo-600 transition-all cursor-pointer shadow-sm"
            title="Chiqish"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Connections, Controls & Logs (4 columns) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Connection Wizard or Status */}
          <div className="bg-white border border-slate-200 shadow-md rounded-2xl p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <UserCheck className="w-5 h-5 text-indigo-600" />
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Farzand Ulanishi</h2>
            </div>

            {!parentData.connectedUserId ? (
              // Not connected - show form
              <div>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  Farzandingiz xavfsizligini nazorat qilish uchun, uning telefonidagi 6 xonali maxsus ulanish kodini quyida kiriting.
                </p>

                {connectionError && (
                  <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{connectionError}</span>
                  </div>
                )}

                {connectionSuccess && (
                  <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-semibold">
                    {connectionSuccess}
                  </div>
                )}

                <form onSubmit={handleConnectChild} className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      maxLength={6}
                      value={connectionCode}
                      onChange={(e) => setConnectionCode(e.target.value.toUpperCase())}
                      placeholder="Kod (Masalan: C48A39)"
                      className="w-full h-11 pl-9 pr-4 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-sm font-semibold tracking-widest text-slate-800 placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  </div>
                  <button
                    type="submit"
                    disabled={connecting}
                    className="h-11 px-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors shrink-0 shadow-md shadow-indigo-100 cursor-pointer"
                  >
                    {connecting ? "Ulanmoqda..." : "Ulash"}
                  </button>
                </form>
              </div>
            ) : (
              // Connected - show profile
              <div>
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200 mb-4">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <img
                      src={childData?.photoURL || "https://api.dicebear.com/7.x/bottts/svg?seed=child"}
                      alt={parentData.connectedName || ""}
                      className="w-10 h-10 rounded-full border border-slate-200 bg-white object-cover shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="overflow-hidden">
                      <h4 className="text-xs font-bold text-slate-800 truncate">{parentData.connectedName}</h4>
                      <p className="text-[10px] text-slate-400 font-medium">Farzand (Ulangan)</p>
                    </div>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="text-[10px] text-red-500 hover:text-red-600 font-bold transition-colors bg-white px-2.5 py-1.5 border border-slate-200 shadow-sm rounded-lg shrink-0 cursor-pointer"
                  >
                    Ulanishni uzish
                  </button>
                </div>

                {/* Device parameters details */}
                {childData && (
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                        <Battery className={`w-4 h-4 ${childData.batteryLevel && childData.batteryLevel < 20 ? 'animate-bounce text-red-500' : 'text-indigo-600'}`} />
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Batareya</p>
                        <p className="text-xs font-bold text-slate-700">{childData.batteryLevel ? `${childData.batteryLevel}%` : "Noma'lum"}</p>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                        <div className={`w-2.5 h-2.5 rounded-full ${childData.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Holat</p>
                        <p className="text-xs font-bold text-slate-700">{childData.isOnline ? "Onlayn" : "Oflyayn"}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Active Location Signal Controls (Only when child is connected) */}
          {parentData.connectedUserId && childData && (
            <div className="bg-white border border-slate-200 shadow-md rounded-2xl p-6">
              <div className="flex items-center gap-2.5 mb-4">
                <Navigation className="w-5 h-5 text-indigo-600" />
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Jonli Signal Tekshiruvi</h2>
              </div>

              <div className="flex flex-col gap-3">
                {childData.isTrackingActive ? (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs mb-1 leading-relaxed">
                    <div className="flex items-center gap-2 font-bold mb-1 text-amber-900">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                      <span>Jonli kuzatuv faollashtirildi</span>
                    </div>
                    <span>Siz farzandingizga jonli joylashuv signalini jo'natdingiz. Bola telefonida ogohlantirish paydo bo'ldi va koordinatalar yangilanmoqda.</span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 leading-relaxed mb-1">
                    "Joylashuvni so'rash" tugmasini bosganingizda, farzand telefoniga darhol uning joylashuvi tekshirilayotgani haqida signal yetib boradi va real vaqt rejimida tracking ishga tushadi.
                  </p>
                )}

                <div className="flex gap-2">
                  {!childData.isTrackingActive ? (
                    <button
                      onClick={handleStartTracking}
                      disabled={triggeringTrack}
                      className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-100 cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-white text-white" />
                      <span>Joylashuvni so'rash</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleStopTracking}
                      className="flex-1 h-11 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-red-100 cursor-pointer"
                    >
                      <Square className="w-4 h-4 fill-white text-white" />
                      <span>Kuzatuvni tugatish</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Location History Logs */}
          {parentData.connectedUserId && (
            <div className="bg-white border border-slate-200 shadow-md rounded-2xl p-6 flex-1 flex flex-col min-h-[250px]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <History className="w-5 h-5 text-slate-500" />
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Loglar tarixi</h2>
                </div>
                {locationHistory.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="text-[10px] text-slate-400 hover:text-red-500 transition-colors font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Tozalash
                  </button>
                )}
              </div>

              {locationHistory.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                  <Clock className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-xs text-slate-400 font-bold">Hozircha koordinata loglari yo'q</p>
                  <p className="text-[10px] text-slate-400 mt-1">Siz kuzatuvni boshlaganingizda loglar bu yerda yoziladi</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto max-h-[300px] flex flex-col gap-2 pr-1 custom-scrollbar">
                  {locationHistory.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100/70 border border-slate-200 transition-colors flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-700">
                              {log.latitude.toFixed(6)}, {log.longitude.toFixed(6)}
                            </span>
                          </div>
                          <p className="text-[9px] text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-300" />
                            <span>{new Date(log.timestamp).toLocaleTimeString()} ({new Date(log.timestamp).toLocaleDateString()})</span>
                          </p>
                        </div>
                      </div>

                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${log.latitude},${log.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-7 h-7 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors shrink-0 cursor-pointer"
                        title="Google Mapsda ko'rish"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Dynamic interactive Map panel (8 columns) */}
        <div className="lg:col-span-8 flex flex-col gap-4 min-h-[450px]">
          {parentData.connectedUserId && childData ? (
            <div className="bg-white border border-slate-200 shadow-md rounded-2xl p-4 flex-1 flex flex-col overflow-hidden relative">
              {/* Connected Header Metrics */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-150">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={childData.photoURL || "https://api.dicebear.com/7.x/bottts/svg?seed=child"}
                      alt={childData.displayName}
                      className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200"
                    />
                    <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${childData.isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>{childData.displayName}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                      <span className="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">Ulangan</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {childData.currentLatitude
                        ? `So'nggi faollik: ${formatTime(childData.lastLocationTime)}`
                        : "Joylashuv hali olinmagan"}
                    </p>
                  </div>
                </div>

                {/* Accuracy & Coords Header */}
                {childData.currentLatitude && (
                  <div className="flex items-center gap-4 text-right">
                    <div className="hidden sm:block">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Koordinatalar</p>
                      <p className="text-xs font-bold text-slate-700 font-mono">
                        {childData.currentLatitude.toFixed(6)}, {childData.currentLongitude?.toFixed(6)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Map Panel Wrapper */}
              <div className="flex-1 relative rounded-xl overflow-hidden border border-slate-150">
                {childData.currentLatitude && childData.currentLongitude ? (
                  <MapComponent
                    latitude={childData.currentLatitude}
                    longitude={childData.currentLongitude}
                    childName={childData.displayName}
                    childPhotoUrl={childData.photoURL}
                    history={locationHistory}
                  />
                ) : (
                  <div className="w-full h-full bg-slate-50 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4 border border-indigo-100">
                      <Navigation className="w-8 h-8 animate-pulse" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-700">Farzandingiz joylashuvi aniqlanmoqda</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                      "Joylashuvni so'rash" signalini bosing. Farzandingiz ushbu signalni qabul qilganda, xaritada uning nuqtasi paydo bo'ladi.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // No Child Connected State
            <div className="bg-white border border-slate-200 shadow-md rounded-2xl p-8 flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center text-indigo-600 border border-slate-200 mb-5 shadow-sm">
                <Shield className="w-8 h-8 text-indigo-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-display">Farzandingizni ulang</h3>
              <p className="text-xs text-slate-500 mt-2 max-w-sm leading-relaxed">
                Kuzatish xaritasini ochish va xavfsizlikni nazorat qilish uchun dastlab farzandingiz telefonidagi ulanish kodini chap paneldagi maydonga kiriting.
              </p>
              <div className="mt-6 flex flex-col items-start gap-3 bg-slate-50 p-4 rounded-xl max-w-md text-left text-xs border border-slate-200">
                <div className="flex gap-2.5 items-start">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                  <span className="text-slate-600 leading-relaxed">Farzandingiz o'z profilini "Farzand" sifatida tanlashi kerak.</span>
                </div>
                <div className="flex gap-2.5 items-start">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                  <span className="text-slate-600 leading-relaxed">Uning ekranida paydo bo'lgan 6 xonali ulanish kodini oling.</span>
                </div>
                <div className="flex gap-2.5 items-start">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
                  <span className="text-slate-600 leading-relaxed">Kodni chap paneldagi "Ulash" bo'limiga kiriting.</span>
                </div>
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
