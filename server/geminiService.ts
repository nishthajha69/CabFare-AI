import { GoogleGenAI, Type } from '@google/genai';
import {
  AIActionType,
  AIRecommendation,
  ChatMessage,
  FareComparisonResponse,
} from '../src/types/cabfare.ts';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getFriendlyGeminiError(err: unknown): {
  status: number;
  message: string;
  isNonRetryable: boolean;
} {
  const raw = err instanceof Error ? err.message : String(err);

  if (raw.includes('free tier is not available') || raw.includes('billing')) {
    return {
      status: 403,
      message:
        'Gemini API access requires a billing-enabled project for this key. Please verify or update GEMINI_API_KEY in Settings > Secrets.',
      isNonRetryable: true,
    };
  }
  if (raw.includes('PERMISSION_DENIED') || raw.includes('403')) {
    return {
      status: 403,
      message:
        'Gemini API permission denied. Please check GEMINI_API_KEY in Settings > Secrets.',
      isNonRetryable: true,
    };
  }
  if (raw.includes('API_KEY_INVALID') || raw.includes('400')) {
    return {
      status: 400,
      message:
        'Gemini API key is invalid. Please update GEMINI_API_KEY in Settings > Secrets.',
      isNonRetryable: true,
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      message:
        'Gemini API quota limit reached. Please try again shortly or check Settings > Secrets.',
      isNonRetryable: false,
    };
  }

  return {
    status: 502,
    message: 'Unable to reach Gemini API right now. Please try again shortly.',
    isNonRetryable: false,
  };
}

