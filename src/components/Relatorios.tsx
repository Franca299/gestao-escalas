import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Printer, ListTodo, Car, FireExtinguisher, 
  AlertTriangle, Stethoscope, RefreshCw, PlusCircle, Shield, UserX
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isWithinInterval, parseISO, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Ala, Military } from '../types';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { getAlaOnDuty, getMilitariesOnDuty } from '../lib/scales';

const daysOfWeek = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

export function Relatorios() {
  const [currentDate, setCurrentDate] = useState(new Date()); // Current month
  const [selectedAla, setSelectedAla] = useState<Ala | 'Todas'>('Todas');
  const [militaries, setMilitaries] = useState<Military[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'militaries'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Military));
      setMilitaries(docs);
      setLoading(false);
    }, (error) => {
      setError(error.message);
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, 'militaries');
    });
    return unsubscribe;
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = getDay(monthStart);

  const calculateDuty = (date: Date) => getMilitariesOnDuty(militaries, date);

  if (loading) {
    return <div className="flex justify-center p-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-red-50 border border-red-200 rounded-xl m-6">
        <h3 className="text-red-700 font-bold mb-2">Erro de Conexão</h3>
        <p className="text-red-600 text-sm mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold label-caps hover:bg-red-700 transition-colors">
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-on-surface capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </h1>
          <p className="text-on-surface-variant font-medium">Visão Geral de Escalas e Efetivo (Min. 3/dia)</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center bg-surface-container-low border border-outline-variant p-1.5 rounded-lg shadow-sm">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-1 text-on-surface-variant hover:text-primary transition-colors"><ChevronLeft size={20} /></button>
            <span className="label-caps text-on-surface px-6 w-32 text-center">{format(currentDate, 'MMM yyyy', { locale: ptBR }).toUpperCase()}</span>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1 text-on-surface-variant hover:text-primary transition-colors"><ChevronRight size={20} /></button>
          </div>
          <div className="flex bg-surface-container-low border border-outline-variant rounded-lg overflow-hidden shadow-sm">
            {(['Todas', 'A', 'B', 'C', 'D'] as const).map(a => (
              <button 
                key={a}
                onClick={() => setSelectedAla(a)}
                className={cn(
                  "px-4 py-2.5 label-caps transition-all",
                  selectedAla === a ? "bg-secondary text-white" : "text-on-surface-variant border-l border-outline-variant hover:bg-white"
                )}
              >
                {a === 'Todas' ? 'TUDO' : `ALA ${a}`}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 bg-primary text-white label-caps px-5 py-2.5 rounded-lg hover:bg-primary-container transition-all shadow-md">
            <Printer size={18} /> IMPRIMIR
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 overflow-hidden h-[calc(100vh-280px)]">
        <div className="flex-1 bg-white border border-outline-variant rounded-xl flex flex-col overflow-hidden shadow-sm">
          <div className="grid grid-cols-7 bg-surface-container-high/50 border-b border-outline-variant">
            {daysOfWeek.map((day) => (
              <div key={day} className="p-3 text-center label-caps text-on-surface-variant">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 flex-1 bg-outline-variant/10 gap-[1px] overflow-y-auto">
            {Array.from({ length: startDay }).map((_, i) => (
              <div key={`prev-${i}`} className="bg-surface-container-low/30 p-2.5 opacity-30" />
            ))}
            
            {daysInMonth.map((day, i) => {
              const onDuty = calculateDuty(day);
              const ala = getAlaOnDuty(day);
              const isShort = onDuty.length < 3;
              const isFiltered = selectedAla !== 'Todas' && selectedAla !== ala;

              return (
                <div 
                  key={i} 
                  className={cn(
                    "bg-white p-2 flex flex-col min-h-[120px] border-t-2 border-transparent transition-all relative",
                    !isFiltered ? "hover:border-secondary hover:shadow-lg cursor-pointer z-10" : "opacity-20 pointer-events-none"
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
                  
                  <div className="space-y-1 flex-1 overflow-hidden">
                    {onDuty.map((m) => (
                      <div key={m.id} className="flex items-center gap-1 px-1.5 py-0.5 bg-surface-container-low rounded border border-outline-variant/30 text-[9px] font-medium text-on-surface-variant truncate">
                        <Shield className="text-tertiary" size={10} />
                        {m.posto} {m.nome}
                      </div>
                    ))}
                    
                    {isShort && !isFiltered && (
                      <div className="mt-1 flex flex-col gap-1">
                        {Array.from({ length: 3 - onDuty.length }).map((_, j) => (
                          <div key={j} className="flex items-center gap-1 px-1.5 py-0.5 bg-red-50 text-primary border border-red-200 rounded text-[9px] font-bold animate-pulse">
                            <AlertTriangle size={10} />
                            VAGA ABERTA
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

        <div className="w-full lg:w-80 space-y-6 shrink-0 overflow-y-auto pr-1">
          <div className="bg-white border border-outline-variant rounded-xl p-5 shadow-sm">
            <h3 className="label-caps text-on-surface border-b border-outline-variant/50 pb-2 mb-4">Legenda de Status</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-surface-container-low border border-outline-variant shadow-sm flex items-center justify-center">
                  <Shield className="text-tertiary" size={10} />
                </div>
                <span className="text-[12px] font-medium text-on-surface-variant">Efetivo Confirmado</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-red-50 border border-red-200 shadow-sm flex items-center justify-center">
                  <AlertTriangle className="text-primary" size={10} />
                </div>
                <span className="text-[12px] font-medium text-on-surface-variant">Vaga / Déficit (Min. 3)</span>
              </li>
            </ul>
          </div>

          <div className="bg-white border border-outline-variant rounded-xl p-5 shadow-sm space-y-5">
            <h3 className="label-caps text-on-surface border-b border-outline-variant/50 pb-2">Resumo Operacional</h3>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 flex items-center justify-between">
              <div>
                <span className="block label-caps text-[10px] text-orange-600 leading-none">PRONTIDÃO CRÍTICA</span>
                <span className="text-lg font-bold text-orange-700 leading-none mt-1 inline-block">Déficit em alguns dias</span>
              </div>
              <AlertTriangle className="text-orange-500 opacity-60" size={32} />
            </div>
            <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant">
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                * A escala é baseada no regime de 24x72h, alternando entre as Alas A, B, C e D.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

