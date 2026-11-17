import {
  CityProviderContext,
  CustomPlatformRatesMap,
  DriverProfileInfo,
  LocationPoint,
  PlatformId,
  ProviderSafetyCapabilities,
  VehicleCategory,
} from '../src/types/cabfare.ts';
import { isInsideIndia } from './locations.ts';

export function getPreBookingDriverProfile(): DriverProfileInfo {
  return {
    isDriverAssigned: false,
    dataSource: 'unavailable_pre_booking',
    statusMessage: 'Driver details will be available after booking',
    driverName: null,
    driverPhotoUrl: null,
    driverGender: null,
    driverGenderSource: 'unavailable',
    driverRating: null,
    completedRides: null,
    verifiedExperienceYears: null,
    vehicleModel: null,
    vehicleRegistrationNumber: null,
    verificationStatus: 'unverified_pending_booking',
    verificationLabel: 'Unverified pre-booking (assigned after confirmation)',
  };
}

export function getProviderSafetyCapabilities(
  platformId: PlatformId
): ProviderSafetyCapabilities {
  const safetyCaveat =
    'Ratings and in-app safety tools do not guarantee personal safety. Always verify the vehicle registration plate, driver name, and Ride PIN inside the official provider app before boarding.';

  switch (platformId) {
    case 'blusmart':
      return {
        hasSOSButtonInApp: true,
        hasLiveTrackingPostBooking: true,
        hasRidePinVerification: true,
        hasShareTripLink: true,
        has24x7SafetyHelpline: true,
        supportsFemaleDriverPreference: false,
        safetyInfoScore: 96,
        safetyInfoLevel: 'Comprehensive Platform Tools',
        documentedSafetyFeatures: [
          'Start Ride OTP',
          'In-app SOS Alert',
          '24x7 Safety Helpline',
          'Share Live Trip (Post-Booking)',
          'Company-Operated EV Hubs',
        ],
        trackingAvailabilityLabel: 'Post-booking tracking in BluSmart app',
        safetyCaveat,
      };
    case 'uber':
      return {
        hasSOSButtonInApp: true,
        hasLiveTrackingPostBooking: true,
        hasRidePinVerification: true,
        hasShareTripLink: true,
        has24x7SafetyHelpline: true,
        supportsFemaleDriverPreference: false,
        safetyInfoScore: 95,
        safetyInfoLevel: 'Comprehensive Platform Tools',
        documentedSafetyFeatures: [
          '4-Digit Ride PIN Verification',
          'In-app SOS (112 Integration)',
          '24x7 Safety Support Line',
          'Share Trip Status Link',
          'RideCheck Anomaly Alerts',
        ],
        trackingAvailabilityLabel: 'Post-booking tracking in Uber app',
        safetyCaveat,
      };
    case 'ola':
      return {
        hasSOSButtonInApp: true,
        hasLiveTrackingPostBooking: true,
        hasRidePinVerification: true,
        hasShareTripLink: true,
        has24x7SafetyHelpline: true,
        supportsFemaleDriverPreference: false,
        safetyInfoScore: 92,
        safetyInfoLevel: 'Comprehensive Platform Tools',
        documentedSafetyFeatures: [
          '4-Digit Start OTP',
          'In-app Emergency SOS Button',
          '24x7 Safety Response Team',
          'Share Ride Link',
        ],
        trackingAvailabilityLabel: 'Post-booking tracking in Ola app',
        safetyCaveat,
      };
    case 'namma_yatri':
      return {
        hasSOSButtonInApp: true,
        hasLiveTrackingPostBooking: true,
        hasRidePinVerification: true,
        hasShareTripLink: true,
        has24x7SafetyHelpline: true,
        supportsFemaleDriverPreference: false,
        safetyInfoScore: 88,
        safetyInfoLevel: 'Comprehensive Platform Tools',
        documentedSafetyFeatures: [
          'Trip Start OTP',
          'In-app SOS & 112 Dial',
          'Share Ride Details',
          'ONDC Verified Registry',
        ],
        trackingAvailabilityLabel: 'Post-booking tracking in Namma Yatri app',
        safetyCaveat,
      };
    case 'rapido':
      return {
        hasSOSButtonInApp: true,
        hasLiveTrackingPostBooking: true,
        hasRidePinVerification: true,
        hasShareTripLink: true,
        has24x7SafetyHelpline: true,
        supportsFemaleDriverPreference: false,
        safetyInfoScore: 86,
        safetyInfoLevel: 'Standard Platform Tools',
        documentedSafetyFeatures: [
          '4-Digit Start PIN',
          'In-app SOS Button',
          'Share Ride Tracking',
          'Safety Helpline',
        ],
        trackingAvailabilityLabel: 'Post-booking tracking in Rapido app',
        safetyCaveat,
      };
    case 'meru':
      return {
        hasSOSButtonInApp: true,
        hasLiveTrackingPostBooking: true,
        hasRidePinVerification: false,
        hasShareTripLink: true,
        has24x7SafetyHelpline: true,
        supportsFemaleDriverPreference: false,
        safetyInfoScore: 80,
        safetyInfoLevel: 'Standard Platform Tools',
        documentedSafetyFeatures: [
          '24x7 Call Center Helpline',
          'In-app SOS',
          'Trip Share Link',
        ],
        trackingAvailabilityLabel: 'Post-booking tracking in Meru app',
        safetyCaveat,
      };
    case 'goamiles':
      return {
        hasSOSButtonInApp: true,
        hasLiveTrackingPostBooking: true,
        hasRidePinVerification: false,
        hasShareTripLink: false,
        has24x7SafetyHelpline: true,
        supportsFemaleDriverPreference: false,
        safetyInfoScore: 76,
        safetyInfoLevel: 'Standard Platform Tools',
        documentedSafetyFeatures: [
          'Govt-Registered Taxi Permit',
          'Support Helpline',
          'Post-Booking Ride Status',
        ],
        trackingAvailabilityLabel: 'Post-booking status in GoaMiles app',
        safetyCaveat,
      };
  }
}

export interface VehicleFareTariff {
  category: VehicleCategory;
  categoryLabel: string;
  vehicleType: string;
  baseFare: number;
  perKmRate: number;
  perMinRate: number;
  minimumFare: number;
  bookingFee: number;
  speedFactor: number; // < 1 means faster in urban traffic (e.g., Bike)
  etaOffsetMin: number;
}