function buildAnalyticalFallback(
  comparison: FareComparisonResponse,
  targetFare?: number,
  notice?: string
): AIRecommendation {
  const {
    fares,
    platformBenchmarks,
    farePredictions,
    predictionMeta,
    summary,
    route,
    alternativePickups,
  } = comparison;
  const cabPool = platformBenchmarks && platformBenchmarks.length > 0 ? platformBenchmarks : fares;
  if (fares.length === 0 || cabPool.length === 0) {
    return {
      action: 'Consider Another Platform',
      recommendedPlatform: 'Local Taxi Counter',
      recommendedVehicle: 'Regional / Prepaid Taxi',
      estimatedFare: 0,
      potentialSavings: 0,
      reasoning:
        comparison.cityProviderContext?.note ||
        `No supported app-based cab aggregators operate in ${route.pickup.city || route.pickup.area}. Check regional taxi stands or adjust pickup/drop inside a supported Indian city.`,
      keyFactors: [
        `Coverage status: ${comparison.cityProviderContext?.serviceStatus ?? 'unsupported'}`,
        `Road route distance: ${route.roadDistanceKm} km`,
      ],
      confidenceLabel: 'Unsupported Location',
      generatedAt: new Date().toISOString(),
      source: 'analytical-fallback',
      notice,
    };
  }
  const cheapestOverall = fares[0];
  const cheapestCab = cabPool[0];
  const highestCab = cabPool[cabPool.length - 1];
  const fastestCab = [...cabPool].sort((a, b) => a.arrivalMinutes - b.arrivalMinutes)[0];
  const next10Min = farePredictions.find((p) => p.minutesAhead === 10);
  const next20Min = farePredictions.find((p) => p.minutesAhead === 20);
  const next30Min = farePredictions.find((p) => p.minutesAhead === 30);

  let action: AIActionType = 'Book Now';
  let recommendedPlatform = cheapestCab.platformName;
  let recommendedVehicle = cheapestCab.vehicleType;
  let estimatedFare = cheapestCab.estimatedFare;
  let potentialSavings = summary.estimatedSavings;
  let reasoning = '';
  const keyFactors: string[] = [];

  const priceDropsSoon =
    next20Min && next20Min.expectedFare < summary.averageFare * 0.94;
  const largePlatformSpread =
    highestCab.estimatedFare - cheapestCab.estimatedFare >= 60 ||
    (fastestCab.platformId !== cheapestCab.platformId &&
      cheapestCab.arrivalMinutes > 10 &&
      fastestCab.estimatedFare - cheapestCab.estimatedFare <= 35);

  if (priceDropsSoon && cheapestCab.surgeMultiplier > 1.18) {
    action = 'Wait 10 Minutes';
    recommendedPlatform = cheapestCab.platformName;
    recommendedVehicle = cheapestCab.vehicleType;
    estimatedFare = Math.round(cheapestCab.estimatedFare * 0.92);
    potentialSavings = Math.max(0, summary.highestFare - estimatedFare);
    reasoning = `Wait 10 minutes before confirming: historical patterns on this ${route.roadDistanceKm} km corridor show peak surge (${cheapestCab.surgeMultiplier}x) cooling over the next 10–30 minutes (projected average moving from ₹${summary.averageFare} toward ₹${next30Min?.expectedFare ?? next20Min?.expectedFare}).`;
    keyFactors.push(
      `10–30 min forecast trend: ${predictionMeta?.directionLabel ?? 'Cooling'} (${predictionMeta?.confidencePercent ?? 78}% historical confidence)`
    );
    keyFactors.push(
      `Current cab spread: ₹${cheapestCab.estimatedFare} (${cheapestCab.platformName}) vs ₹${highestCab.estimatedFare} (${highestCab.platformName})`
    );
  } else if (largePlatformSpread) {
    action = 'Consider Another Platform';
    const pickFastAlt =
      cheapestCab.arrivalMinutes > 10 &&
      fastestCab.estimatedFare - cheapestCab.estimatedFare <= 35;
    const chosen = pickFastAlt ? fastestCab : cheapestCab;
    recommendedPlatform = chosen.platformName;
    recommendedVehicle = chosen.vehicleType;
    estimatedFare = chosen.estimatedFare;
    potentialSavings = Math.max(0, highestCab.estimatedFare - chosen.estimatedFare);
    reasoning = pickFastAlt
      ? `Consider switching from ${cheapestCab.platformName} (${cheapestCab.arrivalMinutes}-min ETA) to ${fastestCab.platformName} (${fastestCab.vehicleType} at ₹${fastestCab.estimatedFare}), cutting wait time to ${fastestCab.arrivalMinutes} min for only ₹${fastestCab.estimatedFare - cheapestCab.estimatedFare} more.`
      : `Consider Another Platform: choosing ${cheapestCab.platformName} (${cheapestCab.vehicleType} at ₹${cheapestCab.estimatedFare}) saves ₹${potentialSavings} (${summary.savingsPercent}%) compared to ${highestCab.platformName} (₹${highestCab.estimatedFare}) on the same ${route.roadDistanceKm} km road route.`;
    keyFactors.push(
      `Platform savings spread: ₹${summary.estimatedSavings} (${summary.savingsPercent}%) between ${cheapestCab.platformName} and ${highestCab.platformName}`
    );
    keyFactors.push(
      `Next 10m / 20m / 30m avg trend: ₹${next10Min?.expectedFare ?? summary.averageFare} → ₹${next20Min?.expectedFare ?? summary.averageFare} → ₹${next30Min?.expectedFare ?? summary.averageFare}`
    );
  } else {
    action = 'Book Now';
    recommendedPlatform = cheapestCab.platformName;
    recommendedVehicle = cheapestCab.vehicleType;
    estimatedFare = cheapestCab.estimatedFare;
    potentialSavings = summary.estimatedSavings;
    const vsHist =
      predictionMeta?.historicalAvgFare
        ? summary.averageFare <= predictionMeta.historicalAvgFare
          ? `at or below the synthetic historical window average (₹${predictionMeta.historicalAvgFare})`
          : `with ${predictionMeta.directionLabel.toLowerCase()} pressure ahead`
        : 'at stable demand';
    reasoning = `Book Now on ${cheapestCab.platformName} (${cheapestCab.vehicleType} at ₹${cheapestCab.estimatedFare}, ~${cheapestCab.arrivalMinutes} min simulated ETA): current fares are ${vsHist}. Waiting 10–30 minutes is unlikely to yield lower pricing (${next10Min?.expectedFare ? `₹${next10Min.expectedFare}` : 'stable'} in 10m).`;
    keyFactors.push(
      `Cheapest overall mode: ${cheapestOverall.vehicleType} at ₹${cheapestOverall.estimatedFare} · Best 4-wheeler: ${cheapestCab.vehicleType} at ₹${cheapestCab.estimatedFare}`
    );
    keyFactors.push(
      `Alt pickup tip: ${alternativePickups[0]?.name ?? 'Nearby arterial stop'} saves ~₹${alternativePickups[0]?.savings ?? 20}`
    );
  }

  return {
    action,
    recommendedPlatform,
    recommendedVehicle,
    estimatedFare,
    potentialSavings,
    reasoning,
    keyFactors,
    confidenceLabel: predictionMeta?.confidenceLabel ?? 'Analytical Model',
    generatedAt: new Date().toISOString(),
    source: 'analytical-fallback',
    notice,
  };
}

