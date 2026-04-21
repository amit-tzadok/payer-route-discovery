'use client'

import { createContext, useContext } from 'react'
import type { LanguageCode } from './language'

export const LanguageContext = createContext<LanguageCode>('en')

export function useLanguage(): LanguageCode {
  return useContext(LanguageContext)
}