export interface PlatformFareModel {
  platformId: PlatformId;
  platformName: string;
  pricingModel: string;
  surgeSensitivity: number; // 0 = zero surge (e.g., BluSmart)
  airportPickupFee: number;
  baseDispatchEtaMin: number;
  reliabilityBase: number;
  notes: string;
  vehicles: VehicleFareTariff[];
}

export interface CityProviderConfig {
  cityKey: string;
  cityName: string;
  state?: string;
  aliases: string[];
  bounds?: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  supportedPlatforms: PlatformId[];
  nammaYatriConfirmed: boolean;
  serviceStatus: 'supported' | 'limited' | 'unsupported';
  rateMultiplier: number; // Configurable city-level base & per-km tariff adjustment
  note: string;
}

/**
 * Default fallback provider list for unconfirmed Indian towns/cities.
 * Namma Yatri, BluSmart, Meru, and GoaMiles are strictly excluded unless confirmed.
 */
export const DEFAULT_SUPPORTED_PLATFORMS: PlatformId[] = ['uber', 'ola', 'rapido'];

export const CITY_PROVIDER_CONFIGS: CityProviderConfig[] = [
  // ================= UNSUPPORTED REMOTE / ISLAND REGIONS (Checked First!) =================
  {
    cityKey: 'ladakh',
    cityName: 'Leh / Ladakh',
    state: 'Ladakh',
    aliases: ['leh', 'ladakh', 'kargil', 'nubra', 'pangong'],
    bounds: { minLat: 32.8, maxLat: 35.8, minLng: 75.5, maxLng: 79.8 },
    supportedPlatforms: [],
    nammaYatriConfirmed: false,
    serviceStatus: 'unsupported',
    rateMultiplier: 1.0,
    note: 'App-based aggregators (Uber, Ola, Rapido, Namma Yatri, BluSmart) do not operate in Leh/Ladakh. Local taxi union prepaid counters apply.',
  },
  {
    cityKey: 'andaman',
    cityName: 'Andaman & Nicobar Islands',
    state: 'Andaman and Nicobar Islands',
    aliases: ['port blair', 'sri vijaya puram', 'andaman', 'havelock', 'nicobar'],
    bounds: { minLat: 6.5, maxLat: 13.8, minLng: 91.5, maxLng: 94.5 },
    supportedPlatforms: [],
    nammaYatriConfirmed: false,
    serviceStatus: 'unsupported',
    rateMultiplier: 1.0,
    note: 'No supported national cab aggregators operate in Andaman & Nicobar Islands.',
  },
  {
    cityKey: 'lakshadweep',
    cityName: 'Lakshadweep',
    state: 'Lakshadweep',
    aliases: ['lakshadweep', 'kavaratti', 'agatti'],
    bounds: { minLat: 8.0, maxLat: 12.5, minLng: 71.5, maxLng: 74.2 },
    supportedPlatforms: [],
    nammaYatriConfirmed: false,
    serviceStatus: 'unsupported',
    serviceStatus_unused: undefined,
    rateMultiplier: 1.0,
    note: 'No supported app-based cab aggregators operate in Lakshadweep.',
  } as CityProviderConfig,

  // ================= SPECIAL REGIONAL COVERAGE (GOA) =================
  {
    cityKey: 'goa',
    cityName: 'Goa',
    state: 'Goa',
    aliases: ['goa', 'panaji', 'panjim', 'margao', 'madgaon', 'calangute', 'baga', 'dabolim', 'vasco da gama', 'mopa'],
    bounds: { minLat: 14.88, maxLat: 15.82, minLng: 73.65, maxLng: 74.35 },
    supportedPlatforms: ['goamiles'],
    nammaYatriConfirmed: false,
    serviceStatus: 'supported',
    rateMultiplier: 1.12,
    note: 'Goa exclusively uses state-authorized GoaMiles for app-based rides. Uber, Ola, Rapido, and Namma Yatri are unavailable in Goa.',
  },

  // ================= METROS (TIER 1) =================
  {
    cityKey: 'bengaluru',
    cityName: 'Bengaluru',
    state: 'Karnataka',
    aliases: [
      'bengaluru',
      'bangalore',
      'indiranagar',
      'koramangala',
      'whitefield',
      'devanahalli',
      'electronic city',
      'jayanagar',
      'hsr layout',
      'nagawara',
      'bellandur',
      'majestic',
    ],
    bounds: { minLat: 12.75, maxLat: 13.26, minLng: 77.4, maxLng: 77.85 },
    supportedPlatforms: ['uber', 'ola', 'rapido', 'blusmart', 'namma_yatri', 'meru'],
    nammaYatriConfirmed: true,
    serviceStatus: 'supported',
    rateMultiplier: 1.0,
    note: 'Bengaluru supports Uber, Ola, Rapido, BluSmart EV, Namma Yatri (ONDC), and Meru Cabs.',
  },
  {
    cityKey: 'delhi_ncr',
    cityName: 'Delhi NCR',
    state: 'Delhi / NCR',
    aliases: [
      'delhi ncr',
      'delhi',
      'new delhi',
      'gurugram',
      'gurgaon',
      'noida',
      'faridabad',
      'ghaziabad',
      'aerocity',
      'saket',
      'paharganj',
      'hauz khas',
      'connaught place',
    ],
    bounds: { minLat: 28.35, maxLat: 28.9, minLng: 76.85, maxLng: 77.5 },
    supportedPlatforms: ['uber', 'ola', 'rapido', 'blusmart', 'meru'],
    nammaYatriConfirmed: false,
    serviceStatus: 'supported',
    rateMultiplier: 0.98,
    note: 'Delhi NCR supports Uber, Ola, Rapido, BluSmart EV, and Meru Cabs. Namma Yatri is unavailable in Delhi NCR.',
  },
  {
    cityKey: 'mumbai',
    cityName: 'Mumbai',
    state: 'Maharashtra',
    aliases: [
      'mumbai',
      'navi mumbai',
      'thane',
      'bandra',
      'andheri',
      'powai',
      'lower parel',
      'nariman point',
      'sahar',
      'csmt',
    ],
    bounds: { minLat: 18.88, maxLat: 19.32, minLng: 72.75, maxLng: 73.06 },
    supportedPlatforms: ['uber', 'ola', 'rapido', 'meru'],
    nammaYatriConfirmed: false,
    serviceStatus: 'supported',
    rateMultiplier: 1.06,
    note: 'Mumbai supports Uber, Ola, Rapido, and Meru Cabs. BluSmart and Namma Yatri are unavailable here.',
  },
  {
    cityKey: 'chennai',
    cityName: 'Chennai',
    state: 'Tamil Nadu',
    aliases: ['chennai', 'madras', 't. nagar', 'meenambakkam', 'adyar', 'velachery', 'tharamani'],
    bounds: { minLat: 12.85, maxLat: 13.25, minLng: 80.1, maxLng: 80.35 },
    supportedPlatforms: ['uber', 'ola', 'rapido', 'namma_yatri', 'meru'],
    nammaYatriConfirmed: true,
    serviceStatus: 'supported',
    rateMultiplier: 0.97,
    note: 'Chennai supports Uber, Ola, Rapido, Namma Yatri, and Meru Cabs.',
  },
  {
    cityKey: 'kolkata',
    cityName: 'Kolkata',
    state: 'West Bengal',
    aliases: ['kolkata', 'calcutta', 'salt lake', 'howrah', 'new town', 'dum dum', 'park street'],
    bounds: { minLat: 22.4, maxLat: 22.7, minLng: 88.2, maxLng: 88.5 },
    supportedPlatforms: ['uber', 'ola', 'rapido', 'namma_yatri'],
    nammaYatriConfirmed: true,
    serviceStatus: 'supported',
    rateMultiplier: 0.93,
    note: 'Kolkata supports Uber, Ola, Rapido, and Namma Yatri / Yatri Sathi ONDC.',
  },
  {
    cityKey: 'hyderabad',
    cityName: 'Hyderabad',
    state: 'Telangana',
    aliases: ['hyderabad', 'secunderabad', 'madhapur', 'hitec', 'shamshabad', 'banjara hills', 'charminar'],
    bounds: { minLat: 17.2, maxLat: 17.6, minLng: 78.25, maxLng: 78.7 },
    supportedPlatforms: ['uber', 'ola', 'rapido', 'meru'],
    nammaYatriConfirmed: false,
    serviceStatus: 'supported',
    rateMultiplier: 0.95,
    note: 'Hyderabad supports Uber, Ola, Rapido, and Meru Cabs.',
  },
  {
    cityKey: 'pune',
    cityName: 'Pune',
    state: 'Maharashtra',
    aliases: ['pune', 'hinjewadi', 'koregaon park', 'viman nagar', 'pimpri', 'lohegaon'],
    bounds: { minLat: 18.4, maxLat: 18.7, minLng: 73.7, maxLng: 74.0 },
    supportedPlatforms: ['uber', 'ola', 'rapido', 'meru'],
    nammaYatriConfirmed: false,
    serviceStatus: 'supported',
    rateMultiplier: 0.96,
    note: 'Pune supports Uber, Ola, Rapido, and Meru Cabs.',
  },
  {
    cityKey: 'ahmedabad',
    cityName: 'Ahmedabad',
    state: 'Gujarat',
    aliases: ['ahmedabad', 'gandhinagar', 'bodakdev', 'kalupur', 'hansol'],
    bounds: { minLat: 22.92, maxLat: 23.25, minLng: 72.42, maxLng: 72.75 },
    supportedPlatforms: ['uber', 'ola', 'rapido', 'meru'],
    nammaYatriConfirmed: false,
    serviceStatus: 'supported',
    rateMultiplier: 0.93,
    note: 'Ahmedabad supports Uber, Ola, Rapido, and Meru Cabs.',
  },

  // ================= TIER 2 CITIES =================
  {
    cityKey: 'kochi',
    cityName: 'Kochi',
    state: 'Kerala',
    aliases: ['kochi', 'ernakulam', 'cochin', 'kakkanad', 'nedumbassery'],
    bounds: { minLat: 9.85, maxLat: 10.2, minLng: 76.18, maxLng: 76.45 },
    supportedPlatforms: ['uber', 'ola', 'namma_yatri'],
    nammaYatriConfirmed: true,
    serviceStatus: 'supported',
    rateMultiplier: 0.94,
    note: 'Kochi supports Uber, Ola, and Namma Yatri (ONDC confirmed).',
  },
  {
    cityKey: 'mysuru',
    cityName: 'Mysuru',
    state: 'Karnataka',
    aliases: ['mysuru', 'mysore'],
    bounds: { minLat: 12.22, maxLat: 12.4, minLng: 76.55, maxLng: 76.75 },
    supportedPlatforms: ['uber', 'ola', 'rapido', 'namma_yatri'],
    nammaYatriConfirmed: true,
    serviceStatus: 'supported',
    rateMultiplier: 0.92,
    note: 'Mysuru supports Uber, Ola, Rapido, and Namma Yatri.',
  },
  {
    cityKey: 'jaipur',
    cityName: 'Jaipur',
    state: 'Rajasthan',
    aliases: ['jaipur', 'sanganer', 'mi road', 'hawa mahal'],
    bounds: { minLat: 26.75, maxLat: 27.05, minLng: 75.68, maxLng: 75.95 },
    supportedPlatforms: ['uber', 'ola', 'rapido', 'meru'],
    nammaYatriConfirmed: false,
    serviceStatus: 'supported',
    rateMultiplier: 0.93,
    note: 'Jaipur supports Uber, Ola, Rapido, and Meru Cabs.',
  },
  {
    cityKey: 'chandigarh',
    cityName: 'Chandigarh',
    state: 'Chandigarh',
    aliases: ['chandigarh', 'mohali', 'panchkula', 'zirakpur'],
    bounds: { minLat: 30.6, maxLat: 30.82, minLng: 76.68, maxLng: 76.92 },
    supportedPlatforms: ['uber', 'ola', 'rapido'],
    nammaYatriConfirmed: false,
    serviceStatus: 'supported',
    rateMultiplier: 0.95,
    note: 'Chandigarh Tricity supports Uber, Ola, and Rapido.',
  },
  {
    cityKey: 'lucknow',
    cityName: 'Lucknow',
    state: 'Uttar Pradesh',
    aliases: ['lucknow', 'hazratganj', 'charbagh', 'gomti nagar'],
    bounds: { minLat: 26.72, maxLat: 26.98, minLng: 80.8, maxLng: 81.08 },
    supportedPlatforms: ['uber', 'ola', 'rapido'],
    nammaYatriConfirmed: false,
    serviceStatus: 'supported',
    rateMultiplier: 0.9,
    note: 'Lucknow supports Uber, Ola, and Rapido.',
  },
  {
    cityKey: 'indore',
    cityName: 'Indore',
    state: 'Madhya Pradesh',
    aliases: ['indore', 'vijay nagar'],
    bounds: { minLat: 22.62, maxLat: 22.82, minLng: 75.75, maxLng: 75.98 },
    supportedPlatforms: ['uber', 'ola', 'rapido'],
    nammaYatriConfirmed: false,
    serviceStatus: 'supported',
    rateMultiplier: 0.9,
    note: 'Indore supports Uber, Ola, and Rapido.',
  },
  {
    cityKey: 'bhopal',
    cityName: 'Bhopal',
    state: 'Madhya Pradesh',
    aliases: ['bhopal'],
    bounds: { minLat: 23.15, maxLat: 23.35, minLng: 77.3, maxLng: 77.55 },
    supportedPlatforms: ['uber', 'ola', 'rapido'],
    nammaYatriConfirmed: false,
    serviceStatus: 'supported',
    rateMultiplier: 0.89,
    note: 'Bhopal supports Uber, Ola, and Rapido.',
  },
  {
    cityKey: 'surat',
    cityName: 'Surat',
    state: 'Gujarat',
    aliases: ['surat', 'piplod', 'varachha'],
    bounds: { minLat: 21.08, maxLat: 21.3, minLng: 72.7, maxLng: 72.95 },
    supportedPlatforms: ['uber', 'ola', 'rapido'],
    nammaYatriConfirmed: false,
    serviceStatus: 'supported',
    rateMultiplier: 0.91,
    note: 'Surat supports Uber, Ola, and Rapido.',
  },
  {
    cityKey: 'nagpur',
    cityName: 'Nagpur',
    state: 'Maharashtra',
    aliases: ['nagpur', 'sitabuldi', 'sonegaon'],
    bounds: { minLat: 21.04, maxLat: 21.25, minLng: 78.98, maxLng: 79.18 },
    supportedPlatforms: ['uber', 'ola', 'rapido'],
    nammaYatriConfirmed: false,
    serviceStatus: 'supported',
    rateMultiplier: 0.91,
    note: 'Nagpur supports Uber, Ola, and Rapido.',
  },
  {
    cityKey: 'coimbatore',
    cityName: 'Coimbatore',
    state: 'Tamil Nadu',
    aliases: ['coimbatore', 'peelamedu', 'gandhipuram'],
    bounds: { minLat: 10.92, maxLat: 11.12, minLng: 76.88, maxLng: 77.12 },
    supportedPlatforms: ['uber', 'ola', 'rapido'],
    nammaYatriConfirmed: false,
    serviceStatus: 'supported',
    rateMultiplier: 0.92,
    note: 'Coimbatore supports Uber, Ola, and Rapido.',
  },
  {
    cityKey: 'patna',
    cityName: 'Patna',
    state: 'Bihar',
    aliases: ['patna', 'boring road'],
    bounds: { minLat: 25.54, maxLat: 25.68, minLng: 85.02, maxLng: 85.26 },
    supportedPlatforms: ['uber', 'ola', 'rapido'],
    nammaYatriConfirmed: false,
    serviceStatus: 'supported',
    rateMultiplier: 0.88,
    note: 'Patna supports Uber, Ola, and Rapido.',
  },
  {
    cityKey: 'bhubaneswar',
    cityName: 'Bhubaneswar',
    state: 'Odisha',
    aliases: ['bhubaneswar', 'cuttack'],
    bounds: { minLat: 20.18, maxLat: 20.38, minLng: 85.72, maxLng: 85.94 },
    supportedPlatforms: ['uber', 'ola', 'rapido'],
    nammaYatriConfirmed: false,
    serviceStatus: 'supported',
    rateMultiplier: 0.89,
    note: 'Bhubaneswar supports Uber, Ola, and Rapido.',
  },
  {
    cityKey: 'guwahati',
    cityName: 'Guwahati',
    state: 'Assam',
    aliases: ['guwahati', 'borjhar', 'paltan bazaar', 'dispur'],
    bounds: { minLat: 26.05, maxLat: 26.25, minLng: 91.52, maxLng: 91.88 },
    supportedPlatforms: ['uber', 'ola', 'rapido'],
    nammaYatriConfirmed: false,
    serviceStatus: 'supported',
    rateMultiplier: 0.92,
    note: 'Guwahati supports Uber, Ola, and Rapido.',
  },
  {
    cityKey: 'varanasi',
    cityName: 'Varanasi',
    state: 'Uttar Pradesh',
    aliases: ['varanasi', 'banaras', 'kashi'],
    bounds: { minLat: 25.22, maxLat: 25.4, minLng: 82.9, maxLng: 83.1 },
    supportedPlatforms: ['uber', 'ola', 'rapido'],
    nammaYatriConfirmed: false,
    serviceStatus: 'supported',
    rateMultiplier: 0.89,
    note: 'Varanasi supports Uber, Ola, and Rapido.',
  },
  {
    cityKey: 'agra',
    cityName: 'Agra',
    state: 'Uttar Pradesh',
    aliases: ['agra', 'taj mahal', 'tajganj'],
    bounds: { minLat: 27.1, maxLat: 27.26, minLng: 77.9, maxLng: 78.12 },
    supportedPlatforms: ['uber', 'ola', 'rapido'],
    nammaYatriConfirmed: false,
    serviceStatus: 'supported',
    rateMultiplier: 0.89,
    note: 'Agra supports Uber, Ola, and Rapido.',
  },
  {
    cityKey: 'visakhapatnam',
    cityName: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    aliases: ['visakhapatnam', 'vizag', 'dwaraka nagar'],
    bounds: { minLat: 17.62, maxLat: 17.85, minLng: 83.15, maxLng: 83.4 },
    supportedPlatforms: ['uber', 'ola', 'rapido'],
    nammaYatriConfirmed: false,
    serviceStatus: 'supported',
    rateMultiplier: 0.91,
    note: 'Visakhapatnam supports Uber, Ola, and Rapido.',
  },
  {
    cityKey: 'thiruvananthapuram',
    cityName: 'Thiruvananthapuram',
    state: 'Kerala',
    aliases: ['thiruvananthapuram', 'trivandrum', 'technopark', 'kazhakkoottam'],
    bounds: { minLat: 8.42, maxLat: 8.62, minLng: 76.82, maxLng: 77.02 },
    supportedPlatforms: ['uber', 'ola'],
    nammaYatriConfirmed: false,
    serviceStatus: 'supported',
    rateMultiplier: 0.94,
    note: 'Thiruvananthapuram supports Uber and Ola.',
  },
  {
    cityKey: 'tier2_other',
    cityName: 'Tier 2 Urban Hub',
    aliases: [
      'vadodara',
      'baroda',
      'nashik',
      'udaipur',
      'jodhpur',
      'dehradun',
      'amritsar',
      'ranchi',
      'raipur',
      'madurai',
      'vijayawada',
      'mangalore',
      'mangaluru',
      'tiruchirappalli',
      'trichy',
      'jalandhar',
      'ludhiana',
      'kanpur',
      'prayagraj',
      'allahabad',
    ],
    supportedPlatforms: ['uber', 'ola', 'rapido'],
    nammaYatriConfirmed: false,
    serviceStatus: 'supported',
    rateMultiplier: 0.9,
    note: 'Supported Tier 2 city: showing Uber, Ola, and Rapido (regional Namma Yatri/BluSmart unavailable).',
  },

  // ================= TIER 3 CITIES (LIMITED COVERAGE) =================
  {
    cityKey: 'shimla',
    cityName: 'Shimla',
    state: 'Himachal Pradesh',
    aliases: ['shimla', 'kufri', 'solan'],
    bounds: { minLat: 31.02, maxLat: 31.18, minLng: 77.08, maxLng: 77.26 },
    supportedPlatforms: ['ola'],
    nammaYatriConfirmed: false,
    serviceStatus: 'limited',
    rateMultiplier: 1.08,
    note: 'Hill-station Tier 3 coverage: limited Ola outstation/local availability. Uber, Rapido, BluSmart, and Namma Yatri are unavailable.',
  },
  {
    cityKey: 'siliguri',
    cityName: 'Siliguri',
    state: 'West Bengal',
    aliases: ['siliguri', 'bagdogra', 'new jalpaiguri', 'njp'],
    bounds: { minLat: 26.62, maxLat: 26.8, minLng: 88.28, maxLng: 88.52 },
    supportedPlatforms: ['ola', 'rapido'],
    nammaYatriConfirmed: false,
    serviceStatus: 'limited',
    rateMultiplier: 0.9,
    note: 'Tier 3 gateway hub: Ola and Rapido operate in Siliguri/Bagdogra. Uber and Namma Yatri are excluded.',
  },
  {
    cityKey: 'tirupati',
    cityName: 'Tirupati',
    state: 'Andhra Pradesh',
    aliases: ['tirupati', 'renigunta', 'tirumala'],
    bounds: { minLat: 13.56, maxLat: 13.72, minLng: 79.35, maxLng: 79.6 },
    supportedPlatforms: ['ola', 'rapido'],
    nammaYatriConfirmed: false,
    serviceStatus: 'limited',
    rateMultiplier: 0.9,
    note: 'Tier 3 city coverage: Ola and Rapido operate locally in Tirupati.',
  },
  {
    cityKey: 'kota',
    cityName: 'Kota',
    state: 'Rajasthan',
    aliases: ['kota', 'talwandi'],
    bounds: { minLat: 25.08, maxLat: 25.28, minLng: 75.76, maxLng: 75.95 },
    supportedPlatforms: ['ola', 'rapido'],
    nammaYatriConfirmed: false,
    serviceStatus: 'limited',
    rateMultiplier: 0.88,
    note: 'Tier 3 city coverage: Ola and Rapido operate in Kota.',
  },
  {
    cityKey: 'tier3_other',
    cityName: 'Tier 3 City',
    aliases: [
      'hubballi',
      'dharwad',
      'belagavi',
      'warangal',
      'rajkot',
      'jamnagar',
      'jabalpur',
      'gwalior',
      'gorakhpur',
      'meerut',
      'gangtok',
      'darjeeling',
      'manali',
      'haridwar',
      'rishikesh',
      'ajmer',
      'bikaner',
      'durgapur',
      'asansol',
      'jamshedpur',
      'dhanbad',
      'muzaffarpur',
      'gaya',
      'aurangabad',
      'kolhapur',
      'solapur',
      'amravati',
      'salem',
      'tirunelveli',
      'nellore',
      'guntur',
      'rahmundry',
      'kakinada',
      'thrissur',
      'kozhikode',
      'calicut',
      'bilaspur',
      'rourkela',
      'puri',
      'agartala',
      'imphal',
      'shillong',
      'aizawl',
      'kohima',
      'itanagar',
      'jammu',
      'srinagar',
    ],
    supportedPlatforms: ['ola', 'rapido'],
    nammaYatriConfirmed: false,
    serviceStatus: 'limited',
    rateMultiplier: 0.9,
    note: 'Tier 3 coverage: showing Ola and Rapido where local drivers are active. Uber, BluSmart, and Namma Yatri are excluded.',
  },
];

