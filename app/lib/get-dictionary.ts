import * as en from './dictionaries/en.json';
import * as nl from './dictionaries/nl.json';
import * as es from './dictionaries/es.json';
import * as ru from './dictionaries/ru.json';
import * as zh from './dictionaries/zh.json';

const dictionaries = {
  en: () => en,
  nl: () => nl,
  es: () => es,
  ru: () => ru,
  zh: () => zh,
};

export type Dictionary = typeof en;
export type Locale = keyof typeof dictionaries;

export const getDictionary = (locale: Locale): Dictionary => {
    const dict = dictionaries[locale] ? dictionaries[locale]() : dictionaries.en();
    // Since we are not doing dynamic imports, we can just cast it.
    // In a real-world app with dynamic imports, you'd have to handle promises.
    return dict as Dictionary;
};
