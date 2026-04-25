import React, { useState } from 'react';
import { AlertTriangle, Filter, History, CheckCircle, Info, Briefcase, Plus, UserSearch } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';

const needs = [
  { id: 1, date: '24 OUT 2023', title: 'Ala A - Prontidão', status: 'CRÍTICO', severity: 'error', role: 'Cmt Guarnição (Sgt/SubTen)', selected: true },
  { id: 2, date: '25 OUT 2023', title: 'Ala B - Resgate', status: 'MÉDIA', severity: 'medium', role: 'Motorista (Condutor VTR)', selected: false },
  { id: 3, date: '26 OUT 2023', title: 'Ala C - Prontidão', status: 'MÉDIA', severity: 'medium', role: 'Combatente (Cb/Sd)', selected: false },
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
  const [selectedNeed, setSelectedNeed] = useState(1);
  const [selectedMilitary, setSelectedMilitary] = useState(1);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex justify-between items-end pb-4 border-b border-outline-variant">
        <div>
          <h1 className="text-on-surface">Painel de Plantões Extras</h1>
          <p className="text-on-surface-variant mt-1">Gerenciamento de necessidades operacionais e convocação de efetivo de folga.</p>
        </div>
        <button className="bg-white border border-outline-variant px-4 py-2 rounded-md label-caps text-on-surface hover:bg-surface-container transition-all flex items-center gap-2">
          <Filter size={16} /> FILTRAR DATAS
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Necessidades */}
        <section className="lg:col-span-7 bg-white border border-outline-variant rounded-lg flex flex-col h-[600px] overflow-hidden shadow-sm">
          <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low/30">
            <h2 className="flex items-center gap-2">
              <AlertTriangle className="text-primary fill-current" size={20} />
              Necessidades de Cobertura
            </h2>
            <span className="bg-red-50 text-primary border border-red-200 label-caps px-3 py-1 rounded-full">3 PENDENTES</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
             {needs.map((need) => (
                <div 
                  key={need.id}
                  onClick={() => setSelectedNeed(need.id)}
                  className={cn(
                    "relative group cursor-pointer border rounded-lg transition-all p-4 pl-6 overflow-hidden",
                    selectedNeed === need.id ? "bg-surface-container-low border-primary shadow-sm" : "border-outline-variant hover:bg-surface-container-low/50"
                  )}
                >
                  <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-2 shadow-inner",
                    need.severity === 'error' ? "bg-primary" : "bg-tertiary"
                  )} />
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-baseline gap-3">
                      <span className="px-2 py-0.5 bg-surface-container-highest rounded text-[10px] font-bold text-on-surface-variant uppercase">{need.date}</span>
                      <h3 className="text-lg">{need.title}</h3>
                    </div>
                    <span className={cn(
                      "label-caps px-2 py-0.5 rounded border",
                      need.severity === 'error' ? "bg-red-50 text-primary border-red-200" : "bg-blue-50 text-tertiary border-blue-200"
                    )}>
                      {need.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                     <div className="flex items-center gap-2 text-on-surface">
                        <UserSearch size={18} className="text-on-surface-variant" />
                        <p className="table-data font-semibold">AUSENTE: {need.role}</p>
                     </div>
                     {selectedNeed === need.id && <span className="label-caps text-primary">SELECIONADO</span>}
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