export async function generateRideRecommendation(
  comparison: FareComparisonResponse,
  targetFare?: number
): Promise<AIRecommendation> {
  if (!comparison.fares || comparison.fares.length === 0) {
    return buildAnalyticalFallback(comparison, targetFare);
  }
  const ai = getGeminiClient();
  if (!ai) {
    return buildAnalyticalFallback(
      comparison,
      targetFare,
      'Set GEMINI_API_KEY in Settings > Secrets to enable live Gemini reasoning.'
    );
  }

  const promptPayload = {
    route: {
      from: comparison.route.pickup.name,
      to: comparison.route.drop.name,
      distanceKm: comparison.route.distanceKm,
      durationMin: comparison.route.estimatedDurationMin,
      traffic: comparison.route.trafficLevel,
      window: comparison.route.timeWindowLabel,
      rideMode: comparison.route.rideMode,
    },
    targetBudgetINR: targetFare ?? null,
    fares: comparison.fares.map((f) => ({
      platform: f.platformName,
      vehicle: f.vehicleType,
      fareINR: f.estimatedFare,
      surge: f.surgeMultiplier,
      etaMin: f.arrivalMinutes,
      scheduledWaitMin: f.scheduledWaitMinutes ?? 0,
      pickupWaitChargeINR: f.pickupWaitCharge ?? 0,
      reliability: f.reliabilityScore,
      cancellationRisk: f.cancellationRisk,
    })),
    nextPredictions: comparison.farePredictions.slice(0, 4),
    topAltPickup: comparison.alternativePickups[0],
  };

  let lastNotice: string | undefined;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Analyze this simulated cab fare dataset and choose the single best recommendation action for the commuter:\n${JSON.stringify(promptPayload)}`,
        config: {
          systemInstruction:
            'You are CabFare AI, an analytical mobility and pricing strategist. Choose exactly one action from: "Book Now", "Wait 10 Minutes", or "Consider Another Platform". Provide concise, quantitative reasoning referencing exact INR (₹) amounts, historical averages, surge multipliers, wait times (ETA), and 10/20/30-min forecast trajectories.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              action: {
                type: Type.STRING,
                description:
                  'Must be exactly one of: "Book Now", "Wait 10 Minutes", or "Consider Another Platform"',
              },
              recommendedPlatform: {
                type: Type.STRING,
                description: 'Name of the recommended cab platform.',
              },
              recommendedVehicle: {
                type: Type.STRING,
                description: 'Exact vehicle option name from the provided fares list (e.g., Uber Go, Ola Mini, Rapido Cab Economy).',
              },
              estimatedFare: {
                type: Type.NUMBER,
                description: 'Estimated fare in INR for the recommended choice.',
              },
              potentialSavings: {
                type: Type.NUMBER,
                description: 'Savings in INR compared to the highest option or current surge.',
              },
              reasoning: {
                type: Type.STRING,
                description: 'Clear 2-3 sentence quantitative explanation for the recommendation.',
              },
              keyFactors: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '2 to 3 crisp bullet takeaways with numbers.',
              },
              confidenceLabel: {
                type: Type.STRING,
                description: 'Short label like High Confidence or Moderate Confidence.',
              },
            },
            required: [
              'action',
              'recommendedPlatform',
              'recommendedVehicle',
              'estimatedFare',
              'potentialSavings',
              'reasoning',
              'keyFactors',
              'confidenceLabel',
            ],
          },
        },
      });

      const raw = (response.text ?? '{}').trim();
      const parsed = JSON.parse(raw);
      const validActions: AIActionType[] = [
        'Book Now',
        'Wait 10 Minutes',
        'Consider Another Platform',
      ];
      const normalizedAction = validActions.includes(parsed.action)
        ? (parsed.action as AIActionType)
        : 'Consider Another Platform';

      const matchedFare =
        comparison.fares.find(
          (f) =>
            typeof parsed.recommendedVehicle === 'string' &&
            f.vehicleType.toLowerCase() === parsed.recommendedVehicle.trim().toLowerCase()
        ) ||
        comparison.platformBenchmarks.find(
          (f) =>
            typeof parsed.recommendedPlatform === 'string' &&
            f.platformName.toLowerCase() === parsed.recommendedPlatform.trim().toLowerCase()
        ) ||
        comparison.platformBenchmarks[0] ||
        comparison.fares[0];

      return {
        action: normalizedAction,
        recommendedPlatform:
          matchedFare?.platformName ||
          parsed.recommendedPlatform ||
          comparison.summary.cheapestCabPlatform,
        recommendedVehicle:
          matchedFare?.vehicleType ||
          parsed.recommendedVehicle ||
          comparison.summary.cheapestCabVehicleType ||
          comparison.summary.cheapestVehicleType,
        estimatedFare:
          Number.isFinite(Number(parsed.estimatedFare)) && Number(parsed.estimatedFare) > 0
            ? Number(parsed.estimatedFare)
            : matchedFare?.estimatedFare ?? comparison.summary.cheapestCabFare,
        potentialSavings:
          Number.isFinite(Number(parsed.potentialSavings))
            ? Number(parsed.potentialSavings)
            : comparison.summary.estimatedSavings,
        reasoning: parsed.reasoning || buildAnalyticalFallback(comparison, targetFare).reasoning,
        keyFactors: Array.isArray(parsed.keyFactors) ? parsed.keyFactors.slice(0, 3) : [],
        confidenceLabel: parsed.confidenceLabel || 'High Confidence',
        generatedAt: new Date().toISOString(),
        source: 'gemini',
      };
    } catch (err) {
      const info = getFriendlyGeminiError(err);
      lastNotice = info.message;
      if (info.isNonRetryable) {
        break;
      }
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }

  return buildAnalyticalFallback(comparison, targetFare, lastNotice);
}

export class GeminiHttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function buildChatAnalyticalFallback(
  question: string,
  comparison?: FareComparisonResponse,
  targetFare?: number,
  recommendation?: AIRecommendation,
  notice?: string
): { reply: string; source: 'analytical-fallback'; notice?: string } {
  if (!comparison) {
    return {
      reply:
        'Select a pickup and destination and click Compare Prices to load simulated road route fares, travel duration, and 10–30 minute predictions. Once loaded, I can tell you which cab is cheapest, whether to book now or wait, and how much you can save.',
      source: 'analytical-fallback',
      notice,
    };
  }

  const q = question.toLowerCase();
  const {
    route,
    summary,
    fares,
    platformBenchmarks,
    farePredictions,
    predictionMeta,
    alternativePickups,
  } = comparison;

  const cabPool = platformBenchmarks && platformBenchmarks.length > 0 ? platformBenchmarks : fares;
  if (fares.length === 0 || cabPool.length === 0) {
    return {
      reply:
        comparison.cityProviderContext?.note ||
        `No supported app-based cab aggregators operate for ${route.pickup.name} → ${route.drop.name} (${route.roadDistanceKm} km). Try selecting a metro, Tier 2, or Tier 3 city in India.`,
      source: 'analytical-fallback',
      notice,
    };
  }
  const cheapestCab = cabPool[0];
  const highestCab = cabPool[cabPool.length - 1];
  const cheapestOverall = fares[0];
  const fastestCab = [...cabPool].sort((a, b) => a.arrivalMinutes - b.arrivalMinutes)[0];
  const bestRatedCab = [...cabPool].sort(
    (a, b) => b.reliabilityScore - a.reliabilityScore || a.estimatedFare - b.estimatedFare
  )[0];

  const p10 = farePredictions.find((p) => p.minutesAhead === 10);
  const p15 = farePredictions.find((p) => p.minutesAhead === 15);
  const p20 = farePredictions.find((p) => p.minutesAhead === 20);
  const p30 = farePredictions.find((p) => p.minutesAhead === 30);
  const expected15Min =
    p15?.expectedFare ??
    (p10 && p20 ? Math.round((p10.expectedFare + p20.expectedFare) / 2) : summary.averageFare);

  const disclaimer =
    'Note: All figures are simulated estimates modeled from road route distance and configured platform tariffs, not live provider prices.';

  // Check if user mentions a specific platform or vehicle category
  const platformKeys: Array<{ key: string; match: string }> = [
    { key: 'namma yatri', match: 'namma_yatri' },
    { key: 'namma_yatri', match: 'namma_yatri' },
    { key: 'blusmart', match: 'blusmart' },
    { key: 'goamiles', match: 'goamiles' },
    { key: 'goa miles', match: 'goamiles' },
    { key: 'meru', match: 'meru' },
    { key: 'rapido', match: 'rapido' },
    { key: 'uber', match: 'uber' },
    { key: 'ola', match: 'ola' },
  ];
  const mentionedPlatform = platformKeys.find((p) => q.includes(p.key));

  const categoryKeys: Array<{ key: string; cat: string }> = [
    { key: 'bike', cat: 'bike' },
    { key: 'auto', cat: 'auto' },
    { key: 'hatchback', cat: 'hatchback' },
    { key: 'sedan', cat: 'sedan' },
    { key: 'suv', cat: 'suv' },
    { key: 'electric', cat: 'ev' },
    { key: 'ev', cat: 'ev' },
  ];
  const mentionedCategory = categoryKeys.find((c) => q.includes(c.key));

  let reply = '';

  if (
    q.includes('cheapest') ||
    q.includes('lowest') ||
    q.includes('cost least') ||
    q.includes('minimum fare')
  ) {
    reply =
      `For ${route.pickup.area} → ${route.drop.area} (${route.roadDistanceKm} km, ~${route.estimatedDurationMin} min travel time), ` +
      `the cheapest 4-wheeler cab is **${summary.cheapestCabPlatform}** (${cheapestCab.vehicleType}) at **₹${summary.cheapestCabFare}** ` +
      `(simulated ETA ${cheapestCab.arrivalMinutes} min, ${cheapestCab.surgeMultiplier}x surge). ` +
      (cheapestOverall.category !== cheapestCab.category
        ? `If you also consider two/three-wheelers, **${cheapestOverall.vehicleType}** on ${cheapestOverall.platformName} is lowest overall at **₹${cheapestOverall.estimatedFare}**. `
        : '') +
      `Choosing ${summary.cheapestCabPlatform} over ${summary.highestPlatform} (₹${summary.highestFare}) saves **₹${summary.estimatedSavings}**. ${disclaimer}`;
  } else if (
    q.includes('15 min') ||
    q.includes('wait') ||
    q.includes('book now') ||
    q.includes('reduce') ||
    q.includes('forecast') ||
    q.includes('trend')
  ) {
    const diff15 = expected15Min - summary.averageFare;
    const verdict =
      recommendation?.action ??
      (diff15 <= -10 && cheapestCab.surgeMultiplier > 1.15
        ? 'Wait 10 Minutes'
        : summary.estimatedSavings >= 60
          ? 'Consider Another Platform'
          : 'Book Now');

    const trendWord =
      diff15 <= -5
        ? `drop by ~₹${Math.abs(diff15)} (from avg ₹${summary.averageFare} toward ~₹${expected15Min})`
        : diff15 >= 5
          ? `rise by ~₹${diff15} (from avg ₹${summary.averageFare} toward ~₹${expected15Min})`
          : `stay roughly stable (~₹${expected15Min} vs ₹${summary.averageFare} now)`;

    reply =
      `**Recommendation: ${verdict}.** Based on the ${predictionMeta?.confidencePercent ?? 76}% confidence historical trend (${predictionMeta?.directionLabel ?? 'Stable'}) for ${route.pickup.area} → ${route.drop.area}: ` +
      `average fares over the next **10 / 15 / 20 / 30 min** are projected at **₹${p10?.expectedFare ?? summary.averageFare} / ~₹${expected15Min} / ₹${p20?.expectedFare ?? summary.averageFare} / ₹${p30?.expectedFare ?? summary.averageFare}**. ` +
      `Waiting 15 minutes is estimated to ${trendWord}. ` +
      (verdict === 'Book Now'
        ? `Booking ${cheapestCab.platformName} (${cheapestCab.vehicleType}) now at **₹${cheapestCab.estimatedFare}** locks in today's lower rate.`
        : `If flexible, re-check after 10–15 minutes or switch to **${summary.cheapestCabPlatform}** (₹${summary.cheapestCabFare}).`) +
      ` ${disclaimer}`;
  } else if (
    q.includes('best value') ||
    q.includes('balance') ||
    q.includes('recommend') ||
    q.includes('which platform')
  ) {
    const recPlatform = recommendation?.recommendedPlatform ?? cheapestCab.platformName;
    const recFare = recommendation?.estimatedFare ?? cheapestCab.estimatedFare;
    reply =
      `**Best overall value: ${recPlatform}** at **₹${recFare}** (${recommendation?.recommendedVehicle || cheapestCab.vehicleType}) for this ${route.roadDistanceKm} km (${route.estimatedDurationMin} min) trip. ` +
      `Comparison across key trade-offs: **Cheapest cab** is ${cheapestCab.platformName} (₹${cheapestCab.estimatedFare}, ${cheapestCab.arrivalMinutes}m ETA), ` +
      `**Fastest pickup** is ${fastestCab.platformName} (${fastestCab.arrivalMinutes}m ETA, ₹${fastestCab.estimatedFare}), and ` +
      `**Highest reliability** is ${bestRatedCab.platformName} (${bestRatedCab.reliabilityScore}% score, ₹${bestRatedCab.estimatedFare}). ` +
      (targetFare !== undefined
        ? recFare <= targetFare
          ? `This fits within your ₹${targetFare} target budget. `
          : `Note: this is ₹${recFare - targetFare} above your ₹${targetFare} budget. `
        : '') +
      `${disclaimer}`;
  } else if (
    q.includes('save') ||
    q.includes('saving') ||
    q.includes('another cab') ||
    q.includes('alternative pickup') ||
    q.includes('cheaper')
  ) {
    const topAlt = alternativePickups[0];
    const cabSpread = Math.max(0, highestCab.estimatedFare - cheapestCab.estimatedFare);
    const overallSpread = Math.max(0, summary.highestFare - cheapestOverall.estimatedFare);
    reply =
      `Choosing **${cheapestCab.platformName}** (${cheapestCab.vehicleType} at ₹${cheapestCab.estimatedFare}) instead of **${highestCab.platformName}** (₹${highestCab.estimatedFare}) saves **₹${cabSpread} (${summary.savingsPercent}%)** on the same ${route.roadDistanceKm} km route. ` +
      (cheapestOverall.category !== cheapestCab.category
        ? `Switching to **${cheapestOverall.vehicleType}** on ${cheapestOverall.platformName} (₹${cheapestOverall.estimatedFare}) increases total savings up to **₹${overallSpread}**. `
        : '') +
      (topAlt
        ? `Walking ${topAlt.walkMinutes} min (${topAlt.walkMeters}m) to **${topAlt.name}** can save an extra **~₹${topAlt.savings}** (best fare ₹${topAlt.newFare} via ${topAlt.bestPlatform}). `
        : '') +
      disclaimer;
  } else if (mentionedPlatform || mentionedCategory) {
    const filtered = fares.filter((f) => {
      const pOk = !mentionedPlatform || f.platformId === mentionedPlatform.match;
      const cOk = !mentionedCategory || f.category === mentionedCategory.cat;
      return pOk && cOk;
    });
    if (filtered.length > 0) {
      const lines = filtered
        .slice(0, 4)
        .map(
          (f) =>
            `${f.platformName} ${f.vehicleType}: ₹${f.estimatedFare} (${f.arrivalMinutes}m ETA, ${f.surgeMultiplier}x surge)`
        )
        .join('; ');
      reply = `On ${route.pickup.area} → ${route.drop.area} (${route.roadDistanceKm} km, ${route.estimatedDurationMin} min), simulated options are: ${lines}. ${disclaimer}`;
    } else {
      reply = `No matching vehicle category is configured for that platform on this route. The cheapest simulated cab overall is ${summary.cheapestCabPlatform} at ₹${summary.cheapestCabFare}. ${disclaimer}`;
    }
  } else {
    reply =
      `For **${route.pickup.area} → ${route.drop.area}** (${route.roadDistanceKm} km, ~${route.estimatedDurationMin} min, ${route.trafficLevel} traffic): ` +
      `cheapest 4-wheeler cab is **${summary.cheapestCabPlatform}** at **₹${summary.cheapestCabFare}** (cheapest overall: ${cheapestOverall.vehicleType} at ₹${cheapestOverall.estimatedFare}), ` +
      `saving **₹${summary.estimatedSavings}** vs ${summary.highestPlatform} (₹${summary.highestFare}). ` +
      `AI Recommendation: **${recommendation?.action ?? 'Book Now'}** — expected average fare in 10–30 min is ₹${p10?.expectedFare ?? summary.averageFare} → ₹${p30?.expectedFare ?? summary.averageFare}. ${disclaimer}`;
  }

  return {
    reply,
    source: 'analytical-fallback',
    notice,
  };
}

