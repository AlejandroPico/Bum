import { lang } from './index';

/** abreviaturas de los rumbos (N, NE, E…) en cada idioma, empezando por el norte y en sentido horario */
const COMPASS: Record<string, string[]> = {
  es: ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'],
  ca: ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'],
  en: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'],
  fr: ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'],
  de: ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'],
  pt: ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'],
  it: ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'],
  ru: ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'],
  zh: ['北', '东北', '东', '东南', '南', '西南', '西', '西北'],
  ja: ['北', '北東', '東', '南東', '南', '南西', '西', '北西'],
  ko: ['북', '북동', '동', '남동', '남', '남서', '서', '북서'],
};
export const compass = (): string[] => COMPASS[lang] ?? COMPASS.es;
/** rumbo (grados desde el norte) → abreviatura en el idioma activo */
export const compassName = (deg: number) => compass()[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
