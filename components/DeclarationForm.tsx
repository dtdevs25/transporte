
import React, { useState } from 'react';
import { SenderData, CarrierData, Equipment } from '../types';
import { PlusCircle, Trash2, EraserIcon } from 'lucide-react';

interface Props {
  onGenerate: (data: { sender: SenderData; carrier: CarrierData; equipment: Equipment[] }) => void;
  initialSender: SenderData;
  initialCarrier: CarrierData;
  initialEquipment: Equipment[];
}

export const DeclarationForm: React.FC<Props> = ({ onGenerate, initialSender, initialCarrier, initialEquipment }) => {
  const [sender, setSender] = useState<SenderData>(initialSender);
  const [carrier, setCarrier] = useState<CarrierData>(initialCarrier);
  const [equipment, setEquipment] = useState<Equipment[]>(initialEquipment);

  const handleAddEquipment = () => {
    setEquipment([...equipment, { description: '', model: '', serialNumber: '', unitValue: 0 }]);
  };

  const handleRemoveEquipment = (index: number) => {
    setEquipment(equipment.filter((_, i) => i !== index));
  };

  const handleEquipmentChange = (index: number, field: keyof Equipment, value: any) => {
    const updated = [...equipment];
    updated[index] = { ...updated[index], [field]: value };
    setEquipment(updated);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.confirm("Deseja realmente apagar todos os dados deste formulário?")) {
      // Limpeza total de todos os campos
      setSender({
        name: '',
        cpf: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        contact: '',
        phone: '',
        email: '',
        companyName: '',
      });
      setCarrier({
        driverName: '',
        rg: '',
        collectionDate: '', // Limpa a data também
        companyName: '',
      });
      setEquipment([{ description: '', model: '', serialNumber: '', unitValue: 0 }]);
    }
  };

  return (
    <div className="p-6 md:p-10 space-y-12">
      {/* Sender Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
             <div className="h-6 w-1.5 bg-zinc-900 rounded-full"></div>
             <h3 className="text-xs font-black text-zinc-900 uppercase tracking-[0.15em]">Remetente (Pessoa Física)</h3>
          </div>
          <button 
            type="button"
            onClick={handleClear}
            className="flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
          >
            <EraserIcon className="w-4 h-4" /> Limpar
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-2">
            <FormField label="Nome Completo" value={sender.name} onChange={(v) => setSender({ ...sender, name: v })} />
          </div>
          <FormField label="CPF" value={sender.cpf} onChange={(v) => setSender({ ...sender, cpf: v })} />
          <FormField label="Razão Social" value={sender.companyName} onChange={(v) => setSender({ ...sender, companyName: v })} />
          
          <div className="md:col-span-2 lg:col-span-3">
            <FormField label="Endereço Completo" value={sender.address} onChange={(v) => setSender({ ...sender, address: v })} />
          </div>
          <FormField label="CEP" value={sender.zipCode} onChange={(v) => setSender({ ...sender, zipCode: v })} />
          
          <FormField label="Município" value={sender.city} onChange={(v) => setSender({ ...sender, city: v })} />
          <FormField label="Estado" value={sender.state} onChange={(v) => setSender({ ...sender, state: v })} />
          <FormField label="Telefone" value={sender.phone} onChange={(v) => setSender({ ...sender, phone: v })} />
          <FormField label="E-mail" value={sender.email} onChange={(v) => setSender({ ...sender, email: v })} />
        </div>
      </section>

      {/* Equipment Section */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
             <div className="h-6 w-1.5 bg-zinc-900 rounded-full"></div>
             <h3 className="text-xs font-black text-zinc-900 uppercase tracking-[0.15em]">Itens para Transporte</h3>
          </div>
          <button 
            type="button" 
            onClick={handleAddEquipment}
            className="flex items-center gap-2 text-[11px] bg-zinc-900 text-white px-4 py-2 rounded-xl hover:bg-zinc-800 transition-all font-bold uppercase tracking-tight shadow-lg shadow-zinc-950/10"
          >
            <PlusCircle className="w-4 h-4" /> Adicionar Item
          </button>
        </div>
        <div className="space-y-4">
          {equipment.map((item, idx) => (
            <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-5 bg-zinc-50/50 p-6 rounded-[1.5rem] border border-zinc-100 relative group transition-all hover:bg-white hover:shadow-xl hover:shadow-zinc-200/30">
              <FormField label="Descrição" value={item.description} onChange={(v) => handleEquipmentChange(idx, 'description', v)} />
              <FormField label="Modelo" value={item.model} onChange={(v) => handleEquipmentChange(idx, 'model', v)} />
              <FormField label="Nº Série" value={item.serialNumber} onChange={(v) => handleEquipmentChange(idx, 'serialNumber', v)} />
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-2 ml-1 tracking-wider">Valor Unitário</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-bold">R$</span>
                    <input 
                      type="number" 
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-xs focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none font-medium transition-all"
                      value={item.unitValue} 
                      onChange={(e) => handleEquipmentChange(idx, 'unitValue', parseFloat(e.target.value) || 0)} 
                    />
                  </div>
                </div>
                {equipment.length > 1 && (
                  <button onClick={() => handleRemoveEquipment(idx)} className="p-2.5 text-zinc-300 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all">
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Carrier Section */}
      <section>
        <div className="flex items-center gap-3 mb-6">
           <div className="h-6 w-1.5 bg-zinc-900 rounded-full"></div>
           <h3 className="text-xs font-black text-zinc-900 uppercase tracking-[0.15em]">Dados da Coleta / Transportadora</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FormField label="Razão Social" value={carrier.companyName} onChange={(v) => setCarrier({ ...carrier, companyName: v })} />
          <FormField label="Nome do Motorista" value={carrier.driverName} onChange={(v) => setCarrier({ ...carrier, driverName: v })} />
          <FormField label="RG do Motorista" value={carrier.rg} onChange={(v) => setCarrier({ ...carrier, rg: v })} />
          <FormField label="Data Prevista" type="date" value={carrier.collectionDate} onChange={(v) => setCarrier({ ...carrier, collectionDate: v })} />
        </div>
      </section>

      <div className="pt-6">
        <button
          onClick={() => onGenerate({ sender, carrier, equipment })}
          className="w-full py-5 bg-zinc-950 text-white rounded-2xl font-black text-lg hover:bg-zinc-800 transition-all active:scale-[0.98] shadow-2xl shadow-zinc-950/30 tracking-[0.2em] uppercase"
        >
          Gerar e Visualizar
        </button>
      </div>
    </div>
  );
};

const FormField: React.FC<{ label: string; value: string; onChange: (v: string) => void; type?: string }> = ({ label, value, onChange, type = "text" }) => (
  <div className="w-full">
    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-2 ml-1 tracking-wider">{label}</label>
    <input
      type={type}
      className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-xs focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none transition-all hover:border-zinc-300 font-medium"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);
