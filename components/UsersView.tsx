import React, { useState, useEffect } from 'react';
import { UserPlusIcon, Trash2Icon, UserIcon, ShieldIcon, LoaderIcon } from 'lucide-react';

interface User {
    id: number;
    username: string;
    role: 'master' | 'user';
    email: string;
    created_at: string;
}

interface Props {
    apiUrl: string;
}

export const UsersView: React.FC<Props> = ({ apiUrl }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' as 'master' | 'user', email: '' });

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${apiUrl}/users`);
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        } catch (err) {
            console.error(err);
            setError('Erro ao carregar usuários');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError('');
        try {
            const response = await fetch(`${apiUrl}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser)
            });
            if (response.ok) {
                setShowForm(false);
                setNewUser({ username: '', password: '', role: 'user' });
                fetchUsers();
            } else {
                const data = await response.json();
                setError(data.error || 'Erro ao criar usuário');
            }
        } catch (err) {
            console.error(err);
            setError('Erro de conexão');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteUser = async (id: number, username: string) => {
        if (username === 'admin') {
            alert('O usuário administrador principal não pode ser excluído.');
            return;
        }
        if (!confirm(`Deseja realmente excluir o usuário ${username}?`)) return;

        try {
            const response = await fetch(`${apiUrl}/users/${id}`, { method: 'DELETE' });
            if (response.ok) {
                setUsers(prev => prev.filter(u => u.id !== id));
            }
        } catch (err) {
            console.error(err);
            alert('Erro ao excluir usuário');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Gestão de Usuários</h2>
                    <p className="text-zinc-500 font-medium mt-1">Cadastre e gerencie os acessos ao sistema.</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 px-6 py-3.5 bg-zinc-950 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-200"
                >
                    <UserPlusIcon className="w-4 h-4" />
                    Novo Usuário
                </button>
            </div>

            {showForm && (
                <div className="bg-white p-8 rounded-[2.5rem] border-2 border-zinc-100 shadow-xl animate-in slide-in-from-top-4 duration-300">
                    <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Usuário</label>
                            <input
                                required
                                type="text"
                                value={newUser.username}
                                onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all font-medium"
                                placeholder="Identificador"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Senha</label>
                            <input
                                required
                                type="password"
                                value={newUser.password}
                                onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all font-medium"
                                placeholder="••••••••"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Nível de Acesso</label>
                            <select
                                value={newUser.role}
                                onChange={e => setNewUser({ ...newUser, role: e.target.value as any })}
                                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all font-medium appearance-none"
                            >
                                <option value="user">Usuário Comum</option>
                                <option value="master">Administrador (Master)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">E-mail</label>
                            <input
                                required
                                type="email"
                                value={newUser.email}
                                onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 transition-all font-medium"
                                placeholder="usuario@ctdi.com"
                            />
                        </div>
                        <div className="md:col-span-3 flex justify-end gap-3 mt-2">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-6 py-3 text-zinc-500 font-bold uppercase text-[10px] tracking-widest hover:text-zinc-900 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                disabled={isSaving}
                                type="submit"
                                className="px-8 py-3 bg-zinc-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-zinc-800 transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSaving && <LoaderIcon className="w-3 h-3 animate-spin" />}
                                Salvar Usuário
                            </button>
                        </div>
                    </form>
                    {error && <p className="mt-4 text-red-500 text-[10px] font-black uppercase text-center">{error}</p>}
                </div>
            )}

            <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-2xl shadow-zinc-200/50 overflow-hidden">
                {isLoading ? (
                    <div className="py-32 flex flex-col items-center gap-4">
                        <LoaderIcon className="w-8 h-8 animate-spin text-zinc-300" />
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Carregando usuários...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-50/80 border-b border-zinc-100">
                                    <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Identificador</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">E-mail</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Nível</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Criado em</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-50">
                                {users.map(user => (
                                    <tr key={user.id} className="hover:bg-zinc-50/50 transition-all group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-all">
                                                    <UserIcon className="w-5 h-5" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-black text-zinc-900">{user.username}</span>
                                                    <span className="text-[10px] font-bold text-zinc-400 uppercase">{user.role}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-sm font-semibold text-zinc-500">{user.email || '—'}</span>
                                        </td>
                                        <td className="px-8 py-6 text-sm font-semibold text-zinc-500">
                                            {new Date(user.created_at).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            {user.username !== 'admin' && (
                                                <button
                                                    onClick={() => handleDeleteUser(user.id, user.username)}
                                                    className="p-3 bg-white hover:bg-red-500 text-zinc-400 hover:text-white rounded-xl shadow-sm border border-zinc-100 transition-all opacity-0 group-hover:opacity-100"
                                                    title="Excluir Usuário"
                                                >
                                                    <Trash2Icon className="w-5 h-5" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
