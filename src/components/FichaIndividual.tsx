import React, { useState, useEffect } from 'react';
import { Verified, Calendar, Clock, Download, ChevronRight, FileText, PlusCircle, History, Briefcase, Syringe, User, Flame } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { Military } from '../types';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';

const firemanAvatars = [
  "https://images.unsplash.com/photo-1599059813005-11265ba4b4ce?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1627389955609-70bd31e67001?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1444927714506-8492d94b4e3d?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1605339560497-22fca59021e1?q=80&w=200&auto=format&fit=crop",
];

export function FichaIndividual() {
  const [militaries, setMilitaries] = useState<Military[]>([]);
  const [selectedMilitary, setSelectedMilitary] = useState<Military | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'militaries'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Military));
      setMilitaries(docs);
      if (docs.length > 0 && !selectedMilitary) {
        setSelectedMilitary(docs[0]);
      }
      setLoading(false);
    }, (error) => {
      setError(error.message);
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, 'militaries');
    });
    return unsubscribe;
  }, []);

  const getRandomAvatar = (id: string = '') => {
    const index = id.length % firemanAvatars.length;
    return firemanAvatars[index];
  };

  if (loading) {
    return <div className="flex justify-center p-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  if (!selectedMilitary) {
    return (
      <div className="p-8 text-center bg-surface-container-low border border-outline-variant rounded-xl m-6">
        <p className="text-on-surface-variant italic">Nenhum militar encontrado ou carregando...</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container-low p-4 rounded-xl border border-outline-variant">
        <div className="flex items-center gap-3 text-on-surface">
          <User className="text-primary" />
          <span className="font-bold label-caps">Selecionar Militar:</span>
        </div>
        <select 
          value={selectedMilitary?.id}
          onChange={(e) => {
            const m = militaries.find(m => m.id === e.target.value);
            if (m) setSelectedMilitary(m);
          }}
          className="w-full md:w-64 p-2 bg-white border border-outline-variant rounded-lg font-bold text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm"
        >
          {militaries.map(m => (
            <option key={m.id} value={m.id}>{m.posto} {m.nome}</option>
          ))}
        </select>
      </div>

      {/* Header Profile Card */}
      <div className="bg-white border border-outline-variant rounded-lg p-8 shadow-sm flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-2 bg-primary"></div>
        <div className="shrink-0 relative">
          <div className="w-32 h-32 rounded-full border-4 border-surface-container-high bg-surface-container overflow-hidden shadow-sm flex items-center justify-center">
            <img 
              src={getRandomAvatar(selectedMilitary.id)} 
              alt="Perfil" 
              className="w-full h-full object-cover grayscale brightness-90 hover:grayscale-0 transition-all duration-500"
            />
          </div>
          <div className="absolute bottom-1 right-1 w-8 h-8 bg-white border border-outline-variant rounded-full flex items-center justify-center text-primary shadow-sm">
            <Verified size={18} />
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
            <div className="flex flex-col md:items-end gap-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-surface-container text-on-surface label-caps border border-outline-variant rounded-md">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Pronto para o Serviço
              </span>
              <p className="text-xs text-on-surface-variant">Matrícula: {Math.floor(Math.random() * 900000 + 100000)}-{Math.floor(Math.random() * 9)}</p>
            </div>
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
              <span className="block label-caps text-on-surface-variant mb-1">Lotação</span>
              <span className="font-semibold text-on-surface">1º BBM - Centro</span>
            </div>
            <div>
              <span className="block label-caps text-on-surface-variant mb-1">Início do Ciclo</span>
              <span className="font-semibold text-on-surface">{selectedMilitary.startCycleDate || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-outline-variant p-6 rounded-lg flex items-center gap-4 shadow-sm">
          <div className="w-14 h-14 rounded bg-surface-container flex items-center justify-center text-primary">
            <FileText size={28} />
          </div>
          <div>
            <h3 className="label-caps text-on-surface-variant leading-none mb-1">Total de Serviços no Ano</h3>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-on-surface">142</span>
              <span className="text-xs text-on-surface-variant">turnos</span>
            </div>
          </div>
        </div>
        <div className="bg-white border border-outline-variant p-6 rounded-lg flex items-center gap-4 shadow-sm">
          <div className="w-14 h-14 rounded bg-surface-container flex items-center justify-center text-secondary">
            <PlusCircle size={28} />
          </div>
          <div>
            <h3 className="label-caps text-on-surface-variant leading-none mb-1">Plantões Extras (Ano)</h3>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-on-surface">28</span>
              <span className="text-xs text-on-surface-variant">horas</span>
            </div>
          </div>
        </div>
        <div className="bg-white border border-outline-variant p-6 rounded-lg flex items-center gap-4 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1 bg-red-500 opacity-30"></div>
          <div className="w-14 h-14 rounded bg-red-50 flex items-center justify-center text-red-600">
            <Syringe size={28} />
          </div>
          <div>
            <h3 className="label-caps text-on-surface-variant leading-none mb-1">Dias de Afastamento</h3>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-red-600">15</span>
              <span className="text-xs text-on-surface-variant">dias (LTS)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 bg-white border border-outline-variant rounded-lg shadow-sm">
          <div className="p-6 border-b border-outline-variant flex items-center justify-between">
            <h2 className="text-lg">Serviços Recentes</h2>
            <button className="text-on-surface-variant hover:text-primary transition-colors">
              <History size={20} />
            </button>
          </div>
          <div className="p-6">
            <div className="relative border-l-2 border-outline-variant/50 ml-2.5 pb-2">
              <div className="mb-8 ml-6 relative">
                <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 bg-primary rounded border-2 border-white shadow-sm" />
                <div className="bg-surface-container-low p-4 rounded-md border border-outline-variant border-l-4 border-l-primary">
                  <span className="label-caps text-[10px] text-on-surface-variant">24 Out 2023 • 08:00 - 08:00</span>
                  <h4 className="font-bold text-on-surface mt-1">Guarnição de Combate</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5 whitespace-pre-wrap">Ala B • Viatura ABT-14</p>
                </div>
              </div>
              <div className="mb-8 ml-6 relative">
                <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 bg-secondary rounded border-2 border-white shadow-sm" />
                <div className="bg-surface-container-low p-4 rounded-md border border-outline-variant border-l-4 border-l-secondary">
                  <span className="label-caps text-[10px] text-on-surface-variant">21 Out 2023 • 18:00 - 06:00</span>
                  <h4 className="font-bold text-on-surface mt-1">Plantão Extra (Reforço)</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5 whitespace-pre-wrap">Ala A • COBOM</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 bg-white border border-outline-variant rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b border-outline-variant flex items-center justify-between">
            <h2 className="text-lg">Histórico de Mudanças de Ala</h2>
            <button className="flex items-center gap-2 border border-secondary text-secondary px-3 py-1.5 rounded-md text-xs font-bold label-caps hover:bg-secondary/5 transition-colors">
              <Download size={14} /> Exportar
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-high/30 border-b border-outline-variant label-caps text-on-surface-variant">
                  <th className="p-4 pl-6">Data da Mudança</th>
                  <th className="p-4">Ala Anterior</th>
                  <th className="p-4">Nova Ala</th>
                  <th className="p-4">Motivo</th>
                  <th className="p-4 text-right pr-6">BG / Pub.</th>
                </tr>
              </thead>
              <tbody className="table-data divide-y divide-outline-variant">
                <tr className="hover:bg-surface-container-low transition-colors">
                  <td className="p-4 pl-6">10/01/2023</td>
                  <td className="p-4">Ala A</td>
                  <td className="p-4 font-bold text-secondary">Ala B</td>
                  <td className="p-4 text-on-surface-variant">Readequação de Efetivo</td>
                  <td className="p-4 text-right pr-6">BG Nº 012/23</td>
                </tr>
                <tr className="hover:bg-surface-container-low transition-colors">
                  <td className="p-4 pl-6">15/05/2021</td>
                  <td className="p-4">Ala C</td>
                  <td className="p-4 font-bold">Ala A</td>
                  <td className="p-4 text-on-surface-variant">Término de Curso de Especialização</td>
                  <td className="p-4 text-right pr-6">BG Nº 098/21</td>
                </tr>
                <tr className="hover:bg-surface-container-low transition-colors">
                  <td className="p-4 pl-6">02/02/2019</td>
                  <td className="p-4">Expediente</td>
                  <td className="p-4 font-bold">Ala C</td>
                  <td className="p-4 text-on-surface-variant">Retorno à Atividade Fim</td>
                  <td className="p-4 text-right pr-6">BG Nº 024/19</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
