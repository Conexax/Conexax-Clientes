import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';

const SubscriptionDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { actions } = useData();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null); // { customer, subscriptions, payments, tenant, status }

    useEffect(() => {
        const loadData = async () => {
            if (id) {
                try {
                    const result = await actions.fetchAdminClientDetails(id);
                    setData(result);
                } catch (e) {
                    console.error("Error fetching details", e);
                }
            }
            setLoading(false);
        };
        loadData();
    }, [id]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (!data) return <div className="p-8 text-white mt-10 text-center glass-panel rounded-2xl border border-rose-500/20 text-rose-500 font-black uppercase tracking-widest">Cliente não encontrado.</div>;

    const { customer, subscriptions, payments, tenant, status } = data;
    const activeSub = subscriptions?.[0];

    return (
        <div className="space-y-8 animate-fade-in p-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <Link to="/assinaturas" className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all text-slate-400 hover:text-white">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
                    <div>
                        <h2 className="text-3xl font-black text-white mb-1">Dossiê do <span className="text-primary italic">Cliente</span></h2>
                        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">ID Asaas: {customer.id}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className={`px-6 py-3 rounded-2xl border flex flex-col items-center
                        ${status === 'adimplente' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/5 border-rose-500/20 text-rose-400'}`}>
                        <span className="text-[10px] font-black uppercase tracking-tighter opacity-70">Status de Adimplência</span>
                        <span className="text-lg font-black uppercase italic">{status}</span>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Customer Info */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-panel p-8 rounded-3xl border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/10 transition-all"></div>
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-sm">person</span>
                            Dados Cadastrais
                        </h3>
                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-slate-600 uppercase">Nome / Lojista</label>
                                <div className="text-lg font-bold text-white">{customer.name}</div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-600 uppercase">E-mail de Contato</label>
                                <div className="text-slate-300 font-medium">{customer.email}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-600 uppercase">Documento</label>
                                    <div className="text-slate-300 font-mono text-xs">{customer.cpfCnpj || '---'}</div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-600 uppercase">Telefone</label>
                                    <div className="text-slate-300 font-medium">{customer.phone || '---'}</div>
                                </div>
                            </div>
                            <div className="pt-6 border-t border-white/5">
                                <label className="text-[10px] font-black text-slate-600 uppercase">Meta Definida</label>
                                <div className="mt-2">
                                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-xs font-black uppercase">
                                        {tenant?.metaRange || 'Não definida'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Subscription Status */}
                    {activeSub && (
                        <div className="glass-panel p-8 rounded-3xl border border-white/5">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <span className="material-symbols-outlined text-emerald-400 text-sm">auto_renew</span>
                                Plano Ativo
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <div className="text-2xl font-black text-white">{activeSub.description || 'Assinatura Conexx'}</div>
                                        <div className="text-[10px] font-black text-primary uppercase">{activeSub.cycle}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-mono text-emerald-400 font-bold">R$ {activeSub.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                        <div className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Valor Mensal</div>
                                    </div>
                                </div>
                                <div className="pt-4 flex items-center justify-between">
                                    <span className="text-xs text-slate-400 font-medium">Próximo Vencimento:</span>
                                    <span className="text-xs text-white font-bold">{new Date(activeSub.nextDueDate).toLocaleDateString('pt-BR')}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* History */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden">
                        <div className="p-8 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-sm">history</span>
                                Histórico de Cobranças
                            </h3>
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{payments?.length || 0} Registros</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white/5">
                                    <tr>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase">Data</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase">Descrição</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase">Valor</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {payments?.map((p: any) => (
                                        <tr key={p.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-8 py-4 text-xs text-slate-300 font-medium">
                                                {new Date(p.dueDate).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="px-8 py-4 text-xs text-white font-bold">
                                                {p.description || 'Cobrança de Assinatura'}
                                            </td>
                                            <td className="px-8 py-4 text-xs font-mono text-emerald-400 font-bold">
                                                R$ {p.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-8 py-4">
                                                <div className="flex justify-center">
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest
                                                        ${p.status === 'RECEIVED' || p.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-400' :
                                                            p.status === 'OVERDUE' ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-500/10 text-slate-400'}`}>
                                                        {(p.status === 'RECEIVED' || p.status === 'CONFIRMED') ? 'Pago' :
                                                            p.status === 'OVERDUE' ? 'Atrasado' : 'Pendente'}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {(!payments || payments.length === 0) && (
                                        <tr>
                                            <td colSpan={4} className="px-8 py-10 text-center text-slate-600 uppercase font-black tracking-widest text-[10px]">Nenhum histórico encontrado</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionDetails;
