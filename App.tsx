
import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  PrinterIcon,
  TrashIcon,
  HistoryIcon,
  FileTextIcon,
  DownloadIcon,
  SearchIcon,
  QrCodeIcon,
  CheckCircle2Icon,
  MenuIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LogOutIcon,
  MailIcon,
  LockIcon,
  UserIcon,
  ArrowRightIcon,
  SaveIcon,
  EyeIcon,
  EyeOffIcon
} from 'lucide-react';
import { Declaration, Equipment, SenderData, CarrierData, RecipientData } from './types';
import { DeclarationPreview } from './components/DeclarationPreview';
import { DeclarationForm } from './components/DeclarationForm';
import { ConsultationView } from './components/ConsultationView';
import { SignatureModal } from './components/SignatureModal';

const INITIAL_SENDER: SenderData = {
  name: 'Bruno Carvalho de Souza',
  cpf: '041.812.386-10',
  address: 'Rua Sergipe, 1440, 5º andar, Savassi, Belo Horizonte',
  city: 'Belo Horizonte',
  state: 'MG',
  zipCode: '30130-174',
  contact: 'Bruno Carvalho de Souza',
  phone: '+5531997710045',
  email: 'bruno.carvalho1@gevernova.com',
  companyName: 'GE Vernova',
};

const INITIAL_RECIPIENT: RecipientData = {
  name: 'CTDI do Brasil LTDA',
  address: 'Av Comendador Aladino Selmi, 4630 - GR2 Campinas - Mod. 18 a 21, Vila San Martin',
  cityState: 'Campinas - SP',
  zipCode: '13069-096',
  cnpj: '01812661000184',
  ie: '244.698.974.115',
};

const INITIAL_CARRIER: CarrierData = {
  driverName: '',
  rg: '',
  collectionDate: new Date().toISOString().split('T')[0],
  companyName: 'Wikilog',
};

const INITIAL_EQUIPMENT: Equipment[] = [
  { description: 'Latitude', model: '5420', serialNumber: 'CGWSYP3', unitValue: 4000.00 }
];

type ViewState = 'edit' | 'preview' | 'consultation' | 'signature-mode';

