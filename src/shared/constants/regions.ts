export const GCC_COUNTRIES = ['SA', 'AE', 'KW', 'QA', 'BH', 'OM'] as const;
export type GccCountry = (typeof GCC_COUNTRIES)[number];

/** Free-text country names that map to GCC ISO-2 codes (tolerates un-normalised supplier.country values) */
export const GCC_NAME_ALIASES: Record<string, GccCountry> = {
  'Saudi Arabia': 'SA',
  'المملكة العربية السعودية': 'SA',
  UAE: 'AE',
  'United Arab Emirates': 'AE',
  'الإمارات العربية المتحدة': 'AE',
  Kuwait: 'KW',
  الكويت: 'KW',
  Qatar: 'QA',
  قطر: 'QA',
  Bahrain: 'BH',
  البحرين: 'BH',
  Oman: 'OM',
  عُمان: 'OM',
  عمان: 'OM',
};