function matchesCityConfig(location: LocationPoint, cfg: CityProviderConfig): boolean {
  const haystack = `${location.city} ${location.area} ${location.name} ${location.state ?? ''}`.toLowerCase();
  if (cfg.aliases.some((alias) => haystack.includes(alias))) {
    return true;
  }
  if (cfg.bounds && Number.isFinite(location.lat) && Number.isFinite(location.lng)) {
    const { minLat, maxLat, minLng, maxLng } = cfg.bounds;
    if (
      location.lat >= minLat &&
      location.lat <= maxLat &&
      location.lng >= minLng &&
      location.lng <= maxLng
    ) {
      return true;
    }
  }
  return false;
}

export function resolveCityProviderConfig(
  pickup: LocationPoint,
  drop?: LocationPoint
): { config: CityProviderConfig; context: CityProviderContext } {
  // 1. Check outside India first
  const pickupInIndia = isInsideIndia(pickup.lat, pickup.lng);
  const dropInIndia = drop ? isInsideIndia(drop.lat, drop.lng) : true;
  if (!pickupInIndia || !dropInIndia) {
    const outLabel = !pickupInIndia
      ? `${pickup.city || pickup.name} (Outside India)`
      : `${drop?.city || drop?.name} (Outside India)`;
    const unsupportedCfg: CityProviderConfig = {
      cityKey: 'outside_india',
      cityName: outLabel,
      state: pickup.state,
      aliases: [],
      supportedPlatforms: [],
      nammaYatriConfirmed: false,
      serviceStatus: 'unsupported',
      rateMultiplier: 1.0,
      note: `Location "${outLabel}" is outside India. CabFare AI supports PAN-India urban and regional cab comparisons only.`,
    };
    return {
      config: unsupportedCfg,
      context: {
        cityKey: unsupportedCfg.cityKey,
        cityName: unsupportedCfg.cityName,
        state: pickup.state,
        isConfirmedCity: false,
        serviceStatus: 'unsupported',
        supportedPlatforms: [],
        note: unsupportedCfg.note,
      },
    };
  }

  // 2. Check explicit regional/unsupported/metro/tier2/tier3 city configs
  const matched =
    CITY_PROVIDER_CONFIGS.find((cfg) => matchesCityConfig(pickup, cfg)) ||
    (drop ? CITY_PROVIDER_CONFIGS.find((cfg) => matchesCityConfig(drop, cfg)) : undefined);

  if (matched) {
    const displayCity =
      matched.cityKey === 'tier2_other' || matched.cityKey === 'tier3_other'
        ? pickup.city && pickup.city !== 'India'
          ? pickup.city
          : matched.cityName
        : matched.cityName;

    return {
      config: matched,
      context: {
        cityKey: matched.cityKey,
        cityName: displayCity,
        state: pickup.state ?? matched.state,
        isConfirmedCity: matched.serviceStatus !== 'unsupported',
        serviceStatus: matched.serviceStatus,
        supportedPlatforms: [...matched.supportedPlatforms],
        note: matched.note,
      },
    };
  }

  // 3. Fallback for unconfirmed Indian towns/localities (Uber/Ola/Rapido only, NO Namma Yatri)
  const fallbackCityName =
    pickup.city && pickup.city !== 'Current Coordinates' && pickup.city !== 'GPS' && pickup.city !== 'India'
      ? pickup.city
      : pickup.area || 'Indian Locality';

  const fallbackConfig: CityProviderConfig = {
    cityKey: 'default_india',
    cityName: fallbackCityName,
    state: pickup.state,
    aliases: [],
    supportedPlatforms: [...DEFAULT_SUPPORTED_PLATFORMS],
    nammaYatriConfirmed: false,
    serviceStatus: 'limited',
    rateMultiplier: 0.94,
    note: `Showing default PAN-India estimates (Uber, Ola, Rapido) for ${fallbackCityName}. Regional services (Namma Yatri, BluSmart, Meru, GoaMiles) are hidden unless confirmed for this city.`,
  };

  return {
    config: fallbackConfig,
    context: {
      cityKey: 'default_india',
      cityName: fallbackCityName,
      state: pickup.state,
      isConfirmedCity: false,
      serviceStatus: 'limited',
      supportedPlatforms: [...DEFAULT_SUPPORTED_PLATFORMS],
      note: fallbackConfig.note,
    },
  };
}