const API_URL = window.location.origin.includes('localhost') ? 'http://localhost:3000/api' : '/api';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const [history, setHistory] = useState<Declaration[]>([]);
  const [currentNumber, setCurrentNumber] = useState<number>(21525);
  const [activeDeclaration, setActiveDeclaration] = useState<Declaration | null>(null);
  const [view, setView] = useState<ViewState>('edit');
  const [sigModal, setSigModal] = useState<{ open: boolean; type: 'sender' | 'carrier' | null }>({ open: false, type: null });
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById('declaration-content');
    if (!element || !activeDeclaration) return;

    const opt = {
      margin: 0,
      filename: `Declaracao_${activeDeclaration.number}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // @ts-ignore
    html2pdf().set(opt).from(element).save();
  };

  const handleSaveManual = () => {
    alert("Declaração salva com sucesso!");
  };

  const fetchDeclarations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/declarations`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
        if (data.length > 0) {
          const lastNum = Math.max(...data.map((d: any) => parseInt(d.number, 10)));
          if (lastNum > 0) setCurrentNumber(lastNum);
        }
      }
    } catch (error) {
      console.error('Error fetching declarations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const auth = sessionStorage.getItem('is_authenticated');
    if (auth === 'true') {
      setIsAuthenticated(true);
      fetchDeclarations();
    }
  }, []);

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/sign/')) {
        const parts = hash.split('/');
        const id = parts[2];
        const type = parts[3] as 'sender' | 'carrier';
        const found = history.find(h => h.id === id);
        if (found) {
          setActiveDeclaration(found);
          setSigModal({ open: true, type });
          setView('signature-mode');
        }
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [history]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });

      if (response.ok) {
        setIsAuthenticated(true);
        sessionStorage.setItem('is_authenticated', 'true');
        fetchDeclarations();
      } else {
        const errorData = await response.json();
        setLoginError(errorData.error || 'Credenciais inválidas. Tente novamente.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('Erro ao conectar com o servidor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setLoginForm({ username: '', password: '' });
    sessionStorage.removeItem('is_authenticated');
    window.location.hash = '';
  };

  const deleteFromHistory = async (id: string) => {
    if (window.confirm("Deseja realmente excluir este registro permanentemente?")) {
      try {
        const response = await fetch(`${API_URL}/declarations/${id}`, { method: 'DELETE' });
        if (response.ok) {
          setHistory(prev => prev.filter(h => h.id !== id));
          if (activeDeclaration?.id === id) {
            setActiveDeclaration(null);
            setView('edit');
          }
        }
      } catch (error) {
        console.error('Error deleting declaration:', error);
        alert('Erro ao excluir declaração');
      }
    }
  };

  const saveSignature = async (base64: string) => {
    if (!activeDeclaration || !sigModal.type) return;

    const field = sigModal.type === 'sender' ? 'signatureSender' : 'signatureCarrier';
    const updatedDecl = {
      ...activeDeclaration,
      [field]: base64
    };

    try {
      const response = await fetch(`${API_URL}/declarations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedDecl)
      });

      if (response.ok) {
        setHistory(prev => prev.map(h => h.id === activeDeclaration.id ? updatedDecl : h));
        setActiveDeclaration(updatedDecl);
        setSigModal({ open: false, type: null });

        if (view === 'signature-mode') {
          setView('preview');
          window.location.hash = '';
        }
      }
    } catch (error) {
      console.error('Error saving signature:', error);
      alert('Erro ao salvar assinatura');
    }
  };

  const handleGenerate = async (data: Partial<Declaration>) => {
    const nextNum = currentNumber + 1;
    const formattedNum = nextNum.toString().padStart(8, '0');

    const newDecl: Declaration = {
      id: crypto.randomUUID(),
      number: formattedNum,
      date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase(),
      city: 'CAMPINAS',
      recipient: INITIAL_RECIPIENT,
      equipment: data.equipment || INITIAL_EQUIPMENT,
      sender: data.sender || INITIAL_SENDER,
      carrier: data.carrier || INITIAL_CARRIER,
    };

    try {
      const response = await fetch(`${API_URL}/declarations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDecl)
      });

      if (response.ok) {
        setHistory([newDecl, ...history]);
        setCurrentNumber(nextNum);
        setActiveDeclaration(newDecl);
        setView('preview');
      }
    } catch (error) {
      console.error('Error saving declaration:', error);
      alert('Erro ao salvar declaração no banco de dados');
    }
  };


  if (!isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-950 p-6">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-zinc-100/5 rounded-full blur-3xl group-hover:bg-zinc-100/10 transition-colors"></div>

            <header className="mb-10 text-center flex flex-col items-center">
              <img src="/LOGO_LOGIN.png" alt="Logo Transporte Fácil" className="w-full max-w-[182px] h-auto mb-2 object-contain" />
            </header>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Usuário</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={loginForm.username}
                    onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                    className="w-full pl-12 pr-4 py-3.5 bg-zinc-950 border border-zinc-800 rounded-2xl text-white text-sm outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition-all font-medium"
                    placeholder="Seu identificador"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Senha</label>
                <div className="relative">
                  <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="w-full pl-12 pr-12 py-3.5 bg-zinc-950 border border-zinc-800 rounded-2xl text-white text-sm outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition-all font-medium"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <p className="text-red-500 text-[10px] font-black uppercase tracking-tight text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">
                  {loginError}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full group flex items-center justify-center gap-3 py-4 bg-zinc-100 hover:bg-white text-zinc-950 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-white/5 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isLoading ? 'Autenticando...' : 'Entrar no Sistema'}
                <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

            <footer className="mt-10 text-center">
              <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter">© 2026 CTDI do Brasil Ltda.</p>
            </footer>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-zinc-50 overflow-hidden">
      <aside
        className={`no-print h-full bg-zinc-950 text-zinc-100 transition-sidebar flex flex-col z-40 border-r border-zinc-800 shrink-0 overflow-hidden ${isMenuCollapsed ? 'w-20' : 'w-64'}`}
      >
        <div className={`flex items-center border-b border-zinc-900/50 h-16 shrink-0 px-4 ${isMenuCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center justify-center w-full h-full overflow-hidden">
            <img
              src={isMenuCollapsed ? "/LOGO_MENU_FECHADO.png" : "/LOGO_MENU_ABERTO.png"}
              alt="Logo"
              className={`h-auto transition-all duration-300 ${isMenuCollapsed ? 'w-10' : 'w-48'}`}
            />
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <SidebarItem
            icon={<PlusIcon className="w-5 h-5" />}
            label="Novo Documento"
            active={view === 'edit'}
            collapsed={isMenuCollapsed}
            onClick={() => { setView('edit'); setActiveDeclaration(null); }}
          />
          <SidebarItem
            icon={<SearchIcon className="w-5 h-5" />}
            label="Histórico"
            active={view === 'consultation'}
            collapsed={isMenuCollapsed}
            onClick={() => setView('consultation')}
          />

          <div className={`mt-6 pt-5 border-t border-zinc-900/50`}>
            {!isMenuCollapsed && (
              <div className="px-3 mb-3 flex items-center gap-2 text-zinc-600 uppercase text-[9px] font-black tracking-widest whitespace-nowrap">
                Recentes
              </div>
            )}
            <div className="space-y-1">
              {history.slice(0, 5).map(item => (
                <button
                  key={item.id}
                  onClick={() => { setActiveDeclaration(item); setView('preview'); }}
                  className={`relative group w-full flex items-center rounded-xl cursor-pointer transition-all ${isMenuCollapsed ? 'justify-center p-3' : 'p-2.5 gap-3'} ${activeDeclaration?.id === item.id ? 'bg-zinc-100 text-zinc-950 shadow-lg' : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200'}`}
                >
                  <HistoryIcon className="w-4 h-4 shrink-0 opacity-40" />
                  {!isMenuCollapsed && (
                    <div className="overflow-hidden text-left whitespace-nowrap">
                      <div className="text-[11px] font-bold leading-none mb-1 truncate">#{item.number}</div>
                      <div className="text-[9px] opacity-60 truncate uppercase font-bold">{item.sender.name}</div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </nav>

        <button
          onClick={() => setIsMenuCollapsed(!isMenuCollapsed)}
          className="p-4 border-t border-zinc-900 hover:bg-zinc-900 transition-colors flex items-center justify-center shrink-0 group overflow-hidden"
        >
          {isMenuCollapsed ? (
            <ChevronRightIcon className="w-5 h-5 text-zinc-600 group-hover:text-white transition-colors" />
          ) : (
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 group-hover:text-white transition-colors whitespace-nowrap">
              <ChevronLeftIcon className="w-4 h-4" /> Recolher
            </div>
          )}
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-zinc-50 relative">
        <header className="no-print sticky top-0 h-16 flex items-center justify-between px-6 bg-white/70 backdrop-blur-xl border-b border-zinc-200/50 z-30">
          <div className="flex items-center gap-4">
            <div className="text-[9px] text-zinc-400 font-black uppercase tracking-[0.3em] whitespace-nowrap">
              SISTEMA <span className="text-zinc-900">/ {view === 'edit' ? 'Criação' : view === 'consultation' ? 'Consulta' : 'Preview'}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-950 text-zinc-500 hover:text-white rounded-lg transition-all border border-zinc-200/50 font-black text-[9px] uppercase tracking-widest group"
            >
              <LogOutIcon className="w-3.5 h-3.5" />
              Sair
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-50/50">
          {view === 'edit' ? (
            <div className="max-w-5xl mx-auto p-6 md:p-10 pb-20">
              <div className="bg-white rounded-[2rem] shadow-xl shadow-zinc-200/50 border border-zinc-200/60 overflow-hidden">
                <DeclarationForm
                  onGenerate={handleGenerate}
                  initialSender={INITIAL_SENDER}
                  initialCarrier={INITIAL_CARRIER}
                  initialEquipment={INITIAL_EQUIPMENT}
                />
              </div>
            </div>
          ) : view === 'consultation' ? (
            <div className="p-6 md:p-10 pb-20 max-w-6xl mx-auto w-full">
              <ConsultationView
                history={history}
                onSelect={(d) => { setActiveDeclaration(d); setView('preview'); }}
                onDelete={deleteFromHistory}
              />
            </div>
          ) : activeDeclaration && (
            <div className="max-w-[21cm] mx-auto p-6 md:p-10 pb-20 relative">
              <div id="declaration-content" className="bg-white shadow-2xl border border-zinc-100 print:border-none print:shadow-none min-h-[29.7cm] rounded-sm transform origin-top md:scale-[0.9] lg:scale-100 transition-transform">
                <DeclarationPreview
                  declaration={activeDeclaration}
                  onSignatureClick={(type) => setSigModal({ open: true, type })}
                />
              </div>

              {/* Floating Action Buttons */}
              <div className="no-print fixed bottom-10 right-10 flex flex-col gap-3 z-50">
                <ActionButton
                  icon={<SaveIcon className="w-5 h-5" />}
                  onClick={handleSaveManual}
                  title="Salvar no Histórico"
                  variant="secondary"
                />
                <ActionButton
                  icon={<PrinterIcon className="w-5 h-5" />}
                  onClick={handlePrint}
                  title="Imprimir Declaração"
                  variant="secondary"
                />
                <ActionButton
                  icon={<DownloadIcon className="w-5 h-5" />}
                  onClick={handleDownloadPDF}
                  title="Baixar PDF"
                  variant="primary"
                />
              </div>
            </div>
          )}
        </main>
      </div>

      {sigModal.open && (
        <SignatureModal
          isOpen={sigModal.open}
          onClose={() => setSigModal({ open: false, type: null })}
          onSave={saveSignature}
          declarationId={activeDeclaration?.id}
          type={sigModal.type}
        />
      )}
    </div>
  );
};

const SidebarItem: React.FC<{ icon: React.ReactNode; label: string; active: boolean; collapsed: boolean; onClick: () => void }> = ({ icon, label, active, collapsed, onClick }) => (
  <button
    onClick={onClick}
    className={`relative group w-full flex items-center transition-all ${collapsed ? 'justify-center p-3.5' : 'p-3 gap-3'} rounded-xl font-bold uppercase tracking-widest text-[10px] ${active ? 'bg-zinc-100 text-zinc-950 shadow-md' : 'text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-100'}`}
  >
    <div className={`shrink-0 transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>{icon}</div>
    {!collapsed && <span className="whitespace-nowrap overflow-hidden text-left">{label}</span>}
  </button>
);

const ActionButton: React.FC<{ icon: React.ReactNode; onClick: () => void; title: string; variant: 'primary' | 'secondary' }> = ({ icon, onClick, title, variant }) => (
  <button
    onClick={onClick}
    title={title}
    className={`p-4 rounded-2xl shadow-2xl transition-all active:scale-90 flex items-center justify-center ${variant === 'primary' ? 'bg-zinc-950 text-white hover:bg-zinc-800' : 'bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50'}`}
  >
    {icon}
  </button>
);

export default App;
