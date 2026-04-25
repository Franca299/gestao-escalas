import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Info, Plus, UserSearch, Calendar as CalendarIcon, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import {
  format, startOfToday, startOfMonth, endOfMonth, eachDayOfInterval,
  getYear, getMonth, setMonth, setYear
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Military, Absence } from '../types';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query, collectionGroup } from 'firebase/firestore';
import { getMilitariesOnDuty, getMilitariesOffDuty, getAlaOnDuty } from '../lib/scales';

interface Need {
  id: string;
  date: Date;
  title: string;
  status: string;
  severity: 'error' | 'medium';
  role: string;
  crewSize: number;
}

const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const RANK_ORDER: Record<string, number> = {
  '1º SGT BM': 1, '2º SGT BM': 2, '3º SGT BM': 3, 'CB BM': 4, 'SD BM': 5, 'Sd BM': 5,
};
const getRankOrder = (posto: string): number => RANK_ORDER[posto] ?? 99;

export function PlantoesExtras() {
  const [selectedNeed, setSelectedNeed]   = useState<string | null>(null);
  const [selectedMilId, setSelectedMilId] = useState<string | null>(null);
  const [needs, setNeeds]                 = useState<Need[]>([]);
  const [militaries, setMilitaries]       = useState<Military[]>([]);
  const [allAbsences, setAllAbsences]     = useState<Absence[]>([]);
  const [loading, setLoading]             = useState(true);

  const today = startOfToday();
  const [viewDate, setViewDate] = useState(new Date(getYear(today), getMonth(today), 1));

  // Load militaries
  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'militaries')), (snap) => {
      setMilitaries(snap.docs.map(d => ({ id: d.id, ...d.data() } as Military)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'militaries');
      setLoading(false);
    });
    return unsub;
  }, []);

  // Load absences
  useEffect(() => {
    const unsub = onSnapshot(query(collectionGroup(db, 'absences')), (snap) => {
      setAllAbsences(snap.docs.map(d => ({ id: d.id, ...d.data() } as Absence)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'absences'));
    return unsub;
  }, []);

  // Generate needs based on real data
  useEffect(() => {
    if (loading) return;
    const daysInMonth = eachDayOfInterval({ start: startOfMonth(viewDate), end: endOfMonth(viewDate) });
    const generated: Need[] = daysInMonth.map(date => {
      const onDuty   = getMilitariesOnDuty(militaries, date, allAbsences);
      const crewSize = onDuty.length;
      return {
        id:       `need-${date.getTime()}`,
        date,
        crewSize,
        title:    crewSize < 2 ? 'Déficit Crítico' : 'Déficit Operacional',
        status:   crewSize < 2 ? 'CRÍTICO' : 'REDUZIDO',
        severity: crewSize < 2 ? 'error' : 'medium',
        role:     crewSize < 2 ? 'Cmt Guarnição (Sgt/SubTen)' : 'Combatente (Cb/Sd)',
      };
    }).filter(n => n.crewSize < 3);

    setNeeds(generated);
    setSelectedNeed(generated.length > 0 ? generated[0].id : null);
    setSelectedMilId(null);
  }, [viewDate, militaries, allAbsences, loading]);

  const years = Array.from({ length: 5 }, (_, i) => getYear(today) - 1 + i);

  // Summary
  const totalExtrasNeeded = needs.reduce((acc, n) => acc + (3 - n.crewSize), 0);
  const criticalDays      = needs.filter(n => n.severity === 'error').length;
  const reducedDays       = needs.filter(n => n.severity === 'medium').length;
  const avgExtrasPerDay   = needs.length > 0 ? (totalExtrasNeeded / needs.length).toFixed(1) : '0';

  // Sugestões para a necessidade selecionada
  const selectedNeedObj = needs.find(n => n.id === selectedNeed);
  const suggestedMilitaries: Military[] = selectedNeedObj
    ? [...getMilitariesOffDuty(militaries, selectedNeedObj.date, allAbsences)]
        .sort((a, b) => getRankOrder(a.posto) - getRankOrder(b.posto))
    : [];

  const selectedNeedAla = selectedNeedObj ? getAlaOnDuty(selectedNeedObj.date) : null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-outline-variant">
        <div>
          <h1 className="text-on-surface">Painel de Plantões Extras</h1>
          <p className="text-on-surface-variant mt-1">Gerenciamento de necessidades operacionais e convocação de efetivo de folga.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-white border border-outline-variant p-1.5 rounded-lg shadow-sm">
            <select
              value={getMonth(viewDate)}
              onChange={e => setViewDate(setMonth(viewDate, parseInt(e.target.value)))}
              className="bg-transparent border-none text-xs font-bold uppercase tracking-widest px-2 py-1 focus:ring-0 cursor-pointer"
            >
              {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <div className="w-[1px] h-4 bg-outline-variant mx-1" />
            <select
              value={getYear(viewDate)}
              onChange={e => setViewDate(setYear(viewDate, parseInt(e.target.value)))}
              className="bg-transparent border-none text-xs font-bold uppercase tracking-widest px-2 py-1 focus:ring-0 cursor-pointer"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg">
            <CalendarIcon size={16} className="text-primary" />
            <span className="label-caps text-on-surface font-bold text-xs">Hoje: {format(new Date(), 'dd/MM/yyyy')}</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border-2 border-primary rounded-xl p-5 flex flex-col gap-1 shadow-sm">
          <span className="label-caps text-primary text-[10px] font-black">Acionamentos Necessários</span>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-4xl font-black text-primary leading-none">{totalExtrasNeeded}</span>
            <span className="text-xs font-bold text-on-surface-variant mb-1">militares/mês</span>
          </div>
          <p className="text-[10px] text-on-surface-variant mt-1 leading-relaxed">Total para cobrir todos os déficits do período.</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex flex-col gap-1 shadow-sm">
          <span className="label-caps text-primary text-[10px] font-black">Dias Críticos</span>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-4xl font-black text-primary leading-none">{criticalDays}</span>
            <span className="text-xs font-bold text-red-400 mb-1">dias</span>
          </div>
          <p className="text-[10px] text-red-600 mt-1 leading-relaxed">Menos de 2 militares — risco elevado.</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex flex-col gap-1 shadow-sm">
          <span className="label-caps text-tertiary text-[10px] font-black">Dias Reduzidos</span>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-4xl font-black text-tertiary leading-none">{reducedDays}</span>
            <span className="text-xs font-bold text-blue-400 mb-1">dias</span>
          </div>
          <p className="text-[10px] text-blue-700 mt-1 leading-relaxed">Guarnição com 2 — abaixo do mínimo de 3.</p>
        </div>
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5 flex flex-col gap-1 shadow-sm">
          <span className="label-caps text-on-surface-variant text-[10px] font-black">Média por Dia Deficitário</span>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-4xl font-black text-on-surface leading-none">{avgExtrasPerDay}</span>
            <span className="text-xs font-bold text-on-surface-variant mb-1">mil/dia</span>
          </div>
          <p className="text-[10px] text-on-surface-variant mt-1 leading-relaxed">Média de convocações por dia com déficit.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Necessidades */}
        <section className="lg:col-span-7 bg-white border border-outline-variant rounded-lg flex flex-col h-[700px] overflow-hidden shadow-sm">
          <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low/30">
            <h2 className="flex items-center gap-2">
              <AlertTriangle className="text-primary fill-current" size={20} />
              Fluxo de Necessidades de Cobertura
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-3 py-1 bg-surface-container border border-outline-variant rounded-full text-[10px] font-bold text-on-surface-variant">
                <Info size={12} /> REGRA: MÍN. 3 PAX
              </div>
              <span className="bg-red-50 text-primary border border-red-200 label-caps px-3 py-1 rounded-full text-[10px]">
                {needs.filter(n => n.severity === 'error').length} CRÍTICOS
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {needs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-on-surface-variant p-8 text-center bg-surface-container/20 rounded-lg border-2 border-dashed border-outline-variant">
                <CheckCircle size={48} className="text-green-500/30 mb-4" />
                <p className="font-bold label-caps">Escala Completa</p>
                <p className="text-sm mt-1">Nenhuma necessidade de cobertura para este período.</p>
              </div>
            ) : needs.map(need => (
              <div
                key={need.id}
                onClick={() => { setSelectedNeed(need.id); setSelectedMilId(null); }}
                className={cn(
                  "p-5 rounded-xl border-2 transition-all cursor-pointer relative overflow-hidden",
                  selectedNeed === need.id
                    ? "bg-primary/[0.03] border-primary shadow-md"
                    : "bg-white border-outline-variant hover:border-primary/40"
                )}
              >
                <div className={cn("absolute left-0 top-0 bottom-0 w-1", need.severity === 'error' ? "bg-primary" : "bg-tertiary")} />
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-baseline gap-3">
                    <span className="px-2 py-0.5 bg-surface-container-highest rounded text-[10px] font-bold text-on-surface-variant uppercase">
                      {format(need.date, 'dd MMM yyyy', { locale: ptBR })}
                    </span>
                    <h3 className="text-lg font-bold">{need.title}</h3>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={cn(
                      "label-caps px-2 py-0.5 rounded border text-[10px] font-black",
                      need.severity === 'error' ? "bg-red-50 text-primary border-red-200" : "bg-blue-50 text-tertiary border-blue-200"
                    )}>{need.status}</span>
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 rounded">-{3 - need.crewSize} MILITAR(ES)</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-1.5">
                    <Users size={16} className="text-on-surface-variant" />
                    <span className="text-xs font-bold text-on-surface-variant uppercase">{need.crewSize}/3</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserSearch size={18} className="text-on-surface-variant" />
                    <p className="table-data font-semibold text-xs">{need.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Sugestões — militares reais do Firebase */}
        <section className="lg:col-span-5 bg-white border-2 border-primary rounded-lg flex flex-col h-[600px] shadow-lg relative">
          <div className="p-6 border-b border-outline-variant">
            <h2 className="text-xl">Militares de Folga</h2>
            {selectedNeedObj ? (
              <p className="text-xs text-on-surface-variant mt-1.5 font-medium">
                {format(selectedNeedObj.date, "dd 'de' MMMM", { locale: ptBR })}
                {selectedNeedAla && ` · Ala ${selectedNeedAla} de serviço`}
              </p>
            ) : (
              <p className="text-xs text-on-surface-variant mt-1.5">Selecione uma necessidade ao lado.</p>
            )}
          </div>
          <div className="p-4 bg-surface-container/50 border-b border-outline-variant">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <Info size={16} />
              <p className="text-xs">Militares da unidade não escalados para este dia.</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {!selectedNeedObj ? (
              <div className="flex flex-col items-center justify-center h-full text-on-surface-variant text-center">
                <UserSearch size={40} className="mb-3 opacity-20" />
                <p className="text-sm">Selecione uma necessidade para ver os militares disponíveis.</p>
              </div>
            ) : suggestedMilitaries.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-on-surface-variant text-center">
                <AlertTriangle size={40} className="mb-3 opacity-20 text-primary" />
                <p className="font-bold label-caps text-sm">Nenhum militar disponível</p>
                <p className="text-xs mt-1">Todos estão em serviço ou afastados nesta data.</p>
              </div>
            ) : suggestedMilitaries.map(m => (
              <label
                key={m.id}
                className={cn(
                  "flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-all",
                  selectedMilId === m.id
                    ? "border-secondary bg-secondary/10 shadow-sm ring-2 ring-secondary/10"
                    : "border-outline-variant hover:bg-surface-container-low"
                )}
              >
                <input
                  type="radio"
                  name="military"
                  checked={selectedMilId === m.id}
                  onChange={() => setSelectedMilId(m.id)}
                  className="mt-1 text-secondary focus:ring-secondary cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-on-surface">{m.posto} {m.nome}</h4>
                    <span className={cn(
                      "label-caps px-2 py-0.5 rounded text-[9px] font-black text-white",
                      m.ala === 'A' ? "bg-red-600" :
                      m.ala === 'B' ? "bg-blue-600" :
                      m.ala === 'C' ? "bg-green-600" : "bg-orange-500"
                    )}>Ala {m.ala}</span>
                  </div>
                  {m.isDriver && (
                    <span className="inline-block mt-1 text-[9px] font-black label-caps text-primary bg-primary/10 px-1.5 rounded">🚗 MOTORISTA</span>
                  )}
                </div>
              </label>
            ))}
          </div>
          <div className="p-6 border-t border-outline-variant bg-white">
            <button
              disabled={!selectedMilId || !selectedNeedObj}
              className="w-full bg-primary text-white font-bold py-3.5 rounded-lg flex items-center justify-center gap-2 hover:bg-primary-container transition-all shadow-md active:translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCircle size={20} />
              Confirmar Escala de Extra
            </button>
          </div>
        </section>

        {/* Histórico — sem dados falsos */}
        <section className="col-span-12 bg-white border border-outline-variant rounded-lg overflow-hidden shadow-sm">
          <div className="p-4 border-b border-outline-variant bg-surface-container-low/30 flex justify-between items-center">
            <h3 className="flex items-center gap-2 text-on-surface font-bold">
              Histórico de Convocações
            </h3>
          </div>
          <div className="p-10 text-center text-on-surface-variant">
            <Plus size={36} className="mx-auto mb-3 opacity-20" />
            <p className="font-bold label-caps text-sm">Nenhuma convocação registrada</p>
            <p className="text-xs mt-1">O histórico de plantões extras confirmados aparecerá aqui.</p>
          </div>
        </section>
      </div>
    </motion.div>
  );
}
