import React, { useState } from 'react';
import { XIcon, SparklesIcon, ClipboardIcon } from 'lucide-react';
import { SenderData, CarrierData, Equipment } from '../types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onImport: (data: { sender?: Partial<SenderData>; carrier?: Partial<CarrierData>; equipment?: Equipment[] }) => void;
}

export const SmartImportModal: React.FC<Props> = ({ isOpen, onClose, onImport }) => {
    const [text, setText] = useState('');

    if (!isOpen) return null;

    const handleProcess = () => {
        const lines = text.split('\n');
        const sender: Partial<SenderData> = {};
        const carrier: Partial<CarrierData> = {};
        const items: Equipment[] = [];

        // Helper regex patterns
        const patterns = {
            cpf: /(?:cpf|documento)[:\s]+([\d.-]+)/i,
            rg: /(?:rg|identidade)[:\s]+([\d.-]+)/i,
            name: /(?:nome|motorista|remetente)[:\s]+([^\n,]+)/i,
            driver: /(?:motorista|condutor)[:\s]+([^\n,]+)/i,
            company: /(?:empresa|razão social|transportadora)[:\s]+([^\n,]+)/i,
            equipment: /(?:item|equipamento|descrição)[:\s]+([^\n,]+)/i,
            model: /(?:modelo)[:\s]+([^\n,]+)/i,
            serial: /(?:série|serial|nº série)[:\s]+([^\n,]+)/i,
            value: /(?:valor|unitário|r\$)[:\s]+([\d.,]+)/i,
        };

        text.split('\n').forEach(line => {
            // Basic heuristic parsing
            if (line.match(patterns.cpf)) sender.cpf = line.match(patterns.cpf)![1].trim();
            if (line.match(patterns.rg)) carrier.rg = line.match(patterns.rg)![1].trim();
            if (line.match(patterns.driver)) carrier.driverName = line.match(patterns.driver)![1].trim();
            if (line.match(patterns.company)) {
                const val = line.match(patterns.company)![1].trim();
                // If it looks like a carrier keyword is nearby, assign to carrier
                if (line.toLowerCase().includes('transp') || line.toLowerCase().includes('coleta')) {
                    carrier.companyName = val;
                } else {
                    sender.companyName = val;
                }
            }
            if (line.match(patterns.name)) {
                const val = line.match(patterns.name)![1].trim();
                if (line.toLowerCase().includes('remetente')) sender.name = val;
                else if (line.toLowerCase().includes('motorista')) carrier.driverName = val;
            }

            // Equipment parsing (simplified for one item or list)
            if (line.match(patterns.equipment) || line.match(patterns.model) || line.match(patterns.serial)) {
                const descMatch = line.match(patterns.equipment);
                const modelMatch = line.match(patterns.model);
                const serialMatch = line.match(patterns.serial);
                const valueMatch = line.match(patterns.value);

                if (descMatch || modelMatch || serialMatch) {
                    // We'll try to group them if they are on the same line or nearby
                    // For now, let's just create one item if we find equipment info
                    const currentItem = {
                        description: descMatch ? descMatch[1].trim() : '',
                        model: modelMatch ? modelMatch[1].trim() : '',
                        serialNumber: serialMatch ? serialMatch[1].trim() : '',
                        unitValue: valueMatch ? parseFloat(valueMatch[1].replace('.', '').replace(',', '.')) : 0
                    };
                    if (currentItem.description || currentItem.model || currentItem.serialNumber) {
                        items.push(currentItem);
                    }
                }
            }
        });

        onImport({
            sender: Object.keys(sender).length > 0 ? sender : undefined,
            carrier: Object.keys(carrier).length > 0 ? carrier : undefined,
            equipment: items.length > 0 ? items : undefined
        });
        setText('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-zinc-100 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-8 border-b border-zinc-50 flex items-center justify-between bg-zinc-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-zinc-950 rounded-2xl flex items-center justify-center shadow-xl">
                            <SparklesIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-zinc-900 tracking-tight">Importação Inteligente</h3>
                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Cole os dados brutos abaixo</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-zinc-100 rounded-2xl transition-all text-zinc-400">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8 space-y-6 flex-1 overflow-y-auto">
                    <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl flex gap-4 items-start">
                        <ClipboardIcon className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-900/70 font-medium leading-relaxed">
                            Nosso sistema tentará identificar automaticamente nomes, CPFs, RGs, modelos e números de série no texto colado. Funciona bem com e-mails, mensagens de WhatsApp ou tabelas.
                        </p>
                    </div>

                    <textarea
                        className="w-full h-64 p-6 bg-zinc-50 border-2 border-zinc-100 rounded-3xl outline-none focus:border-zinc-900 focus:bg-white transition-all font-mono text-sm resize-none"
                        placeholder="Exemplo:&#10;Remetente: João Silva&#10;CPF: 123.456.789-00&#10;Motorista: Pedro Santos&#10;Equipamento: Notebook Dell G15&#10;Série: ABC123XYZ"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                    />
                </div>

                <div className="p-8 border-t border-zinc-50 bg-zinc-50/30 flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-600 transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleProcess}
                        disabled={!text.trim()}
                        className="flex-[2] py-4 bg-zinc-950 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all disabled:opacity-30 shadow-xl shadow-zinc-950/20"
                    >
                        Processar e Preencher
                    </button>
                </div>
            </div>
        </div>
    );
};
