import { LocationPoint, RoutePreset, ZoneType } from '../src/types/cabfare.ts';

export const CURATED_LOCATIONS: LocationPoint[] = [
  // ================= METROS =================
  // Bengaluru (Karnataka)
  {
    id: 'blr-indiranagar',
    name: 'Indiranagar 100 Feet Road',
    area: 'Indiranagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    lat: 12.9784,
    lng: 77.6408,
    zoneType: 'commercial',
    tier: 'metro',
  },
  {
    id: 'blr-koramangala',
    name: 'Koramangala 4th Block (Sony Signal)',
    area: 'Koramangala',
    city: 'Bengaluru',
    state: 'Karnataka',
    lat: 12.9352,
    lng: 77.6245,
    zoneType: 'commercial',
    tier: 'metro',
  },
  {
    id: 'blr-kia',
    name: 'Kempegowda International Airport (BLR)',
    area: 'Devanahalli',
    city: 'Bengaluru',
    state: 'Karnataka',
    lat: 13.1986,
    lng: 77.7066,
    zoneType: 'airport',
    tier: 'metro',
  },
  {
    id: 'blr-ksr',
    name: 'Krantivira Sangolli Rayanna (Bengaluru City) Railway Station',
    area: 'Majestic',
    city: 'Bengaluru',
    state: 'Karnataka',
    lat: 12.9781,
    lng: 77.5698,
    zoneType: 'railway',
    tier: 'metro',
  },
  {
    id: 'blr-ecity',
    name: 'Electronic City Phase 1',
    area: 'Electronic City',
    city: 'Bengaluru',
    state: 'Karnataka',
    lat: 12.8452,
    lng: 77.6602,
    zoneType: 'tech-park',
    tier: 'metro',
  },
  {
    id: 'blr-whitefield',
    name: 'Whitefield ITPL Main Gate',
    area: 'Whitefield',
    city: 'Bengaluru',
    state: 'Karnataka',
    lat: 12.9855,
    lng: 77.7363,
    zoneType: 'tech-park',
    tier: 'metro',
  },
  {
    id: 'blr-mgroad',
    name: 'MG Road Metro Station',
    area: 'Central Business District',
    city: 'Bengaluru',
    state: 'Karnataka',
    lat: 12.9756,
    lng: 77.6066,
    zoneType: 'metro',
    tier: 'metro',
  },
  {
    id: 'blr-hsr',
    name: 'HSR Layout 27th Main',
    area: 'HSR Layout',
    city: 'Bengaluru',
    state: 'Karnataka',
    lat: 12.9121,
    lng: 77.6446,
    zoneType: 'residential',
    tier: 'metro',
  },
  {
    id: 'blr-manyata',
    name: 'Manyata Tech Park',
    area: 'Nagawara',
    city: 'Bengaluru',
    state: 'Karnataka',
    lat: 13.0458,
    lng: 77.6203,
    zoneType: 'tech-park',
    tier: 'metro',
  },
  {
    id: 'blr-majestic',
    name: 'Kempegowda Bus Station (Majestic)',
    area: 'Gandhi Nagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    lat: 12.9767,
    lng: 77.5713,
    zoneType: 'metro',
    tier: 'metro',
  },
  {
    id: 'blr-jayanagar',
    name: 'Jayanagar 4th Block Shopping Complex',
    area: 'Jayanagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    lat: 12.9299,
    lng: 77.5838,
    zoneType: 'residential',
    tier: 'metro',
  },
  {
    id: 'blr-bellandur',
    name: 'Ecospace Business Park, Bellandur',
    area: 'Outer Ring Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    lat: 12.9261,
    lng: 77.6798,
    zoneType: 'tech-park',
    tier: 'metro',
  },

  // Delhi NCR (Delhi / Haryana / Uttar Pradesh)
  {
    id: 'del-cp',
    name: 'Connaught Place (Rajiv Chowk)',
    area: 'Central Delhi',
    city: 'Delhi NCR',
    state: 'Delhi',
    lat: 28.6328,
    lng: 77.2197,
    zoneType: 'commercial',
    tier: 'metro',
  },
  {
    id: 'del-igi-t3',
    name: 'Indira Gandhi International Airport T3',
    area: 'Aerocity',
    city: 'Delhi NCR',
    state: 'Delhi',
    lat: 28.5562,
    lng: 77.1000,
    zoneType: 'airport',
    tier: 'metro',
  },
  {
    id: 'del-cyberhub',
    name: 'DLF Cyber Hub',
    area: 'Gurugram Phase 2',
    city: 'Delhi NCR',
    state: 'Haryana',
    lat: 28.4950,
    lng: 77.0895,
    zoneType: 'tech-park',
    tier: 'metro',
  },
  {
    id: 'del-hauzkhas',
    name: 'Hauz Khas Metro & Village',
    area: 'South Delhi',
    city: 'Delhi NCR',
    state: 'Delhi',
    lat: 28.5433,
    lng: 77.2067,
    zoneType: 'metro',
    tier: 'metro',
  },
  {
    id: 'del-noida18',
    name: 'Noida Sector 18 Market',
    area: 'Noida',
    city: 'Delhi NCR',
    state: 'Uttar Pradesh',
    lat: 28.5708,
    lng: 77.3261,
    zoneType: 'commercial',
    tier: 'metro',
  },
  {
    id: 'del-saket',
    name: 'Select Citywalk, Saket',
    area: 'Saket',
    city: 'Delhi NCR',
    state: 'Delhi',
    lat: 28.5286,
    lng: 77.2189,
    zoneType: 'commercial',
    tier: 'metro',
  },
  {
    id: 'del-ndls',
    name: 'New Delhi Railway Station (NDLS)',
    area: 'Paharganj',
    city: 'Delhi NCR',
    state: 'Delhi',
    lat: 28.6429,
    lng: 77.2191,
    zoneType: 'railway',
    tier: 'metro',
  },
  {
    id: 'del-india-gate',
    name: 'India Gate Kartavya Path',
    area: 'Central Secretariat',
    city: 'Delhi NCR',
    state: 'Delhi',
    lat: 28.6129,
    lng: 77.2295,
    zoneType: 'landmark',
    tier: 'metro',
  },

  // Mumbai (Maharashtra)
  {
    id: 'bom-bkc',
    name: 'Bandra Kurla Complex (BKC)',
    area: 'Bandra East',
    city: 'Mumbai',
    state: 'Maharashtra',
    lat: 19.0653,
    lng: 72.8682,
    zoneType: 'commercial',
    tier: 'metro',
  },
  {
    id: 'bom-csmi',
    name: 'Chhatrapati Shivaji Maharaj Airport T2',
    area: 'Sahar, Andheri East',
    city: 'Mumbai',
    state: 'Maharashtra',
    lat: 19.0896,
    lng: 72.8656,
    zoneType: 'airport',
    tier: 'metro',
  },
  {
    id: 'bom-csmt',
    name: 'Chhatrapati Shivaji Maharaj Terminus (CSMT)',
    area: 'Fort',
    city: 'Mumbai',
    state: 'Maharashtra',
    lat: 18.9398,
    lng: 72.8355,
    zoneType: 'railway',
    tier: 'metro',
  },
  {
    id: 'bom-nariman',
    name: 'Nariman Point',
    area: 'South Mumbai',
    city: 'Mumbai',
    state: 'Maharashtra',
    lat: 18.9256,
    lng: 72.8242,
    zoneType: 'commercial',
    tier: 'metro',
  },
  {
    id: 'bom-powai',
    name: 'Hiranandani Gardens, Powai',
    area: 'Powai',
    city: 'Mumbai',
    state: 'Maharashtra',
    lat: 19.1197,
    lng: 72.9051,
    zoneType: 'tech-park',
    tier: 'metro',
  },
  {
    id: 'bom-andheri',
    name: 'Andheri West Station',
    area: 'Andheri',
    city: 'Mumbai',
    state: 'Maharashtra',
    lat: 19.1197,
    lng: 72.8464,
    zoneType: 'railway',
    tier: 'metro',
  },
  {
    id: 'bom-lowerparel',
    name: 'Lower Parel (Phoenix Palladium)',
    area: 'Lower Parel',
    city: 'Mumbai',
    state: 'Maharashtra',
    lat: 18.9949,
    lng: 72.8251,
    zoneType: 'commercial',
    tier: 'metro',
  },

  // Hyderabad (Telangana)
  {
    id: 'hyd-hitec',
    name: 'HITEC City (Cyber Towers)',
    area: 'Madhapur',
    city: 'Hyderabad',
    state: 'Telangana',
    lat: 17.4504,
    lng: 78.3812,
    zoneType: 'tech-park',
    tier: 'metro',
  },
  {
    id: 'hyd-rgia',
    name: 'Rajiv Gandhi International Airport (HYD)',
    area: 'Shamshabad',
    city: 'Hyderabad',
    state: 'Telangana',
    lat: 17.2403,
    lng: 78.4294,
    zoneType: 'airport',
    tier: 'metro',
  },
  {
    id: 'hyd-secbad',
    name: 'Secunderabad Junction Railway Station',
    area: 'Secunderabad',
    city: 'Hyderabad',
    state: 'Telangana',
    lat: 17.4344,
    lng: 78.5013,
    zoneType: 'railway',
    tier: 'metro',
  },
  {
    id: 'hyd-banjara',
    name: 'Banjara Hills Road No. 12',
    area: 'Banjara Hills',
    city: 'Hyderabad',
    state: 'Telangana',
    lat: 17.4126,
    lng: 78.4398,
    zoneType: 'commercial',
    tier: 'metro',
  },
  {
    id: 'hyd-charminar',
    name: 'Charminar Old City',
    area: 'Laad Bazaar',
    city: 'Hyderabad',
    state: 'Telangana',
    lat: 17.3616,
    lng: 78.4747,
    zoneType: 'landmark',
    tier: 'metro',
  },

  // Pune (Maharashtra)
  {
    id: 'pnq-kp',
    name: 'Koregaon Park North Main Road',
    area: 'Koregaon Park',
    city: 'Pune',
    state: 'Maharashtra',
    lat: 18.5362,
    lng: 73.8940,
    zoneType: 'commercial',
    tier: 'metro',
  },
  {
    id: 'pnq-hinjewadi',
    name: 'Hinjewadi Rajiv Gandhi Infotech Park',
    area: 'Hinjewadi',
    city: 'Pune',
    state: 'Maharashtra',
    lat: 18.5913,
    lng: 73.7389,
    zoneType: 'tech-park',
    tier: 'metro',
  },
  {
    id: 'pnq-junction',
    name: 'Pune Junction Railway Station',
    area: 'Camp',
    city: 'Pune',
    state: 'Maharashtra',
    lat: 18.5289,
    lng: 73.8744,
    zoneType: 'railway',
    tier: 'metro',
  },
  {
    id: 'pnq-airport',
    name: 'Pune International Airport (PNQ)',
    area: 'Lohegaon',
    city: 'Pune',
    state: 'Maharashtra',
    lat: 18.5821,
    lng: 73.9197,
    zoneType: 'airport',
    tier: 'metro',
  },

  // Chennai (Tamil Nadu)
  {
    id: 'maa-tnagar',
    name: 'T. Nagar Panagal Park',
    area: 'T. Nagar',
    city: 'Chennai',
    state: 'Tamil Nadu',
    lat: 13.0418,
    lng: 80.2341,
    zoneType: 'commercial',
    tier: 'metro',
  },
  {
    id: 'maa-airport',
    name: 'Chennai International Airport (MAA)',
    area: 'Meenambakkam',
    city: 'Chennai',
    state: 'Tamil Nadu',
    lat: 12.9941,
    lng: 80.1709,
    zoneType: 'airport',
    tier: 'metro',
  },
  {
    id: 'maa-central',
    name: 'Puratchi Thalaivar Dr. MGR Central Railway Station',
    area: 'Park Town',
    city: 'Chennai',
    state: 'Tamil Nadu',
    lat: 13.0827,
    lng: 80.2755,
    zoneType: 'railway',
    tier: 'metro',
  },
  {
    id: 'maa-omr',
    name: 'Tidel Park / OMR IT Corridor',
    area: 'Tharamani',
    city: 'Chennai',
    state: 'Tamil Nadu',
    lat: 12.9896,
    lng: 80.2494,
    zoneType: 'tech-park',
    tier: 'metro',
  },

  // Kolkata (West Bengal)
  {
    id: 'ccu-parkst',
    name: 'Park Street / Esplanade Metro',
    area: 'Central Kolkata',
    city: 'Kolkata',
    state: 'West Bengal',
    lat: 22.5551,
    lng: 88.3517,
    zoneType: 'commercial',
    tier: 'metro',
  },
  {
    id: 'ccu-howrah',
    name: 'Howrah Junction Railway Station',
    area: 'Howrah',
    city: 'Kolkata',
    state: 'West Bengal',
    lat: 22.5839,
    lng: 88.3426,
    zoneType: 'railway',
    tier: 'metro',
  },
  {
    id: 'ccu-airport',
    name: 'Netaji Subhas Chandra Bose Airport (CCU)',
    area: 'Dum Dum',
    city: 'Kolkata',
    state: 'West Bengal',
    lat: 22.6547,
    lng: 88.4467,
    zoneType: 'airport',
    tier: 'metro',
  },
  {
    id: 'ccu-saltlake',
    name: 'Salt Lake Sector V IT Hub',
    area: 'Bidhannagar',
    city: 'Kolkata',
    state: 'West Bengal',
    lat: 22.5735,
    lng: 88.4331,
    zoneType: 'tech-park',
    tier: 'metro',
  },

  // Ahmedabad (Gujarat)
  {
    id: 'amd-sg',
    name: 'SG Highway (Sindhu Bhavan Road)',
    area: 'Bodakdev',
    city: 'Ahmedabad',
    state: 'Gujarat',
    lat: 23.0387,
    lng: 72.5112,
    zoneType: 'commercial',
    tier: 'metro',
  },
  {
    id: 'amd-airport',
    name: 'Sardar Vallabhbhai Patel International Airport (AMD)',
    area: 'Hansol',
    city: 'Ahmedabad',
    state: 'Gujarat',
    lat: 23.0734,
    lng: 72.6266,
    zoneType: 'airport',
    tier: 'metro',
  },
  {
    id: 'amd-kalupur',
    name: 'Ahmedabad Junction (Kalupur) Railway Station',
    area: 'Kalupur',
    city: 'Ahmedabad',
    state: 'Gujarat',
    lat: 23.0268,
    lng: 72.6010,
    zoneType: 'railway',
    tier: 'metro',
  },

  // ================= TIER 2 CITIES =================
  // Jaipur (Rajasthan)
  {
    id: 'jai-miroad',
    name: 'MI Road (Panch Batti)',
    area: 'Jaipur Central',
    city: 'Jaipur',
    state: 'Rajasthan',
    lat: 26.9154,
    lng: 75.8055,
    zoneType: 'commercial',
    tier: 'tier2',
  },
  {
    id: 'jai-airport',
    name: 'Jaipur International Airport (JAI)',
    area: 'Sanganer',
    city: 'Jaipur',
    state: 'Rajasthan',
    lat: 26.8242,
    lng: 75.8122,
    zoneType: 'airport',
    tier: 'tier2',
  },
  {
    id: 'jai-junction',
    name: 'Jaipur Junction Railway Station',
    area: 'Gopalbari',
    city: 'Jaipur',
    state: 'Rajasthan',
    lat: 26.9196,
    lng: 75.7878,
    zoneType: 'railway',
    tier: 'tier2',
  },
  {
    id: 'jai-hawamahal',
    name: 'Hawa Mahal Heritage Precinct',
    area: 'Badi Choupad',
    city: 'Jaipur',
    state: 'Rajasthan',
    lat: 26.9239,
    lng: 75.8267,
    zoneType: 'landmark',
    tier: 'tier2',
  },

  // Kochi (Kerala - Namma Yatri / Yatri confirmed)
  {
    id: 'cok-mgroad',
    name: 'MG Road / Ernakulam South',
    area: 'Ernakulam',
    city: 'Kochi',
    state: 'Kerala',
    lat: 9.9720,
    lng: 76.2839,
    zoneType: 'commercial',
    tier: 'tier2',
  },
  {
    id: 'cok-infopark',
    name: 'Infopark Kakkanad',
    area: 'Kakkanad',
    city: 'Kochi',
    state: 'Kerala',
    lat: 10.0102,
    lng: 76.3621,
    zoneType: 'tech-park',
    tier: 'tier2',
  },
  {
    id: 'cok-airport',
    name: 'Cochin International Airport (COK)',
    area: 'Nedumbassery',
    city: 'Kochi',
    state: 'Kerala',
    lat: 10.1518,
    lng: 76.3930,
    zoneType: 'airport',
    tier: 'tier2',
  },

  // Lucknow (Uttar Pradesh)
  {
    id: 'lko-hazratganj',
    name: 'Hazratganj Crossing',
    area: 'Hazratganj',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    lat: 26.8500,
    lng: 80.9462,
    zoneType: 'commercial',
    tier: 'tier2',
  },
  {
    id: 'lko-charbagh',
    name: 'Lucknow Charbagh Railway Station',
    area: 'Charbagh',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    lat: 26.8318,
    lng: 80.9209,
    zoneType: 'railway',
    tier: 'tier2',
  },
  {
    id: 'lko-airport',
    name: 'Chaudhary Charan Singh Airport (LKO)',
    area: 'Amausi',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    lat: 26.7606,
    lng: 80.8893,
    zoneType: 'airport',
    tier: 'tier2',
  },

  // Chandigarh (Chandigarh)
  {
    id: 'ixc-sec17',
    name: 'Sector 17 Plaza',
    area: 'Sector 17',
    city: 'Chandigarh',
    state: 'Chandigarh',
    lat: 30.7398,
    lng: 76.7827,
    zoneType: 'commercial',
    tier: 'tier2',
  },
  {
    id: 'ixc-airport',
    name: 'Shaheed Bhagat Singh International Airport (IXC)',
    area: 'Mohali / Zirakpur',
    city: 'Chandigarh',
    state: 'Chandigarh',
    lat: 30.6735,
    lng: 76.7885,
    zoneType: 'airport',
    tier: 'tier2',
  },

  // Indore (Madhya Pradesh)
  {
    id: 'idr-vijaynagar',
    name: 'Vijay Nagar Square',
    area: 'Vijay Nagar',
    city: 'Indore',
    state: 'Madhya Pradesh',
    lat: 22.7533,
    lng: 75.8937,
    zoneType: 'commercial',
    tier: 'tier2',
  },
  {
    id: 'idr-junction',
    name: 'Indore Junction Railway Station',
    area: 'Chhoti Gwaltoli',
    city: 'Indore',
    state: 'Madhya Pradesh',
    lat: 22.7169,
    lng: 75.8682,
    zoneType: 'railway',
    tier: 'tier2',
  },

  // Surat (Gujarat)
  {
    id: 'stv-piplod',
    name: 'Piplod / Dumas Road',
    area: 'Piplod',
    city: 'Surat',
    state: 'Gujarat',
    lat: 21.1589,
    lng: 72.7733,
    zoneType: 'commercial',
    tier: 'tier2',
  },
  {
    id: 'stv-station',
    name: 'Surat Railway Station',
    area: 'Varachha',
    city: 'Surat',
    state: 'Gujarat',
    lat: 21.2049,
    lng: 72.8407,
    zoneType: 'railway',
    tier: 'tier2',
  },

  // Nagpur (Maharashtra)
  {
    id: 'nag-sitabuldi',
    name: 'Sitabuldi Main Market',
    area: 'Sitabuldi',
    city: 'Nagpur',
    state: 'Maharashtra',
    lat: 21.1431,
    lng: 79.0806,
    zoneType: 'commercial',
    tier: 'tier2',
  },
  {
    id: 'nag-airport',
    name: 'Dr. Babasaheb Ambedkar Airport (NAG)',
    area: 'Sonegaon',
    city: 'Nagpur',
    state: 'Maharashtra',
    lat: 21.0922,
    lng: 79.0472,
    zoneType: 'airport',
    tier: 'tier2',
  },

  // Coimbatore (Tamil Nadu)
  {
    id: 'cjb-gandhipuram',
    name: 'Gandhipuram Central Bus Terminus',
    area: 'Gandhipuram',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    lat: 11.0183,
    lng: 76.9725,
    zoneType: 'commercial',
    tier: 'tier2',
  },
  {
    id: 'cjb-airport',
    name: 'Coimbatore International Airport (CJB)',
    area: 'Peelamedu',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    lat: 11.0300,
    lng: 77.0434,
    zoneType: 'airport',
    tier: 'tier2',
  },

  // Patna (Bihar)
  {
    id: 'pat-boringroad',
    name: 'Boring Road Crossing',
    area: 'Sri Krishnapuri',
    city: 'Patna',
    state: 'Bihar',
    lat: 25.6151,
    lng: 85.1180,
    zoneType: 'commercial',
    tier: 'tier2',
  },
  {
    id: 'pat-junction',
    name: 'Patna Junction Railway Station',
    area: 'Fraser Road',
    city: 'Patna',
    state: 'Bihar',
    lat: 25.6030,
    lng: 85.1376,
    zoneType: 'railway',
    tier: 'tier2',
  },

  // Bhubaneswar (Odisha)
  {
    id: 'bbi-mastercanteen',
    name: 'Bhubaneswar Railway Station (Master Canteen)',
    area: 'Kharavela Nagar',
    city: 'Bhubaneswar',
    state: 'Odisha',
    lat: 20.2665,
    lng: 85.8436,
    zoneType: 'railway',
    tier: 'tier2',
  },
  {
    id: 'bbi-airport',
    name: 'Biju Patnaik International Airport (BBI)',
    area: 'Aerodrome Area',
    city: 'Bhubaneswar',
    state: 'Odisha',
    lat: 20.2444,
    lng: 85.8178,
    zoneType: 'airport',
    tier: 'tier2',
  },

  // Guwahati (Assam)
  {
    id: 'gau-paltan',
    name: 'Guwahati Railway Station (Paltan Bazaar)',
    area: 'Paltan Bazaar',
    city: 'Guwahati',
    state: 'Assam',
    lat: 26.1818,
    lng: 91.7506,
    zoneType: 'railway',
    tier: 'tier2',
  },
  {
    id: 'gau-airport',
    name: 'Lokpriya Gopinath Bordoloi Airport (GAU)',
    area: 'Borjhar',
    city: 'Guwahati',
    state: 'Assam',
    lat: 26.1061,
    lng: 91.5859,
    zoneType: 'airport',
    tier: 'tier2',
  },

  // Mysuru (Karnataka - Namma Yatri confirmed)
  {
    id: 'myq-palace',
    name: 'Mysuru Palace (Sayyaji Rao Road)',
    area: 'Agrahara',
    city: 'Mysuru',
    state: 'Karnataka',
    lat: 12.3051,
    lng: 76.6551,
    zoneType: 'landmark',
    tier: 'tier2',
  },
  {
    id: 'myq-junction',
    name: 'Mysuru Junction Railway Station',
    area: 'Medar Block',
    city: 'Mysuru',
    state: 'Karnataka',
    lat: 12.3168,
    lng: 76.6454,
    zoneType: 'railway',
    tier: 'tier2',
  },

  // Varanasi, Agra, Visakhapatnam, Bhopal, Thiruvananthapuram, Udaipur
  {
    id: 'vns-cantt',
    name: 'Varanasi Junction (Cantt) Railway Station',
    area: 'Cantonment',
    city: 'Varanasi',
    state: 'Uttar Pradesh',
    lat: 25.3270,
    lng: 82.9866,
    zoneType: 'railway',
    tier: 'tier2',
  },
  {
    id: 'vns-dashashwamedh',
    name: 'Dashashwamedh Ghat / Godowlia',
    area: 'Old Varanasi',
    city: 'Varanasi',
    state: 'Uttar Pradesh',
    lat: 25.3075,
    lng: 83.0104,
    zoneType: 'landmark',
    tier: 'tier2',
  },
  {
    id: 'agr-taj',
    name: 'Taj Mahal East Gate',
    area: 'Tajganj',
    city: 'Agra',
    state: 'Uttar Pradesh',
    lat: 27.1751,
    lng: 78.0421,
    zoneType: 'landmark',
    tier: 'tier2',
  },
  {
    id: 'agr-cantt',
    name: 'Agra Cantt Railway Station',
    area: 'Idgah Colony',
    city: 'Agra',
    state: 'Uttar Pradesh',
    lat: 27.1583,
    lng: 77.9896,
    zoneType: 'railway',
    tier: 'tier2',
  },
  {
    id: 'vtz-dwaraka',
    name: 'Dwaraka Nagar / Vizag RTC Complex',
    area: 'Dwaraka Nagar',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    lat: 17.7289,
    lng: 83.3072,
    zoneType: 'commercial',
    tier: 'tier2',
  },
  {
    id: 'trv-technopark',
    name: 'Technopark Kazhakkoottam',
    area: 'Kazhakkoottam',
    city: 'Thiruvananthapuram',
    state: 'Kerala',
    lat: 8.5579,
    lng: 76.8800,
    zoneType: 'tech-park',
    tier: 'tier2',
  },

  // ================= TIER 3 & REGIONAL HUBS =================
  // Goa (GoaMiles regional coverage — Uber/Ola/Rapido/Namma Yatri unavailable)
  {
    id: 'goi-panaji',
    name: 'Panaji Municipal Market / Miramar',
    area: 'Panaji',
    city: 'Goa',
    state: 'Goa',
    lat: 15.4909,
    lng: 73.8278,
    zoneType: 'commercial',
    tier: 'regional',
  },
  {
    id: 'goi-calangute',
    name: 'Calangute Beach Circle',
    area: 'North Goa',
    city: 'Goa',
    state: 'Goa',
    lat: 15.5439,
    lng: 73.7553,
    zoneType: 'landmark',
    tier: 'regional',
  },
  {
    id: 'goi-airport',
    name: 'Goa Dabolim International Airport (GOI)',
    area: 'Vasco da Gama',
    city: 'Goa',
    state: 'Goa',
    lat: 15.3808,
    lng: 73.8314,
    zoneType: 'airport',
    tier: 'regional',
  },
  {
    id: 'goi-madgaon',
    name: 'Madgaon Junction Railway Station',
    area: 'Margao',
    city: 'Goa',
    state: 'Goa',
    lat: 15.2719,
    lng: 73.9685,
    zoneType: 'railway',
    tier: 'regional',
  },

  // Shimla (Himachal Pradesh - Tier 3 limited)
  {
    id: 'slv-mallroad',
    name: 'Shimla Mall Road / Old Bus Stand',
    area: 'The Ridge',
    city: 'Shimla',
    state: 'Himachal Pradesh',
    lat: 31.1048,
    lng: 77.1734,
    zoneType: 'landmark',
    tier: 'tier3',
  },
  {
    id: 'slv-station',
    name: 'Shimla Kalka-Heritage Railway Station',
    area: 'Cart Road',
    city: 'Shimla',
    state: 'Himachal Pradesh',
    lat: 31.1023,
    lng: 77.1636,
    zoneType: 'railway',
    tier: 'tier3',
  },

  // Siliguri (West Bengal - Tier 3)
  {
    id: 'ixb-njp',
    name: 'New Jalpaiguri (NJP) Railway Station',
    area: 'Bhaktinagar',
    city: 'Siliguri',
    state: 'West Bengal',
    lat: 26.6838,
    lng: 88.4426,
    zoneType: 'railway',
    tier: 'tier3',
  },
  {
    id: 'ixb-bagdogra',
    name: 'Bagdogra Airport (IXB)',
    area: 'Bagdogra',
    city: 'Siliguri',
    state: 'West Bengal',
    lat: 26.6812,
    lng: 88.3286,
    zoneType: 'airport',
    tier: 'tier3',
  },

  // Tirupati (Andhra Pradesh - Tier 3)
  {
    id: 'tir-station',
    name: 'Tirupati Main Railway Station',
    area: 'Tilak Road',
    city: 'Tirupati',
    state: 'Andhra Pradesh',
    lat: 13.6288,
    lng: 79.4192,
    zoneType: 'railway',
    tier: 'tier3',
  },
  {
    id: 'tir-airport',
    name: 'Tirupati Airport (TIR)',
    area: 'Renigunta',
    city: 'Tirupati',
    state: 'Andhra Pradesh',
    lat: 13.6325,
    lng: 79.5433,
    zoneType: 'airport',
    tier: 'tier3',
  },

  // Kota (Rajasthan - Tier 3)
  {
    id: 'ktu-talwandi',
    name: 'Talwandi Circle',
    area: 'Talwandi',
    city: 'Kota',
    state: 'Rajasthan',
    lat: 25.1518,
    lng: 75.8442,
    zoneType: 'commercial',
    tier: 'tier3',
  },
  {
    id: 'ktu-junction',
    name: 'Kota Junction Railway Station',
    area: 'Bhimganj Mandi',
    city: 'Kota',
    state: 'Rajasthan',
    lat: 25.2239,
    lng: 75.8812,
    zoneType: 'railway',
    tier: 'tier3',
  },

  // ================= UNSUPPORTED REMOTE REGIONS =================
  {
    id: 'ixl-leh',
    name: 'Leh Main Bazaar',
    area: 'Leh',
    city: 'Leh',
    state: 'Ladakh',
    lat: 34.1642,
    lng: 77.5848,
    zoneType: 'landmark',
    tier: 'unsupported',
  },
  {
    id: 'ixl-airport',
    name: 'Kushok Bakula Rimpochee Airport (IXL)',
    area: 'Leh',
    city: 'Leh',
    state: 'Ladakh',
    lat: 34.1359,
    lng: 77.5465,
    zoneType: 'airport',
    tier: 'unsupported',
  },
  {
    id: 'ixz-portblair',
    name: 'Veer Savarkar Airport (IXZ), Sri Vijaya Puram',
    area: 'Port Blair',
    city: 'Port Blair',
    state: 'Andaman and Nicobar Islands',
    lat: 11.6412,
    lng: 92.7297,
    zoneType: 'airport',
    tier: 'unsupported',
  },
];

