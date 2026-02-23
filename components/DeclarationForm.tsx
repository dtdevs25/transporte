
import React, { useState } from 'react';
import { SenderData, CarrierData, Equipment, RecipientData } from '../types';
import {
  PlusCircle,
  Trash2,
  EraserIcon,
  SparklesIcon,
  UserIcon,
  BoxIcon,
  TruckIcon,
  MapPinIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  CheckCircle2Icon
} from 'lucide-react';
import { SmartImportModal } from './SmartImportModal';

interface Props {
  onGenerate: (data: { sender: SenderData; carrier: CarrierData; equipment: Equipment[]; recipient: RecipientData }) => void;
  initialSender: SenderData;
  initialCarrier: CarrierData;
  initialEquipment: Equipment[];
  initialRecipient: RecipientData;
}

export const DeclarationForm: React.FC<Props> = ({ onGenerate, initialSender, initialCarrier, initialEquipment, initialRecipient }) => {
  const [step, setStep] = useState(1);
  const [sender, setSender] = useState<SenderData>(initialSender);
  const [carrier, setCarrier] = useState<CarrierData>(initialCarrier);
  const [equipment, setEquipment] = useState<Equipment[]>(initialEquipment);
  const [recipient, setRecipient] = useState<RecipientData>(initialRecipient);
  const [isSmartModalOpen, setIsSmartModalOpen] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  const formatCPF = (value: string) => {
    const raw = value.replace(/\D/g, '').slice(0, 11);
    return raw
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2');
  };

  const formatCEP = (value: string) => {
    const raw = value.replace(/\D/g, '').slice(0, 8);
    return raw.replace(/(\d{5})(\d)/, '$1-$2');
  };

  const formatCNPJ = (value: string) => {
    const raw = value.replace(/\D/g, '').slice(0, 14);
    return raw
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  };

  const handleCepSearch = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      setIsSearchingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setSender(prev => ({
            ...prev,
            address: data.logradouro || '',
            bairro: data.bairro || '',
            city: data.localidade,
            state: data.uf,
            zipCode: formatCEP(cleanCep)
          }));
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      } finally {
        setIsSearchingCep(false);
      }
    }
  };

  const handleSmartImport = (data: { sender?: Partial<SenderData>; carrier?: Partial<CarrierData>; equipment?: Equipment[] }) => {
    if (data.sender) {
      setSender(prev => ({ ...prev, ...data.sender }));
    }
    if (data.carrier) {
      setCarrier(prev => ({ ...prev, ...data.carrier }));
    }
    if (data.equipment) {
      setEquipment(data.equipment);
    }
  };

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
      setSender(initialSender);
      setCarrier(initialCarrier);
      setEquipment([{ description: '', model: '', serialNumber: '', unitValue: 0 }]);
      setRecipient(initialRecipient);
      setStep(1);
    }
  };

  const steps = [
    { id: 1, name: 'Remetente', icon: <UserIcon className="w-4 h-4" /> },
    { id: 2, name: 'Itens', icon: <BoxIcon className="w-4 h-4" /> },
    { id: 3, name: 'Coleta', icon: <TruckIcon className="w-4 h-4" /> },
    { id: 4, name: 'Destinatário', icon: <MapPinIcon className="w-4 h-4" /> },
  ];

  return (
    <div className="p-6 md:p-10 space-y-10">
      {/* Progress Stepper */}
      <div className="flex items-center justify-between max-w-4xl mx-auto mb-10">
        {steps.map((s, idx) => (
          <React.Fragment key={s.id}>
            <button
              onClick={() => setStep(s.id)}
              className={`flex flex-col items-center gap-2 group transition-all ${step === s.id ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg ${step === s.id ? 'bg-zinc-900 text-white scale-110' : 'bg-zinc-100 text-zinc-500'}`}>
                {step > s.id ? <CheckCircle2Icon className="w-6 h-6" /> : s.icon}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">{s.name}</span>
            </button>
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-4 rounded-full ${step > s.id + 1 ? 'bg-zinc-900' : 'bg-zinc-100'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Form Content */}
      <div className="min-h-[400px] animate-in slide-in-from-bottom-4 duration-500">
        {step === 1 && (
          <section className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-6 w-1.5 bg-zinc-900 rounded-full"></div>
                <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Remetente (Pessoa Física)</h3>
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => setIsSmartModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-zinc-100 text-zinc-900 hover:bg-zinc-200 rounded-xl transition-all shadow-sm">
                  <SparklesIcon className="w-4 h-4" /> Importação Inteligente
                </button>
                <button type="button" onClick={handleClear} className="flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                  <EraserIcon className="w-4 h-4" /> Limpar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-2">
                <FormField label="Nome Completo *" value={sender.name} onChange={(v) => setSender({ ...sender, name: v })} />
              </div>
              <FormField
                label="CPF *"
                value={sender.cpf}
                onChange={(v) => setSender({ ...sender, cpf: formatCPF(v) })}
                placeholder="000.000.000-00"
              />
              <FormField
                label="Razão Social (CNPJ) *"
                value={sender.companyName}
                onChange={(v) => setSender({ ...sender, companyName: formatCNPJ(v) })}
                placeholder="00.000.000/0000-00"
              />

              <div className="relative">
                <FormField
                  label="CEP *"
                  value={sender.zipCode}
                  onChange={(v) => {
                    const formatted = formatCEP(v);
                    setSender({ ...sender, zipCode: formatted });
                    if (formatted.replace(/\D/g, '').length === 8) handleCepSearch(formatted);
                  }}
                  placeholder="00000-000"
                />
                {isSearchingCep && (
                  <div className="absolute right-3 top-9 text-zinc-400">
                    <div className="animate-spin w-4 h-4 border-2 border-zinc-300 border-t-zinc-900 rounded-full" />
                  </div>
                )}
              </div>

              <div className="md:col-span-2 lg:col-span-2">
                <FormField label="Endereço Completo *" value={sender.address} onChange={(v) => setSender({ ...sender, address: v })} />
              </div>
              <FormField label="Número *" value={sender.number} onChange={(v) => setSender({ ...sender, number: v })} />

              <FormField label="Bairro *" value={sender.bairro} onChange={(v) => setSender({ ...sender, bairro: v })} />
              <FormField label="Município *" value={sender.city} onChange={(v) => setSender({ ...sender, city: v })} />
              <FormField label="Estado *" value={sender.state} onChange={(v) => setSender({ ...sender, state: v })} />
              <FormField label="Telefone *" value={sender.phone} onChange={(v) => setSender({ ...sender, phone: v })} />
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-8 py-4 bg-zinc-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/20 active:scale-95"
              >
                Próximo Passo <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="h-6 w-1.5 bg-zinc-900 rounded-full"></div>
                <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Itens para Transporte</h3>
              </div>
              <button type="button" onClick={handleAddEquipment} className="flex items-center gap-2 text-[11px] bg-zinc-900 text-white px-4 py-2 rounded-xl hover:bg-zinc-800 transition-all font-bold uppercase tracking-tight shadow-lg shadow-zinc-950/10">
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
                        <input type="number" className="w-full pl-9 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-xs focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none font-medium transition-all" value={item.unitValue} onChange={(e) => handleEquipmentChange(idx, 'unitValue', parseFloat(e.target.value) || 0)} />
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
        )}

        {step === 3 && (
          <section className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="h-6 w-1.5 bg-zinc-900 rounded-full"></div>
              <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Dados da Coleta / Transportadora</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <FormField label="Razão Social" value={carrier.companyName} onChange={(v) => setCarrier({ ...carrier, companyName: v })} />
              <FormField label="Nome do Motorista" value={carrier.driverName} onChange={(v) => setCarrier({ ...carrier, driverName: v })} />
              <FormField label="RG do Motorista" value={carrier.rg} onChange={(v) => setCarrier({ ...carrier, rg: v })} />
              <FormField label="Data Prevista" type="date" value={carrier.collectionDate} onChange={(v) => setCarrier({ ...carrier, collectionDate: v })} />
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="h-6 w-1.5 bg-zinc-900 rounded-full"></div>
              <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Dados de Destino (À CTDI do Brasil)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-2">
                <FormField label="Destinatário" value={recipient.name} onChange={(v) => setRecipient({ ...recipient, name: v })} />
              </div>
              <FormField label="CNPJ" value={recipient.cnpj} onChange={(v) => setRecipient({ ...recipient, cnpj: v })} />
              <FormField label="Inscrição Estadual" value={recipient.ie} onChange={(v) => setRecipient({ ...recipient, ie: v })} />
              <div className="md:col-span-2 lg:col-span-3">
                <FormField label="Endereço" value={recipient.address} onChange={(v) => setRecipient({ ...recipient, address: v })} />
              </div>
              <FormField label="CEP" value={recipient.zipCode} onChange={(v) => setRecipient({ ...recipient, zipCode: v })} />
              <FormField label="Cidade/Estado" value={recipient.cityState} onChange={(v) => setRecipient({ ...recipient, cityState: v })} />
            </div>
          </section>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-10 border-t border-zinc-100">
        <button
          disabled={step === 1}
          onClick={() => setStep(step - 1)}
          className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${step === 1 ? 'opacity-0 pointer-events-none' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
        >
          <ChevronLeftIcon className="w-4 h-4" /> Passo Anterior
        </button>

        {step < 4 ? (
          <button
            onClick={() => setStep(step + 1)}
            className="flex items-center gap-2 px-8 py-4 bg-zinc-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/20 active:scale-95"
          >
            Próximo Passo <ChevronRightIcon className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => onGenerate({ sender, carrier, equipment, recipient })}
            className="flex items-center gap-2 px-10 py-4 bg-zinc-950 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-zinc-800 transition-all shadow-2xl shadow-zinc-950/30 active:scale-95"
          >
            Finalizar e Gerar <CheckCircle2Icon className="w-5 h-5" />
          </button>
        )}
      </div>

      <SmartImportModal
        isOpen={isSmartModalOpen}
        onClose={() => setIsSmartModalOpen(false)}
        onImport={handleSmartImport}
      />
    </div>
  );
};

const FormField: React.FC<{ label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }> = ({ label, value, onChange, type = "text", placeholder }) => (
  <div className="w-full">
    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-2 ml-1 tracking-wider">{label}</label>
    <input
      type={type}
      placeholder={placeholder}
      className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-xs focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none transition-all hover:border-zinc-300 font-medium"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);