export function getSupportedPlatformsForCityName(cityName: string): PlatformId[] {
  const lower = cityName.toLowerCase();
  const matched = CITY_PROVIDER_CONFIGS.find((cfg) =>
    cfg.aliases.some((alias) => lower.includes(alias))
  );
  return matched ? [...matched.supportedPlatforms] : [...DEFAULT_SUPPORTED_PLATFORMS];
}

export function buildProviderBookingUrl(
  platformId: PlatformId,
  pickup: LocationPoint,
  drop: LocationPoint
): string {
  switch (platformId) {
    case 'uber':
      return `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${pickup.lat}&pickup[longitude]=${pickup.lng}&pickup[nickname]=${encodeURIComponent(pickup.name)}&dropoff[latitude]=${drop.lat}&dropoff[longitude]=${drop.lng}&dropoff[nickname]=${encodeURIComponent(drop.name)}`;
    case 'ola':
      return `https://book.olacabs.com/?lat=${pickup.lat}&lng=${pickup.lng}&drop_lat=${drop.lat}&drop_lng=${drop.lng}&pickup_name=${encodeURIComponent(pickup.name)}&drop_name=${encodeURIComponent(drop.name)}`;
    case 'rapido':
      return 'https://www.rapido.bike/';
    case 'blusmart':
      return 'https://blu-smart.com/';
    case 'namma_yatri':
      return 'https://nammayatri.in/';
    case 'meru':
      return 'https://www.meru.in/';
    case 'goamiles':
      return 'https://www.goamiles.com/';
  }
}

