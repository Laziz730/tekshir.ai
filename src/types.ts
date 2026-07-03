export type UserRole = 'parent' | 'child' | 'unassigned';

export interface LocationData {
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
  batteryLevel?: number;
  accuracy?: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  connectionCode: string;
  connectedUserId: string | null;
  connectedName: string | null;
  isTrackingActive: boolean;
  trackIntervalMinutes: number;
  highAccuracy: boolean;
  alertMessage: string;
  currentLatitude: number | null;
  currentLongitude: number | null;
  lastLocationTime: string | null;
  batteryLevel: number | null;
  isOnline: boolean;
}

export interface LocationLog {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
  batteryLevel?: number;
  accuracy?: number;
}
