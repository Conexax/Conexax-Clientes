import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Tenant, User, Product, WeeklyFee } from '../types';
import { toast } from 'react-hot-toast';
import TenantMetricsDetails from './TenantMetricsDetails';
import { supabase } from '../backend/supabaseClient';

// We reuse TenantMetricsDetails for the "Dashboard" tab but rename/wrap it?
// Actually, TenantMetricsDetails is designed as a full page. 
// We should import its logic or component if possible, 
// OR just re-implement the fetch logic here to have a unified view.
// Let's re-implement for better control over layout (Tabs).

// Components for Tabs
const DashboardTab = ({ tenantId }: { tenantId: string }) => {
    // This will render the charts and metrics
    // We can reuse the logic from TenantMetricsDetails here or just render it if it accepts props?
    // The existing component uses useParams. 
    // Let's modify TenantMetricsDetails to optionally ANY id via props or hook?
    // Ideally, we just copy the fetch logic here or make a reusable component.
    // For speed, let's render the charts here directly.

    // ... (Chart logic similar to TenantMetricsDetails)
    return <TenantMetricsDetails />;
    // Wait, TenantMetricsDetails uses useParams(). If we are at /tenants/:id, it works!
    // So DashboardTab just renders that component? 
    // YES. It will pick up the ID from the URL context.
};

const FinanceTab = ({ tenantId }: { tenantId: string }) => {
    const [fees, setFees] = useState<WeeklyFee[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFees = async () => {
            const { data, error } = await supabase
                .from('weekly_fees')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('week_start', { ascending: false });
            if (data) setFees(data as any);
            setLoading(false);
        };
        fetchFees();
    }, [tenantId]);

    if (loading) return <div className="p-8 text-center text-slate-500">Carregando financeiro...</div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="glass-panel p-6 rounded-2xl border border-white/5">
                <h3 className="text-lg font-bold text-white mb-4">Histórico de Taxas Semanais</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                            <tr>
                                <th className="p-4">Semana</th>
                                <th className="p-4">Faturamento</th>
                                <th className="p-4">Valor</th>
                                <th className="p-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {fees.map(fee => (
                                <tr key={fee.id}>
                                    <td className="p-4 text-slate-300">
                                        {new Date(fee.week_start).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="p-4 font-mono text-white">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fee.revenueWeek)}
                                    </td>
                                    <td className="p-4 font-mono text-primary font-bold">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fee.amountDue)}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest
                                            ${fee.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' :
                                                fee.status === 'overdue' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
                                            }`}>
                                            {fee.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {fees.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-slate-500 text-xs">Nenhuma taxa encontrada.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const ProductsTab = ({ tenantId }: { tenantId: string }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProds = async () => {
            const { data } = await supabase.from('products').select('*').eq('tenant_id', tenantId);
            if (data) setProducts(data.map((p: any) => ({
                id: p.id,
                tenantId: p.tenant_id,
                name: p.name,
                price: p.price,
                active: p.active,
                sku: p.sku
            })));
            setLoading(false);
        };
        fetchProds();
    }, [tenantId]);

    if (loading) return <div className="p-8 text-center text-slate-500">Carregando produtos...</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
            {products.map(p => (
                <div key={p.id} className="glass-panel p-4 rounded-xl border border-white/5 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                        <h4 className="font-bold text-white text-sm">{p.name}</h4>
                        <span className={`w-2 h-2 rounded-full ${p.active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    </div>
                    <p className="text-xs text-slate-500 font-mono">{p.sku || 'Sem SKU'}</p>
                    <p className="text-primary font-black font-mono">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.price)}
                    </p>
                </div>
            ))}
            {products.length === 0 && <p className="text-slate-500 text-sm col-span-3 text-center">Nenhum produto cadastrado.</p>}
        </div>
    );
};