export const PLATFORM_FARE_MODELS: PlatformFareModel[] = [
  {
    platformId: 'uber',
    platformName: 'Uber',
    pricingModel: 'Dynamic algorithmic tariff',
    surgeSensitivity: 1.0,
    airportPickupFee: 95,
    baseDispatchEtaMin: 4,
    reliabilityBase: 94,
    notes: 'Full multi-modal fleet with dynamic peak surge and fast urban dispatch.',
    vehicles: [
      {
        category: 'bike',
        categoryLabel: 'Bike',
        vehicleType: 'Uber Moto',
        baseFare: 16,
        perKmRate: 6.8,
        perMinRate: 0.75,
        minimumFare: 28,
        bookingFee: 5,
        speedFactor: 0.76,
        etaOffsetMin: -1,
      },
      {
        category: 'auto',
        categoryLabel: 'Auto',
        vehicleType: 'Uber Auto',
        baseFare: 28,
        perKmRate: 12.2,
        perMinRate: 1.0,
        minimumFare: 40,
        bookingFee: 7,
        speedFactor: 0.9,
        etaOffsetMin: 0,
      },
      {
        category: 'hatchback',
        categoryLabel: 'Hatchback',
        vehicleType: 'Uber Go',
        baseFare: 46,
        perKmRate: 14.8,
        perMinRate: 1.5,
        minimumFare: 72,
        bookingFee: 12,
        speedFactor: 1.0,
        etaOffsetMin: 0,
      },
      {
        category: 'sedan',
        categoryLabel: 'Sedan',
        vehicleType: 'Uber Premier',
        baseFare: 58,
        perKmRate: 17.6,
        perMinRate: 1.85,
        minimumFare: 95,
        bookingFee: 16,
        speedFactor: 1.0,
        etaOffsetMin: 1,
      },
      {
        category: 'suv',
        categoryLabel: 'SUV',
        vehicleType: 'Uber XL',
        baseFare: 88,
        perKmRate: 23.4,
        perMinRate: 2.35,
        minimumFare: 145,
        bookingFee: 22,
        speedFactor: 1.04,
        etaOffsetMin: 3,
      },
      {
        category: 'ev',
        categoryLabel: 'Electric Vehicle',
        vehicleType: 'Uber Green EV',
        baseFare: 54,
        perKmRate: 16.5,
        perMinRate: 1.55,
        minimumFare: 90,
        bookingFee: 14,
        speedFactor: 1.0,
        etaOffsetMin: 3,
      },
    ],
  },
  {
    platformId: 'ola',
    platformName: 'Ola',
    pricingModel: 'Peak zone multiplier tariff',
    surgeSensitivity: 1.08,
    airportPickupFee: 90,
    baseDispatchEtaMin: 5,
    reliabilityBase: 89,
    notes: 'Broad PAN-India ICE cab, auto, and bike coverage across metro, Tier 2, and Tier 3 cities.',
    vehicles: [
      {
        category: 'bike',
        categoryLabel: 'Bike',
        vehicleType: 'Ola Bike',
        baseFare: 15,
        perKmRate: 6.5,
        perMinRate: 0.7,
        minimumFare: 25,
        bookingFee: 5,
        speedFactor: 0.76,
        etaOffsetMin: -1,
      },
      {
        category: 'auto',
        categoryLabel: 'Auto',
        vehicleType: 'Ola Auto',
        baseFare: 27,
        perKmRate: 12.5,
        perMinRate: 0.95,
        minimumFare: 38,
        bookingFee: 7,
        speedFactor: 0.9,
        etaOffsetMin: 0,
      },
      {
        category: 'hatchback',
        categoryLabel: 'Hatchback',
        vehicleType: 'Ola Mini',
        baseFare: 44,
        perKmRate: 15.1,
        perMinRate: 1.45,
        minimumFare: 70,
        bookingFee: 12,
        speedFactor: 1.0,
        etaOffsetMin: 0,
      },
      {
        category: 'sedan',
        categoryLabel: 'Sedan',
        vehicleType: 'Ola Prime Sedan',
        baseFare: 56,
        perKmRate: 18.0,
        perMinRate: 1.8,
        minimumFare: 95,
        bookingFee: 15,
        speedFactor: 1.0,
        etaOffsetMin: 1,
      },
      {
        category: 'suv',
        categoryLabel: 'SUV',
        vehicleType: 'Ola Prime SUV',
        baseFare: 85,
        perKmRate: 24.0,
        perMinRate: 2.3,
        minimumFare: 145,
        bookingFee: 22,
        speedFactor: 1.04,
        etaOffsetMin: 3,
      },
    ],
  },
  {
    platformId: 'rapido',
    platformName: 'Rapido',
    pricingModel: 'Low-commission economy tariff',
    surgeSensitivity: 0.68,
    airportPickupFee: 70,
    baseDispatchEtaMin: 4,
    reliabilityBase: 87,
    notes: 'Specializes in affordable bike taxis, autos, and economy hatchback rides.',
    vehicles: [
      {
        category: 'bike',
        categoryLabel: 'Bike',
        vehicleType: 'Rapido Bike Taxi',
        baseFare: 14,
        perKmRate: 6.1,
        perMinRate: 0.65,
        minimumFare: 24,
        bookingFee: 4,
        speedFactor: 0.75,
        etaOffsetMin: -1,
      },
      {
        category: 'auto',
        categoryLabel: 'Auto',
        vehicleType: 'Rapido Auto',
        baseFare: 25,
        perKmRate: 11.4,
        perMinRate: 0.9,
        minimumFare: 35,
        bookingFee: 5,
        speedFactor: 0.9,
        etaOffsetMin: 0,
      },
      {
        category: 'hatchback',
        categoryLabel: 'Hatchback',
        vehicleType: 'Rapido Cab Economy',
        baseFare: 38,
        perKmRate: 13.6,
        perMinRate: 1.25,
        minimumFare: 62,
        bookingFee: 9,
        speedFactor: 1.0,
        etaOffsetMin: 1,
      },
    ],
  },
  {
    platformId: 'blusmart',
    platformName: 'BluSmart',
    pricingModel: 'Zero-surge fixed EV tariff',
    surgeSensitivity: 0.0,
    airportPickupFee: 85,
    baseDispatchEtaMin: 9,
    reliabilityBase: 98,
    notes: '100% electric fleet with zero surge multipliers and zero driver cancellation.',
    vehicles: [
      {
        category: 'ev',
        categoryLabel: 'Electric Vehicle',
        vehicleType: 'BluSmart EV Sedan',
        baseFare: 62,
        perKmRate: 17.2,
        perMinRate: 1.25,
        minimumFare: 110,
        bookingFee: 15,
        speedFactor: 1.0,
        etaOffsetMin: 0,
      },
      {
        category: 'suv',
        categoryLabel: 'SUV',
        vehicleType: 'BluSmart EV XL',
        baseFare: 90,
        perKmRate: 22.8,
        perMinRate: 1.7,
        minimumFare: 165,
        bookingFee: 20,
        speedFactor: 1.03,
        etaOffsetMin: 2,
      },
    ],
  },
  {
    platformId: 'namma_yatri',
    platformName: 'Namma Yatri',
    pricingModel: 'Zero-commission ONDC direct tariff',
    surgeSensitivity: 0.25,
    airportPickupFee: 65,
    baseDispatchEtaMin: 5,
    reliabilityBase: 91,
    notes: 'Open ONDC network with transparent meter-aligned auto and cab fares in confirmed cities.',
    vehicles: [
      {
        category: 'auto',
        categoryLabel: 'Auto',
        vehicleType: 'Namma Yatri Auto',
        baseFare: 26,
        perKmRate: 11.2,
        perMinRate: 0.85,
        minimumFare: 34,
        bookingFee: 3,
        speedFactor: 0.9,
        etaOffsetMin: -1,
      },
      {
        category: 'hatchback',
        categoryLabel: 'Hatchback',
        vehicleType: 'Namma Yatri Mini Cab',
        baseFare: 40,
        perKmRate: 13.8,
        perMinRate: 1.2,
        minimumFare: 65,
        bookingFee: 6,
        speedFactor: 1.0,
        etaOffsetMin: 1,
      },
      {
        category: 'sedan',
        categoryLabel: 'Sedan',
        vehicleType: 'Namma Yatri Sedan',
        baseFare: 52,
        perKmRate: 16.4,
        perMinRate: 1.5,
        minimumFare: 88,
        bookingFee: 8,
        speedFactor: 1.0,
        etaOffsetMin: 2,
      },
    ],
  },
  {
    platformId: 'meru',
    platformName: 'Meru Cabs',
    pricingModel: 'Radio-cab & airport fixed tariff',
    surgeSensitivity: 0.35,
    airportPickupFee: 95,
    baseDispatchEtaMin: 7,
    reliabilityBase: 93,
    notes: 'Established metro & airport taxi service with predictable AC sedan and hatchback fares.',
    vehicles: [
      {
        category: 'hatchback',
        categoryLabel: 'Hatchback',
        vehicleType: 'Meru Switch',
        baseFare: 48,
        perKmRate: 15.8,
        perMinRate: 1.35,
        minimumFare: 80,
        bookingFee: 10,
        speedFactor: 1.0,
        etaOffsetMin: 0,
      },
      {
        category: 'sedan',
        categoryLabel: 'Sedan',
        vehicleType: 'Meru Genie Sedan',
        baseFare: 64,
        perKmRate: 19.2,
        perMinRate: 1.65,
        minimumFare: 110,
        bookingFee: 14,
        speedFactor: 1.0,
        etaOffsetMin: 1,
      },
    ],
  },
  {
    platformId: 'goamiles',
    platformName: 'GoaMiles',
    pricingModel: 'Goa Govt. regulated taxi tariff',
    surgeSensitivity: 0.1,
    airportPickupFee: 80,
    baseDispatchEtaMin: 7,
    reliabilityBase: 92,
    notes: 'Official Goa app-based cab aggregator connecting airports, beaches, and railway stations.',
    vehicles: [
      {
        category: 'hatchback',
        categoryLabel: 'Hatchback',
        vehicleType: 'GoaMiles Mini AC',
        baseFare: 95,
        perKmRate: 21.5,
        perMinRate: 1.2,
        minimumFare: 150,
        bookingFee: 15,
        speedFactor: 1.0,
        etaOffsetMin: 0,
      },
      {
        category: 'sedan',
        categoryLabel: 'Sedan',
        vehicleType: 'GoaMiles Sedan',
        baseFare: 120,
        perKmRate: 24.5,
        perMinRate: 1.4,
        minimumFare: 190,
        bookingFee: 18,
        speedFactor: 1.0,
        etaOffsetMin: 1,
      },
      {
        category: 'suv',
        categoryLabel: 'SUV',
        vehicleType: 'GoaMiles Innova / XL',
        baseFare: 170,
        perKmRate: 30.0,
        perMinRate: 1.8,
        minimumFare: 260,
        bookingFee: 25,
        speedFactor: 1.04,
        etaOffsetMin: 2,
      },
    ],
  },
];

