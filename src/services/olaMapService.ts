const FUNCTION_NAME = 'ola-maps-proxy';

function getSupabaseConfig() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  return { supabaseUrl, anonKey };
}

async function callProxy(params: Record<string, string>) {
  const { supabaseUrl, anonKey } = getSupabaseConfig();
  const queryString = new URLSearchParams(params).toString();

  const res = await fetch(`${supabaseUrl}/functions/v1/${FUNCTION_NAME}?${queryString}`, {
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ola Maps proxy error [${res.status}]: ${text}`);
  }

  return res.json();
}

export interface OlaSuggestion {
  place_id: string;
  placeName: string;
  placeAddress: string;
  type: string;
  latitude?: number;
  longitude?: number;
  cityName?: string;
  areaName?: string;
}

export interface OlaReverseGeocodeResult {
  formatted_address: string;
  /** Structured Indian delivery address: {Building/Street}, {Area}, {City}, {State} - {Pincode} */
  structuredAddress: string;
  city: string;
  area: string;
  locality: string;
  subLocality: string;
  neighborhood: string;
  street: string;
  premise: string;
  district: string;
  state: string;
  pincode: string;
  lat: number;
  lng: number;
}

/** Build a structured Indian delivery address from components.
 *  Priority order: street → neighborhood → sub_locality → area → city → pincode
 *  If street-level names like "Azad Colony" or "2nd Cross" exist in
 *  street/neighborhood, they MUST appear at the start of the string. */
function buildStructuredAddress(parts: {
  premise?: string;
  street?: string;
  neighborhood?: string;
  subLocality?: string;
  area?: string;
  locality?: string;
  city?: string;
  state?: string;
  pincode?: string;
}): string {
  const segments: string[] = [];
  const added = new Set<string>();

  const push = (val?: string) => {
    if (val && !added.has(val)) { segments.push(val); added.add(val); }
  };

  // 1. Street / premise (most granular — cross roads, house numbers)
  if (parts.premise && parts.street) {
    push(`${parts.premise}, ${parts.street}`);
  } else {
    push(parts.street || parts.premise);
  }

  // 2. Neighborhood (colony names, cross roads when not in street)
  push(parts.neighborhood);

  // 3. Sub-locality / area
  push(parts.subLocality || parts.area || parts.locality);

  // 4. City
  push(parts.city);

  // 5. State - Pincode
  if (parts.state && parts.pincode) {
    push(`${parts.state} - ${parts.pincode}`);
  } else {
    push(parts.state || parts.pincode);
  }

  return segments.join(', ') || 'Unknown location';
}

export async function olaAutosuggest(
  query: string,
  location?: { lat: number; lng: number },
  radiusMeters = 50000
): Promise<OlaSuggestion[]> {
  const params: Record<string, string> = { action: 'autocomplete', query };
  if (location) {
    params.location = `${location.lat},${location.lng}`;
    params.radius = radiusMeters.toString();
  }

  const json = await callProxy(params);
  const predictions = json.predictions || [];

  return predictions.map((p: any) => {
    const loc = p.geometry?.location;
    // Extract city and area from address components
    const components = p.structured_formatting || {};
    
    return {
      place_id: p.place_id || '',
      placeName: p.structured_formatting?.main_text || p.description?.split(',')[0] || '',
      placeAddress: p.description || '',
      type: p.types?.[0] || 'UNKNOWN',
      latitude: loc?.lat ? Number(loc.lat) : undefined,
      longitude: loc?.lng ? Number(loc.lng) : undefined,
      cityName: '',
      areaName: components.secondary_text || '',
    };
  });
}

export async function olaPlaceDetail(
  placeId: string
): Promise<{ lat: number; lng: number; address: string; city: string; area: string } | null> {
  try {
    const json = await callProxy({ action: 'place-detail', place_id: placeId });

    const result = json.result;
    if (!result) return null;

    const loc = result.geometry?.location;
    if (!loc?.lat || !loc?.lng) return null;

    // Extract city and area from address_components
    let city = '';
    let area = '';
    const components: any[] = result.address_components || [];
    for (const comp of components) {
      const types: string[] = comp.types || [];
      if (types.includes('locality')) city = comp.long_name || '';
      if (types.includes('sublocality') || types.includes('sublocality_level_1')) area = comp.long_name || '';
    }

    return {
      lat: Number(loc.lat),
      lng: Number(loc.lng),
      address: result.formatted_address || '',
      city,
      area,
    };
  } catch {
    return null;
  }
}

export async function olaReverseGeocode(
  lat: number,
  lng: number
): Promise<OlaReverseGeocodeResult> {
  const json = await callProxy({
    action: 'reverse-geocode',
    lat: lat.toString(),
    lng: lng.toString(),
  });

  const results: any[] = json.results || [];

  // Merge address components from ALL results to get maximum detail.
  // Earlier results tend to be more specific (street-level), later ones broader.
  let city = '';
  let area = '';
  let locality = '';
  let subLocality = '';
  let neighborhood = '';
  let street = '';
  let premise = '';
  let district = '';
  let state = '';
  let pincode = '';

  for (const result of results) {
    const components: any[] = result.address_components || [];
    for (const comp of components) {
      const types: string[] = comp.types || [];
      const name: string = comp.long_name || '';
      if (!name) continue;

      // Only fill if not already set — first (most specific) result wins
      if (!city && types.includes('locality')) city = name;
      if (!area && (types.includes('sublocality_level_1') || types.includes('sublocality'))) area = name;
      // Neighborhood is a separate field — colony names, cross roads
      if (!neighborhood && types.includes('neighborhood')) neighborhood = name;
      if (!subLocality && (types.includes('sublocality_level_2') || types.includes('sublocality_level_3'))) {
        subLocality = name;
      }
      if (!street && (types.includes('route') || types.includes('street_address'))) street = name;
      if (!premise && (types.includes('premise') || types.includes('street_number'))) premise = name;
      if (!district && types.includes('administrative_area_level_2')) district = name;
      if (!state && types.includes('administrative_area_level_1')) state = name;
      if (!pincode && types.includes('postal_code')) pincode = name;
      // Also check point_of_interest / establishment as landmark fallback for street
      if (!street && !neighborhood && (types.includes('point_of_interest') || types.includes('establishment'))) {
        neighborhood = name;
      }
    }
  }

  // Backfill: if no neighborhood but subLocality has it, swap
  if (!locality) locality = neighborhood || subLocality || area;

  // Pick the most detailed formatted_address from ALL results (longest one typically has most detail)
  let bestFormattedAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  let longestLen = 0;
  for (const result of results) {
    const fa: string = result.formatted_address || '';
    if (fa.length > longestLen) {
      longestLen = fa.length;
      bestFormattedAddress = fa;
    }
  }

  const resolvedCity = city || district || state || 'Unknown';

  const structured = buildStructuredAddress({
    premise,
    street,
    neighborhood,
    subLocality,
    area,
    locality,
    city: resolvedCity,
    state,
    pincode,
  });

  // If our structured address is too sparse (only city + state), prefer the API's formatted_address
  const hasStreetDetail = !!(premise || street || neighborhood || subLocality);
  const finalAddress = hasStreetDetail ? structured : bestFormattedAddress;

  return {
    formatted_address: bestFormattedAddress,
    structuredAddress: finalAddress,
    city: resolvedCity,
    area,
    locality,
    subLocality,
    neighborhood,
    street,
    premise,
    district,
    state,
    pincode,
    lat,
    lng,
  };
}