export const ROUTE_PRESETS: RoutePreset[] = [
  {
    id: 'preset-blr-airport',
    label: 'Indiranagar → BLR Airport',
    city: 'Bengaluru',
    pickup: CURATED_LOCATIONS.find((l) => l.id === 'blr-indiranagar')!,
    drop: CURATED_LOCATIONS.find((l) => l.id === 'blr-kia')!,
  },
  {
    id: 'preset-del-cyber',
    label: 'Connaught Place → DLF Cyber Hub',
    city: 'Delhi NCR',
    pickup: CURATED_LOCATIONS.find((l) => l.id === 'del-cp')!,
    drop: CURATED_LOCATIONS.find((l) => l.id === 'del-cyberhub')!,
  },
  {
    id: 'preset-bom-bkc',
    label: 'Powai → Bandra Kurla Complex',
    city: 'Mumbai',
    pickup: CURATED_LOCATIONS.find((l) => l.id === 'bom-powai')!,
    drop: CURATED_LOCATIONS.find((l) => l.id === 'bom-bkc')!,
  },
  {
    id: 'preset-jai-airport',
    label: 'MI Road → Jaipur Airport (Tier 2)',
    city: 'Jaipur',
    pickup: CURATED_LOCATIONS.find((l) => l.id === 'jai-miroad')!,
    drop: CURATED_LOCATIONS.find((l) => l.id === 'jai-airport')!,
  },
  {
    id: 'preset-goi-calangute',
    label: 'GOI Airport → Calangute (GoaMiles)',
    city: 'Goa',
    pickup: CURATED_LOCATIONS.find((l) => l.id === 'goi-airport')!,
    drop: CURATED_LOCATIONS.find((l) => l.id === 'goi-calangute')!,
  },
];

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function isInsideIndia(lat: number, lng: number): boolean {
  // Covers mainland India + Andaman/Nicobar + Lakshadweep
  return lat >= 6.4 && lat <= 37.6 && lng >= 68.0 && lng <= 97.5;
}