export function getEffectivePlatformModels(
  cityConfig: CityProviderConfig,
  customRates?: CustomPlatformRatesMap
): PlatformFareModel[] {
  const supportedSet = new Set<PlatformId>(cityConfig.supportedPlatforms);

  return PLATFORM_FARE_MODELS.filter((m) => supportedSet.has(m.platformId)).map((model) => {
    const benchmark =
      model.vehicles.find((v) => v.category === 'hatchback') ||
      model.vehicles.find((v) => v.category === 'ev') ||
      model.vehicles[0];

    const override = customRates?.[model.platformId];
    const cityMult = cityConfig.rateMultiplier;

    const benchmarkBaseCity = Math.max(10, Math.round(benchmark.baseFare * cityMult));
    const benchmarkPerKmCity = Number((benchmark.perKmRate * cityMult).toFixed(1));
    const benchmarkPerMinCity = Number((benchmark.perMinRate * cityMult).toFixed(2));

    const baseRatio =
      override?.baseFare !== undefined &&
      Number.isFinite(override.baseFare) &&
      override.baseFare >= 5 &&
      benchmarkBaseCity > 0
        ? override.baseFare / benchmarkBaseCity
        : 1;

    const kmRatio =
      override?.perKmRate !== undefined &&
      Number.isFinite(override.perKmRate) &&
      override.perKmRate >= 2 &&
      benchmarkPerKmCity > 0
        ? override.perKmRate / benchmarkPerKmCity
        : 1;

    const minRatio =
      override?.perMinRate !== undefined &&
      Number.isFinite(override.perMinRate) &&
      override.perMinRate >= 0.2 &&
      benchmarkPerMinCity > 0
        ? override.perMinRate / benchmarkPerMinCity
        : 1;

    return {
      ...model,
      vehicles: model.vehicles.map((v) => {
        const isBenchmark = v.category === benchmark.category;
        const baseFare =
          isBenchmark && override?.baseFare !== undefined && Number.isFinite(override.baseFare)
            ? Math.max(5, Math.round(override.baseFare))
            : Math.max(5, Math.round(v.baseFare * cityMult * baseRatio));

        const perKmRate =
          isBenchmark && override?.perKmRate !== undefined && Number.isFinite(override.perKmRate)
            ? Number(Math.max(2, override.perKmRate).toFixed(1))
            : Number(Math.max(2, v.perKmRate * cityMult * kmRatio).toFixed(1));

        const perMinRate =
          isBenchmark && override?.perMinRate !== undefined && Number.isFinite(override.perMinRate)
            ? Number(Math.max(0.2, override.perMinRate).toFixed(2))
            : Number(Math.max(0.2, v.perMinRate * cityMult * minRatio).toFixed(2));

        const minimumFare = Math.max(
          baseFare + v.bookingFee,
          Math.round(v.minimumFare * cityMult * ((baseRatio + kmRatio) / 2))
        );

        return {
          ...v,
          baseFare,
          perKmRate,
          perMinRate,
          minimumFare,
        };
      }),
    };
  });
}
