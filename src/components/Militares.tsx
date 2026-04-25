import React, { useState, useEffect } from 'react';
import { Plus, Search, ChevronLeft, ChevronRight, Eye, UserMinus, ArrowLeftRight, CalendarRange, UserPlus, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { Ala, AbsenceType, Military, Regime } from '../types';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { INITIAL_MILITARIES } from '../constants';
import { collection, onSnapshot, query, addDoc, updateDoc, doc, deleteDoc, setDoc } from 'firebase/firestore';

export function Militares() {
  const [militaries, setMilitaries] = useState<Military[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
  const [selectedMilitary, setSelectedMilitary] = useState<Military | null>(null);
  
  const [absenceType, setAbsenceType] = useState<AbsenceType>('Férias');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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

  const seedData = async () => {
    try {
      for (const m of INITIAL_MILITARIES) {
        const { id, ...data } = m;
        await setDoc(doc(db, 'militaries', id), data);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'militaries/seed');
    }
  };

  const handleAlaChange = async (id: string, newAla: Ala) => {
    try {
      await updateDoc(doc(db, 'militaries', id), { ala: newAla });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `militaries/${id}`);
    }
  };

  const handleRegimeChange = async (id: string, newRegime: Regime) => {
    try {
      await updateDoc(doc(db, 'militaries', id), { regime: newRegime });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `militaries/${id}`);
    }
  };

  const handleStartDateChange = async (id: string, date: string) => {
    try {
      await updateDoc(doc(db, 'militaries', id), { startCycleDate: date });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `militaries/${id}`);
    }
  };

  const handleDriverToggle = async (id: string, isDriver: boolean) => {
    try {
      await updateDoc(doc(db, 'militaries', id), { isDriver: !isDriver });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `militaries/${id}`);
    }
  };

  const openAbsenceModal = (m: Military) => {
    setSelectedMilitary(m);
    setIsAbsenceModalOpen(true);
  };

  const handleAbsenceConfirm = async () => {
    if (!selectedMilitary || !startDate || !endDate) return;

    try {
      // Add absence to subcollection
      await addDoc(collection(db, `militaries/${selectedMilitary.id}/absences`), {
        type: absenceType,
        startDate,
        endDate,
        militaryId: selectedMilitary.id
      });

      // Update military status to Inativo
      await updateDoc(doc(db, 'militaries', selectedMilitary.id), {
        status: 'Inativo'
      });

      setIsAbsenceModalOpen(false);
      setStartDate('');
      setEndDate('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `militaries/${selectedMilitary.id}/absences`);
    }
  };

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
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-on-surface">Gestão de Militares</h1>
          <p className="text-on-surface-variant mt-1">Gerencie efetivo, alas e afastamentos temporários.</p>
        </div>
        <div className="flex gap-3">
          {militaries.length === 0 && (
            <button 
              onClick={seedData}
              className="bg-secondary text-white label-caps px-6 py-3 rounded-md flex items-center gap-2 hover:bg-secondary/90 transition-all shadow-md active:scale-95"
            >
              <Clock size={18} /> Carregar Lista Inicial
            </button>
          )}
          <button className="bg-primary text-white label-caps px-6 py-3 rounded-md flex items-center gap-2 hover:bg-primary-container transition-all shadow-md active:scale-95">
            <Plus size={18} /> Adicionar Militar
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
            <Search size={18} />
          </div>
          <input 
            type="text" 
            placeholder="Buscar por Nome, RE ou Posto..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-outline-variant rounded-md focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary table-data"
          />
        </div>
        <select className="w-full md:w-48 px-3 py-2 bg-white border border-outline-variant rounded-md focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary table-data cursor-pointer">
          <option>Todas as Alas</option>
          <option>Ala A</option>
          <option>Ala B</option>
          <option>Ala C</option>
          <option>Ala D</option>
        </select>
      </div>

      <div className="bg-white border border-outline-variant rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-high/30 border-b border-outline-variant text-on-surface-variant label-caps">
                <th className="p-4 w-1"></th>
                <th className="p-4">Posto</th>
                <th className="p-4">Nome</th>
                <th className="p-4 text-center">Motorista</th>
                <th className="p-4">Regime / Escala</th>
                <th className="p-4 text-center">Ala / Início Ciclo</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="table-data divide-y divide-outline-variant">
              {militaries.map((m) => (
                <tr key={m.id} className="hover:bg-surface-container-low transition-colors group">
                  <td className="p-4 relative">
                    <div className={cn(
                      "absolute left-0 top-0 bottom-0 w-1.5",
                      m.ala === 'A' ? "bg-red-600" : 
                      m.ala === 'B' ? "bg-blue-600" : 
                      m.ala === 'C' ? "bg-green-600" : "bg-orange-600"
                    )} />
                  </td>
                  <td className="p-4">{m.posto}</td>
                  <td className="p-4 font-bold">{m.nome}</td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleDriverToggle(m.id, !!m.isDriver)}
                      className={cn(
                        "p-2 rounded-full transition-all border",
                        m.isDriver 
                          ? "bg-primary text-white border-primary shadow-sm" 
                          : "bg-surface-container text-on-surface-variant border-outline-variant hover:border-primary/50"
                      )}
                      title={m.isDriver ? "Remover Função de Motorista" : "Marcar como Motorista"}
                    >
                      <ArrowLeftRight size={14} className={cn(m.isDriver && "rotate-90")} />
                    </button>
                  </td>
                  <td className="p-4">
                    <select 
                      value={m.regime} 
                      onChange={(e) => handleRegimeChange(m.id, e.target.value as Regime)}
                      className="bg-surface-container-low border border-outline-variant rounded px-2 py-1 text-xs font-bold cursor-pointer"
                    >
                      <option value="Ala">Escala Ala (24x72)</option>
                      <option value="1x3">1x3 (24x72)</option>
                      <option value="2x6">2x6 (48x144)</option>
                      <option value="3x9">3x9 (72x216)</option>
                      <option value="4x12">4x12 (96x288)</option>
                    </select>
                  </td>
                  <td className="p-4 text-center">
                    {m.regime === 'Ala' ? (
                      <select 
                        value={m.ala} 
                        onChange={(e) => handleAlaChange(m.id, e.target.value as Ala)}
                        className="bg-transparent border border-transparent hover:border-outline-variant rounded px-2 py-1 text-xs font-bold transition-all cursor-pointer"
                      >
                        <option value="A">Ala A</option>
                        <option value="B">Ala B</option>
                        <option value="C">Ala C</option>
                        <option value="D">Ala D</option>
                      </select>
                    ) : (
                      <input 
                        type="date" 
                        value={m.startCycleDate || ''}
                        onChange={(e) => handleStartDateChange(m.id, e.target.value)}
                        className="bg-white border border-outline-variant rounded px-2 py-1 text-[10px] font-bold"
                      />
                    )}
                  </td>
                  <td className="p-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold border",
                      m.status === 'Pronto' ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
                    )}>
                      {m.status === 'Pronto' ? 'ATIVO' : 'AFASTADO'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => openAbsenceModal(m)}
                        className="p-2 text-secondary hover:bg-secondary/10 rounded transition-colors" 
                        title="Registrar Afastamento (Férias/Licença)"
                      >
                        <CalendarRange size={16} />
                      </button>
                      <button className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded transition-colors">
                        <Eye size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isAbsenceModalOpen && selectedMilitary && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-outline-variant bg-surface-container-low text-blue-900">
                <h3 className="text-xl">Lançar Afastamento</h3>
                <p className="text-xs font-bold label-caps mt-1">{selectedMilitary.posto} {selectedMilitary.nome}</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block label-caps text-on-surface-variant mb-1.5">Tipo de Licença</label>
                  <select 
                    value={absenceType}
                    onChange={(e) => setAbsenceType(e.target.value as AbsenceType)}
                    className="w-full p-2 border border-outline-variant rounded-md table-data"
                  >
                    <option value="Férias">Férias</option>
                    <option value="LESP">LESP (Licença Especial)</option>
                    <option value="Atestado">Atestado Médico</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block label-caps text-on-surface-variant mb-1.5">Início</label>
                    <input 
                      type="date" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full p-2 border border-outline-variant rounded-md table-data" 
                    />
                  </div>
                  <div>
                    <label className="block label-caps text-on-surface-variant mb-1.5">Fim</label>
                    <input 
                      type="date" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full p-2 border border-outline-variant rounded-md table-data" 
                    />
                  </div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                   <p className="text-[11px] text-blue-800 leading-relaxed italic">
                     * Ao confirmar, o militar continuará pertencendo à <b>Ala {selectedMilitary.ala}</b>, mas será removido automaticamente das escalas durante o período selecionado.
                   </p>
                </div>
              </div>
              <div className="p-6 bg-surface-container-low flex justify-end gap-3">
                <button 
                  onClick={() => setIsAbsenceModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold label-caps text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  CANCELAR
                </button>
                <button 
                  onClick={handleAbsenceConfirm}
                  className="bg-primary text-white px-6 py-2 rounded-md label-caps hover:bg-primary-container transition-colors shadow-sm"
                >
                  CONFIRMAR
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

