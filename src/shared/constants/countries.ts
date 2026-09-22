/**
 * Country list for the phone field, mirroring the default list in
 * ../qayema/resources/views/components/ui/phone.blade.php so the dashboard and
 * the onboarding wizard offer exactly the same options. `code` is the ISO-3166
 * alpha-2 value the API stores in `restaurants.country_code`.
 */
export type Country = {
  code: string
  label: string
  flag: string
  dial: string
}

export const COUNTRIES: Country[] = [
  { code: 'LB', label: 'Lebanon', flag: '🇱🇧', dial: '+961' },
  { code: 'AE', label: 'United Arab Emirates', flag: '🇦🇪', dial: '+971' },
  { code: 'SA', label: 'Saudi Arabia', flag: '🇸🇦', dial: '+966' },
  { code: 'EG', label: 'Egypt', flag: '🇪🇬', dial: '+20' },
  { code: 'JO', label: 'Jordan', flag: '🇯🇴', dial: '+962' },
  { code: 'KW', label: 'Kuwait', flag: '🇰🇼', dial: '+965' },
  { code: 'QA', label: 'Qatar', flag: '🇶🇦', dial: '+974' },
  { code: 'BH', label: 'Bahrain', flag: '🇧🇭', dial: '+973' },
  { code: 'OM', label: 'Oman', flag: '🇴🇲', dial: '+968' },
  { code: 'SY', label: 'Syria', flag: '🇸🇾', dial: '+963' },
  { code: 'IQ', label: 'Iraq', flag: '🇮🇶', dial: '+964' },
  { code: 'TR', label: 'Turkey', flag: '🇹🇷', dial: '+90' },
  { code: 'US', label: 'United States', flag: '🇺🇸', dial: '+1' },
  { code: 'GB', label: 'United Kingdom', flag: '🇬🇧', dial: '+44' },
  { code: 'FR', label: 'France', flag: '🇫🇷', dial: '+33' },
  { code: 'DE', label: 'Germany', flag: '🇩🇪', dial: '+49' },
  { code: 'IT', label: 'Italy', flag: '🇮🇹', dial: '+39' },
  { code: 'ES', label: 'Spain', flag: '🇪🇸', dial: '+34' },
  { code: 'GR', label: 'Greece', flag: '🇬🇷', dial: '+30' },
  { code: 'NL', label: 'Netherlands', flag: '🇳🇱', dial: '+31' },
  { code: 'PT', label: 'Portugal', flag: '🇵🇹', dial: '+351' },
  { code: 'RU', label: 'Russia', flag: '🇷🇺', dial: '+7' },
  { code: 'CN', label: 'China', flag: '🇨🇳', dial: '+86' },
  { code: 'JP', label: 'Japan', flag: '🇯🇵', dial: '+81' },
  { code: 'KR', label: 'South Korea', flag: '🇰🇷', dial: '+82' },
  { code: 'IN', label: 'India', flag: '🇮🇳', dial: '+91' },
  { code: 'AU', label: 'Australia', flag: '🇦🇺', dial: '+61' },
  { code: 'CA', label: 'Canada', flag: '🇨🇦', dial: '+1' },
]

/** The product is Lebanon-first, matching the backend default. */
export const DEFAULT_COUNTRY = 'LB'

export const findCountry = (code: string): Country | undefined =>
  COUNTRIES.find((country) => country.code === code)
