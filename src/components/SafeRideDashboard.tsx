import {
  AlertTriangle,
  Award,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  LocateFixed,
  Lock,
  MessageSquare,
  Phone,
  Plus,
  Radio,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Star,
  Trash2,
  User,
  UserCheck,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import {
  EmergencyContact,
  FareComparisonResponse,
  FareEstimate,
  RideRecommendationHighlight,
  SosDispatchLog,
} from '../types/cabfare';
import {
  buildEmergencyShareMessage,
  hasVerifiedAuthorisedFemaleDriver,
  maskPhoneNumber,
  sanitizePhoneForUri,
  sortFaresWithSafeRidePriority,
} from '../utils/safeRideStorage';
import { ProviderLogo } from './ProviderLogo';

interface SafeRideDashboardProps {
  comparison: FareComparisonResponse;
  selectedEstimateId: string | null;
  onSelectEstimate: (fare: FareEstimate) => void;
  womenSafetyMode: boolean;
  onToggleWomenSafetyMode: () => void;
  femaleDriverOnly: boolean;
  onToggleFemaleDriverOnly: () => void;
  emergencyContacts: EmergencyContact[];
  onAddEmergencyContact: (contact: Omit<EmergencyContact, 'id'>) => void;
  onDeleteEmergencyContact: (id: string) => void;
  onSetPrimaryContact: (id: string) => void;
  sosLogs: SosDispatchLog[];
  onLogSosAction: (log: Omit<SosDispatchLog, 'id' | 'triggeredAt'>) => void;
  onJumpToExplorer: () => void;
  onViewDriverProfile: (fare: FareEstimate, demoPreview?: boolean) => void;
}

const PRE_BOARDING_CHECKS = [
  {
    id: 'plate',
    title: 'Match Vehicle Registration Number',
    detail: 'Confirm the physical license plate matches the assigned plate inside the official provider app before opening the door.',
  },
  {
    id: 'driver',
    title: 'Verify Driver Name & Photograph',
    detail: 'Ensure the driver matches the assigned profile supplied inside the provider app after booking.',
  },
  {
    id: 'pin',
    title: 'Use 4-Digit Ride PIN / Start OTP',
    detail: 'Only share your Ride PIN once seated inside the verified cab (supported by Uber, Ola, BluSmart, Rapido, and Namma Yatri).',
  },
  {
    id: 'share',
    title: 'Share Official Trip Link + Device Check-In',
    detail: 'Share the official provider tracking link and/or your real device check-in with your saved emergency contact.',
  },
];

export function SafeRideDashboard({
  comparison,
  selectedEstimateId,
  onSelectEstimate,
  womenSafetyMode,
  onToggleWomenSafetyMode,
  femaleDriverOnly,
  onToggleFemaleDriverOnly,
  emergencyContacts,
  onAddEmergencyContact,
  onDeleteEmergencyContact,
  onSetPrimaryContact,
  sosLogs,
  onLogSosAction,
  onJumpToExplorer,
  onViewDriverProfile,
}: SafeRideDashboardProps) {
  const [contactName, setContactName] = useState('');
  const [contactRelation, setContactRelation] = useState('Family');
  const [contactPhone, setContactPhone] = useState('');
  const [contactError, setContactError] = useState<string | null>(null);
  const [revealPhones, setRevealPhones] = useState(false);

  const [vehicleNote, setVehicleNote] = useState('');
  const [ridePinNote, setRidePinNote] = useState('');
  const [liveCoords, setLiveCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(
    null
  );
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const [sosFeedback, setSosFeedback] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<'sos' | 'share' | null>(null);
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});

  const selectedFare =
    comparison.fares.find((f) => f.id === selectedEstimateId) ??
    comparison.platformBenchmarks[0] ??
    comparison.fares[0] ??
    null;

  const primaryContact =
    emergencyContacts.find((c) => c.isPrimary) ?? emergencyContacts[0] ?? null;

  // Check strictly whether any option has real assigned driver data from an authorised API
  const assignedDriverFares = sortFaresWithSafeRidePriority(
    comparison.fares.filter(
      (f) =>
        f.driverProfile.isDriverAssigned &&
        typeof f.driverProfile.driverRating === 'number'
    ),
    femaleDriverOnly
  );

  const hasConfirmedFemaleAvailability = comparison.fares.some(
    (f) =>
      hasVerifiedAuthorisedFemaleDriver(f) ||
      f.safetyCapabilities.supportsFemaleDriverPreference
  );

  const displayedComparisonFares = sortFaresWithSafeRidePriority(
    comparison.fares,
    femaleDriverOnly
  );

  const captureDeviceGps = async (): Promise<{ lat: number; lng: number; accuracy: number } | null> => {
    if (
      typeof window === 'undefined' ||
      !window.isSecureContext ||
      !('geolocation' in navigator)
    ) {
      setGpsStatus('Real GPS capture requires HTTPS browser geolocation access.');
      return null;
    }
    setGpsStatus('Reading device GPS coordinates...');
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 15000,
        });
      });
      const coords = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      };
      setLiveCoords(coords);
      setGpsStatus(
        `Device GPS captured: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)} (±${Math.round(coords.accuracy)}m)`
      );
      return coords;
    } catch {
      setGpsStatus('Could not obtain device GPS (permission denied or signal unavailable). Planned pickup coordinates will be referenced instead.');
      return null;
    }
  };

  const handleCopyMessage = async (isSos: boolean) => {
    const coords = liveCoords ?? (await captureDeviceGps());
    const text = buildEmergencyShareMessage({
      isSos,
      pickup: comparison.route.pickup,
      drop: comparison.route.drop,
      selectedFare,
      liveCoords: coords,
      ridePinNote,
      vehicleNote,
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(isSos ? 'sos' : 'share');
      window.setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      // Fallback ignored if clipboard denied
    }
    onLogSosAction({
      routeLabel: `${comparison.route.pickup.area} -> ${comparison.route.drop.area}`,
      lat: coords?.lat ?? comparison.route.pickup.lat,
      lng: coords?.lng ?? comparison.route.pickup.lng,
      channel: isSos ? 'contact_share' : 'live_share',
      recipientsCount: emergencyContacts.length,
      note: isSos
        ? 'SOS alert payload copied & ready for emergency dispatch.'
        : 'Live check-in message copied for sharing.',
    });
    setSosFeedback(
      isSos
        ? 'SOS alert message & location link copied to clipboard. Use Call 112 / 1091 or SMS/WhatsApp buttons below to send immediately.'
        : 'Route & device location check-in copied to clipboard.'
    );
  };

  const handleNativeShare = async (isSos: boolean) => {
    const coords = liveCoords ?? (await captureDeviceGps());
    const text = buildEmergencyShareMessage({
      isSos,
      pickup: comparison.route.pickup,
      drop: comparison.route.drop,
      selectedFare,
      liveCoords: coords,
      ridePinNote,
      vehicleNote,
    });

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: isSos ? 'SOS Emergency Ride Alert' : 'Live Ride Check-In',
          text,
        });
        onLogSosAction({
          routeLabel: `${comparison.route.pickup.area} -> ${comparison.route.drop.area}`,
          lat: coords?.lat ?? comparison.route.pickup.lat,
          lng: coords?.lng ?? comparison.route.pickup.lng,
          channel: isSos ? 'contact_share' : 'live_share',
          recipientsCount: Math.max(1, emergencyContacts.length),
          note: isSos ? 'SOS alert shared via system share sheet.' : 'Ride check-in shared via system share sheet.',
        });
        setSosFeedback('Shared successfully via device share dialog.');
        return;
      } catch {
        // User cancelled or share failed; fall back to clipboard copy
      }
    }
    await handleCopyMessage(isSos);
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactError(null);
    const trimmedName = contactName.trim();
    const cleanedPhone = sanitizePhoneForUri(contactPhone.trim());

    if (trimmedName.length < 2) {
      setContactError('Please enter the contact name.');
      return;
    }
    if (cleanedPhone.replace(/\D/g, '').length < 10) {
      setContactError('Please enter a valid 10+ digit phone number (include country code e.g. +91).');
      return;
    }

    onAddEmergencyContact({
      name: trimmedName,
      relationship: contactRelation.trim() || 'Trusted Contact',
      phone: contactPhone.trim(),
      isPrimary: emergencyContacts.length === 0,
    });
    setContactName('');
    setContactPhone('');
  };

  const shareText = buildEmergencyShareMessage({
    isSos: true,
    pickup: comparison.route.pickup,
    drop: comparison.route.drop,
    selectedFare,
    liveCoords,
    ridePinNote,
    vehicleNote,
  });

  const liveCheckInText = buildEmergencyShareMessage({
    isSos: false,
    pickup: comparison.route.pickup,
    drop: comparison.route.drop,
    selectedFare,
    liveCoords,
    ridePinNote,
    vehicleNote,
  });

  const primaryPhoneClean = primaryContact ? sanitizePhoneForUri(primaryContact.phone) : '';
  const smsHref = primaryPhoneClean
    ? `sms:${primaryPhoneClean}?body=${encodeURIComponent(shareText)}`
    : `sms:?body=${encodeURIComponent(shareText)}`;
  const waHref = primaryPhoneClean
    ? `https://wa.me/${primaryPhoneClean.replace(/^\+/, '')}?text=${encodeURIComponent(liveCheckInText)}`
    : `https://wa.me/?text=${encodeURIComponent(liveCheckInText)}`;

  const safeRecCards: RideRecommendationHighlight[] = [
    comparison.rideRecommendations.bestRatedDriver,
    comparison.rideRecommendations.bestSafetyInfo,
    comparison.rideRecommendations.cheapest,
    comparison.rideRecommendations.bestOverall,
  ].filter((r): r is RideRecommendationHighlight => r !== null);

  return (
    <div className="space-y-6">
      {/* SafeRide Hero Banner & Women's Safety Mode Control */}
      <section
        aria-label="SafeRide Women's Safety Hub"
        className="rounded-xl border border-rose-200 bg-white p-5 sm:p-6"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600 text-white">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              </span>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900">
                SafeRide – Women&apos;s Safety &amp; Trusted Drivers
              </h2>
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                Transparent Safety Architecture
              </span>
            </div>
            <p className="mt-1.5 text-sm text-slate-600">
              Compare documented platform safety tools, pre-booking driver status, Ride PIN verification, and emergency response workflows for{' '}
              <strong className="text-slate-900">
                {comparison.route.pickup.area} → {comparison.route.drop.area}
              </strong>{' '}
              ({comparison.cityProviderContext.cityName}).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            <button
              type="button"
              role="switch"
              aria-checked={womenSafetyMode}
              onClick={onToggleWomenSafetyMode}
              className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                womenSafetyMode
                  ? 'border-rose-300 bg-rose-600 text-white hover:bg-rose-700'
                  : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
              }`}
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              <span>Women&apos;s Safety Mode: {womenSafetyMode ? 'Enabled' : 'Disabled'}</span>
            </button>

            <button
              type="button"
              role="switch"
              aria-checked={femaleDriverOnly}
              onClick={onToggleFemaleDriverOnly}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                femaleDriverOnly
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-800'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Prefer Female Driver: {femaleDriverOnly ? 'On' : 'Off'}</span>
            </button>
          </div>
        </div>

        {/* Truthfulness & Safety Caveat Strip */}
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-950">
            <p className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden="true" />
              <span>Zero Fabrication Guarantee</span>
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-amber-900">
              CabFare AI never generates fake driver names, photographs, ratings, verification badges, completed trip counts, or simulated moving GPS pins. Driver gender is displayed only when supplied by an authorised API and is never assumed from names or photos.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">
            <p className="font-semibold flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 shrink-0 text-blue-700" aria-hidden="true" />
              <span>Safety Disclaimer &amp; Privacy Protection</span>
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
              Driver ratings and platform safety tools do not guarantee personal safety. Emergency contacts stay strictly in your browser&apos;s local storage with masked display protection.
            </p>
          </div>
        </div>

        {femaleDriverOnly && (
          <div
            role="status"
            className="mt-3 flex flex-col gap-2.5 rounded-lg border border-indigo-200 bg-indigo-50/70 px-3.5 py-3 text-xs text-indigo-950 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              {hasConfirmedFemaleAvailability ? (
                <span>
                  <strong>Prefer Female Driver Active:</strong> Confirmed female-driver options and providers supporting female-driver preference are prioritised first, followed by verified and safety-prioritised drivers.
                </span>
              ) : (
                <span>
                  <strong>Prefer Female Driver Active — Female-driver availability cannot be confirmed:</strong>{' '}
                  Publicly accessible APIs for {comparison.supportedPlatforms.map((p) => p.name).join(', ') || 'this route'} do not confirm female-driver assignment pre-booking, and gender is never assumed from names or photos. Verified and safety-prioritised options remain available below so you can continue with other available drivers.
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onJumpToExplorer}
                className="rounded-md border border-indigo-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-indigo-900 hover:bg-indigo-100 whitespace-nowrap"
              >
                Continue in Ride Explorer
              </button>
              <button
                type="button"
                onClick={onToggleFemaleDriverOnly}
                className="rounded-md bg-indigo-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-indigo-800 whitespace-nowrap"
              >
                Continue Without Preference
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Smart Safety & Value Recommendations (4 Cards) */}
      {safeRecCards.length > 0 && (
        <section aria-label="SafeRide Smart Recommendations">
          <h3 className="font-display text-base font-bold text-slate-900 mb-3">
            Smart Safety &amp; Value Recommendations
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {safeRecCards.map((rec) => {
              const est = rec.estimate;
              const style =
                rec.type === 'best_rated_driver'
                  ? 'border-amber-200 bg-amber-50/50'
                  : rec.type === 'best_safety_info'
                    ? 'border-rose-200 bg-rose-50/50'
                    : rec.type === 'cheapest'
                      ? 'border-emerald-200 bg-emerald-50/50'
                      : 'border-blue-200 bg-blue-50/50';

              return (
                <div
                  key={rec.type}
                  className={`flex flex-col justify-between rounded-xl border p-4 ${style}`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900">
                        {rec.type === 'best_rated_driver' ? (
                          <Star className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                        ) : rec.type === 'best_safety_info' ? (
                          <ShieldCheck className="h-3.5 w-3.5 text-rose-600" aria-hidden="true" />
                        ) : rec.type === 'cheapest' ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                        ) : (
                          <Award className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                        )}
                        <span>{rec.title}</span>
                      </span>
                      {est && (
                        <span className="font-mono text-base font-bold text-slate-900 tabular-nums">
                          ₹{est.estimatedFare}
                        </span>
                      )}
                    </div>

                    {est ? (
                      <div className="mt-2.5 flex items-center gap-2">
                        <ProviderLogo platformId={est.platformId} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-slate-900">
                            {est.platformName} · {est.vehicleType}
                          </p>
                          <p className="text-[11px] text-slate-600 tabular-nums">
                            Safety info: {est.safetyCapabilities.safetyInfoScore}/100 ·{' '}
                            {est.arrivalMinutes}m ETA
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2.5 rounded-md border border-amber-200 bg-white/80 px-2.5 py-1.5 text-xs font-semibold text-amber-900">
                        Driver details will be available after booking
                      </p>
                    )}

                    <p className="mt-2 text-[11px] leading-relaxed text-slate-700">{rec.reason}</p>
                  </div>

                  {est && (
                    <div className="mt-3 flex items-center justify-between border-t border-slate-200/70 pt-2">
                      <button
                        type="button"
                        onClick={() => onSelectEstimate(est)}
                        className="text-xs font-semibold text-blue-700 hover:underline"
                      >
                        Select for Check-In
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectEstimate(est);
                          onJumpToExplorer();
                        }}
                        className="text-[11px] font-medium text-slate-600 hover:text-slate-900"
                      >
                        View in Explorer →
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* WOMEN'S SAFETY DASHBOARD: SOS Emergency, Contacts, Live Ride Sharing, Verification */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Column 1: SOS Emergency + Quick Emergency Services */}
        <section
          aria-label="SOS Emergency and Assistance"
          className="rounded-xl border border-rose-200 bg-white p-5 sm:p-6 lg:col-span-6 space-y-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-600" aria-hidden="true" />
                <span>SOS Emergency &amp; Quick Assistance</span>
              </h3>
              <p className="mt-0.5 text-xs text-slate-600">
                Direct emergency helpline dialing plus instant SOS alert message dispatch to your saved contacts.
              </p>
            </div>
            <span className="rounded bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-700 border border-rose-200">
              India Helplines
            </span>
          </div>

          {/* Direct India Emergency Dial Tiles */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <a
              href="tel:112"
              onClick={() =>
                onLogSosAction({
                  routeLabel: `${comparison.route.pickup.area} -> ${comparison.route.drop.area}`,
                  channel: 'emergency_dial',
                  recipientsCount: 1,
                  note: 'Initiated call link to 112 National Emergency.',
                })
              }
              className="flex flex-col items-center justify-center rounded-lg border border-rose-300 bg-rose-600 px-3 py-3 text-center text-white transition-colors hover:bg-rose-700"
            >
              <Phone className="h-4 w-4 mb-1" aria-hidden="true" />
              <span className="font-mono text-base font-bold">112</span>
              <span className="text-[10px] font-medium text-rose-100">National SOS</span>
            </a>

            <a
              href="tel:1091"
              onClick={() =>
                onLogSosAction({
                  routeLabel: `${comparison.route.pickup.area} -> ${comparison.route.drop.area}`,
                  channel: 'emergency_dial',
                  recipientsCount: 1,
                  note: 'Initiated call link to 1091 Women Helpline.',
                })
              }
              className="flex flex-col items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3 py-3 text-center text-rose-900 transition-colors hover:bg-rose-100"
            >
              <Phone className="h-4 w-4 mb-1 text-rose-700" aria-hidden="true" />
              <span className="font-mono text-base font-bold">1091</span>
              <span className="text-[10px] font-medium text-rose-800">Women Helpline</span>
            </a>

            <a
              href="tel:100"
              onClick={() =>
                onLogSosAction({
                  routeLabel: `${comparison.route.pickup.area} -> ${comparison.route.drop.area}`,
                  channel: 'emergency_dial',
                  recipientsCount: 1,
                  note: 'Initiated call link to 100 Police.',
                })
              }
              className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-center text-slate-900 transition-colors hover:bg-slate-100"
            >
              <Phone className="h-4 w-4 mb-1 text-slate-700" aria-hidden="true" />
              <span className="font-mono text-base font-bold">100</span>
              <span className="text-[10px] font-medium text-slate-600">Police</span>
            </a>

            <a
              href="tel:108"
              onClick={() =>
                onLogSosAction({
                  routeLabel: `${comparison.route.pickup.area} -> ${comparison.route.drop.area}`,
                  channel: 'emergency_dial',
                  recipientsCount: 1,
                  note: 'Initiated call link to 108 Ambulance.',
                })
              }
              className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-center text-slate-900 transition-colors hover:bg-slate-100"
            >
              <Phone className="h-4 w-4 mb-1 text-emerald-700" aria-hidden="true" />
              <span className="font-mono text-base font-bold">108</span>
              <span className="text-[10px] font-medium text-slate-600">Medical / 108</span>
            </a>
          </div>

          {/* Primary SOS Contact Workflow Actions */}
          <div className="rounded-lg border border-rose-200/80 bg-rose-50/40 p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-900">
                Emergency Contact SOS Workflow
              </span>
              <button
                type="button"
                onClick={() => void captureDeviceGps()}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline"
              >
                <LocateFixed className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{liveCoords ? 'Refresh Real GPS' : 'Attach Device GPS'}</span>
              </button>
            </div>

            {gpsStatus && <p className="text-[11px] text-slate-600">{gpsStatus}</p>}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleNativeShare(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-700"
              >
                <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Send SOS Alert</span>
              </button>

              <a
                href={smsHref}
                onClick={() =>
                  onLogSosAction({
                    routeLabel: `${comparison.route.pickup.area} -> ${comparison.route.drop.area}`,
                    lat: liveCoords?.lat ?? comparison.route.pickup.lat,
                    lng: liveCoords?.lng ?? comparison.route.pickup.lng,
                    channel: 'contact_share',
                    recipientsCount: primaryContact ? 1 : 0,
                    note: primaryContact
                      ? `Opened SMS SOS draft for ${primaryContact.name}.`
                      : 'Opened SMS SOS draft.',
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-50"
              >
                <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {primaryContact ? `SMS ${primaryContact.name}` : 'SMS Emergency Text'}
                </span>
              </a>

              <button
                type="button"
                onClick={() => void handleCopyMessage(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {copiedKey === 'sos' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                    <span className="text-emerald-700">SOS Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Copy SOS Details</span>
                  </>
                )}
              </button>
            </div>

            {sosFeedback && (
              <p role="status" className="text-[11px] font-medium text-emerald-800">
                {sosFeedback}
              </p>
            )}
          </div>

          {sosLogs.length > 0 && (
            <div className="border-t border-slate-100 pt-3">
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Recent Emergency / Check-In Activity (Local Only)
              </h4>
              <ul className="mt-1.5 space-y-1">
                {sosLogs.slice(0, 3).map((log) => (
                  <li key={log.id} className="text-[11px] text-slate-600 flex justify-between gap-2">
                    <span className="truncate">{log.note}</span>
                    <span className="font-mono text-slate-400 shrink-0">
                      {new Date(log.triggeredAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Column 2: Emergency Contact Management */}
        <section
          aria-label="Emergency Contact Management"
          className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 lg:col-span-6 space-y-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" aria-hidden="true" />
                <span>Emergency Contact Management</span>
              </h3>
              <p className="mt-0.5 text-xs text-slate-600">
                Contacts stay strictly in your device&apos;s local storage and are masked by default for privacy.
              </p>
            </div>
            {emergencyContacts.length > 0 && (
              <button
                type="button"
                onClick={() => setRevealPhones((v) => !v)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
              >
                {revealPhones ? (
                  <>
                    <EyeOff className="h-3 w-3" aria-hidden="true" />
                    <span>Mask Numbers</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3" aria-hidden="true" />
                    <span>Reveal</span>
                  </>
                )}
              </button>
            )}
          </div>

          <form onSubmit={handleContactSubmit} className="grid grid-cols-1 gap-2.5 sm:grid-cols-12">
            <div className="sm:col-span-4">
              <label htmlFor="ec-name" className="mb-1 block text-[11px] font-medium text-slate-700">
                Contact Name
              </label>
              <input
                id="ec-name"
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. Mom / Priya"
                className="h-9 w-full rounded-lg border border-slate-300 px-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-3">
              <label htmlFor="ec-rel" className="mb-1 block text-[11px] font-medium text-slate-700">
                Relation
              </label>
              <select
                id="ec-rel"
                value={contactRelation}
                onChange={(e) => setContactRelation(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              >
                <option value="Family">Family</option>
                <option value="Friend">Friend</option>
                <option value="Colleague">Colleague</option>
                <option value="Partner">Partner</option>
              </select>
            </div>
            <div className="sm:col-span-3">
              <label htmlFor="ec-phone" className="mb-1 block text-[11px] font-medium text-slate-700">
                Phone (+91...)
              </label>
              <input
                id="ec-phone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91 98XXXXXXXX"
                className="h-9 w-full rounded-lg border border-slate-300 px-2.5 font-mono text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2 flex items-end">
              <button
                type="submit"
                className="inline-flex h-9 w-full items-center justify-center gap-1 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Add</span>
              </button>
            </div>
          </form>

          {contactError && (
            <p role="alert" className="text-xs font-medium text-red-700">
              {contactError}
            </p>
          )}

          {emergencyContacts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/70 p-4 text-xs text-slate-600">
              No emergency contacts saved yet. Add a trusted family member or friend above to enable one-tap SMS SOS and WhatsApp ride check-ins.
            </div>
          ) : (
            <ul className="space-y-2">
              {emergencyContacts.map((c) => (
                <li
                  key={c.id}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-xs ${
                    c.isPrimary
                      ? 'border-blue-200 bg-blue-50/40'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{c.name}</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                        {c.relationship}
                      </span>
                      {c.isPrimary && (
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800">
                          Primary SOS
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 font-mono text-slate-600">
                      {revealPhones ? c.phone : maskPhoneNumber(c.phone)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!c.isPrimary && (
                      <button
                        type="button"
                        onClick={() => onSetPrimaryContact(c.id)}
                        className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Set Primary
                      </button>
                    )}
                    <a
                      href={`tel:${sanitizePhoneForUri(c.phone)}`}
                      className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
                    >
                      Call
                    </a>
                    <button
                      type="button"
                      onClick={() => onDeleteEmergencyContact(c.id)}
                      aria-label={`Remove ${c.name}`}
                      className="rounded border border-slate-200 bg-white p-1 text-slate-500 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Live Ride Sharing, Real-Time Tracking Transparency & Ride PIN / Verification Checklist */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section
          aria-label="Live Ride Sharing and Tracking Availability"
          className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 lg:col-span-6 space-y-4"
        >
          <div>
            <h3 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
              <Share2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              <span>Live Ride Sharing &amp; Real-Time Tracking Status</span>
            </h3>
            <p className="mt-0.5 text-xs text-slate-600">
              Share your planned route, actual device GPS check-in, and post-booking vehicle/OTP notes. Live vehicle telemetry starts inside the official provider app after booking.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div>
              <label htmlFor="share-veh-note" className="mb-1 block text-[11px] font-medium text-slate-700">
                Vehicle Number / Model (Once Assigned)
              </label>
              <input
                id="share-veh-note"
                type="text"
                value={vehicleNote}
                onChange={(e) => setVehicleNote(e.target.value)}
                placeholder="Enter after booking, e.g. KA01AB..."
                className="h-9 w-full rounded-lg border border-slate-300 px-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="share-pin-note" className="mb-1 block text-[11px] font-medium text-slate-700">
                Ride PIN / Check-In Note (Optional)
              </label>
              <input
                id="share-pin-note"
                type="text"
                value={ridePinNote}
                onChange={(e) => setRidePinNote(e.target.value)}
                placeholder="e.g. Boarded at Gate 2"
                className="h-9 w-full rounded-lg border border-slate-300 px-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleNativeShare(false)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Share Live Check-In</span>
            </button>

            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
            >
              <span>WhatsApp Check-In</span>
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>

            <button
              type="button"
              onClick={() => void handleCopyMessage(false)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              {copiedKey === 'share' ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Copy Share Link</span>
                </>
              )}
            </button>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-[11px] text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
              <span>Real-Time Tracking Availability (Pre-Booking Transparency)</span>
            </p>
            <p>
              Real-time cab GPS tracking is only active after ride confirmation inside the chosen provider&apos;s app ({selectedFare ? selectedFare.safetyCapabilities.trackingAvailabilityLabel : 'Provider app required'}). CabFare AI never simulates fake moving driver markers.
            </p>
          </div>
        </section>

        {/* Column 2: Ride PIN Verification & Pre-Boarding Checklist */}
        <section
          aria-label="Driver Verification and Ride PIN Verification"
          className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 lg:col-span-6 space-y-4"
        >
          <div>
            <h3 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-blue-600" aria-hidden="true" />
              <span>Driver Verification &amp; Ride PIN Checklist</span>
            </h3>
            <p className="mt-0.5 text-xs text-slate-600">
              Complete these verification steps before boarding. Ride PIN protection prevents unauthorised drivers from starting your trip.
            </p>
          </div>

          <ul className="space-y-2">
            {PRE_BOARDING_CHECKS.map((step) => {
              const checked = Boolean(checkedSteps[step.id]);
              return (
                <li key={step.id}>
                  <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50/60 p-3 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setCheckedSteps((prev) => ({ ...prev, [step.id]: !prev[step.id] }))
                      }
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                    />
                    <div className="text-xs">
                      <span
                        className={`font-semibold ${
                          checked ? 'text-emerald-800 line-through' : 'text-slate-900'
                        }`}
                      >
                        {step.title}
                      </span>
                      <p className="mt-0.5 text-[11px] text-slate-600">{step.detail}</p>
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {/* SECTION: TOP-RATED & TRUSTED DRIVERS */}
      <section
        aria-label="Top-Rated and Trusted Drivers"
        className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" aria-hidden="true" />
              <span>Top-Rated &amp; Trusted Drivers</span>
            </h3>
            <p className="text-xs text-slate-600">
              Identifies and prioritizes verified, high-rated drivers whenever an authorised provider API supplies live driver profiles.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!womenSafetyMode) onToggleWomenSafetyMode();
              onJumpToExplorer();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100 self-start sm:self-auto whitespace-nowrap"
          >
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Prioritise Safety-First Options</span>
          </button>
        </div>

        {assignedDriverFares.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {assignedDriverFares.map((fare) => (
              <div
                key={fare.id}
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {fare.driverProfile.driverPhotoUrl ? (
                      <img
                        src={fare.driverProfile.driverPhotoUrl}
                        alt={fare.driverProfile.driverName ?? 'Driver photo'}
                        className="h-10 w-10 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <ProviderLogo platformId={fare.platformId} size="md" />
                    )}
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {fare.driverProfile.driverName}
                      </p>
                      <p className="text-xs text-slate-600">
                        {fare.platformName} · {fare.vehicleType}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-base font-bold text-slate-900">
                    ₹{fare.estimatedFare}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700">
                  <div>Rating: {fare.driverProfile.driverRating ?? 'N/A'}</div>
                  <div>Completed rides: {fare.driverProfile.completedRides ?? 'N/A'}</div>
                  <div>Vehicle: {fare.driverProfile.vehicleModel ?? 'Pending'}</div>
                  <div>Reg: {fare.driverProfile.vehicleRegistrationNumber ?? 'Pending'}</div>
                  {fare.driverProfile.driverGenderSource === 'authorized_provider_api' &&
                    fare.driverProfile.driverGender && (
                      <div className="col-span-2 capitalize font-medium text-emerald-800">
                        Gender (Authorised API): {fare.driverProfile.driverGender.replace('_', ' ')}
                      </div>
                    )}
                </div>
                <button
                  type="button"
                  onClick={() => onViewDriverProfile(fare)}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                >
                  <User className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>View Driver Profile</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/40 p-5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-slate-900">
                Driver details will be available after booking
              </p>
              <span className="rounded bg-slate-200/80 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                Pre-Booking Mode · No Fake Profiles
              </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-700">
              Individual driver names, photographs, star ratings, completed trip counts, verified experience, vehicle model, and registration numbers are assigned by {comparison.supportedPlatforms.map((p) => p.name).join(', ') || 'cab operators'} strictly <strong>after</strong> you confirm a booking in their authorised app. CabFare AI does not fabricate synthetic driver personas or unverified verification badges.
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <p className="text-[11px] text-amber-900 font-medium">
                Note: When driver ratings are supplied post-booking, remember that high ratings alone do not guarantee safety — always confirm the registration plate and Ride PIN.
              </p>
              {selectedFare && (
                <button
                  type="button"
                  onClick={() => onViewDriverProfile(selectedFare, true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-50 whitespace-nowrap"
                >
                  <User className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Preview Fictional Sample Profile (Dev Demo)</span>
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* SECTION: SAFETY-BASED CAB COMPARISON */}
      <section
        aria-label="Safety-Based Cab Comparison"
        className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display text-lg font-bold text-slate-900">
              Safety-Based Cab Comparison ({comparison.cityProviderContext.cityName})
            </h3>
            <p className="text-xs text-slate-600">
              Side-by-side view of driver rating status, verification status, platform safety information availability, ride tracking availability, and estimated fare.
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500">
            {displayedComparisonFares.length} options compared
          </span>
        </div>

        {displayedComparisonFares.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center text-xs text-slate-600">
            No supported cab providers operate at the selected location.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 pr-3 font-semibold">Provider &amp; Cab</th>
                  <th className="py-2.5 pr-3 font-semibold">Driver Rating</th>
                  <th className="py-2.5 pr-3 font-semibold">Verification Status</th>
                  <th className="py-2.5 pr-3 font-semibold">Safety Information Availability</th>
                  <th className="py-2.5 pr-3 font-semibold">Ride Tracking Availability</th>
                  <th className="py-2.5 pr-3 text-right font-semibold">Est. Fare</th>
                  <th className="py-2.5 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedComparisonFares.map((fare) => {
                  const isVerified =
                    fare.driverProfile.verificationStatus === 'verified_by_provider';
                  return (
                    <tr
                      key={fare.id}
                      className={`hover:bg-slate-50/80 ${
                        selectedEstimateId === fare.id ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2.5">
                          <ProviderLogo platformId={fare.platformId} size="sm" />
                          <div>
                            <p className="font-semibold text-slate-900">{fare.platformName}</p>
                            <p className="text-[11px] text-slate-500">
                              {fare.vehicleType} ({fare.categoryLabel})
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 pr-3">
                        {fare.driverProfile.driverRating !== null ? (
                          <span className="font-mono font-bold text-slate-900">
                            {fare.driverProfile.driverRating} ★ ({fare.driverProfile.completedRides ?? 0} trips)
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-slate-600">
                            Available after booking
                          </span>
                        )}
                      </td>

                      <td className="py-3 pr-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold ${
                            isVerified
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isVerified ? 'Verified by Provider' : 'Unverified pre-booking'}
                        </span>
                      </td>

                      <td className="py-3 pr-3">
                        <div className="space-y-1">
                          <span className="font-semibold text-slate-800 tabular-nums">
                            {fare.safetyCapabilities.safetyInfoScore}/100 ·{' '}
                            {fare.safetyCapabilities.safetyInfoLevel}
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {fare.safetyCapabilities.hasRidePinVerification && (
                              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                                Ride PIN
                              </span>
                            )}
                            {fare.safetyCapabilities.hasSOSButtonInApp && (
                              <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">
                                In-app SOS
                              </span>
                            )}
                            {fare.safetyCapabilities.has24x7SafetyHelpline && (
                              <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                                24x7 Helpline
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 pr-3 text-[11px] text-slate-600">
                        {fare.safetyCapabilities.trackingAvailabilityLabel}
                      </td>

                      <td className="py-3 pr-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                        ₹{fare.estimatedFare}
                      </td>

                      <td className="py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onViewDriverProfile(fare)}
                            className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-800 hover:bg-rose-50"
                          >
                            <User className="h-3 w-3" aria-hidden="true" />
                            <span>View Driver Profile</span>
                          </button>
                          <a
                            href={fare.bookingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-800"
                          >
                            <span>Book</span>
                            <ExternalLink className="h-3 w-3" aria-hidden="true" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
