import React, { useState, useEffect } from 'react';
import { Plus, Search, Eye, ArrowLeftRight, CalendarRange, RotateCcw, Car } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { Ala, AbsenceType, Absence, Military, Regime } from '../types';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query, addDoc, updateDoc, doc, collectionGroup } from 'firebase/firestore';
import { getAlaOnDuty, isMilitaryScheduled } from '../lib/scales';
import { format, addDays, startOfDay, parseISO, isAfter, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Hierarchy: lower number = more senior
const RANK_ORDER: Record<string, number> = {
  '1º SGT BM': 1,
  '2º SGT BM': 2,
  '3º SGT BM': 3,
  'CB BM': 4,
  'SD BM': 5,
  'Sd BM': 5,
};

const getRankOrder = (posto: string): number => {
  if (RANK_ORDER[posto] !== undefined) return RANK_ORDER[posto];
  for (const [key, val] of Object.entries(RANK_ORDER)) {
    if (posto.startsWith(key.split(' ')[0])) return val;
  }
  return 99;
};

/** Calcula próximo dia de serviço a partir de hoje */
const getNextDutyDate = (m: Military): string | null => {
  const today = startOfDay(new Date());
  for (let i = 0; i <= 30; i++) {
    const d = addDays(today, i);
    if (isMilitaryScheduled(m, d)) {
      return format(d, "dd/MM", { locale: ptBR });
    }
  }
  return null;
};

/** Calcula ala em que o militar estará no próximo serviço */
const getNextDutyAla = (m: Military): Ala | null => {
  const today = startOfDay(new Date());
  for (let i = 0; i <= 30; i++) {
    const d = addDays(today, i);
    if (isMilitaryScheduled(m, d)) {
      return getAlaOnDuty(d);
    }
  }
  return null;
};

export function Militares() {
  const [militaries, setMilitaries] = useState<Military[]>([]);
  const [allAbsences, setAllAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
  const [selectedMilitary, setSelectedMilitary] = useState<Military | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAla, setFilterAla] = useState<Ala | 'Todas'>('Todas');

  const [absenceType, setAbsenceType] = useState<AbsenceType | 'Retorno'>('Férias');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Transfer state
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferRegime, setTransferRegime] = useState<Regime>('Ala');
  const [transferAla, setTransferAla] = useState<Ala>('A');
  const [transferStartDate, setTransferStartDate] = useState('');
  const [transferEffectiveDate, setTransferEffectiveDate] = useState('');

  // Load militaries
  useEffect(() => {
    const q = query(collection(db, 'militaries'));
    const unsub = onSnapshot(q, (snap) => {
      setMilitaries(snap.docs.map(d => ({ id: d.id, ...d.data() } as Military)));
      setLoading(false);
    }, (err) => {
      setError(err.message);
      setLoading(false);
      handleFirestoreError(err, OperationType.LIST, 'militaries');
    });
    return unsub;
  }, []);

  // Load all absences via collectionGroup
  useEffect(() => {
    const q = query(collectionGroup(db, 'absences'));
    const unsub = onSnapshot(q, (snap) => {
      setAllAbsences(snap.docs.map(d => ({ id: d.id, ...d.data() } as Absence)));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'absences');
    });
    return unsub;
  }, []);

  /** Retorna a ausência ativa hoje, se houver */
  const getActiveAbsenceToday = (m: Military): Absence | undefined => {
    const today = startOfDay(new Date());
    return allAbsences.find(abs => {
      if (abs.militaryId !== m.id) return false;
      try {
        const s = startOfDay(parseISO(abs.startDate));
        const e = startOfDay(parseISO(abs.endDate));
        return today >= s && today <= e;
      } catch { return false; }
    });
  };

  /** Verifica se o militar tem ausência ativa hoje */
  const hasActiveAbsenceToday = (m: Military): boolean => {
    return !!getActiveAbsenceToday(m);
  };

  /** Status calculado: Ativo se não há ausência ativa hoje */
  const getEffectiveStatus = (m: Military): 'Pronto' | 'Inativo' => {
    return hasActiveAbsenceToday(m) ? 'Inativo' : 'Pronto';
  };

  const handleAlaChange = async (id: string, newAla: Ala) => {
    try { await updateDoc(doc(db, 'militaries', id), { ala: newAla }); }
    catch (e) { handleFirestoreError(e, OperationType.UPDATE, `militaries/${id}`); }
  };

  const handleRegimeChange = async (id: string, newRegime: Regime) => {
    try { await updateDoc(doc(db, 'militaries', id), { regime: newRegime }); }
    catch (e: any) { alert(`Erro ao atualizar o regime no Firebase: ${e.message || e}`); handleFirestoreError(e, OperationType.UPDATE, `militaries/${id}`); }
  };

  const handleStartDateChange = async (id: string, date: string) => {
    try { await updateDoc(doc(db, 'militaries', id), { startCycleDate: date }); }
    catch (e) { handleFirestoreError(e, OperationType.UPDATE, `militaries/${id}`); }
  };

  const handleDriverToggle = async (id: string, isDriver: boolean) => {
    try {
      await updateDoc(doc(db, 'militaries', id), { isDriver: !isDriver });
    } catch (e: any) {
      alert(`Erro ao atualizar motorista no Firebase: ${e.message || e}`);
      handleFirestoreError(e, OperationType.UPDATE, `militaries/${id}`);
    }
  };

  const openAbsenceModal = (m: Military) => {
    setSelectedMilitary(m);
    setAbsenceType('Férias');
    setStartDate('');
    setEndDate('');
    setIsAbsenceModalOpen(true);
  };

  const openTransferModal = (m: Military) => {
    setSelectedMilitary(m);
    setTransferRegime(m.regime);
    setTransferAla(m.ala);
    setTransferStartDate(m.startCycleDate || '');
    setTransferEffectiveDate(format(new Date(), 'yyyy-MM-dd'));
    setIsTransferModalOpen(true);
  };

  const handleTransferConfirm = async () => {
    if (!selectedMilitary || !transferEffectiveDate) return;

    try {
      const historyEntry = {
        id: Date.now().toString(),
        date: transferEffectiveDate,
        regime: transferRegime,
        ala: transferAla,
        startCycleDate: transferStartDate
      };

      const updatedHistory = [...(selectedMilitary.regimeHistory || []), historyEntry];
      const isPastOrToday = startOfDay(parseISO(transferEffectiveDate)) <= startOfDay(new Date());

      const updatePayload: any = { regimeHistory: updatedHistory };
      if (isPastOrToday) {
         updatePayload.regime = transferRegime;
         updatePayload.ala = transferAla;
         updatePayload.startCycleDate = transferStartDate || null;
      }

      await updateDoc(doc(db, 'militaries', selectedMilitary.id), updatePayload);
      setIsTransferModalOpen(false);
    } catch (e: any) {
      alert(`Erro ao transferir escala: ${e.message || e}`);
      handleFirestoreError(e, OperationType.UPDATE, `militaries/${selectedMilitary.id}`);
    }
  };

  const handleAbsenceConfirm = async () => {
    if (!selectedMilitary) return;

    // Retorno à ativa / Sustar: corta a ausência atual e atualiza status
    if (absenceType === 'Retorno') {
      try {
        const activeAbs = getActiveAbsenceToday(selectedMilitary);
        if (activeAbs) {
          const originalEnd = startOfDay(parseISO(activeAbs.endDate));
          const today = startOfDay(new Date());
          const remaining = differenceInDays(originalEnd, today) + 1; // +1 includes today if interrupted today
          const todayStr = format(today, 'yyyy-MM-dd');

          await updateDoc(doc(db, `militaries/${selectedMilitary.id}/absences`, activeAbs.id), {
            endDate: todayStr,
            sustadaEm: todayStr,
            diasRestantes: remaining > 0 ? remaining : 0
          });
        }
        await updateDoc(doc(db, 'militaries', selectedMilitary.id), { status: 'Pronto' });
        setIsAbsenceModalOpen(false);
      } catch (e: any) {
        alert(`Erro ao atualizar o Firebase: ${e.message || e}`);
        handleFirestoreError(e, OperationType.UPDATE, `militaries/${selectedMilitary.id}`);
      }
      return;
    }

    if (!startDate || !endDate) return;

    try {
      await addDoc(collection(db, `militaries/${selectedMilitary.id}/absences`), {
        type: absenceType,
        startDate,
        endDate,
        militaryId: selectedMilitary.id,
      });

      // Só marcar como Inativo se o afastamento já começou hoje ou antes
      const today = startOfDay(new Date());
      const start = startOfDay(parseISO(startDate));
      if (!isAfter(start, today)) {
        await updateDoc(doc(db, 'militaries', selectedMilitary.id), { status: 'Inativo' });
      }
      // Se o afastamento é futuro, não alterar o status — o sistema calculará automaticamente

      setIsAbsenceModalOpen(false);
      setStartDate('');
      setEndDate('');
    } catch (e: any) {
      alert(`Erro ao salvar no Firebase: ${e.message || e}`);
      handleFirestoreError(e, OperationType.WRITE, `militaries/${selectedMilitary.id}/absences`);
    }
  };

  const filtered = [...militaries]
    .sort((a, b) => getRankOrder(a.posto) - getRankOrder(b.posto))
    .filter(m => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || m.nome.toLowerCase().includes(q) || m.posto.toLowerCase().includes(q);
      const matchAla = filterAla === 'Todas' || m.ala === filterAla;
      return matchSearch && matchAla;
    });

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
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-on-surface">Gestão de Militares</h1>
          <p className="text-on-surface-variant mt-1">Gerencie efetivo, alas e afastamentos temporários.</p>
        </div>
        <button className="bg-primary text-white label-caps px-6 py-3 rounded-md flex items-center gap-2 hover:bg-primary-container transition-all shadow-md active:scale-95">
          <Plus size={18} /> Adicionar Militar
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Buscar por Nome ou Posto..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-outline-variant rounded-md focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary table-data"
          />
        </div>
        <select
          value={filterAla}
          onChange={e => setFilterAla(e.target.value as Ala | 'Todas')}
          className="w-full md:w-48 px-3 py-2 bg-white border border-outline-variant rounded-md focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary table-data cursor-pointer"
        >
          <option value="Todas">Todas as Alas</option>
          <option value="A">Ala A</option>
          <option value="B">Ala B</option>
          <option value="C">Ala C</option>
          <option value="D">Ala D</option>
        </select>
      </div>

      {/* Tabela */}
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
                <th className="p-4 text-center">Ala / Próx. Serviço</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="table-data divide-y divide-outline-variant">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-on-surface-variant italic">
                    Nenhum militar encontrado.
                  </td>
                </tr>
              ) : filtered.map((m) => {
                const effectiveStatus = getEffectiveStatus(m);
                const nextDuty = getNextDutyDate(m);
                const nextAla = getNextDutyAla(m);

                return (
                  <tr key={m.id} className="hover:bg-surface-container-low transition-colors group">
                    {/* Ala color stripe */}
                    <td className="p-4 relative">
                      <div className={cn(
                        "absolute left-0 top-0 bottom-0 w-1.5",
                        m.ala === 'A' ? "bg-red-600" :
                          m.ala === 'B' ? "bg-blue-600" :
                            m.ala === 'C' ? "bg-green-600" : "bg-orange-600"
                      )} />
                    </td>

                    <td className="p-4 font-medium">{m.posto}</td>
                    <td className="p-4 font-bold">{m.nome}</td>

                    {/* Motorista */}
                    <td className="p-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <button
                          onClick={() => handleDriverToggle(m.id, !!m.isDriver)}
                          className={cn(
                            "p-2 rounded-full transition-all border",
                            m.isDriver
                              ? "bg-green-600 text-white border-green-600 shadow-sm"
                              : "bg-surface-container text-on-surface-variant border-outline-variant hover:border-green-600/50"
                          )}
                          title={m.isDriver ? "Remover Função de Motorista" : "Marcar como Motorista"}
                        >
                          <Car size={14} className={cn(m.isDriver && "text-white")} />
                        </button>
                        {m.isDriver && (
                          <span className="text-[8px] font-black label-caps text-green-700 leading-none">MOTORISTA</span>
                        )}
                      </div>
                    </td>

                    {/* Regime */}
                    <td className="p-4">
                      <select
                        value={m.regime}
                        onChange={(e) => handleRegimeChange(m.id, e.target.value as Regime)}
                        className="bg-surface-container-low border border-outline-variant rounded px-2 py-1 text-xs font-bold cursor-pointer"
                      >
                        <option value="Ala">Escala Ala (2x6)</option>
                        <option value="1x3">1x3 (24x72)</option>
                        <option value="2x6">2x6 (48x144)</option>
                        <option value="3x9">3x9 (72x216)</option>
                        <option value="4x12">4x12 (96x288)</option>
                      </select>
                    </td>

                    {/* Ala / Próximo Serviço */}
                    <td className="p-4 text-center">
                      {m.regime === 'Ala' ? (
                        <div className="flex flex-col items-center gap-1">
                          <select
                            value={m.ala}
                            onChange={(e) => handleAlaChange(m.id, e.target.value as Ala)}
                            className={cn(
                              "border rounded px-2 py-1 text-xs font-black transition-all cursor-pointer",
                              m.ala === 'A' ? "bg-red-50 border-red-300 text-red-700" :
                                m.ala === 'B' ? "bg-blue-50 border-blue-300 text-blue-700" :
                                  m.ala === 'C' ? "bg-green-50 border-green-300 text-green-700" :
                                    "bg-orange-50 border-orange-300 text-orange-700"
                            )}
                          >
                            <option value="A">Ala A</option>
                            <option value="B">Ala B</option>
                            <option value="C">Ala C</option>
                            <option value="D">Ala D</option>
                          </select>
                          {nextDuty && (
                            <span className="text-[9px] text-on-surface-variant font-semibold">
                              Próx: {nextDuty}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <input
                            type="date"
                            value={m.startCycleDate || ''}
                            onChange={(e) => handleStartDateChange(m.id, e.target.value)}
                            className="bg-white border border-outline-variant rounded px-2 py-1 text-[10px] font-bold"
                          />
                          {m.startCycleDate && nextDuty && (
                            <span className="text-[9px] text-on-surface-variant font-semibold">
                              Próx: {nextDuty}
                              {nextAla && (
                                <span className={cn(
                                  "ml-1 px-1 rounded text-white text-[7px]",
                                  nextAla === 'A' ? "bg-red-600" :
                                    nextAla === 'B' ? "bg-blue-600" :
                                      nextAla === 'C' ? "bg-green-600" : "bg-orange-600"
                                )}>
                                  ALA {nextAla}
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Status calculado */}
                    <td className="p-4">
                      {(() => {
                        const activeAbs = getActiveAbsenceToday(m);
                        const label = activeAbs ? activeAbs.type.toUpperCase() : 'ATIVO';
                        return (
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold border",
                            !activeAbs
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          )}>
                            {label}
                          </span>
                        );
                      })()}
                    </td>

                    {/* Ações */}
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-1">
                        {/* Retornar à ativa (apenas se estiver afastado) */}
                        {effectiveStatus === 'Inativo' && (
                          <button
                            onClick={() => {
                              setSelectedMilitary(m);
                              setAbsenceType('Retorno');
                              setIsAbsenceModalOpen(true);
                            }}
                            className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors border border-transparent hover:border-green-200"
                            title="Sustar Ausência / Retornar à Ativa"
                          >
                            <RotateCcw size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => openTransferModal(m)}
                          className="p-2 text-primary hover:bg-primary/10 rounded transition-colors"
                          title="Transferir Escala/Ala"
                        >
                          <ArrowLeftRight size={16} />
                        </button>
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
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Afastamento */}
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
                <h3 className="text-xl">
                  {absenceType === 'Retorno' ? 'Sustar Ausência (Retorno)' : 'Lançar Afastamento'}
                </h3>
                <p className="text-xs font-bold label-caps mt-1">
                  {selectedMilitary.posto} {selectedMilitary.nome}
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block label-caps text-on-surface-variant mb-1.5">Tipo</label>
                  <select
                    value={absenceType}
                    onChange={(e) => setAbsenceType(e.target.value as AbsenceType | 'Retorno')}
                    className="w-full p-2 border border-outline-variant rounded-md table-data"
                  >
                    <option value="Férias">Férias</option>
                    <option value="LESP">LESP (Licença Especial)</option>
                    <option value="Atestado">Atestado Médico</option>
                    <option value="Outros">Outros</option>
                    <option value="Retorno">Retorno à Ativa</option>
                  </select>
                </div>

                {absenceType !== 'Retorno' && (
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
                )}

                <div className={cn(
                  "p-4 rounded-lg border",
                  absenceType === 'Retorno'
                    ? "bg-green-50 border-green-100"
                    : "bg-blue-50 border-blue-100"
                )}>
                  <p className={cn(
                    "text-[11px] leading-relaxed italic",
                    absenceType === 'Retorno' ? "text-green-800" : "text-blue-800"
                  )}>
                    {absenceType === 'Retorno'
                      ? `* A ausência atual de ${selectedMilitary.nome} será cortada a partir de hoje. O militar será reativado e voltará à escala. O sistema calculará os dias restantes da licença.`
                      : `* O militar continuará na Ala ${selectedMilitary.ala}. Será removido das escalas durante o período informado. Se o afastamento for futuro, o status permanece ATIVO até o início.`
                    }
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
                  className={cn(
                    "text-white px-6 py-2 rounded-md label-caps transition-colors shadow-sm",
                    absenceType === 'Retorno'
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-primary hover:bg-primary-container"
                  )}
                >
                  CONFIRMAR
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Transferência */}
      <AnimatePresence>
        {isTransferModalOpen && selectedMilitary && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-outline-variant bg-surface-container-low text-blue-900">
                <h3 className="text-xl">Transferência de Escala</h3>
                <p className="text-xs font-bold label-caps mt-1">
                  {selectedMilitary.posto} {selectedMilitary.nome}
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block label-caps text-on-surface-variant mb-1.5">A partir de (Data Efetiva)</label>
                  <input
                    type="date"
                    value={transferEffectiveDate}
                    onChange={(e) => setTransferEffectiveDate(e.target.value)}
                    className="w-full p-2 border border-outline-variant rounded-md table-data"
                  />
                </div>

                <div>
                  <label className="block label-caps text-on-surface-variant mb-1.5">Novo Regime</label>
                  <select
                    value={transferRegime}
                    onChange={(e) => setTransferRegime(e.target.value as Regime)}
                    className="w-full p-2 border border-outline-variant rounded-md table-data"
                  >
                    <option value="Ala">Escala Ala (2x6)</option>
                    <option value="1x3">1x3 (24x72)</option>
                    <option value="2x6">2x6 (48x144)</option>
                    <option value="3x9">3x9 (72x216)</option>
                    <option value="4x12">4x12 (96x288)</option>
                  </select>
                </div>

                {transferRegime === 'Ala' ? (
                  <div>
                    <label className="block label-caps text-on-surface-variant mb-1.5">Nova Ala</label>
                    <select
                      value={transferAla}
                      onChange={(e) => setTransferAla(e.target.value as Ala)}
                      className="w-full p-2 border border-outline-variant rounded-md table-data"
                    >
                      <option value="A">Ala A</option>
                      <option value="B">Ala B</option>
                      <option value="C">Ala C</option>
                      <option value="D">Ala D</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block label-caps text-on-surface-variant mb-1.5">Data Início do Novo Ciclo</label>
                    <input
                      type="date"
                      value={transferStartDate}
                      onChange={(e) => setTransferStartDate(e.target.value)}
                      className="w-full p-2 border border-outline-variant rounded-md table-data"
                    />
                  </div>
                )}
                
                <div className="p-4 rounded-lg border bg-amber-50 border-amber-100">
                  <p className="text-[11px] leading-relaxed italic text-amber-800">
                    * A escala atual será mantida até o dia anterior à Data Efetiva. A partir da Data Efetiva, o novo regime entrará em vigor, preservando o histórico passado.
                  </p>
                </div>
              </div>

              <div className="p-6 bg-surface-container-low flex justify-end gap-3">
                <button
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold label-caps text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  CANCELAR
                </button>
                <button
                  onClick={handleTransferConfirm}
                  className="bg-primary hover:bg-primary-container text-white px-6 py-2 rounded-md label-caps transition-colors shadow-sm"
                >
                  GRAVAR
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