export async function chatWithFareAssistant(
  question: string,
  history: ChatMessage[],
  comparison?: FareComparisonResponse,
  targetFare?: number,
  recommendation?: AIRecommendation
): Promise<{
  reply: string;
  source: 'gemini' | 'analytical-fallback';
  notice?: string;
}> {
  const ai = getGeminiClient();

  if (!ai) {
    return buildChatAnalyticalFallback(
      question,
      comparison,
      targetFare,
      recommendation,
      'Showing data-backed simulated fare guidance (live Gemini API key not configured).'
    );
  }

  const contextBlock = comparison
    ? {
        route: {
          pickup: comparison.route.pickup.name,
          drop: comparison.route.drop.name,
          roadDistanceKm: comparison.route.roadDistanceKm,
          straightLineKm: comparison.route.straightLineKm,
          distanceSource: comparison.route.distanceSource,
          durationMin: comparison.route.estimatedDurationMin,
          traffic: comparison.route.trafficLevel,
          scenario: comparison.route.scenario,
          rideMode: comparison.route.rideMode,
          timeWindowLabel: comparison.route.timeWindowLabel,
          surgePeriod: comparison.route.surgeConfig.activePeriod,
        },
        targetBudgetINR: targetFare ?? null,
        summary: comparison.summary,
        platformBenchmarks: comparison.platformBenchmarks.map((f) => ({
          platform: f.platformName,
          vehicle: f.vehicleType,
          category: f.categoryLabel,
          fareINR: f.estimatedFare,
          etaMin: f.arrivalMinutes,
          surge: f.surgeMultiplier,
          reliability: f.reliabilityScore,
          cancellationRisk: f.cancellationRisk,
        })),
        fares: comparison.fares.map((f) => ({
          platform: f.platformName,
          vehicle: f.vehicleType,
          category: f.categoryLabel,
          fareINR: f.estimatedFare,
          baseFare: f.baseFare,
          perKmRate: f.perKmRate,
          etaMin: f.arrivalMinutes,
          surge: f.surgeMultiplier,
          reliability: f.reliabilityScore,
        })),
        predictions: comparison.farePredictions,
        predictionMeta: comparison.predictionMeta,
        alternativePickups: comparison.alternativePickups,
        currentRecommendation: recommendation
          ? {
              action: recommendation.action,
              recommendedPlatform: recommendation.recommendedPlatform,
              recommendedVehicle: recommendation.recommendedVehicle,
              estimatedFare: recommendation.estimatedFare,
              potentialSavings: recommendation.potentialSavings,
              reasoning: recommendation.reasoning,
            }
          : null,
        simulatedNotice: comparison.simulatedNotice,
      }
    : null;

  const formattedHistory = history
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const prompt = [
    contextBlock
      ? `ACTIVE ROUTE, SIMULATED FARES, PREDICTIONS & RECOMMENDATION CONTEXT:\n${JSON.stringify(contextBlock)}`
      : 'No active route selected yet.',
    formattedHistory ? `RECENT CONVERSATION:\n${formattedHistory}` : '',
    `USER QUESTION: ${question}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  let lastNotice: string | undefined;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'You are the CabFare AI Ride Assistant, a concise and practical urban cab-booking advisor. Ground every number strictly in the provided simulated fare, road distance, travel time, price prediction (+10m/+20m/+30m), and AI recommendation context—never invent or claim live provider prices. Always clearly note that figures are simulated or estimated fares. Use INR (₹) amounts, keep answers crisp, actionable, and under 140 words.',
        },
      });

      const text = response.text?.trim();
      if (text) {
        return { reply: text, source: 'gemini' };
      }
      lastNotice = 'Gemini returned an empty response; displaying analytical summary.';
      break;
    } catch (error) {
      const info = getFriendlyGeminiError(error);
      lastNotice = info.message;
      if (info.isNonRetryable) {
        break;
      }
      await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
    }
  }

  return buildChatAnalyticalFallback(
    question,
    comparison,
    targetFare,
    recommendation,
    lastNotice
  );
}
