export type Ala = 'A' | 'B' | 'C' | 'D';

export type Regime = 'Ala' | '1x3' | '2x6' | '3x9' | '4x12';

export type AbsenceType = 'Férias' | 'LESP' | 'Atestado' | 'Outros';

export interface Absence {
  id: string;
  type: AbsenceType;
  startDate: string; // ISO date
  endDate: string;   // ISO date
  militaryId: string;
}

export interface Military {
  id: string;
  nome: string;
  posto: string;
  ala: Ala;
  regime: Regime;
  startCycleDate?: string; // For 1x3, 2x6, etc.
  status: 'Pronto' | 'Inativo';
  isDriver?: boolean;
  absences: Absence[];
}
