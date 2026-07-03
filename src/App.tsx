import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "./lib/firebase";
import { UserProfile, UserRole } from "./types";
import Login from "./components/Login";
import RoleSelection from "./components/RoleSelection";
import ParentDashboard from "./components/ParentDashboard";
import ChildDashboard from "./components/ChildDashboard";
import { Shield } from "lucide-react";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to generate a 6-character random code (e.g. "E4B289")
  const generateConnectionCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No confusing chars like 0, O, 1, I
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Fetch or create user profile in Firestore
        const userRef = doc(db, "users", firebaseUser.uid);
        try {
          const docSnap = await getDoc(userRef);
          
          if (docSnap.exists()) {
            // Existing user
            const profileData = docSnap.data() as UserProfile;
            setUserProfile(profileData);
            
            // Mark user as online
            await updateDoc(userRef, { isOnline: true });
          } else {
            // New user, generate new profile
            const code = generateConnectionCode();
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              displayName: firebaseUser.displayName || "Foydalanuvchi",
              photoURL: firebaseUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${firebaseUser.uid}`,
              role: "unassigned",
              connectionCode: code,
              connectedUserId: null,
              connectedName: null,
              isTrackingActive: false,
              trackIntervalMinutes: 1,
              highAccuracy: true,
              alertMessage: "",
              currentLatitude: null,
              currentLongitude: null,
              lastLocationTime: null,
              batteryLevel: 100,
              isOnline: true
            };
            
            await setDoc(userRef, newProfile);
            setUserProfile(newProfile);
          }
        } catch (err) {
          console.error("Firestore loading error:", err);
          handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Update offline status when user signs out or tab closes
  const handleLogout = async () => {
    if (user) {
      try {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, { isOnline: false });
      } catch (err) {
        console.error("Error setting offline status:", err);
      }
    }
    await signOut(auth);
  };

  // Role onboarding callback
  const handleSelectRole = async (selectedRole: UserRole) => {
    if (!user || !userProfile) return;
    
    setLoading(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { role: selectedRole });
      
      setUserProfile((prev) => {
        if (!prev) return null;
        return { ...prev, role: selectedRole };
      });
    } catch (err) {
      console.error("Error updating user role:", err);
    } finally {
      setLoading(false);
    }
  };

  // Login handler for Mock/Developer flows inside iframe
  const handleLoginSuccess = async (loggedInUser: any, isMock = false) => {
    setLoading(true);
    setUser(loggedInUser);
    
    const userRef = doc(db, "users", loggedInUser.uid);
    try {
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        setUserProfile(docSnap.data() as UserProfile);
        await updateDoc(userRef, { isOnline: true });
      } else {
        const code = generateConnectionCode();
        const newProfile: UserProfile = {
          uid: loggedInUser.uid,
          email: loggedInUser.email || "",
          displayName: loggedInUser.displayName || "Foydalanuvchi",
          photoURL: loggedInUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${loggedInUser.uid}`,
          role: isMock ? loggedInUser.role : "unassigned", // skip onboarding if mock selected parent/child specifically
          connectionCode: code,
          connectedUserId: null,
          connectedName: null,
          isTrackingActive: false,
          trackIntervalMinutes: 1,
          highAccuracy: true,
          alertMessage: "",
          currentLatitude: null,
          currentLongitude: null,
          lastLocationTime: null,
          batteryLevel: 100,
          isOnline: true
        };
        
        await setDoc(userRef, newProfile);
        setUserProfile(newProfile);
      }
    } catch (err) {
      console.error("Login success handling error:", err);
      handleFirestoreError(err, OperationType.GET, `users/${loggedInUser.uid}`);
    } finally {
      setLoading(false);
    }
  };

  // Loading Screen Spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 animate-pulse">
            <Shield className="w-8 h-8 animate-spin duration-3000" />
          </div>
        </div>
        <p className="text-xs text-slate-500 font-medium mt-4 tracking-wide font-sans animate-pulse">
          Ma'lumotlar yuklanmoqda, iltimos kuting...
        </p>
      </div>
    );
  }

  // Auth Guard: If not signed in
  if (!user || !userProfile) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Onboarding Guard: If role not chosen yet
  if (userProfile.role === "unassigned") {
    return (
      <RoleSelection
        userName={userProfile.displayName}
        onSelectRole={handleSelectRole}
      />
    );
  }

  // Dashboard routing based on roles
  if (userProfile.role === "parent") {
    return (
      <ParentDashboard
        userProfile={userProfile}
        onLogout={handleLogout}
      />
    );
  }

  if (userProfile.role === "child") {
    return (
      <ChildDashboard
        userProfile={userProfile}
        onLogout={handleLogout}
      />
    );
  }

  // Fallback
  return <Login onLoginSuccess={handleLoginSuccess} />;
}
