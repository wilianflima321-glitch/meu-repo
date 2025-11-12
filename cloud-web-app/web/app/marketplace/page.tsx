'use client';

import { useTranslation } from 'react-i18next';

export default function MarketplacePage() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('marketplace.title')}</h1>
      <p>{t('marketplace.description')}</p>
      <ul>
        <li>Unreal VR Plugin</li>
        <li>AI Code Assistant</li>
        <li>VR Preview Tool</li>
      </ul>
    </div>
  );
}