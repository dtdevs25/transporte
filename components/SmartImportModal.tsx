import React, { useState, useRef } from 'react';
import { XIcon, SparklesIcon, ClipboardIcon, ImageIcon, Loader2Icon, CheckCircle2Icon } from 'lucide-react';
import { SenderData, CarrierData, Equipment } from '../types';
import Tesseract from 'tesseract.js';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onImport: (data: { 
        sender?: Partial<SenderData>; 
        carrier?: Partial<CarrierData>; 
        equipment?: Equipment[];
        requestNumber?: string;
    }) => void;
}

export const SmartImportModal: React.FC<Props> = ({ isOpen, onClose, onImport }) => {
    const [text, setText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [ocrStatus, setOcrStatus] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setOcrStatus('Lendo imagem...');

        try {
            const { data: { text: extractedText } } = await Tesseract.recognize(file, 'por+eng', {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        setOcrStatus(`Processando: ${Math.round(m.progress * 100)}%`);
                    }
                }
            });
            setText(extractedText);
            setOcrStatus('Texto extraído com sucesso!');
            setTimeout(() => setOcrStatus(''), 3000);
        } catch (error) {
            console.error('OCR Error:', error);
            setOcrStatus('Erro ao extrair texto da imagem.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleProcess = (importType: 'all' | 'sender' | 'items') => {
        const sender: Partial<SenderData> = {};
        const carrier: Partial<CarrierData> = {};
        let requestNumber = '';
        const items: Equipment[] = [];

        // Build a key->value map from the raw text
        // Handles: "key\tvalue", "key   value", "key: value", "key value" (all on same line)
        const kvMap: Record<string, string> = {};
        const lines = text.split('\n');

        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line) continue;

            // Try tab-separated first (most common when copying from a table)
            const tabParts = line.split('\t');
            if (tabParts.length >= 2) {
                const key = tabParts[0].trim();
                const val = tabParts.slice(1).join('\t').trim();
                if (key && val) kvMap[key.toLowerCase()] = val;
                continue;
            }

            // Try colon-separated: "key: value" or "key : value"
            const colonIdx = line.indexOf(':');
            if (colonIdx > 0 && colonIdx < 40) {
                const key = line.slice(0, colonIdx).trim();
                const val = line.slice(colonIdx + 1).trim();
                if (key && val) kvMap[key.toLowerCase()] = val;
                continue;
            }

            // Try multiple consecutive spaces: "key   value"
            const spaceParts = line.split(/\s{2,}/);
            if (spaceParts.length >= 2) {
                const key = spaceParts[0].trim();
                const val = spaceParts.slice(1).join(' ').trim();
                if (key && val) kvMap[key.toLowerCase()] = val;
            }
        }

        // Helper to get value by trying several key names
        const get = (...keys: string[]): string => {
            for (const key of keys) {
                const val = kvMap[key.toLowerCase()];
                if (val) return val.trim();
            }
            return '';
        };

        // Also try a regex scan across the whole text as fallback
        const scan = (pattern: RegExp): string => {
            const m = text.match(pattern);
            return m ? m[1].trim() : '';
        };

        // ---- DESTINATION INFO (PAYGEN) mappings ----
        const careOf = get('shipToCareOf') || scan(/shipToCareOf\s+(.+)/i);
        if (careOf) { sender.name = careOf; sender.contact = careOf; }

        const taxNum = get('taxNumber') || scan(/taxNumber\s+([\d.-]+)/i);
        if (taxNum) {
            const digits = taxNum.replace(/\D/g, '');
            if (digits.length === 11) {
                sender.cpf = digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
            } else {
                sender.cpf = taxNum;
            }
        }

        const addr1 = get('shipToAddress1') || scan(/shipToAddress1\s+(.+)/i);
        const addr2 = get('shipToAddress2') || scan(/shipToAddress2\s+(.+)/i);
        if (addr1 || addr2) {
            // Extract number from address if present (e.g. "Rua Antônio Leal da Silva, 535 B")
            const fullAddr = [addr1, addr2].filter(Boolean).join(' - ');
            const numMatch = addr1.match(/,\s*(\S+)\s*$/);
            sender.address = fullAddr;
            if (numMatch) sender.number = numMatch[1];
        }

        const city = get('shipToCity') || scan(/shipToCity\s+(.+)/i);
        if (city) sender.city = city;

        const state = get('shipToState') || scan(/shipToState\s+([A-Z]{2})/i);
        if (state) sender.state = state.toUpperCase().slice(0, 2);

        const zip = get('shipToPostalCode') || scan(/shipToPostalCode\s+([\d-]+)/i);
        if (zip) {
            const zipDigits = zip.replace(/\D/g, '');
            sender.zipCode = zipDigits.length === 8 ? zipDigits.replace(/(\d{5})(\d{3})/, '$1-$2') : zip;
        }

        // ---- SR INFO (PAYGEN) mappings ----
        const lob = get('lob') || scan(/\blob\s+(\S+)/i);
        if (lob) {
            const l = lob.toLowerCase().trim();
            if (l === 'gev') sender.companyName = 'GE Vernova';
            else if (l === 'geh-br-le1') sender.companyName = 'GE HealthCare';
            else sender.companyName = lob;
        }

        const reqNum = get('requestNumber') || scan(/requestNumber\s+(\S+)/i) || scan(/(RITM\d+)/i);
        if (reqNum) requestNumber = reqNum;

        const empPhone = get('employeePhone') || scan(/employeePhone\s+([\d+\s]+)/i);
        if (empPhone) {
            const digits = empPhone.replace(/\D/g, '');
            if (digits.length >= 10) {
                sender.phone = digits.length === 13
                    ? `(${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`
                    : digits.length === 11
                        ? `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
                        : empPhone;
            } else {
                sender.phone = empPhone;
            }
        }

        const empEmail = get('employeeEmail') || scan(/employeeEmail\s+(\S+@\S+)/i);
        // email is not a field in SenderData but could be used as contact reference

        const serialNum = get('returnSerialNumber') || scan(/returnSerialNumber\s+(\S+)/i);
        if (serialNum) {
            items.push({
                description: 'EQUIPAMENTO EM RECLAME',
                model: 'CONFIRME O MODELO',
                serialNumber: serialNum,
                unitValue: 0
            });
        }

        // ---- Generic CPF fallback ----
        if (!sender.cpf) {
            const cpfMatch = text.match(/(\d{3}[\.\s]?\d{3}[\.\s]?\d{3}[\-\.\s]?\d{2})/);
            if (cpfMatch) sender.cpf = cpfMatch[1].replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        }

        // ---- Call onImport ----
        onImport({
            sender: (importType === 'all' || importType === 'sender') && Object.keys(sender).length > 0 ? sender : undefined,
            carrier: importType === 'all' && Object.keys(carrier).length > 0 ? carrier : undefined,
            equipment: (importType === 'all' || importType === 'items') && items.length > 0 ? items : undefined,
            requestNumber: requestNumber || undefined
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
                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Cole dados do Paygen ou suba uma imagem</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-zinc-100 rounded-2xl transition-all text-zinc-400">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8 space-y-6 flex-1 overflow-y-auto">
                    <div className="flex gap-4">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isProcessing}
                            className="flex-1 flex items-center justify-center gap-3 p-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-2xl border-2 border-dashed border-zinc-300 transition-all font-black text-[10px] uppercase tracking-widest"
                        >
                            {isProcessing ? <Loader2Icon className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                            Extrair de uma Imagem
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileUpload} 
                            className="hidden" 
                            accept="image/*"
                        />
                    </div>

                    {ocrStatus && (
                        <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold uppercase tracking-widest ${ocrStatus.includes('Erro') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                            {ocrStatus.includes('sucesso') ? <CheckCircle2Icon className="w-4 h-4" /> : <Loader2Icon className="w-4 h-4 animate-spin" />}
                            {ocrStatus}
                        </div>
                    )}

                    <div className="bg-zinc-900/5 border border-zinc-100 p-4 rounded-2xl flex gap-4 items-start">
                        <ClipboardIcon className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight leading-relaxed">
                            Funciona com os campos shipToAddress1, taxNumber, lob, etc. Cole a tabela inteira ou o texto copiado do Paygen.
                        </p>
                    </div>

                    <textarea
                        className="w-full h-64 p-6 bg-zinc-50 border-2 border-zinc-100 rounded-3xl outline-none focus:border-zinc-900 focus:bg-white transition-all font-mono text-sm resize-none"
                        placeholder="Cole aqui os dados copiados do sistema..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                    />
                </div>

                <div className="p-8 border-t border-zinc-50 bg-zinc-50/30 flex flex-wrap gap-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-4 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-600 transition-all"
                    >
                        Cancelar
                    </button>

                    <button
                        onClick={() => handleProcess('sender')}
                        disabled={!text.trim() || isProcessing}
                        className="flex-1 py-4 bg-zinc-100 text-zinc-900 border border-zinc-200 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-zinc-200 transition-all disabled:opacity-30"
                    >
                        Só Remetente
                    </button>

                    <button
                        onClick={() => handleProcess('all')}
                        disabled={!text.trim() || isProcessing}
                        className="flex-1 py-4 bg-zinc-950 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all disabled:opacity-30 shadow-xl shadow-zinc-950/20"
                    >
                        Importar Tudo
                    </button>
                </div>
            </div>
        </div>
    );
};
