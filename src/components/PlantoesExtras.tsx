import React, { useState, useEffect } from 'react';
import { AlertTriangle, Filter, History, CheckCircle, Info, Briefcase, Plus, UserSearch, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { format, addDays, startOfToday, startOfMonth, endOfMonth, eachDayOfInterval, getYear, getMonth, setMonth, setYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Military } from '../types';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { getMilitariesOnDuty } from '../lib/scales';

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

const suggestedMilitaries = [
  { id: 1, name: '1º Sgt BM SOUZA', rest: 'Folga 48h', last: 'Há 15 dias', specialty: 'Salvamento', checked: true },
  { id: 2, name: '2º Sgt BM OLIVEIRA', rest: 'Folga 24h', last: 'Há 5 dias', specialty: 'Incêndio', checked: false },
  { id: 3, name: 'SubTen BM CARVALHO', rest: 'Folga 72h', last: 'Há 30 dias', specialty: 'Geral', checked: false },
];

const callHistory = [
  { date: '22 Out 2023', ala: 'Ala C', military: 'Cb BM LIMA', role: 'Combatente', author: 'Cap BM SILVA', status: 'CUMPRIDO' },
  { date: '20 Out 2023', ala: 'Ala B', military: 'Sd BM PEREIRA', role: 'Motorista', author: 'Maj BM SANTOS', status: 'CUMPRIDO' },
  { date: '18 Out 2023', ala: 'Ala A', military: '1º Sgt BM COSTA', role: 'Cmt Guarnição', author: 'Cap BM SILVA', status: 'CUMPRIDO' },
];

export function PlantoesExtras() {
  const [selectedNeed, setSelectedNeed] = useState<string | null>(null);
  const [selectedMilitary, setSelectedMilitary] = useState(1);
  const [needs, setNeeds] = useState<Need[]>([]);
  const [militaries, setMilitaries] = useState<Military[]>([]);
  const [loading, setLoading] = useState(true);
  
  const today = startOfToday();
  const [viewDate, setViewDate] = useState(new Date(getYear(today), getMonth(today), 1));

  useEffect(() => {
    const q = query(collection(db, 'militaries'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Military));
      setMilitaries(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'militaries');
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (loading) return;

    const start = startOfMonth(viewDate);
    const end = endOfMonth(viewDate);
    const daysInMonth = eachDayOfInterval({ start, end });

    const generatedNeeds: Need[] = daysInMonth.map((date, i) => {
      const onDuty = getMilitariesOnDuty(militaries, date);
      const crewSize = onDuty.length;
      
      const severity: 'error' | 'medium' = crewSize < 2 ? 'error' : 'medium';

      return {
        id: `need-${date.getTime()}`,
        date,
        crewSize,
        title: crewSize < 2 ? 'Déficit Crítico' : 'Déficit Operacional',
        status: crewSize < 2 ? 'CRÍTICO' : 'REDUZIDO',
        severity,
        role: crewSize < 2 ? 'Cmt Guarnição (Sgt/SubTen)' : 'Combatente (Cb/Sd)'
      };
    }).filter(need => need.crewSize < 3); // Apenas onde falta gente

    setNeeds(generatedNeeds);
    if (generatedNeeds.length > 0) {
      setSelectedNeed(generatedNeeds[0].id);
    } else {
      setSelectedNeed(null);
    }
  }, [viewDate, militaries, loading]);

  const years = Array.from({ length: 5 }, (_, i) => getYear(today) - 1 + i);

  // ── Summary calculations ─────────────────────────────────────────────────
  const totalExtrasNeeded = needs.reduce((acc, n) => acc + (3 - n.crewSize), 0);
  const criticalDays     = needs.filter(n => n.severity === 'error').length;
  const reducedDays      = needs.filter(n => n.severity === 'medium').length;
  const avgExtrasPerDay  = needs.length > 0
    ? (totalExtrasNeeded / needs.length).toFixed(1)
    : '0';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-outline-variant">
        <div>
          <h1 className="text-on-surface">Painel de Plantões Extras</h1>
          <p className="text-on-surface-variant mt-1">Gerenciamento de necessidades operacionais e convocação de efetivo de folga.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-white border border-outline-variant p-1.5 rounded-lg shadow-sm">
            <select 
              value={getMonth(viewDate)}
              onChange={(e) => setViewDate(setMonth(viewDate, parseInt(e.target.value)))}
              className="bg-transparent border-none text-xs font-bold uppercase tracking-widest px-2 py-1 focus:ring-0 cursor-pointer"
            >
              {months.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>
            <div className="w-[1px] h-4 bg-outline-variant mx-1" />
            <select 
              value={getYear(viewDate)}
              onChange={(e) => setViewDate(setYear(viewDate, parseInt(e.target.value)))}
              className="bg-transparent border-none text-xs font-bold uppercase tracking-widest px-2 py-1 focus:ring-0 cursor-pointer"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-surface-container-low border border-outline-variant px-4 py-2.5 rounded-lg">
             <CalendarIcon size={16} className="text-primary" />
             <span className="label-caps text-on-surface font-bold text-xs">Hoje: {format(new Date(), 'dd/MM/yyyy')}</span>
          </div>
        </div>
      </div>

      {/* ── Summary Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total acionamentos */}
        <div className="bg-white border-2 border-primary rounded-xl p-5 flex flex-col gap-1 shadow-sm">
          <span className="label-caps text-primary text-[10px] font-black">Acionamentos Necessários</span>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-4xl font-black text-primary leading-none">{totalExtrasNeeded}</span>
            <span className="text-xs font-bold text-on-surface-variant mb-1">militares/mês</span>
          </div>
          <p className="text-[10px] text-on-surface-variant mt-1 leading-relaxed">
            Total de convocações de folga necessárias para cobrir os déficits do período.
          </p>
        </div>

        {/* Dias críticos */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex flex-col gap-1 shadow-sm">
          <span className="label-caps text-primary text-[10px] font-black">Dias Críticos</span>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-4xl font-black text-primary leading-none">{criticalDays}</span>
            <span className="text-xs font-bold text-red-400 mb-1">dias</span>
          </div>
          <p className="text-[10px] text-red-600 mt-1 leading-relaxed">
            Menos de 2 militares em serviço — risco operacional elevado.
          </p>
        </div>

        {/* Dias reduzidos */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex flex-col gap-1 shadow-sm">
          <span className="label-caps text-tertiary text-[10px] font-black">Dias Reduzidos</span>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-4xl font-black text-tertiary leading-none">{reducedDays}</span>
            <span className="text-xs font-bold text-blue-400 mb-1">dias</span>
          </div>
          <p className="text-[10px] text-blue-700 mt-1 leading-relaxed">
            Guarnição com 2 militares — abaixo do mínimo de 3.
          </p>
        </div>

        {/* Média por dia */}
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5 flex flex-col gap-1 shadow-sm">
          <span className="label-caps text-on-surface-variant text-[10px] font-black">Média por Dia Deficitário</span>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-4xl font-black text-on-surface leading-none">{avgExtrasPerDay}</span>
            <span className="text-xs font-bold text-on-surface-variant mb-1">mil/dia</span>
          </div>
          <p className="text-[10px] text-on-surface-variant mt-1 leading-relaxed">
            Média de militares de folga convocados por dia com déficit.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Necessidades */}
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
              <span className="bg-red-50 text-primary border border-red-200 label-caps px-3 py-1 rounded-full">{needs.filter(n => n.severity === 'error').length} CRÍTICOS</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
             {needs.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full text-on-surface-variant p-8 text-center bg-surface-container/20 rounded-lg border-2 border-dashed border-outline-variant">
                 <CheckCircle size={48} className="text-green-500/30 mb-4" />
                 <p className="font-bold label-caps">Escala Completa</p>
                 <p className="text-sm mt-1">Não há necessidades de cobertura para o período selecionado.</p>
               </div>
             ) : needs.map((need) => (
                <div 
                  key={need.id}
                  onClick={() => setSelectedNeed(need.id)}
                  className={cn(
                    "p-5 rounded-xl border-2 transition-all cursor-pointer group relative overflow-hidden",
                    selectedNeed === need.id 
                      ? "bg-primary/[0.03] border-primary shadow-md" 
                      : "bg-white border-outline-variant hover:border-primary/40"
                  )}
                >
                  <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-1",
                    need.severity === 'error' ? "bg-primary" : "bg-tertiary"
                  )} />
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
                      )}>
                        {need.status}
                      </span>
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 rounded">-{3 - need.crewSize} MILITAR(ES)</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                     <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-on-surface">
                           <Users size={16} className="text-on-surface-variant" />
                           <span className="text-xs font-bold text-on-surface-variant uppercase">{need.crewSize}/3</span>
                        </div>
                        <div className="flex items-center gap-2 text-on-surface">
                           <UserSearch size={18} className="text-on-surface-variant" />
                           <p className="table-data font-semibold">MISSAL: {need.role}</p>
                        </div>
                     </div>
                     {selectedNeed === need.id && (
                       <motion.span 
                         layoutId="selected-tag"
                         className="label-caps text-primary text-[10px] font-black border-b-2 border-primary"
                        >
                          SELECIONADO
                        </motion.span>
                      )}
                  </div>
                </div>
             ))}
          </div>
        </section>

        {/* Right: Sugestões */}
        <section className="lg:col-span-5 bg-white border-2 border-primary rounded-lg flex flex-col h-[600px] shadow-lg relative">
          <div className="p-6 border-b border-outline-variant">
            <h2 className="text-xl">Militares Sugeridos</h2>
            <p className="text-xs text-on-surface-variant mt-1.5 font-medium">Alocando para: 24 Out • Ala A • Cmt Guarnição</p>
          </div>
          <div className="p-4 bg-surface-container/50 border-b border-outline-variant space-y-1">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <Info size={16} />
              <p className="text-xs">Militares em folga, ordenados por menor carga horária recente.</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
             {suggestedMilitaries.map((mililitary) => (
                <label 
                  key={mililitary.id} 
                  className={cn(
                    "flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-all",
                    selectedMilitary === mililitary.id 
                      ? "border-secondary bg-secondary-fixed-dim/20 shadow-sm ring-2 ring-secondary/10" 
                      : "border-outline-variant hover:bg-surface-container-low"
                  )}
                >
                  <input 
                    type="radio" 
                    name="military" 
                    checked={selectedMilitary === mililitary.id}
                    onChange={() => setSelectedMilitary(mililitary.id)}
                    className="mt-1 text-secondary focus:ring-secondary cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-on-surface">{mililitary.name}</h4>
                      <span className="label-caps px-2 py-0.5 bg-surface-container rounded border border-outline-variant">{mililitary.rest}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <span className="block label-caps text-on-surface-variant leading-none mb-1">Último Extra</span>
                        <span className="text-xs font-semibold">{mililitary.last}</span>
                      </div>
                      <div className="border-l border-outline-variant pl-4">
                        <span className="block label-caps text-on-surface-variant leading-none mb-1">Especialidade</span>
                        <span className="text-xs font-semibold">{mililitary.specialty}</span>
                      </div>
                    </div>
                  </div>
                </label>
             ))}
          </div>
          <div className="p-6 border-t border-outline-variant bg-white">
            <button className="w-full bg-primary text-white font-bold py-3.5 rounded-lg flex items-center justify-center gap-2 hover:bg-primary-container transition-all shadow-md active:translate-y-0.5">
              <CheckCircle size={20} />
              Confirmar Escala de Extra
            </button>
          </div>
        </section>

        {/* Bottom: Histórico */}
        <section className="col-span-12 bg-white border border-outline-variant rounded-lg overflow-hidden shadow-sm">
          <div className="p-4 border-b border-outline-variant bg-surface-container-low/30 flex justify-between items-center">
            <h3 className="flex items-center gap-2">
              <History size={18} className="text-on-surface-variant" />
              Histórico Recente de Convocações
            </h3>
            <button className="label-caps text-primary hover:underline">Ver Todos</button>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-high/20 label-caps text-on-surface-variant">
                    <th className="p-4">DATA/ALA</th>
                    <th className="p-4">MILITAR CONVOCADO</th>
                    <th className="p-4">FUNÇÃO COBERTA</th>
                    <th className="p-4">AUTORIZADO POR</th>
                    <th className="p-4 text-right">STATUS</th>
                  </tr>
                </thead>
                <tbody className="table-data divide-y divide-outline-variant">
                   {callHistory.map((item, i) => (
                      <tr key={i} className="hover:bg-surface-container-low transition-colors">
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="font-bold">{item.date}</span>
                            <span className="text-[10px] text-on-surface-variant">{item.ala}</span>
                          </div>
                        </td>
                        <td className="p-4 font-bold">{item.military}</td>
                        <td className="p-4">{item.role}</td>
                        <td className="p-4 text-on-surface-variant">{item.author}</td>
                        <td className="p-4 text-right">
                          <span className="bg-green-50 text-green-700 border border-green-200 label-caps px-3 py-1 rounded-md">CUMPRIDO</span>
                        </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </section>
      </div>
    </motion.div>
  );
}
