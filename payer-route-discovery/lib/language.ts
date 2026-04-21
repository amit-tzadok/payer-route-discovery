// Pure constants/types — safe to import in both server and client code

export const LANGUAGES = [
  { code: 'en', label: 'EN', full: 'English'    },
  { code: 'es', label: 'ES', full: 'Español'    },
  { code: 'fr', label: 'FR', full: 'Français'   },
  { code: 'zh', label: 'ZH', full: '中文'        },
  { code: 'pt', label: 'PT', full: 'Português'  },
] as const

export type LanguageCode = typeof LANGUAGES[number]['code']

export const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  zh: 'Mandarin Chinese',
  pt: 'Portuguese',
}