const TeamTab = ({ tenantId }: { tenantId: string }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            const { data } = await supabase.from('users').select('*').eq('tenant_id', tenantId);
            if (data) setUsers(data.map((u: any) => ({
                id: u.id,
                tenantId: u.tenant_id,
                email: u.email,
                role: u.role,
                name: u.name
            })));
            setLoading(false);
        };
        fetchUsers();
    }, [tenantId]);

    if (loading) return <div className="p-8 text-center text-slate-500">Carregando equipe...</div>;

    return (
        <div className="space-y-4 animate-fade-in">
            {users.map(u => (
                <div key={u.id} className="glass-panel p-4 rounded-xl border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-primary font-bold">
                            {u.name.substring(0, 2)}
                        </div>
                        <div>
                            <p className="text-white font-bold text-sm">{u.name}</p>
                            <p className="text-slate-500 text-xs">{u.email}</p>
                        </div>
                    </div>
                    <span className="px-2 py-1 bg-white/5 rounded text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {u.role}
                    </span>
                </div>
            ))}
            {users.length === 0 && <p className="text-slate-500 text-sm text-center">Nenhum usuário encontrado.</p>}
        </div>
    );
};

const TenantDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { state, actions } = useData();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'finance' | 'products' | 'team'>('dashboard');
    const [showEditModal, setShowEditModal] = useState(false);
    const [editFormData, setEditFormData] = useState<Partial<Tenant>>({});
    const [isSaving, setIsSaving] = useState(false);

    const tenant = state.tenants.find(t => t.id === id);

    useEffect(() => {
        if (tenant) setEditFormData(tenant);
    }, [tenant]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await actions.saveTenant(editFormData);
            setShowEditModal(false);
            toast.success("Lojista atualizado com sucesso!");
        } catch (err) {
            toast.error("Erro ao salvar lojista.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!tenant) return <div className="p-10 text-center text-slate-500">Lojista não encontrado ou carregando...</div>;

    return (
        <div className="space-y-8 min-h-screen pb-20">
            {/* HEADER */}
            <header className="glass-panel p-8 rounded-3xl border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                        <div className="flex items-center gap-6">
                            <Link to="/tenants" className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl hover:bg-white/10 transition-all text-slate-400 hover:text-white">
                                <span className="material-symbols-outlined">arrow_back</span>
                            </Link>

                            {/* AVATAR / LOGO */}
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-800 to-black border border-white/10 flex items-center justify-center text-primary font-black text-2xl shadow-xl overflow-hidden relative group">
                                {tenant.logoUrl ? (
                                    <img src={tenant.logoUrl} alt={tenant.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span>{tenant.name.substring(0, 2)}</span>
                                )}
                                {/* Quick Edit Overlay */}
                                <button onClick={() => { setEditFormData(tenant); setShowEditModal(true); }} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="material-symbols-outlined text-white text-sm">edit</span>
                                </button>
                            </div>

                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h1 className="text-3xl font-black text-white">{tenant.name}</h1>
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${tenant.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                        {tenant.active ? 'ATIVO' : 'INATIVO'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
                                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">id_card</span> {tenant.id}</span>
                                    <span className="flex items-center gap-1 border-l border-white/10 pl-4"><span className="material-symbols-outlined text-[16px]">business</span> {tenant.document || 'N/A'}</span>
                                    <span className="flex items-center gap-1 border-l border-white/10 pl-4"><span className="material-symbols-outlined text-[16px]">mail</span> {tenant.ownerEmail}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 items-center">
                            <button
                                onClick={() => { setEditFormData(tenant); setShowEditModal(true); }}
                                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-all flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">edit</span>
                                Editar
                            </button>

                            <div className="text-right hidden md:block border-l border-white/10 pl-6 ml-2">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Health Score</p>
                                <p className="text-xl font-black text-emerald-400">98/100</p>
                            </div>
                            <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 flex items-center justify-center text-[10px] font-black text-emerald-500">
                                98%
                            </div>
                        </div>
                    </div>

                    {/* TABS */}
                    <div className="flex gap-1 bg-black/40 p-1 rounded-xl max-w-fit">
                        {[
                            { id: 'dashboard', label: 'Dashboard', icon: 'monitoring' },
                            { id: 'finance', label: 'Financeiro', icon: 'payments' },
                            { id: 'products', label: 'Produtos', icon: 'inventory_2' },
                            { id: 'team', label: 'Equipe', icon: 'group' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id
                                    ? 'bg-primary text-neutral-950 shadow-lg shadow-primary/20'
                                    : 'text-slate-500 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* CONTENT */}
            <div className="min-h-[400px]">
                {activeTab === 'dashboard' && <DashboardTab tenantId={id!} />}
                {activeTab === 'finance' && <FinanceTab tenantId={id!} />}
                {activeTab === 'products' && <ProductsTab tenantId={id!} />}
                {activeTab === 'team' && <TeamTab tenantId={id!} />}
            </div>

            {/* EDIT MODAL */}
            {showEditModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border-primary/20 p-8">
                        <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                            <h3 className="text-2xl font-black text-white italic">Editar Lojista</h3>
                            <button onClick={() => setShowEditModal(false)} className="text-slate-500 hover:text-white transition-all"><span className="material-symbols-outlined">close</span></button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nome da Loja</label>
                                    <input type="text" className="w-full bg-black/40 border-neutral-border rounded-xl px-4 py-3 text-sm text-white focus:ring-primary" value={editFormData.name || ''} onChange={e => setEditFormData({ ...editFormData, name: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Documento (CPF/CNPJ)</label>
                                    <input type="text" className="w-full bg-black/40 border-neutral-border rounded-xl px-4 py-3 text-sm text-white focus:ring-primary" value={editFormData.document || ''} onChange={e => setEditFormData({ ...editFormData, document: e.target.value })} />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Logo da Empresa (URL)</label>
                                    <input
                                        type="text"
                                        placeholder="https://exemplo.com/logo.png"
                                        className="w-full bg-black/40 border-neutral-border rounded-xl px-4 py-3 text-sm text-white focus:ring-primary font-mono text-xs"
                                        value={editFormData.logoUrl || ''}
                                        onChange={e => setEditFormData({ ...editFormData, logoUrl: e.target.value })}
                                    />
                                    <p className="text-[9px] text-slate-500">Cole a URL pública da logomarca da empresa.</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Proprietário</label>
                                    <input type="text" readOnly disabled className="w-full bg-white/5 border-neutral-border/50 rounded-xl px-4 py-3 text-sm text-slate-400 cursor-not-allowed" value={editFormData.ownerName || ''} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Email (Login)</label>
                                    <input type="text" readOnly disabled className="w-full bg-white/5 border-neutral-border/50 rounded-xl px-4 py-3 text-sm text-slate-400 cursor-not-allowed" value={editFormData.ownerEmail || ''} />
                                </div>
                            </div>

                            <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-4">
                                <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Configurações Avançadas</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Percentual da Empresa (%)</label>
                                        <input type="number" className="w-full bg-black/40 border-neutral-border rounded-xl px-4 py-2 text-sm text-white" value={editFormData.companyPercentage || ''} onChange={e => setEditFormData({ ...editFormData, companyPercentage: Number(e.target.value) })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Yampi ID / Alias</label>
                                        <input type="text" className="w-full bg-black/40 border-neutral-border rounded-xl px-4 py-2 text-sm text-slate-300 font-mono" value={editFormData.yampiAlias || ''} onChange={e => setEditFormData({ ...editFormData, yampiAlias: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                                <button type="button" onClick={() => setShowEditModal(false)} className="px-6 py-3 font-bold text-slate-400 hover:text-white transition-colors">Cancelar</button>
                                <button type="submit" disabled={isSaving} className="px-8 py-3 bg-primary text-neutral-950 rounded-xl font-black hover:bg-primary-dark transition-all flex items-center gap-2">
                                    {isSaving ? <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" /> : 'Salvar Alterações'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TenantDetails;
