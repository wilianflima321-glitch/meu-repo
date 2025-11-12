'use client'
import { useTranslation } from 'react-i18next'

const LanguageSwitcher = () => {
  const { i18n } = useTranslation()

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
  }

  return (
    <div>
      <button onClick={() => changeLanguage('en')}>EN</button>
      <button onClick={() => changeLanguage('zh')}>ZH</button>
      <button onClick={() => changeLanguage('ja')}>JA</button>
      <button onClick={() => changeLanguage('es')}>ES</button>
      <button onClick={() => changeLanguage('fr')}>FR</button>
      <button onClick={() => changeLanguage('pt-BR')}>PT</button>
    </div>
  )
}

export default LanguageSwitcher
