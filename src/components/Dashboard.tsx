import React, { useState, useEffect } from 'react';
import { FileDown, Table, TrendingUp, Minus, TrendingDown, Flame, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { Link } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query, collectionGroup } from 'firebase/firestore';
import { Military, Absence } from '../types';
import { getYear, eachDayOfInterval } from 'date-fns';
import { isMilitaryOnDuty } from '../lib/scales';

const stats = [
  { label: 'Ala A - Serviços', value: '342', trend: '+5% vs 2022', trendType: 'up', icon: Flame, color: 'text-primary' },
  { label: 'Ala B - Serviços', value: '338', trend: 'Estável vs 2022', trendType: 'neutral', icon: Flame, color: 'text-secondary' },
  { label: 'Ala C - Serviços', value: '350', trend: '-2% vs 2022', trendType: 'down', icon: Flame, color: 'text-tertiary' },
];

const criticalAlerts = [
  { date: '12/08/2023', shift: 'Ala A', role: 'Motorista ABT', desc: 'Falta sem cobertura prévia. Remanejamento emergencial da Ala B.', severity: 'high' },
  { date: '05/09/2023', shift: 'Ala C', role: 'Ch. Guarnição', desc: 'Atestado médico de última hora. Coberto por hora extra.', severity: 'medium' },
  { date: '21/10/2023', shift: 'Ala B', role: 'Resgatista', desc: 'Efetivo mínimo não atingido. Viatura UR inoperante no turno.', severity: 'high' },
];

export function Dashboard() {
  const [militaries, setMilitaries] = useState<Military[]>([]);
  const [allAbsences, setAllAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(getYear(new Date()));

  useEffect(() => {
    const q = query(collection(db, 'militaries'));
    const unsub = onSnapshot(q, (snap) => {
      setMilitaries(snap.docs.map(d => ({ id: d.id, ...d.data() } as Military)));
      setLoading(false);
    }, (err) => {
      setLoading(false);
      handleFirestoreError(err, OperationType.LIST, 'militaries');
    });
    
    const unsubAbs = onSnapshot(query(collectionGroup(db, 'absences')), (snap) => {
      setAllAbsences(snap.docs.map(d => ({ id: d.id, ...d.data() } as Absence)));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'absences');
    });

    return () => {
      unsub();
      unsubAbs();
    };
  }, []);

  const rankingData = React.useMemo(() => {
    if (militaries.length === 0) return [];
    
    // Calcula o ano atual vs ano selecionado
    const isCurrentYear = selectedYear === getYear(new Date());
    // Se for o ano atual, só conta até hoje para não inflar serviços futuros irreais, ou conta o ano todo?
    // A regra padrão é contar o ano todo escalado.
    const daysInYear = eachDayOfInterval({ 
      start: new Date(selectedYear, 0, 1), 
      end: new Date(selectedYear, 11, 31) 
    });
    
    return militaries.map(m => {
      let total = 0;
      let extras = 0; // Ainda não integrado
      let faults = 0;
      
      faults = allAbsences.filter(a => a.militaryId === m.id && new Date(a.startDate).getFullYear() === selectedYear).length;
      
      daysInYear.forEach(day => {
        if (isMilitaryOnDuty(m, day, allAbsences)) {
          total++;
        }
      });

      return { ...m, total, extras, faults };
    }).sort((a, b) => b.total - a.total);
  }, [militaries, allAbsences, selectedYear]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-on-surface">Resumo Anual de Escalas</h1>
          <div className="flex items-center gap-3 mt-1">
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-white border border-outline-variant rounded-md px-2 py-1 text-sm font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/20 cursor-pointer"
            >
              {Array.from({ length: 5 }, (_, i) => getYear(new Date()) - 1 + i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <p className="text-on-surface-variant text-sm">Visão consolidada de serviços e coberturas de {selectedYear}.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-white border border-outline-variant px-4 py-2 rounded text-xs font-semibold hover:bg-surface-container-high transition-colors">
            <FileDown size={16} /> Exportar PDF
          </button>
          <button className="flex items-center gap-2 bg-white border border-outline-variant px-4 py-2 rounded text-xs font-semibold hover:bg-surface-container-high transition-colors">
            <Table size={16} /> Exportar Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white border border-outline-variant p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <span className="label-caps text-on-surface-variant">{stat.label}</span>
              <stat.icon className={stat.color} size={20} fill="currentColor" fillOpacity={0.2} />
            </div>
            <div className="text-4xl font-bold text-on-surface">{stat.value}</div>
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium mt-2",
              stat.trendType === 'up' ? "text-green-600" : stat.trendType === 'down' ? "text-red-500" : "text-on-surface-variant"
            )}>
              {stat.trendType === 'up' && <TrendingUp size={14} />}
              {stat.trendType === 'down' && <TrendingDown size={14} />}
              {stat.trendType === 'neutral' && <Minus size={14} />}
              {stat.trend}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-white border border-outline-variant rounded-lg overflow-hidden flex flex-col shadow-sm">
          <div className="p-4 border-b border-outline-variant bg-surface-container-lowest">
            <h3 className="text-on-surface">Ranking de Militares</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-high/30 border-b border-outline-variant uppercase text-[11px] font-bold text-on-surface-variant">
                  <th className="p-4">Posto/Grad</th>
                  <th className="p-4">Nome Guerra</th>
                  <th className="p-4 text-center">Serviços Totais</th>
                  <th className="p-4 text-center">Extras (HT)</th>
                  <th className="p-4 text-center">Faltas</th>
                </tr>
              </thead>
              <tbody className="table-data divide-y divide-outline-variant">
                {loading ? (
                  <tr><td colSpan={5} className="p-8 text-center text-on-surface-variant italic">Carregando...</td></tr>
                ) : rankingData.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-on-surface-variant italic">Nenhum militar cadastrado.</td></tr>
                ) : rankingData.map((m) => (
                  <tr key={m.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="p-4">{m.posto}</td>
                    <td className="p-4 font-bold">{m.nome}</td>
                    <td className="p-4 text-center font-bold">{m.total}</td>
                    <td className="p-4 text-center">
                      <span className="bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded">
                        {m.extras}
                      </span>
                    </td>
                    <td className="p-4 text-center">{m.faults}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white border border-outline-variant rounded-lg flex flex-col shadow-sm">
          <div className="p-4 border-b border-outline-variant bg-surface-container-lowest flex items-center justify-between">
            <h3 className="flex items-center gap-2">
              <AlertTriangle className="text-primary" size={18} />
              Buracos na Escala
            </h3>
            <span className="bg-red-50 text-primary label-caps px-2 py-1 rounded">5 Ocorrências</span>
          </div>
          <div className="p-4 space-y-4">
            {criticalAlerts.map((alert, i) => (
              <div key={i} className={cn(
                "p-3 bg-white border border-outline-variant rounded-md relative pl-5",
                alert.severity === 'high' ? "status-bar-red" : "status-bar-orange"
              )}>
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-bold text-on-surface">{alert.date} - {alert.shift}</span>
                  <span className="label-caps text-on-surface-variant">{alert.role}</span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">{alert.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-auto p-4 border-t border-outline-variant bg-surface-container-low/50">
            <Link to="/relatorios" className="block w-full text-center text-xs font-bold text-secondary hover:text-blue-900 transition-colors">
              VER RELATÓRIO COMPLETO
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
