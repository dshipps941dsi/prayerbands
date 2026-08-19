// Structured location input for band registration.
//
// Free-text city/state/country produced "Syracus" and "NY " — Nominatim
// resolved neither, the row saved with null coordinates, and the stop silently
// vanished from the journey map. With a valid country and (where it applies) a
// valid subdivision, the geocode fallback chain can always land a pin: a
// misspelled city costs precision, never the pin.
//
// Centroids below are approximate — they place a marker in the right state or
// province, which is all a journey map needs when the city can't be resolved.

export type Subdivision = { code: string; name: string; lat: number; lng: number }

// ISO 3166-1 country list, packed to keep this file readable.
const COUNTRY_DATA =
  'AF|Afghanistan;AL|Albania;DZ|Algeria;AD|Andorra;AO|Angola;AG|Antigua and Barbuda;AR|Argentina;AM|Armenia;AU|Australia;AT|Austria;AZ|Azerbaijan;BS|Bahamas;BH|Bahrain;BD|Bangladesh;BB|Barbados;BY|Belarus;BE|Belgium;BZ|Belize;BJ|Benin;BT|Bhutan;BO|Bolivia;BA|Bosnia and Herzegovina;BW|Botswana;BR|Brazil;BN|Brunei;BG|Bulgaria;BF|Burkina Faso;BI|Burundi;KH|Cambodia;CM|Cameroon;CA|Canada;CV|Cape Verde;CF|Central African Republic;TD|Chad;CL|Chile;CN|China;CO|Colombia;KM|Comoros;CG|Congo;CD|Congo (DRC);CR|Costa Rica;CI|Côte d’Ivoire;HR|Croatia;CU|Cuba;CY|Cyprus;CZ|Czechia;DK|Denmark;DJ|Djibouti;DM|Dominica;DO|Dominican Republic;EC|Ecuador;EG|Egypt;SV|El Salvador;GQ|Equatorial Guinea;ER|Eritrea;EE|Estonia;SZ|Eswatini;ET|Ethiopia;FJ|Fiji;FI|Finland;FR|France;GA|Gabon;GM|Gambia;GE|Georgia;DE|Germany;GH|Ghana;GR|Greece;GD|Grenada;GT|Guatemala;GN|Guinea;GW|Guinea-Bissau;GY|Guyana;HT|Haiti;HN|Honduras;HU|Hungary;IS|Iceland;IN|India;ID|Indonesia;IR|Iran;IQ|Iraq;IE|Ireland;IL|Israel;IT|Italy;JM|Jamaica;JP|Japan;JO|Jordan;KZ|Kazakhstan;KE|Kenya;KI|Kiribati;KW|Kuwait;KG|Kyrgyzstan;LA|Laos;LV|Latvia;LB|Lebanon;LS|Lesotho;LR|Liberia;LY|Libya;LI|Liechtenstein;LT|Lithuania;LU|Luxembourg;MG|Madagascar;MW|Malawi;MY|Malaysia;MV|Maldives;ML|Mali;MT|Malta;MH|Marshall Islands;MR|Mauritania;MU|Mauritius;MX|Mexico;FM|Micronesia;MD|Moldova;MC|Monaco;MN|Mongolia;ME|Montenegro;MA|Morocco;MZ|Mozambique;MM|Myanmar;NA|Namibia;NR|Nauru;NP|Nepal;NL|Netherlands;NZ|New Zealand;NI|Nicaragua;NE|Niger;NG|Nigeria;KP|North Korea;MK|North Macedonia;NO|Norway;OM|Oman;PK|Pakistan;PW|Palau;PS|Palestine;PA|Panama;PG|Papua New Guinea;PY|Paraguay;PE|Peru;PH|Philippines;PL|Poland;PT|Portugal;QA|Qatar;RO|Romania;RU|Russia;RW|Rwanda;KN|Saint Kitts and Nevis;LC|Saint Lucia;VC|Saint Vincent and the Grenadines;WS|Samoa;SM|San Marino;ST|São Tomé and Príncipe;SA|Saudi Arabia;SN|Senegal;RS|Serbia;SC|Seychelles;SL|Sierra Leone;SG|Singapore;SK|Slovakia;SI|Slovenia;SB|Solomon Islands;SO|Somalia;ZA|South Africa;KR|South Korea;SS|South Sudan;ES|Spain;LK|Sri Lanka;SD|Sudan;SR|Suriname;SE|Sweden;CH|Switzerland;SY|Syria;TW|Taiwan;TJ|Tajikistan;TZ|Tanzania;TH|Thailand;TL|Timor-Leste;TG|Togo;TO|Tonga;TT|Trinidad and Tobago;TN|Tunisia;TR|Türkiye;TM|Turkmenistan;TV|Tuvalu;UG|Uganda;UA|Ukraine;AE|United Arab Emirates;GB|United Kingdom;US|United States;UY|Uruguay;UZ|Uzbekistan;VU|Vanuatu;VA|Vatican City;VE|Venezuela;VN|Vietnam;YE|Yemen;ZM|Zambia;ZW|Zimbabwe'

export const COUNTRIES: { code: string; name: string }[] = COUNTRY_DATA
  .split(';')
  .map(entry => {
    const [code, name] = entry.split('|')
    return { code, name }
  })

// Registration defaults here — most bands start domestic, and it saves the
// person scrolling past two hundred options.
export const DEFAULT_COUNTRY = 'United States'

