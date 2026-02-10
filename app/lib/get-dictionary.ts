import * as en from './dictionaries/en.json';
import * as nl from './dictionaries/nl.json';
import * as es from './dictionaries/es.json';
import * as ru from './dictionaries/ru.json';
import * as zh from './dictionaries/zh.json';
import * as de from './dictionaries/de.json';
import * as pl from './dictionaries/pl.json';
import * as fr from './dictionaries/fr.json';
import * as ar from './dictionaries/ar.json';
import * as hi from './dictionaries/hi.json';
import * as bn from './dictionaries/bn.json';
import * as pt from './dictionaries/pt.json';
import * as ur from './dictionaries/ur.json';

const dictionaries = {
  en: () => en,
  nl: () => nl,
  es: () => es,
  ru: () => ru,
  zh: () => zh,
  de: () => de,
  pl: () => pl,
  fr: () => fr,
  ar: () => ar,
  hi: () => hi,
  bn: () => bn,
  pt: () => pt,
  ur: () => ur,
};

export type Dictionary = typeof en;
export type Locale = keyof typeof dictionaries;

export const getDictionary = (locale: Locale): Dictionary => {
    const dict = dictionaries[locale] ? dictionaries[locale]() : dictionaries.en();
    return dict as Dictionary;
};

// RTL language detection
export const isRTLLocale = (locale: Locale): boolean => {
  return ['ar', 'ur'].includes(locale);
};
