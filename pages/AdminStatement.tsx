import React, { useState, useEffect } from 'react';
import DateRangeFilter from '../components/DateRangeFilter';
import axios from 'axios';

const AdminStatement: React.FC = () => {
    const [dateRange, setDateRange] = useState<{ start: Date, end: Date }>({
        start: new Date(new Date().setDate(new Date().getDate() - 30)), // Last 30 days default
        end: new Date(new Date().setHours(23, 59, 59, 999))
    });
    const [page, setPage] = useState(1);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);

    const handleFilterChange = (start: Date, end: Date) => {
        setDateRange({ start, end });
        setPage(1); // Reset to first page
    };

    const fetchExtrato = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/admin/extrato', {
                params: {
                    page,
                    limit: 10,
                    startDate: dateRange.start.toISOString(),
                    endDate: dateRange.end.toISOString()
                }
            });
            setTransactions(res.data.data || []);
            setMeta(res.data.meta || { total: 0, totalPages: 1 });
        } catch (err) {
            console.error("Failed to fetch extrato", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExtrato();
    }, [dateRange, page]);

    const handleSync = async () => {
        if (syncing) return;
        setSyncing(true);
        try {
            await axios.post('/api/asaas/sync-data');
            // Refresh data
            await fetchExtrato();
            alert("Sincronização concluída com sucesso!");
        } catch (error) {
            console.error("Sync failed", error);
            alert("Erro ao sincronizar dados do Asaas.");
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className="space-y-10" >
            <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <div>
                    <h2 className="text-4xl font-black text-white mb-2">Extrato <span className="text-primary italic">Financeiro</span></h2>
                    <p className="text-slate-500 font-medium italic">Histórico detalhado de transações (Fonte: Asaas).</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="btn btn-secondary flex items-center gap-2"
                    >
                        <span className={`material-symbols-outlined ${syncing ? 'animate-spin' : ''}`}>sync</span>
                        {syncing ? 'Sincronizando...' : 'Sincronizar Asaas'}
                    </button>
                    <DateRangeFilter onFilterChange={handleFilterChange} />
                </div>
            </header>

            {/* Table */}
            < section className="space-y-4" >
                {/* Desktop Table */}
                < div className="hidden lg:block glass-panel p-6 rounded-2xl" >
                    {loading && <div className="text-center py-4 text-slate-400">Carregando...</div>}
                    {!loading && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Data</th>
                                        <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Descrição</th>
                                        <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                                        <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo</th>
                                        <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Valor Bruto</th>
                                        <th className="py-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right text-emerald-400">Valor Líquido</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {transactions.map(item => (
                                        <tr key={item.id} className="hover:bg-white/5 transition-colors">
                                            <td className="py-4 px-4 text-sm text-slate-300 font-medium">
                                                {new Date(item.due_date || item.created_at).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="py-4 px-4">
                                                <p className="text-sm font-bold text-white">{item.description || 'Sem descrição'}</p>
                                                <p className="text-[10px] text-slate-500 uppercase tracking-widest">{item.invoice_url ? <a href={item.invoice_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">Ver Fatura</a> : item.id}</p>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${['RECEIVED', 'CONFIRMED', 'PAID'].includes(item.status) ? 'bg-emerald-500/10 text-emerald-400' :
                                                        ['PENDING'].includes(item.status) ? 'bg-yellow-500/10 text-yellow-400' :
                                                            'bg-red-500/10 text-red-400'
                                                    }`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-sm text-slate-400">{item.billing_type || 'UNDEFINED'}</td>
                                            <td className="py-4 px-4 text-sm text-white text-right font-bold">R$ {(item.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                            <td className="py-4 px-4 text-sm text-emerald-400 text-right font-black">R$ {(item.net_value || item.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div >

                {/* Mobile Cards */}
                < div className="lg:hidden space-y-4" >
                    {
                        transactions.map(item => (
                            <div key={item.id} className="glass-panel p-6 rounded-2xl border-white/5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${['RECEIVED', 'CONFIRMED', 'PAID'].includes(item.status) ? 'bg-emerald-500/10 text-emerald-400' :
                                            ['PENDING'].includes(item.status) ? 'bg-yellow-500/10 text-yellow-400' :
                                                'bg-red-500/10 text-red-400'
                                        }`}>
                                        {item.status}
                                    </span>
                                    <span className="text-xs text-slate-500">{new Date(item.due_date).toLocaleDateString()}</span>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-white">{item.description}</h4>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
                                        {item.invoice_url && <a href={item.invoice_url} target="_blank" rel="noreferrer" className="text-primary underline">Ver Fatura</a>}
                                    </p>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-white/5">
                                    <span className="text-slate-400 text-xs">Valor</span>
                                    <span className="text-white font-bold">R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        ))
                    }
                </div >

                {
                    !loading && transactions.length === 0 && (
                        <div className="text-center py-20 glass-panel rounded-2xl border-dashed border-neutral-border/30">
                            <span className="material-symbols-outlined text-slate-700 text-6xl mb-4">analytics</span>
                            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Nenhum dado encontrado</p>
                        </div>
                    )
                }

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                    <button
                        disabled={page <= 1}
                        onClick={() => setPage(p => p - 1)}
                        className="px-4 py-2 rounded bg-white/5 text-white disabled:opacity-50 text-xs font-bold uppercase"
                    >
                        Anterior
                    </button>
                    <span className="text-slate-500 text-xs">Página {page} de {meta.totalPages}</span>
                    <button
                        disabled={page >= meta.totalPages}
                        onClick={() => setPage(p => p + 1)}
                        className="px-4 py-2 rounded bg-white/5 text-white disabled:opacity-50 text-xs font-bold uppercase"
                    >
                        Próxima
                    </button>
                </div>
            </section >
        </div >
    );
};

export default AdminStatement;
