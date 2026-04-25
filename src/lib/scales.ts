import { format, parseISO, startOfDay, differenceInDays } from 'date-fns';
import { Ala, Military } from '../types';

export const getAlaOnDuty = (date: Date): Ala => {
  // Data âncora arbitrária para rotação (01/01/2023 foi um ponto de partida conhecido)
  const baseDate = new Date(2023, 0, 1);
  const diffTime = Math.abs(startOfDay(date).getTime() - startOfDay(baseDate).getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const alas: Ala[] = ['A', 'B', 'C', 'D'];
  return alas[diffDays % 4];
};

export const isMilitaryOnDuty = (m: Military, date: Date): boolean => {
  if (m.status === 'Inativo') return false;
  if (!m.startCycleDate) return false;

  const targetDate = startOfDay(date);
  const startDate = startOfDay(parseISO(m.startCycleDate));
  
  // Regra: Não mostrar serviço em datas anteriores à data de início do ciclo/ala atual
  if (targetDate < startDate) return false;

  const diffDays = differenceInDays(targetDate, startDate);

  if (m.regime === 'Ala') {
    const alaOnDuty = getAlaOnDuty(date);
    return m.ala === alaOnDuty;
  }

  // Regimes Especiais baseados em ciclos a partir da data de início
  // 1x3: 1 de serviço, 3 de folga (Ciclo de 4)
  if (m.regime === '1x3') return diffDays % 4 === 0;
  // 2x6: 2 de serviço, 6 de folga (Ciclo de 8)
  if (m.regime === '2x6') return diffDays % 8 === 0 || diffDays % 8 === 1;
  // 3x9: 3 de serviço, 9 de folga (Ciclo de 12)
  if (m.regime === '3x9') return diffDays % 12 >= 0 && diffDays % 12 <= 2;
  // 4x12: 4 de serviço, 12 de folga (Ciclo de 16)
  if (m.regime === '4x12') return diffDays % 16 >= 0 && diffDays % 16 <= 3;

  return false;
};

export const getMilitariesOnDuty = (militaries: Military[], date: Date): Military[] => {
  return militaries.filter(m => isMilitaryOnDuty(m, date));
};
