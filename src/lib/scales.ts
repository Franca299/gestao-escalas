import { parseISO, startOfDay, differenceInDays, isWithinInterval } from 'date-fns';
import { Ala, Absence, Military } from '../types';

// Esquema 2x6: cada ala trabalha 2 dias consecutivos e folga 6.
// Ciclo de 8 dias: AA BB CC DD
// Âncora: 02/05/2026 — Ala A começa aqui conforme registro dos militares.
export const ALA_BASE_DATE = new Date(2026, 4, 2); // 02/05/2026

export const getAlaOnDuty = (date: Date): Ala => {
  const target = startOfDay(date);
  const base   = startOfDay(ALA_BASE_DATE);
  const diff   = differenceInDays(target, base);

  // Para datas antes da âncora, calculamos de trás pra frente
  // normalizamos para sempre positivo com módulo
  const cycle  = ((diff % 8) + 8) % 8; // 0..7
  const alas: Ala[] = ['A', 'A', 'B', 'B', 'C', 'C', 'D', 'D'];
  return alas[cycle];
};

/** Verifica se uma ausência está ativa em uma data específica */
export const isAbsenceActive = (absence: Absence, date: Date): boolean => {
  const target = startOfDay(date);
  try {
    const start = startOfDay(parseISO(absence.startDate));
    const end   = startOfDay(parseISO(absence.endDate));
    return isWithinInterval(target, { start, end });
  } catch {
    return false;
  }
};

/** Verifica se um militar teria serviço em uma data (sem considerar ausências) */
export const isMilitaryScheduled = (m: Military, date: Date): boolean => {
  if (!m.startCycleDate && m.regime !== 'Ala') return false;

  const targetDate = startOfDay(date);

  if (m.regime === 'Ala') {
    const alaOnDuty = getAlaOnDuty(date);
    return m.ala === alaOnDuty;
  }

  // Regimes especiais com data de início do ciclo
  const startDate = startOfDay(parseISO(m.startCycleDate!));
  if (targetDate < startDate) return false;

  const diffDays = differenceInDays(targetDate, startDate);

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

/** Verifica se o militar está de serviço (escalado E sem ausência ativa) */
export const isMilitaryOnDuty = (m: Military, date: Date, absences: Absence[] = []): boolean => {
  if (!isMilitaryScheduled(m, date)) return false;

  // Verificar se há ausência ativa na data
  const hasActiveAbsence = absences.some(abs => abs.militaryId === m.id && isAbsenceActive(abs, date));
  if (hasActiveAbsence) return false;

  return true;
};

/** Retorna militares de serviço em uma data */
export const getMilitariesOnDuty = (militaries: Military[], date: Date, allAbsences: Absence[] = []): Military[] => {
  return militaries.filter(m => isMilitaryOnDuty(m, date, allAbsences));
};

/** Retorna militares de folga (escalados para outra ala OU sem ausência ativa nessa data) */
export const getMilitariesOffDuty = (militaries: Military[], date: Date, allAbsences: Absence[] = []): Military[] => {
  return militaries.filter(m => {
    // Não contar inativos definitivos
    if (m.status === 'Inativo') return false;
    // Está de folga se NÃO está de serviço nessa data
    return !isMilitaryOnDuty(m, date, allAbsences);
  });
};
