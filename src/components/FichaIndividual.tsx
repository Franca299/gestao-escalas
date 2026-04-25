import React, { useState, useEffect } from 'react';
import { Download, History, User, Info, Flame } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { Military, Absence } from '../types';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query, collectionGroup } from 'firebase/firestore';
import { parseISO, startOfDay, isWithinInterval, differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Emojis únicos por posto/índice — sem fotos externas
const MILITARY_EMOJIS = ['🧑‍🚒', '👨‍🚒', '🚒', '🔥', '🛡️', '⛑️', '🚑', '🪖', '🏅', '🎖️', '🔱', '⚜️', '🦺', '🚨', '🧯'];

function getMilitaryEmoji(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return MILITARY_EMOJIS[Math.abs(hash) % MILITARY_EMOJIS.length];
}

const ALA_COLORS: Record<string, string> = {
  A: 'bg-red-600',
  B: 'bg-blue-600',
  C: 'bg-green-600',
  D: 'bg-orange-500',
};

export function FichaIndividual() {
  const [militaries, setMilitaries]       = useState<Military[]>([]);
  const [selectedMilitary, setSelected]   = useState<Military | null>(null);
  const [absences, setAbsences]           = useState<Absence[]>([]);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'militaries')), (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Military));
      setMilitaries(docs);
      if (docs.length > 0 && !selectedMilitary) setSelected(docs[0]);
      setLoading(false);
    }, (err) => {
      setLoading(false);
      handleFirestoreError(err, OperationType.LIST, 'militaries');
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(query(collectionGroup(db, 'absences')), (snap) => {
      setAbsences(snap.docs.map(d => ({ id: d.id, ...d.data() } as Absence)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'absences'));
    return unsub;
  }, []);

  const today = startOfDay(new Date());

  const milAbsences = selectedMilitary
    ? absences.filter(a => a.militaryId === selectedMilitary.id)
    : [];

  const activeAbsence = milAbsences.find(a => {
    try {
      const s = startOfDay(parseISO(a.startDate));
      const e = startOfDay(parseISO(a.endDate));
      return isWithinInterval(today, { start: s, end: e });
    } catch { return false; }
  });

  const totalAbsenceDays = milAbsences.reduce((sum, a) => {
    try { return sum + differenceInDays(parseISO(a.endDate), parseISO(a.startDate)) + 1; }
    catch { return sum; }
  }, 0);

  const isOnDutyToday = selectedMilitary?.status === 'Pronto' && !activeAbsence;

  if (loading) return <div className="flex justify-center p-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  if (!selectedMilitary) return (
    <div className="p-8 text-center bg-surface-container-low border border-outline-variant rounded-xl m-6">
      <p className="text-on-surface-variant italic">Nenhum militar encontrado. Cadastre na aba Militares.</p>
    </div>
  );

  const emoji = getMilitaryEmoji(selectedMilitary.id);

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">

      {/* Seletor */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container-low p-4 rounded-xl border border-outline-variant">
        <div className="flex items-center gap-3 text-on-surface">
          <User className="text-primary" />
          <span className="font-bold label-caps">Selecionar Militar:</span>
        </div>
        <select
          value={selectedMilitary.id}
          onChange={e => {
            const m = militaries.find(m => m.id === e.target.value);
            if (m) setSelected(m);
          }}
          className="w-full md:w-64 p-2 bg-white border border-outline-variant rounded-lg font-bold text-on-surface focus:ring-2 focus:ring-primary outline-none shadow-sm"
        >
          {militaries.map(m => (
            <option key={m.id} value={m.id}>{m.posto} {m.nome}</option>
          ))}
        </select>
      </div>

      {/* Profile Card */}
      <div className="bg-white border border-outline-variant rounded-lg p-8 shadow-sm flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
        <div className={cn("absolute left-0 top-0 bottom-0 w-2", ALA_COLORS[selectedMilitary.ala] ?? 'bg-primary')} />

        {/* Avatar emoji */}
        <div className="shrink-0">
          <div className="w-32 h-32 rounded-full border-4 border-surface-container-high bg-surface-container flex items-center justify-center shadow-sm text-6xl select-none">
            {emoji}
          </div>
        </div>

        <div className="flex-1 w-full">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-2">
            <div>
              <h1 className="text-3xl font-bold text-on-surface">{selectedMilitary.posto} {selectedMilitary.nome}</h1>
              <p className="text-xl font-bold text-secondary uppercase tracking-tight mt-1">
                {selectedMilitary.regime === 'Ala' ? 'Serviço Operacional' : `Regime ${selectedMilitary.regime}`}
              </p>
            </div>
            <span className={cn(
              "inline-flex items-center gap-2 px-3 py-1 label-caps border rounded-md text-sm",
              isOnDutyToday
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-red-50 text-red-700 border-red-200"
            )}>
              <span className={cn("w-2 h-2 rounded-full", isOnDutyToday ? "bg-green-500 animate-pulse" : "bg-red-500")} />
              {isOnDutyToday ? 'Ativo' : activeAbsence ? `Afastado (${activeAbsence.type})` : 'De Folga'}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8 pt-6 border-t border-outline-variant/30">
            <div>
              <span className="block label-caps text-on-surface-variant mb-1">Ala Atual</span>
              <span className="font-semibold text-on-surface">{selectedMilitary.ala ? `Ala ${selectedMilitary.ala}` : 'N/A'}</span>
            </div>
            <div>
              <span className="block label-caps text-on-surface-variant mb-1">Regime</span>
              <span className="font-semibold text-on-surface">{selectedMilitary.regime}</span>
            </div>
            <div>
              <span className="block label-caps text-on-surface-variant mb-1">Motorista</span>
              <span className="font-semibold text-on-surface">{selectedMilitary.isDriver ? '✅ Sim' : '—'}</span>
            </div>
            <div>
              <span className="block label-caps text-on-surface-variant mb-1">Início do Ciclo</span>
              <span className="font-semibold text-on-surface">{selectedMilitary.startCycleDate || '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs — dados reais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-outline-variant p-6 rounded-lg flex items-center gap-4 shadow-sm">
          <div className="w-14 h-14 rounded bg-amber-50 flex items-center justify-center text-4xl select-none">📋</div>
          <div>
            <h3 className="label-caps text-on-surface-variant leading-none mb-1">Afastamentos Registrados</h3>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-on-surface">{milAbsences.length}</span>
              <span className="text-xs text-on-surface-variant">registros</span>
            </div>
          </div>
        </div>
        <div className="bg-white border border-outline-variant p-6 rounded-lg flex items-center gap-4 shadow-sm">
          <div className="w-14 h-14 rounded bg-red-50 flex items-center justify-center text-4xl select-none">📅</div>
          <div>
            <h3 className="label-caps text-on-surface-variant leading-none mb-1">Dias de Afastamento</h3>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-red-600">{totalAbsenceDays}</span>
              <span className="text-xs text-on-surface-variant">dias total</span>
            </div>
          </div>
        </div>
        <div className="bg-white border border-outline-variant p-6 rounded-lg flex items-center gap-4 shadow-sm">
          <div className="w-14 h-14 rounded bg-blue-50 flex items-center justify-center text-4xl select-none">🚒</div>
          <div>
            <h3 className="label-caps text-on-surface-variant leading-none mb-1">Status Atual</h3>
            <span className={cn(
              "text-lg font-bold",
              isOnDutyToday ? "text-green-600" : "text-red-600"
            )}>
              {isOnDutyToday ? 'Ativo' : activeAbsence ? activeAbsence.type : 'De Folga'}
            </span>
          </div>
        </div>
      </div>

      {/* Histórico de Afastamentos */}
      <div className="bg-white border border-outline-variant rounded-lg shadow-sm overflow-hidden">
        <div className="p-6 border-b border-outline-variant flex items-center justify-between">
          <h2 className="text-lg flex items-center gap-2">
            <History size={20} className="text-on-surface-variant" />
            Histórico de Afastamentos
          </h2>
        </div>
        {milAbsences.length === 0 ? (
          <div className="p-10 text-center">
            <Info size={32} className="text-on-surface-variant/30 mx-auto mb-3" />
            <p className="text-on-surface-variant italic text-sm">Nenhum afastamento registrado para este militar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-high/30 border-b border-outline-variant label-caps text-on-surface-variant">
                  <th className="p-4 pl-6">Tipo</th>
                  <th className="p-4">Início</th>
                  <th className="p-4">Fim</th>
                  <th className="p-4 text-right pr-6">Duração</th>
                </tr>
              </thead>
              <tbody className="table-data divide-y divide-outline-variant">
                {milAbsences.map(a => {
                  let days = 0;
                  try { days = differenceInDays(parseISO(a.endDate), parseISO(a.startDate)) + 1; } catch {}
                  const isActive = !!activeAbsence && activeAbsence.id === a.id;
                  return (
                    <tr key={a.id} className={cn("hover:bg-surface-container-low transition-colors", isActive && "bg-amber-50")}>
                      <td className="p-4 pl-6 font-bold">
                        {a.type}
                        {isActive && <span className="ml-2 text-[9px] font-black label-caps bg-amber-200 text-amber-800 px-1.5 rounded">EM CURSO</span>}
                      </td>
                      <td className="p-4">{a.startDate}</td>
                      <td className="p-4">{a.endDate}</td>
                      <td className="p-4 text-right pr-6 text-on-surface-variant">{days} dias</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </motion.div>
  );
}
