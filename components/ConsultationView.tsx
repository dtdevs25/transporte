
import React, { useState } from 'react';
import { Declaration } from '../types';
import { SearchIcon, EyeIcon, Trash2Icon, FilterIcon, CalendarIcon, CheckCircle2Icon, AlertCircleIcon } from 'lucide-react';

interface Props {
  history: Declaration[];
  onSelect: (d: Declaration) => void;
  onDelete: (id: string) => void;
}

export const ConsultationView: React.FC<Props> = ({ history, onSelect, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = history.filter(d => 
    d.number.includes(searchTerm) || 
    d.sender.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.carrier.companyName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Histórico</h2>
          <p className="text-zinc-500 font-medium mt-1">Gerencie suas declarações e acompanhe assinaturas.</p>
        </div>
        <div className="relative w-full md:w-[400px]">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Buscar por Nº, Nome ou Transportadora..." 
            className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-zinc-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-2xl shadow-zinc-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/80 border-b border-zinc-100">
                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Número</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Data de Coleta</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Remetente / Transportadora</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Assinaturas</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-32 text-center text-zinc-400">
                    <div className="flex flex-col items-center gap-4">
                       <div className="p-4 bg-zinc-50 rounded-full">
                         <SearchIcon className="w-10 h-10 opacity-20" />
                       </div>
                       <p className="font-bold uppercase tracking-widest text-[11px]">Nenhum registro encontrado</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(d => (
                  <tr key={d.id} className="hover:bg-zinc-50/50 transition-all group">
                    <td className="px-8 py-6 font-mono font-black text-zinc-900 text-lg">#{d.number}</td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-sm font-semibold text-zinc-600">
                        <CalendarIcon className="w-4 h-4 opacity-40" />
                        {d.carrier.collectionDate ? new Date(d.carrier.collectionDate).toLocaleDateString('pt-BR') : '--/--/--'}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-sm font-black text-zinc-900">{d.sender.name}</div>
                      <div className="text-[11px] text-zinc-500 font-bold uppercase tracking-tight mt-0.5">{d.carrier.companyName}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex gap-2">
                         <SignatureBadge active={!!d.signatureSender} label="Rem." />
                         <SignatureBadge active={!!d.signatureCarrier} label="Mot." />
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                        <button 
                          onClick={() => onSelect(d)}
                          className="p-3 bg-white hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-xl shadow-sm border border-zinc-100 transition-all"
                          title="Visualizar"
                        >
                          <EyeIcon className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => onDelete(d.id)}
                          className="p-3 bg-white hover:bg-red-500 text-zinc-400 hover:text-white rounded-xl shadow-sm border border-zinc-100 transition-all"
                          title="Excluir"
                        >
                          <Trash2Icon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const SignatureBadge: React.FC<{ active: boolean; label: string }> = ({ active, label }) => (
  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${active ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-400'}`}>
    {active ? <CheckCircle2Icon className="w-3.5 h-3.5" /> : <AlertCircleIcon className="w-3.5 h-3.5 opacity-40" />}
    {label}
  </div>
);
