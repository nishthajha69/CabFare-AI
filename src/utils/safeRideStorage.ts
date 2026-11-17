import { EmergencyContact, FareEstimate, LocationPoint, SosDispatchLog } from '../types/cabfare';

const CONTACTS_STORAGE_KEY = 'cabfare_emergency_contacts_v1';
const SOS_LOGS_STORAGE_KEY = 'cabfare_sos_logs_v1';
const SAFETY_MODE_STORAGE_KEY = 'cabfare_women_safety_mode_v1';
const PREFER_FEMALE_STORAGE_KEY = 'cabfare_prefer_female_driver_v1';

export function loadEmergencyContacts(): EmergencyContact[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CONTACTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as EmergencyContact[]) : [];
  } catch {
    return [];
  }
}

export function saveEmergencyContacts(contacts: EmergencyContact[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(contacts));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadSosDispatchLogs(): SosDispatchLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SOS_LOGS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SosDispatchLog[]) : [];
  } catch {
    return [];
  }
}

export function saveSosDispatchLogs(logs: SosDispatchLog[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SOS_LOGS_STORAGE_KEY, JSON.stringify(logs.slice(0, 20)));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadWomenSafetyMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(SAFETY_MODE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveWomenSafetyMode(enabled: boolean) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SAFETY_MODE_STORAGE_KEY, String(enabled));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadPreferFemaleDriver(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(PREFER_FEMALE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function savePreferFemaleDriver(enabled: boolean) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PREFER_FEMALE_STORAGE_KEY, String(enabled));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Checks strictly whether a fare estimate has verified female driver gender from an
 * authorised API (never inferred from name or photo).
 */
export function hasVerifiedAuthorisedFemaleDriver(fare: FareEstimate): boolean {
  return (
    fare.driverProfile.isDriverAssigned &&
    fare.driverProfile.driverGenderSource === 'authorized_provider_api' &&
    fare.driverProfile.driverGender === 'female'
  );
}

/**
 * Shared SafeRide prioritisation comparator:
 * 1. Confirmed female driver from authorised API (when preferFemaleDriver is on)
 * 2. Provider explicitly supporting female-driver preference (when preferFemaleDriver is on)
 * 3. Verified driver status
 * 4. Higher verified driver rating
 * 5. Documented platform safety info score & reliability score
 * 6. Estimated fare ascending
 */
export function sortFaresWithSafeRidePriority(
  fares: FareEstimate[],
  preferFemaleDriver: boolean
): FareEstimate[] {
  return [...fares].sort((a, b) => {
    if (preferFemaleDriver) {
      const aFem = hasVerifiedAuthorisedFemaleDriver(a) ? 1 : 0;
      const bFem = hasVerifiedAuthorisedFemaleDriver(b) ? 1 : 0;
      if (bFem !== aFem) return bFem - aFem;

      const aSup = a.safetyCapabilities.supportsFemaleDriverPreference ? 1 : 0;
      const bSup = b.safetyCapabilities.supportsFemaleDriverPreference ? 1 : 0;
      if (bSup !== aSup) return bSup - aSup;
    }

    const aVer = a.driverProfile.verificationStatus === 'verified_by_provider' ? 1 : 0;
    const bVer = b.driverProfile.verificationStatus === 'verified_by_provider' ? 1 : 0;
    if (bVer !== aVer) return bVer - aVer;

    const aRat = a.driverProfile.driverRating ?? -1;
    const bRat = b.driverProfile.driverRating ?? -1;
    if (bRat !== aRat) return bRat - aRat;

    const sDiff = b.safetyCapabilities.safetyInfoScore - a.safetyCapabilities.safetyInfoScore;
    if (sDiff !== 0) return sDiff;

    const rDiff = b.reliabilityScore - a.reliabilityScore;
    if (rDiff !== 0) return rDiff;

    return a.estimatedFare - b.estimatedFare;
  });
}

/**
 * Masks personal phone digits in UI display so bystanders cannot read full contact numbers.
 */
export function maskPhoneNumber(phone: string): string {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length <= 4) return trimmed;
  const tail = digits.slice(-4);
  const maskedDigits = `${digits.slice(0, 2)}${'•'.repeat(Math.max(2, digits.length - 6))}${tail}`;
  return trimmed.startsWith('+') ? `+${maskedDigits}` : maskedDigits;
}

export function sanitizePhoneForUri(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

export function buildEmergencyShareMessage(params: {
  isSos: boolean;
  pickup: LocationPoint;
  drop: LocationPoint;
  selectedFare?: FareEstimate | null;
  liveCoords?: { lat: number; lng: number } | null;
  ridePinNote?: string;
  vehicleNote?: string;
}): string {
  const { isSos, pickup, drop, selectedFare, liveCoords, ridePinNote, vehicleNote } = params;
  const locLat = liveCoords?.lat ?? pickup.lat;
  const locLng = liveCoords?.lng ?? pickup.lng;
  const mapsPinUrl = `https://www.google.com/maps/search/?api=1&query=${locLat.toFixed(5)},${locLng.toFixed(5)}`;
  const routeUrl = `https://www.google.com/maps/dir/?api=1&origin=${pickup.lat},${pickup.lng}&destination=${drop.lat},${drop.lng}&travelmode=driving`;

  const lines: string[] = [];
  if (isSos) {
    lines.push('SOS EMERGENCY ALERT — Shared via CabFare SafeRide');
    lines.push('Please check on me or contact Emergency Services (112 / Women Helpline 1091) immediately.');
  } else {
    lines.push('Live Ride Check-In — Shared via CabFare SafeRide');
  }

  lines.push(`Planned Route: ${pickup.name} (${pickup.city}) -> ${drop.name} (${drop.city})`);
  if (selectedFare) {
    lines.push(`Cab Provider Option: ${selectedFare.platformName} (${selectedFare.vehicleType})`);
  }
  if (vehicleNote?.trim()) {
    lines.push(`Vehicle / Reg Note: ${vehicleNote.trim()}`);
  }
  if (ridePinNote?.trim()) {
    lines.push(`Ride Start OTP / Check Note: ${ridePinNote.trim()}`);
  }
  lines.push(
    liveCoords
      ? `Current Device GPS Location: ${mapsPinUrl}`
      : `Planned Pickup Map Pin: ${mapsPinUrl}`
  );
  lines.push(`Planned Route Map: ${routeUrl}`);
  lines.push(`Timestamp: ${new Date().toLocaleString()}`);

  return lines.join('\n');
}

export interface FictionalSampleDriverProfile {
  isFictionalDemo: true;
  demoBannerTitle: string;
  demoDisclaimer: string;
  driverName: string;
  initials: string;
  driverRating: number;
  completedRides: number;
  verifiedExperienceYears: number;
  vehicleModel: string;
  vehicleRegistrationNumber: string;
  verificationLabel: string;
  femaleDriverSampleNote: string;
}

/**
 * Returns an unmistakably labelled fictional sample driver profile strictly for
 * opt-in development UI preview. Never used as live or verified driver data.
 */
export function getFictionalSampleDriverProfile(
  fare: FareEstimate
): FictionalSampleDriverProfile {
  const sampleVehicleByCategory: Record<FareEstimate['category'], string> = {
    bike: 'Honda Activa 6G (Sample Vehicle)',
    auto: 'Bajaj RE Compact Auto (Sample Vehicle)',
    hatchback: 'Maruti Suzuki WagonR (Sample Vehicle)',
    sedan: 'Maruti Suzuki Swift Dzire (Sample Vehicle)',
    suv: 'Maruti Suzuki Ertiga (Sample Vehicle)',
    ev: 'Tata Tigor EV (Sample Vehicle)',
  };

  return {
    isFictionalDemo: true,
    demoBannerTitle: 'Fictional Sample Driver Profile (Dev Demo Preview Only)',
    demoDisclaimer:
      'Simulated layout demonstration only — not a real driver, live rating, or verified badge. Genuine driver identity and registration numbers are assigned only inside an authorised provider app after booking.',
    driverName: `Sample Driver — ${fare.platformName} (Demo)`,
    initials: 'SD',
    driverRating: 4.8,
    completedRides: 1240,
    verifiedExperienceYears: 4,
    vehicleModel: sampleVehicleByCategory[fare.category] ?? `${fare.vehicleType} (Sample)`,
    vehicleRegistrationNumber: 'XX-00-DEMO-0000',
    verificationLabel: 'Sample Demo Status (Not Live Verified)',
    femaleDriverSampleNote:
      'Female driver filtering is shown only when an authorised provider API explicitly supports it.',
  };
}

