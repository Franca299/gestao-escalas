import React, { useState, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, Printer, AlertTriangle, Shield,
  CalendarOff, CalendarRange, Activity, Car, UserX
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  addMonths, subMonths, parseISO, isBefore, isAfter, isWithinInterval,
  differenceInDays, startOfDay, addDays
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Ala, Absence, Military } from '../types';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query, collectionGroup } from 'firebase/firestore';
import { getAlaOnDuty, getMilitariesOnDuty, isMilitaryScheduled } from '../lib/scales';

const daysOfWeek = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

const ABSENCE_META: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  Férias:   { label: 'Férias',        color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200',  icon: <CalendarRange size={14} className="text-amber-600" /> },
  LESP:     { label: 'Lic. Especial', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', icon: <CalendarOff size={14} className="text-purple-600" /> },
  Atestado: { label: 'Atestado',      color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',    icon: <Activity size={14} className="text-red-600" /> },
  Outros:   { label: 'Outros',        color: 'text-slate-700',  bg: 'bg-slate-50',  border: 'border-slate-200',  icon: <CalendarOff size={14} className="text-slate-500" /> },
};

function absenceMeta(type: string) {
  return ABSENCE_META[type] ?? ABSENCE_META['Outros'];
}

interface AbsenceWithMilitary extends Absence {
  military: Military;
}

export function Relatorios() {
  const [currentDate, setCurrentDate]         = useState(new Date());
  const [selectedAla, setSelectedAla]         = useState<Ala | 'Todas'>('Todas');
  const [highlightMilId, setHighlightMilId]   = useState<string>('');
  const [militaries, setMilitaries]           = useState<Military[]>([]);
  const [allAbsences, setAllAbsences]         = useState<Absence[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'militaries')), (snap) => {
      setMilitaries(snap.docs.map(d => ({ id: d.id, ...d.data() } as Military)));
      setLoading(false);
    }, (err) => {
      setError(err.message);
      setLoading(false);
      handleFirestoreError(err, OperationType.LIST, 'militaries');
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(query(collectionGroup(db, 'absences')), (snap) => {
      setAllAbsences(snap.docs.map(d => ({ id: d.id, ...d.data() } as Absence)));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'absences');
    });
    return unsub;
  }, []);

  const monthStart  = startOfMonth(currentDate);
  const monthEnd    = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay    = getDay(monthStart);

  const calculateDuty = (date: Date) => getMilitariesOnDuty(militaries, date, allAbsences);

  // Absences overlapping current month
  const monthAbsences: AbsenceWithMilitary[] = allAbsences
    .map(abs => {
      const mil = militaries.find(m => m.id === abs.militaryId);
      if (!mil) return null;
      return { ...abs, military: mil };
    })
    .filter((abs): abs is AbsenceWithMilitary => {
      if (!abs) return false;
      const s = parseISO(abs.startDate);
      const e = parseISO(abs.endDate);
      return !isAfter(s, monthEnd) && !isBefore(e, monthStart);
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  // Currently absent (today is within absence interval)
  const today = startOfDay(new Date());
  const currentlyAbsent: AbsenceWithMilitary[] = allAbsences
    .map(abs => {
      const mil = militaries.find(m => m.id === abs.militaryId);
      if (!mil) return null;
      return { ...abs, military: mil };
    })
    .filter((abs): abs is AbsenceWithMilitary => {
      if (!abs) return false;
      try {
        const s = startOfDay(parseISO(abs.startDate));
        const e = startOfDay(parseISO(abs.endDate));
        return isWithinInterval(today, { start: s, end: e });
      } catch { return false; }
    });

  // Highlighted military
  const highlightedMilitary = militaries.find(m => m.id === highlightMilId) ?? null;
  const isHighlightOnLeave = (date: Date): boolean => {
    if (!highlightedMilitary) return false;
    return allAbsences.some(abs => {
      if (abs.militaryId !== highlightedMilitary.id) return false;
      try {
        const s = startOfDay(parseISO(abs.startDate));
        const e = startOfDay(parseISO(abs.endDate));
        return isWithinInterval(startOfDay(date), { start: s, end: e });
      } catch { return false; }
    });
  };

  if (loading) return <div className="flex justify-center p-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  if (error) return (
    <div className="p-8 text-center bg-red-50 border border-red-200 rounded-xl m-6">
      <h3 className="text-red-700 font-bold mb-2">Erro de Conexão</h3>
      <p className="text-red-600 text-sm mb-4">{error}</p>
      <button onClick={() => window.location.reload()} className="bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold label-caps hover:bg-red-700">Tentar Novamente</button>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-on-surface capitalize">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</h1>
          <p className="text-on-surface-variant font-medium">Escala 2x6 — Ciclo AABBCCDD (Mín. 3/dia)</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center bg-surface-container-low border border-outline-variant p-1.5 rounded-lg shadow-sm">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-1 text-on-surface-variant hover:text-primary transition-colors"><ChevronLeft size={20} /></button>
            <span className="label-caps text-on-surface px-6 w-32 text-center">{format(currentDate, 'MMM yyyy', { locale: ptBR }).toUpperCase()}</span>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1 text-on-surface-variant hover:text-primary transition-colors"><ChevronRight size={20} /></button>
          </div>
          <div className="flex bg-surface-container-low border border-outline-variant rounded-lg overflow-hidden shadow-sm">
            {(['Todas', 'A', 'B', 'C', 'D'] as const).map(a => (
              <button key={a} onClick={() => setSelectedAla(a)} className={cn(
                "px-4 py-2.5 label-caps transition-all",
                selectedAla === a ? "bg-secondary text-white" : "text-on-surface-variant border-l border-outline-variant hover:bg-white"
              )}>
                {a === 'Todas' ? 'TUDO' : `ALA ${a}`}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 bg-primary text-white label-caps px-5 py-2.5 rounded-lg hover:bg-primary-container transition-all shadow-md">
            <Printer size={18} /> IMPRIMIR
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 overflow-hidden h-[calc(100vh-260px)]">

        {/* Calendar */}
        <div className="flex-1 bg-white border border-outline-variant rounded-xl flex flex-col overflow-hidden shadow-sm">
          <div className="grid grid-cols-7 bg-surface-container-high/50 border-b border-outline-variant">
            {daysOfWeek.map(day => (
              <div key={day} className="p-3 text-center label-caps text-on-surface-variant">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 flex-1 bg-outline-variant/10 gap-[1px] overflow-y-auto">
            {Array.from({ length: startDay }).map((_, i) => (
              <div key={`prev-${i}`} className="bg-surface-container-low/30 p-2.5 opacity-30" />
            ))}
            {daysInMonth.map((day, i) => {
              const onDuty  = calculateDuty(day);
              const ala     = getAlaOnDuty(day);
              const isShort = onDuty.length < 3;
              const isFiltered = selectedAla !== 'Todas' && selectedAla !== ala;

              // Highlight logic
              const milIsOnDuty  = highlightedMilitary && onDuty.some(m => m.id === highlightedMilitary.id);
              const milIsLeave   = highlightedMilitary && isHighlightOnLeave(day);
              const milWouldWork = highlightedMilitary && isMilitaryScheduled(highlightedMilitary, day) && milIsLeave;

              return (
                <div
                  key={i}
                  className={cn(
                    "bg-white p-2 flex flex-col min-h-[120px] border-t-2 transition-all relative",
                    isFiltered && "opacity-20 pointer-events-none",
                    !isFiltered && !highlightedMilitary && "hover:border-secondary hover:shadow-lg cursor-pointer border-transparent z-10",
                    milIsOnDuty  && !isFiltered && "border-blue-500 bg-blue-50/40 shadow-md z-10",
                    milWouldWork && !isFiltered && "border-yellow-400 bg-yellow-50/40 shadow-md z-10",
                    !milIsOnDuty && !milWouldWork && !isFiltered && highlightedMilitary && "border-transparent opacity-60"
                  )}
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold text-on-surface">{format(day, 'd')}</span>
                    <span className={cn(
                      "text-[9px] font-black px-1.5 rounded-sm text-white",
                      ala === 'A' ? "bg-red-600" :
                      ala === 'B' ? "bg-blue-600" :
                      ala === 'C' ? "bg-green-600" : "bg-orange-600"
                    )}>
                      ALA {ala}
                    </span>
                  </div>

                  {/* "Would work" ghost entry */}
                  {milWouldWork && highlightedMilitary && (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-100 border border-yellow-300 rounded text-[9px] font-bold text-yellow-800 mb-1">
                      <AlertTriangle size={9} /> {highlightedMilitary.posto} {highlightedMilitary.nome}
                    </div>
                  )}

                  <div className="space-y-1 flex-1 overflow-hidden">
                    {onDuty.map(m => (
                      <div
                        key={m.id}
                        className={cn(
                          "flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-medium truncate",
                          m.id === highlightMilId
                            ? "bg-blue-100 border-blue-400 text-blue-900 font-bold"
                            : "bg-surface-container-low border-outline-variant/30 text-on-surface-variant"
                        )}
                      >
                        <Shield className="text-tertiary shrink-0" size={10} />
                        <span className="truncate">{m.posto} {m.nome}</span>
                        {m.isDriver && <Car size={9} className="text-primary shrink-0 ml-auto" />}
                      </div>
                    ))}
                    {isShort && !isFiltered && (
                      <div className="mt-1 flex flex-col gap-1">
                        {Array.from({ length: 3 - onDuty.length }).map((_, j) => (
                          <div key={j} className="flex items-center gap-1 px-1.5 py-0.5 bg-red-50 text-primary border border-red-200 rounded text-[9px] font-bold animate-pulse">
                            <AlertTriangle size={10} /> VAGA ABERTA
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 space-y-5 shrink-0 overflow-y-auto pr-1">

          {/* Highlight por militar */}
          <div className="bg-white border border-outline-variant rounded-xl p-5 shadow-sm">
            <h3 className="label-caps text-on-surface border-b border-outline-variant/50 pb-2 mb-3">Destacar Militar no Mapa</h3>
            <select
              value={highlightMilId}
              onChange={e => setHighlightMilId(e.target.value)}
              className="w-full p-2 border border-outline-variant rounded-md text-xs font-bold bg-surface-container-low focus:ring-2 focus:ring-secondary/20 outline-none"
            >
              <option value="">— Nenhum —</option>
              {[...militaries].sort((a, b) => a.nome.localeCompare(b.nome)).map(m => (
                <option key={m.id} value={m.id}>{m.posto} {m.nome}</option>
              ))}
            </select>
            {highlightedMilitary && (
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center gap-2 text-[11px] text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1.5">
                  <div className="w-3 h-3 rounded-sm bg-blue-500" />
                  Dias de serviço do militar
                </div>
                <div className="flex items-center gap-2 text-[11px] text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-2 py-1.5">
                  <div className="w-3 h-3 rounded-sm bg-yellow-400" />
                  Dias em que estaria de serviço (férias)
                </div>
              </div>
            )}
          </div>

          {/* Fora da escala AGORA */}
          <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-outline-variant bg-surface-container-low/40 flex items-center justify-between">
              <h3 className="label-caps text-on-surface flex items-center gap-2">
                <UserX size={15} className="text-primary" />
                Fora da Escala Agora
              </h3>
              <span className={cn(
                "label-caps text-[10px] px-2.5 py-1 rounded-full font-black border",
                currentlyAbsent.length > 0
                  ? "bg-red-50 text-primary border-red-200"
                  : "bg-green-50 text-green-700 border-green-200"
              )}>
                {currentlyAbsent.length} {currentlyAbsent.length === 1 ? 'MILITAR' : 'MILITARES'}
              </span>
            </div>
            <div className="divide-y divide-outline-variant/60 max-h-60 overflow-y-auto">
              {currentlyAbsent.length === 0 ? (
                <div className="py-8 px-5 text-center">
                  <CalendarRange size={32} className="text-green-400 mx-auto mb-2 opacity-60" />
                  <p className="font-bold label-caps text-green-700 text-xs">Todos presentes</p>
                </div>
              ) : currentlyAbsent.map(abs => {
                const meta = absenceMeta(abs.type);
                const end  = parseISO(abs.endDate);
                const daysLeft = differenceInDays(startOfDay(end), today) + 1;
                return (
                  <div key={abs.id} className={cn("p-4 flex flex-col gap-1", meta.bg)}>
                    <div className="flex items-center gap-2">
                      {meta.icon}
                      <p className="font-black text-on-surface text-[12px] leading-tight truncate">{abs.military.nome}</p>
                    </div>
                    <p className="text-[10px] text-on-surface-variant font-bold uppercase">{abs.military.posto} · Ala {abs.military.ala}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className={cn("label-caps text-[9px] px-2 py-0.5 rounded border font-black", meta.color, meta.border, meta.bg)}>{meta.label}</span>
                      <span className="text-[10px] font-bold text-on-surface-variant">Ret. {format(end, 'dd/MM/yyyy')}</span>
                    </div>
                    <p className="text-[10px] text-on-surface-variant">{daysLeft} {daysLeft === 1 ? 'dia restante' : 'dias restantes'}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ausentes no mês */}
          <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-outline-variant bg-surface-container-low/40 flex items-center justify-between">
              <h3 className="label-caps text-on-surface flex items-center gap-2">
                <CalendarOff size={15} className="text-primary" />
                Ausentes — {format(currentDate, 'MMM yyyy', { locale: ptBR }).toUpperCase()}
              </h3>
              <span className={cn(
                "label-caps text-[10px] px-2.5 py-1 rounded-full font-black border",
                monthAbsences.length > 0 ? "bg-red-50 text-primary border-red-200" : "bg-green-50 text-green-700 border-green-200"
              )}>
                {monthAbsences.length} {monthAbsences.length === 1 ? 'MILITAR' : 'MILITARES'}
              </span>
            </div>
            <div className="divide-y divide-outline-variant/60 max-h-72 overflow-y-auto">
              {monthAbsences.length === 0 ? (
                <div className="py-10 px-5 text-center">
                  <CalendarRange size={36} className="text-green-400 mx-auto mb-3 opacity-60" />
                  <p className="font-bold label-caps text-green-700 text-xs">Nenhum afastamento neste mês</p>
                </div>
              ) : monthAbsences.map(abs => {
                const meta       = absenceMeta(abs.type);
                const start      = parseISO(abs.startDate);
                const end        = parseISO(abs.endDate);
                const totalDays  = differenceInDays(end, start) + 1;
                const isOngoing  = !isAfter(start, today) && !isBefore(end, today);
                const isFuture   = isAfter(start, today);
                return (
                  <motion.div key={abs.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                    className={cn("p-4 flex flex-col gap-2 hover:bg-surface-container-low/30", meta.bg)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {meta.icon}
                        <div className="min-w-0">
                          <p className="font-black text-on-surface text-[12px] truncate">{abs.military.nome}</p>
                          <p className="text-[10px] text-on-surface-variant font-bold uppercase">{abs.military.posto} · Ala {abs.military.ala}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={cn("label-caps text-[9px] px-2 py-0.5 rounded border font-black", meta.color, meta.border, meta.bg)}>{meta.label}</span>
                        {isOngoing && <span className="label-caps text-[9px] px-2 py-0.5 rounded border font-black bg-green-50 text-green-700 border-green-300 flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />EM CURSO</span>}
                        {isFuture  && <span className="label-caps text-[9px] px-2 py-0.5 rounded border font-black bg-blue-50 text-blue-700 border-blue-200">FUTURO</span>}
                      </div>
                    </div>
                    <div className={cn("rounded-lg px-3 py-2 border flex items-center justify-between", meta.border, "bg-white/70")}>
                      <div className="text-center">
                        <p className="text-[9px] font-bold text-on-surface-variant uppercase">Início</p>
                        <p className="text-[11px] font-black text-on-surface">{format(start, 'dd/MM/yyyy')}</p>
                      </div>
                      <div className="flex-1 mx-2 h-[2px] bg-outline-variant rounded-full relative">
                        <div className={cn("absolute inset-0 rounded-full", meta.color.replace('text-', 'bg-').replace('-700', '-300'))} />
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] font-bold text-on-surface-variant uppercase">Fim</p>
                        <p className="text-[11px] font-black text-on-surface">{format(end, 'dd/MM/yyyy')}</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-on-surface-variant text-right font-semibold">{totalDays} {totalDays === 1 ? 'dia' : 'dias'}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Legenda */}
          <div className="bg-white border border-outline-variant rounded-xl p-5 shadow-sm">
            <h3 className="label-caps text-on-surface border-b border-outline-variant/50 pb-2 mb-4">Legenda</h3>
            <ul className="space-y-2.5">
              <li className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-surface-container-low border border-outline-variant flex items-center justify-center"><Shield className="text-tertiary" size={10} /></div>
                <span className="text-[12px] font-medium text-on-surface-variant">Efetivo Confirmado</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-red-50 border border-red-200 flex items-center justify-center"><AlertTriangle className="text-primary" size={10} /></div>
                <span className="text-[12px] font-medium text-on-surface-variant">Vaga / Déficit (Mín. 3)</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-blue-100 border border-blue-400 flex items-center justify-center"><Shield className="text-blue-700" size={10} /></div>
                <span className="text-[12px] font-medium text-on-surface-variant">Militar destacado</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-400 flex items-center justify-center"><AlertTriangle className="text-yellow-700" size={10} /></div>
                <span className="text-[12px] font-medium text-on-surface-variant">Estaria de serviço (férias)</span>
              </li>
              <li className="flex items-center gap-3">
                <Car size={14} className="text-primary" />
                <span className="text-[12px] font-medium text-on-surface-variant">Motorista</span>
              </li>
            </ul>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