export function classifyZoneType(text: string): ZoneType {
  const lower = text.toLowerCase();
  if (lower.includes('airport') || lower.includes('aerodrome') || lower.includes('terminal')) {
    return 'airport';
  }
  if (
    lower.includes('railway') ||
    lower.includes('junction') ||
    lower.includes('terminus') ||
    lower.includes('rail ') ||
    lower.includes('cantt')
  ) {
    return 'railway';
  }
  if (lower.includes('metro')) {
    return 'metro';
  }
  if (
    lower.includes('tech park') ||
    lower.includes('infotech') ||
    lower.includes('it park') ||
    lower.includes('cyber') ||
    lower.includes('sez')
  ) {
    return 'tech-park';
  }
  if (
    lower.includes('temple') ||
    lower.includes('fort') ||
    lower.includes('palace') ||
    lower.includes('beach') ||
    lower.includes('mahal') ||
    lower.includes('ghat') ||
    lower.includes('monument') ||
    lower.includes('gate')
  ) {
    return 'landmark';
  }
  return 'commercial';
}

export function findNearestHub(lat: number, lng: number): LocationPoint {
  let closest = CURATED_LOCATIONS[0];
  let minDist = Infinity;
  for (const loc of CURATED_LOCATIONS) {
    const d = haversineKm(lat, lng, loc.lat, loc.lng);
    if (d < minDist) {
      minDist = d;
      closest = loc;
    }
  }

  if (minDist <= 8) {
    return {
      ...closest,
      id: `gps-${Date.now()}`,
      name: minDist < 1.2 ? closest.name : `Near ${closest.name}`,
      lat,
      lng,
    };
  }

  if (minDist <= 35) {
    return {
      id: `gps-${Date.now()}`,
      name: `Current Location (${closest.city})`,
      area: `Near ${closest.area}`,
      city: closest.city,
      state: closest.state,
      lat,
      lng,
      zoneType: 'commercial',
      tier: closest.tier,
    };
  }

  return {
    id: `gps-${Date.now()}`,
    name: `Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    area: isInsideIndia(lat, lng) ? 'Detected Location (India)' : 'Outside India',
    city: isInsideIndia(lat, lng) ? 'Current Coordinates' : 'International Coordinates',
    lat,
    lng,
    zoneType: 'commercial',
  };
}

export function searchLocalLocations(query: string): LocationPoint[] {
  const q = query.trim().toLowerCase();
  if (!q) return CURATED_LOCATIONS.slice(0, 10);

  const tokens = q.split(/[\s,]+/).filter(Boolean);
  const scored: Array<{ loc: LocationPoint; score: number }> = [];

  for (const loc of CURATED_LOCATIONS) {
    const nameLower = loc.name.toLowerCase();
    const cityLower = loc.city.toLowerCase();
    const stateLower = (loc.state ?? '').toLowerCase();
    const areaLower = loc.area.toLowerCase();
    const haystack = `${nameLower} ${areaLower} ${cityLower} ${stateLower} ${loc.zoneType}`;

    if (!tokens.every((t) => haystack.includes(t))) continue;

    let score = 1;
    if (cityLower.startsWith(q) || nameLower.startsWith(q)) score += 10;
    else if (cityLower.includes(q) || stateLower.includes(q)) score += 6;
    if (haystack.includes(q)) score += 4;
    scored.push({ loc, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 10).map((s) => s.loc);
}
