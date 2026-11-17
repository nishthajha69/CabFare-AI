import {
  AlertTriangle,
  Car,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  KeyRound,
  LocateFixed,
  Phone,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Star,
  User,
  UserCheck,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  EmergencyContact,
  FareEstimate,
  LocationPoint,
  SosDispatchLog,
} from '../types/cabfare';
import {
  buildEmergencyShareMessage,
  getFictionalSampleDriverProfile,
  maskPhoneNumber,
  sanitizePhoneForUri,
} from '../utils/safeRideStorage';
import { ProviderLogo } from './ProviderLogo';

interface DriverProfileModalProps {
  fare: FareEstimate | null;
  pickup: LocationPoint;
  drop: LocationPoint;
  emergencyContacts: EmergencyContact[];
  onClose: () => void;
  onLogSosAction: (log: Omit<SosDispatchLog, 'id' | 'triggeredAt'>) => void;
  onOpenSafeRide: () => void;
  initialShowDemoPreview?: boolean;
  preferFemaleDriver?: boolean;
  onTogglePreferFemaleDriver?: () => void;
}

export function DriverProfileModal({
  fare,
  pickup,
  drop,
  emergencyContacts,
  onClose,
  onLogSosAction,
  onOpenSafeRide,
  initialShowDemoPreview = false,
  preferFemaleDriver = false,
  onTogglePreferFemaleDriver,
}: DriverProfileModalProps) {
  const [showDemoPreview, setShowDemoPreview] = useState(initialShowDemoPreview);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);

  useEffect(() => {
    setShowDemoPreview(initialShowDemoPreview);
    setShareFeedback(null);
    setCopiedShare(false);
  }, [fare?.id, initialShowDemoPreview]);

  useEffect(() => {
    if (!fare) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [fare, onClose]);

  if (!fare) return null;

  const isRealAssigned = fare.driverProfile.isDriverAssigned;
  const isVerifiedReal =
    isRealAssigned && fare.driverProfile.verificationStatus === 'verified_by_provider';
  const useSample = !isRealAssigned && showDemoPreview;
  const sampleProfile = useSample ? getFictionalSampleDriverProfile(fare) : null;

  const displayName = isRealAssigned
    ? fare.driverProfile.driverName || 'Assigned Driver'
    : sampleProfile
      ? sampleProfile.driverName
      : 'Driver details will be available after booking';

  const displayRating = isRealAssigned
    ? fare.driverProfile.driverRating
    : sampleProfile
      ? sampleProfile.driverRating
      : null;

  const displayCompletedRides = isRealAssigned
    ? fare.driverProfile.completedRides
    : sampleProfile
      ? sampleProfile.completedRides
      : null;

  const displayExperienceYears = isRealAssigned
    ? fare.driverProfile.verifiedExperienceYears
    : sampleProfile
      ? sampleProfile.verifiedExperienceYears
      : null;

  const displayVehicleModel = isRealAssigned
    ? fare.driverProfile.vehicleModel || fare.vehicleType
    : sampleProfile
      ? sampleProfile.vehicleModel
      : `${fare.vehicleType} (${fare.categoryLabel}) — Exact model assigned after booking`;

  const displayRegNumber = isRealAssigned
    ? fare.driverProfile.vehicleRegistrationNumber || 'Pending'
    : sampleProfile
      ? sampleProfile.vehicleRegistrationNumber
      : 'Available after booking';

  const primaryContact =
    emergencyContacts.find((c) => c.isPrimary) ?? emergencyContacts[0] ?? null;

  const readDeviceCoords = async (): Promise<{ lat: number; lng: number } | null> => {
    if (
      typeof window === 'undefined' ||
      !window.isSecureContext ||
      !('geolocation' in navigator)
    ) {
      return null;
    }
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 6000,
          maximumAge: 20000,
        });
      });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch {
      return null;
    }
  };

  const handleShareRide = async () => {
    const coords = await readDeviceCoords();
    const message = buildEmergencyShareMessage({
      isSos: false,
      pickup,
      drop,
      selectedFare: fare,
      liveCoords: coords,
    });

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `SafeRide Check-In · ${fare.platformName}`,
          text: message,
        });
        onLogSosAction({
          routeLabel: `${pickup.area} -> ${drop.area}`,
          lat: coords?.lat ?? pickup.lat,
          lng: coords?.lng ?? pickup.lng,
          channel: 'live_share',
          recipientsCount: Math.max(1, emergencyContacts.length),
          note: `Shared ${fare.platformName} (${fare.vehicleType}) check-in details.`,
        });
        setShareFeedback('Ride details shared successfully.');
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(message);
      setCopiedShare(true);
      window.setTimeout(() => setCopiedShare(false), 2500);
      onLogSosAction({
        routeLabel: `${pickup.area} -> ${drop.area}`,
        lat: coords?.lat ?? pickup.lat,
        lng: coords?.lng ?? pickup.lng,
        channel: 'live_share',
        recipientsCount: emergencyContacts.length,
        note: `Copied ${fare.platformName} (${fare.vehicleType}) ride check-in details.`,
      });
      setShareFeedback('Ride details & route map link copied to clipboard.');
    } catch {
      setShareFeedback('Clipboard unavailable — open SafeRide Hub to copy or send via SMS/WhatsApp.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-[1px] sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Driver Profile and Safety Details for ${fare.platformName} ${fare.vehicleType}`}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl"
      >
        {/* Top Modal Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <ProviderLogo platformId={fare.platformId} size="md" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-base sm:text-lg font-bold text-slate-900">
                  Driver Profile &amp; SafeRide Details
                </h2>
                <span className="rounded bg-slate-200/80 px-2 py-0.5 text-[11px] font-semibold text-slate-800">
                  {fare.platformName} · {fare.vehicleType}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-600 tabular-nums">
                {pickup.area} → {drop.area} · Est. Fare ₹{fare.estimatedFare} · {fare.arrivalMinutes}m ETA
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close driver profile"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200/60 hover:text-slate-900"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Truthfulness / Sample Preview Control Strip */}
          {!isRealAssigned && (
            <div
              className={`rounded-xl border p-3.5 text-xs ${
                useSample
                  ? 'border-amber-300 bg-amber-50 text-amber-950'
                  : 'border-slate-200 bg-slate-50 text-slate-700'
              }`}
            >
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                      useSample ? 'text-amber-700' : 'text-slate-600'
                    }`}
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-semibold text-slate-900">
                      {useSample
                        ? sampleProfile?.demoBannerTitle
                        : 'Pre-Booking Privacy & Anti-Fabrication Mode'}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed">
                      {useSample
                        ? sampleProfile?.demoDisclaimer
                        : 'No authorised live driver dispatch API is connected before booking. Driver details will be available after booking inside the official provider app.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDemoPreview((v) => !v)}
                  className={`shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                    useSample
                      ? 'border-amber-400 bg-white text-amber-900 hover:bg-amber-100'
                      : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {useSample ? 'Return to Real Pre-Booking Status' : 'Preview Sample Profile (Dev Demo)'}
                </button>
              </div>
            </div>
          )}

          {/* Core Driver Profile Card */}
          <section
            aria-label="Driver Identity and Vehicle Information"
            className="rounded-xl border border-slate-200 bg-white p-4 space-y-4"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3.5">
                {isRealAssigned && fare.driverProfile.driverPhotoUrl ? (
                  <img
                    src={fare.driverProfile.driverPhotoUrl}
                    alt={displayName}
                    className="h-16 w-16 rounded-full border border-slate-200 object-cover shrink-0"
                  />
                ) : (
                  <div
                    aria-label="Driver profile placeholder"
                    className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full border ${
                      useSample
                        ? 'border-amber-300 bg-amber-100 text-amber-900'
                        : 'border-slate-200 bg-slate-100 text-slate-500'
                    }`}
                  >
                    {sampleProfile ? (
                      <span className="font-display text-lg font-bold">
                        {sampleProfile.initials}
                      </span>
                    ) : (
                      <User className="h-7 w-7" aria-hidden="true" />
                    )}
                  </div>
                )}

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-base font-bold text-slate-900">
                      {displayName}
                    </h3>
                    {useSample && (
                      <span className="rounded bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-950">
                        Fictional Sample
                      </span>
                    )}
                  </div>

                  {/* Star Rating out of 5 */}
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <div
                      className="flex items-center gap-0.5"
                      aria-label={
                        displayRating !== null
                          ? `Rated ${displayRating} out of 5 stars`
                          : 'Driver rating available after booking'
                      }
                    >
                      {[1, 2, 3, 4, 5].map((starIdx) => {
                        const filled =
                          displayRating !== null && displayRating >= starIdx - 0.3;
                        return (
                          <Star
                            key={starIdx}
                            className={`h-4 w-4 ${
                              filled
                                ? 'fill-amber-400 text-amber-500'
                                : 'text-slate-300'
                            }`}
                            aria-hidden="true"
                          />
                        );
                      })}
                    </div>
                    <span className="font-mono text-xs font-semibold text-slate-800 tabular-nums">
                      {displayRating !== null
                        ? `${displayRating.toFixed(1)} / 5.0${useSample ? ' (Sample)' : ''}`
                        : '— / 5.0 (Available after booking)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Verified Driver Indicator */}
              <div className="self-start sm:self-center">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                    isVerifiedReal
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : useSample
                        ? 'border-amber-200 bg-amber-50 text-amber-900'
                        : 'border-slate-200 bg-slate-100 text-slate-700'
                  }`}
                >
                  {isVerifiedReal ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                  )}
                  <span>
                    {isVerifiedReal
                      ? 'Verified by Provider'
                      : sampleProfile
                        ? sampleProfile.verificationLabel
                        : 'Unverified — Pending Booking'}
                  </span>
                </span>
              </div>
            </div>

            {/* 8-Field Driver & Vehicle Grid */}
            <dl className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-3.5 text-xs sm:grid-cols-2">
              <div className="rounded-lg bg-slate-50/80 p-2.5">
                <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Total Completed Rides
                </dt>
                <dd className="mt-0.5 font-mono font-semibold text-slate-900 tabular-nums">
                  {displayCompletedRides !== null
                    ? `${displayCompletedRides.toLocaleString('en-IN')} trips${useSample ? ' (Sample)' : ''}`
                    : 'Available after booking'}
                </dd>
              </div>

              <div className="rounded-lg bg-slate-50/80 p-2.5">
                <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Driving Experience
                </dt>
                <dd className="mt-0.5 font-mono font-semibold text-slate-900 tabular-nums">
                  {displayExperienceYears !== null
                    ? `${displayExperienceYears}+ years${useSample ? ' (Sample)' : ''}`
                    : 'Available after booking'}
                </dd>
              </div>

              <div className="rounded-lg bg-slate-50/80 p-2.5">
                <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-500 flex items-center gap-1">
                  <Car className="h-3 w-3 text-slate-500" aria-hidden="true" />
                  <span>Vehicle Name &amp; Model</span>
                </dt>
                <dd className="mt-0.5 font-semibold text-slate-900">{displayVehicleModel}</dd>
              </div>

              <div className="rounded-lg bg-slate-50/80 p-2.5">
                <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Vehicle Registration Number
                </dt>
                <dd className="mt-0.5 font-mono font-semibold text-slate-900">
                  {displayRegNumber}
                </dd>
              </div>
              <div className="rounded-lg bg-slate-50/80 p-2.5 sm:col-span-2">
                <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Driver Gender (Authorised Provider Source Only)
                </dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  {fare.driverProfile.driverGenderSource === 'authorized_provider_api' &&
                  fare.driverProfile.driverGender
                    ? `${fare.driverProfile.driverGender.replace('_', ' ')} (Supplied by authorised provider API)`
                    : 'Not disclosed pre-booking (never assumed from driver name or photo)'}
                </dd>
              </div>
            </dl>
          </section>

          {/* Women's Safety & Provider Safety Capabilities */}
          <section
            aria-label="Women's Safety Information and Controls"
            className="rounded-xl border border-rose-200 bg-rose-50/35 p-4 space-y-3.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-rose-600" aria-hidden="true" />
                <span>Women&apos;s Safety &amp; Ride Verification</span>
              </h3>
              <span className="rounded border border-rose-200 bg-white px-2 py-0.5 font-mono text-xs font-bold text-rose-800 tabular-nums">
                Safety Info: {fare.safetyCapabilities.safetyInfoScore}/100
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs">
              <div className="flex items-start gap-2 rounded-lg border border-slate-200/80 bg-white p-2.5">
                <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" aria-hidden="true" />
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-slate-900">Prefer Female Driver</span>
                    {preferFemaleDriver && (
                      <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-800">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600">
                    {fare.safetyCapabilities.supportsFemaleDriverPreference
                      ? 'Supported by provider preference API'
                      : 'Female-driver availability cannot be confirmed pre-booking by provider API; you may continue with available drivers.'}
                  </p>
                  {onTogglePreferFemaleDriver && (
                    <button
                      type="button"
                      onClick={onTogglePreferFemaleDriver}
                      className="mt-1 text-[11px] font-semibold text-indigo-700 hover:underline"
                    >
                      {preferFemaleDriver
                        ? 'Turn off Prefer Female Driver'
                        : 'Enable Prefer Female Driver'}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-slate-200/80 bg-white p-2.5">
                <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
                <div>
                  <span className="font-semibold text-slate-900">Ride PIN &amp; Tracking</span>
                  <p className="text-[11px] text-slate-600">
                    {fare.safetyCapabilities.hasRidePinVerification ? '4-Digit Ride PIN · ' : ''}
                    {fare.safetyCapabilities.trackingAvailabilityLabel}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200/80 bg-white p-3 text-[11px] text-slate-700 space-y-1">
              <p className="font-semibold text-slate-900">
                Documented Platform Safety Tools ({fare.safetyCapabilities.safetyInfoLevel}):
              </p>
              <p>{fare.safetyCapabilities.documentedSafetyFeatures.join(' · ')}</p>
              <p className="text-slate-500 pt-0.5">{fare.safetyCapabilities.safetyCaveat}</p>
            </div>

            {/* Emergency Contact, Share Ride, and SOS Access */}
            <div className="space-y-2.5 border-t border-rose-200/70 pt-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="text-slate-700">
                  <span className="font-semibold text-slate-900">Emergency Contact: </span>
                  {primaryContact ? (
                    <span className="font-mono">
                      {primaryContact.name} ({maskPhoneNumber(primaryContact.phone)})
                    </span>
                  ) : (
                    <span className="text-slate-600">None saved yet</span>
                  )}
                </div>
                {primaryContact && (
                  <a
                    href={`tel:${sanitizePhoneForUri(primaryContact.phone)}`}
                    className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
                  >
                    <Phone className="h-3 w-3" aria-hidden="true" />
                    <span>Call {primaryContact.name}</span>
                  </a>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="tel:112"
                  onClick={() =>
                    onLogSosAction({
                      routeLabel: `${pickup.area} -> ${drop.area}`,
                      channel: 'emergency_dial',
                      recipientsCount: 1,
                      note: `Dialed 112 National SOS from ${fare.platformName} Driver Profile.`,
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700"
                >
                  <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>SOS 112</span>
                </a>

                <a
                  href="tel:1091"
                  onClick={() =>
                    onLogSosAction({
                      routeLabel: `${pickup.area} -> ${drop.area}`,
                      channel: 'emergency_dial',
                      recipientsCount: 1,
                      note: `Dialed 1091 Women Helpline from ${fare.platformName} Driver Profile.`,
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-50"
                >
                  <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Women Helpline 1091</span>
                </a>

                <button
                  type="button"
                  onClick={() => void handleShareRide()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
                >
                  {copiedShare ? (
                    <>
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Ride Details Copied</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Share Ride</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSafeRide();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                >
                  <LocateFixed className="h-3.5 w-3.5 text-rose-600" aria-hidden="true" />
                  <span>Emergency Contacts &amp; SafeRide Hub</span>
                </button>
              </div>

              {shareFeedback && (
                <p role="status" className="text-[11px] font-medium text-emerald-800">
                  {shareFeedback}
                </p>
              )}
            </div>
          </section>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 tabular-nums">
            <Clock className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            <span>
              Est. Fare <strong className="font-mono text-slate-900">₹{fare.estimatedFare}</strong> · {fare.arrivalMinutes}m arrival
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Close
            </button>
            <a
              href={fare.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              <span>Book on {fare.platformName}</span>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