const US: Subdivision[] = [
  ['AL', 'Alabama', 32.8, -86.8], ['AK', 'Alaska', 64.0, -152.0], ['AZ', 'Arizona', 34.3, -111.7],
  ['AR', 'Arkansas', 34.9, -92.4], ['CA', 'California', 37.2, -119.5], ['CO', 'Colorado', 39.0, -105.5],
  ['CT', 'Connecticut', 41.6, -72.7], ['DE', 'Delaware', 39.0, -75.5], ['DC', 'District of Columbia', 38.9, -77.0],
  ['FL', 'Florida', 28.6, -82.4], ['GA', 'Georgia', 32.6, -83.4], ['HI', 'Hawaii', 20.3, -156.4],
  ['ID', 'Idaho', 44.4, -114.6], ['IL', 'Illinois', 40.0, -89.2], ['IN', 'Indiana', 39.9, -86.3],
  ['IA', 'Iowa', 42.0, -93.5], ['KS', 'Kansas', 38.5, -98.4], ['KY', 'Kentucky', 37.5, -85.3],
  ['LA', 'Louisiana', 31.0, -92.0], ['ME', 'Maine', 45.4, -69.2], ['MD', 'Maryland', 39.0, -76.8],
  ['MA', 'Massachusetts', 42.3, -71.8], ['MI', 'Michigan', 44.3, -85.4], ['MN', 'Minnesota', 46.3, -94.3],
  ['MS', 'Mississippi', 32.7, -89.7], ['MO', 'Missouri', 38.4, -92.5], ['MT', 'Montana', 47.0, -109.6],
  ['NE', 'Nebraska', 41.5, -99.8], ['NV', 'Nevada', 39.3, -116.6], ['NH', 'New Hampshire', 43.7, -71.6],
  ['NJ', 'New Jersey', 40.2, -74.7], ['NM', 'New Mexico', 34.4, -106.1], ['NY', 'New York', 42.9, -75.5],
  ['NC', 'North Carolina', 35.5, -79.4], ['ND', 'North Dakota', 47.4, -100.5], ['OH', 'Ohio', 40.3, -82.8],
  ['OK', 'Oklahoma', 35.6, -97.5], ['OR', 'Oregon', 43.9, -120.6], ['PA', 'Pennsylvania', 40.9, -77.8],
  ['RI', 'Rhode Island', 41.7, -71.6], ['SC', 'South Carolina', 33.9, -80.9], ['SD', 'South Dakota', 44.4, -100.2],
  ['TN', 'Tennessee', 35.8, -86.4], ['TX', 'Texas', 31.5, -99.3], ['UT', 'Utah', 39.3, -111.7],
  ['VT', 'Vermont', 44.1, -72.7], ['VA', 'Virginia', 37.5, -78.9], ['WA', 'Washington', 47.4, -120.5],
  ['WV', 'West Virginia', 38.6, -80.6], ['WI', 'Wisconsin', 44.6, -89.7], ['WY', 'Wyoming', 43.0, -107.6],
].map(([code, name, lat, lng]) => ({ code: code as string, name: name as string, lat: lat as number, lng: lng as number }))

const CA: Subdivision[] = [
  ['AB', 'Alberta', 54.0, -115.0], ['BC', 'British Columbia', 54.0, -125.0], ['MB', 'Manitoba', 55.0, -97.0],
  ['NB', 'New Brunswick', 46.5, -66.0], ['NL', 'Newfoundland and Labrador', 53.0, -60.0],
  ['NS', 'Nova Scotia', 45.0, -63.0], ['NT', 'Northwest Territories', 64.5, -119.0], ['NU', 'Nunavut', 70.0, -90.0],
  ['ON', 'Ontario', 50.0, -85.0], ['PE', 'Prince Edward Island', 46.4, -63.2], ['QC', 'Quebec', 52.0, -72.0],
  ['SK', 'Saskatchewan', 54.0, -106.0], ['YT', 'Yukon', 63.0, -135.0],
].map(([code, name, lat, lng]) => ({ code: code as string, name: name as string, lat: lat as number, lng: lng as number }))

const AU: Subdivision[] = [
  ['NSW', 'New South Wales', -32.0, 147.0], ['VIC', 'Victoria', -37.0, 144.0], ['QLD', 'Queensland', -22.0, 144.0],
  ['SA', 'South Australia', -30.0, 135.0], ['WA', 'Western Australia', -25.0, 122.0], ['TAS', 'Tasmania', -42.0, 147.0],
  ['NT', 'Northern Territory', -19.0, 133.0], ['ACT', 'Australian Capital Territory', -35.5, 149.0],
].map(([code, name, lat, lng]) => ({ code: code as string, name: name as string, lat: lat as number, lng: lng as number }))

// Only countries whose first-level divisions people actually name in an address.
// Everywhere else gets an optional free-text region, because "state" does not
// translate — France has départements, Japan prefectures, Kenya counties.
export const SUBDIVISIONS: Record<string, { label: string; items: Subdivision[] }> = {
  'United States': { label: 'State', items: US },
  Canada: { label: 'Province', items: CA },
  Australia: { label: 'State', items: AU },
}

export function subdivisionsFor(country: string) {
  return SUBDIVISIONS[country] ?? null
}

// Offline centroid for a country's subdivision. Lets a registration resolve to a
// pin with no network call at all, so the map never depends on a rate-limited
// third party for the common case.
export function subdivisionCentroid(country: string, state: string): { lat: number; lng: number } | null {
  const set = SUBDIVISIONS[country]
  if (!set || !state) return null
  const needle = state.trim().toLowerCase()
  const hit = set.items.find(s => s.code.toLowerCase() === needle || s.name.toLowerCase() === needle)
  return hit ? { lat: hit.lat, lng: hit.lng } : null
}
