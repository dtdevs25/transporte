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
        const lines = text.split('\n');
        const sender: Partial<SenderData> = {};
        const carrier: Partial<CarrierData> = {};
        let requestNumber = '';
        const items: Equipment[] = [];

        // Helper to find value by multiple possible keys
        const findValue = (keys: string[]) => {
            for (const line of lines) {
                // Try format "Key Value" or "Key: Value" or "Key [tab] Value"
                const lowerLine = line.toLowerCase();
                for (const key of keys) {
                    const lowerKey = key.toLowerCase();
                    if (lowerLine.includes(lowerKey)) {
                        // Split by colon, tab, or double space
                        const parts = line.split(/[:\t]|\s{2,}/);
                        if (parts.length >= 2) {
                            // Find which part contains the key and return the next non-empty part
                            const keyIdx = parts.findIndex(p => p.toLowerCase().includes(lowerKey));
                            if (keyIdx !== -1 && parts[keyIdx + 1]) {
                                return parts[keyIdx + 1].trim();
                            }
                        }
                        // Fallback: replace key and trim
                        const regex = new RegExp(key, 'i');
                        let val = line.replace(regex, '').replace(/^[:\t\s]+/, '').trim();
                        if (val) return val;
                    }
                }
            }
            return '';
        };

        // 1. Specific Paygen Mappings
        const careOf = findValue(['shipToCareOf', 'Nome:']);
        if (careOf) {
            sender.name = careOf;
            sender.contact = careOf;
        }

        const taxNumber = findValue(['taxNumber', 'CPF:']);
        if (taxNumber) sender.cpf = taxNumber.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');

        const addr1 = findValue(['shipToAddress1']);
        const addr2 = findValue(['shipToAddress2']);
        if (addr1 || addr2) {
            sender.address = [addr1, addr2].filter(Boolean).join(' - ');
        }

        const city = findValue(['shipToCity', 'Municipio:']);
        if (city) sender.city = city;

        const state = findValue(['shipToState', 'Estado:']);
        if (state) sender.state = state.toUpperCase().slice(0, 2);

        const zip = findValue(['shipToPostalCode', 'CEP:']);
        if (zip) sender.zipCode = zip.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2');

        const lob = findValue(['lob']);
        if (lob) {
            const lowerLob = lob.toLowerCase();
            if (lowerLob === 'gev') sender.companyName = 'GE Vernova';
            else if (lowerLob === 'geh-br-le1') sender.companyName = 'GE HealthCare';
            else sender.companyName = lob;
        }

        const reqNum = findValue(['requestNumber', 'RITM']);
        if (reqNum) requestNumber = reqNum;

        const phone = findValue(['employeePhone', 'Telefone/Fax:']);
        if (phone) sender.phone = phone;

        const serial = findValue(['returnSerialNumber', 'Nº de Série']);
        if (serial) {
            items.push({
                description: 'EQUIPAMENTO EM RECLAME',
                model: 'CONFIRME O MODELO',
                serialNumber: serial,
                unitValue: 0
            });
        }

        // 2. Generic Mappings (Fallback)
        if (!sender.cpf) {
            const cpfMatch = text.match(/(?:cpf)[:\s]+([\d.-]+)/i);
            if (cpfMatch) sender.cpf = cpfMatch[1].trim();
        }

        // Return the data
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
