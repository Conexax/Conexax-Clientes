
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Coupon, Influencer } from '../types';

const Marketing: React.FC = () => {
  const { state, stats, actions } = useData();
  const [activeTab, setActiveTab] = useState<'influencers' | 'coupons'>('influencers');
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [showInfluencerModal, setShowInfluencerModal] = useState(false);

  // Form states
  const [couponForm, setCouponForm] = useState<Partial<Coupon>>({ id: '', code: '', type: 'percentage', value: 10, usageLimit: 0 });
  const [infForm, setInfForm] = useState<Partial<Influencer>>({ id: '', name: '', couponId: '', commissionRate: 5 });

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    await actions.saveCoupon({ ...couponForm, active: true });
    setShowCouponModal(false);
  };

  const handleCreateInfluencer = (e: React.FormEvent) => {
    e.preventDefault();
    actions.saveInfluencer({ ...infForm });
    setShowInfluencerModal(false);
  };

  const openEditCoupon = (coupon: Coupon) => {
    setCouponForm(coupon);
    setShowCouponModal(true);
  };

  const openEditInfluencer = (inf: Influencer) => {
    setInfForm(inf);
    setShowInfluencerModal(true);
  };

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-white mb-2">Marketing & <span className="text-primary italic">Crescimento</span></h2>
          <p className="text-slate-500 font-medium italic">Gerencie parceiros, cupons sincronizados e analise o ROI.</p>
        </div>
        <div className="flex bg-panel-dark border border-neutral-border p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('influencers')}
            className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'influencers' ? 'bg-primary text-neutral-950 shadow-lg' : 'text-slate-500 hover:text-white'}`}
          >
            Influenciadores
          </button>
          <button
            onClick={() => setActiveTab('coupons')}
            className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'coupons' ? 'bg-primary text-neutral-950 shadow-lg' : 'text-slate-500 hover:text-white'}`}
          >
            Cupons Yampi
          </button>
        </div>
      </header>

      {activeTab === 'influencers' ? (
        <section className="space-y-8 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="glass-panel p-6 rounded-2xl stat-card border-l-4 border-l-primary">
              <p className="text-[10px] font-black text-slate-500 uppercase mb-2">ROI Médio Influenciadores</p>
              <h4 className="text-3xl font-black text-white">{(stats.totalRevenue / (state.influencers.length || 1)).toFixed(1)}x</h4>
            </div>
            <div className="glass-panel p-6 rounded-2xl stat-card border-l-4 border-l-amber-500">
              <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Comissões Pendentes</p>
              <h4 className="text-3xl font-black text-white">R$ {stats.influencerStats.reduce((acc: number, curr: any) => acc + curr.totalCommission, 0).toLocaleString()}</h4>
            </div>
            <button
              onClick={() => { setInfForm({ id: '', name: '', couponId: '', commissionRate: 5 }); setShowInfluencerModal(true); }}
              className="md:col-span-2 bg-primary/10 border border-dashed border-primary/40 rounded-2xl flex items-center justify-center gap-4 hover:bg-primary/20 transition-all group"
            >
              <span className="material-symbols-outlined text-primary text-3xl group-hover:scale-110 transition-transform">person_add</span>
              <span className="text-primary font-black uppercase text-xs tracking-widest">Novo Influenciador</span>
            </button>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block glass-panel rounded-2xl overflow-hidden shadow-2xl">
            <table className="w-full text-left">
              <thead className="bg-black/40 border-b border-neutral-border/50">
                <tr>
                  <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-500">Influenciador</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-500">Vendas</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-500">Faturamento</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-500">Comissão (%)</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-500 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-border/30">
                {stats.influencerStats.map((inf: any) => (
                  <tr key={inf.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/5 flex items-center justify-center text-primary font-black text-xs">{inf.name.substring(0, 1)}</div>
                        <span className="text-sm font-bold text-white">{inf.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm font-bold text-slate-400">{inf.totalSales} pedidos</td>
                    <td className="px-8 py-5 text-sm font-black text-white">R$ {inf.revenue.toLocaleString()}</td>
                    <td className="px-8 py-5">
                      <span className="px-2 py-0.5 bg-neutral-800 border border-white/10 text-slate-400 text-[10px] font-black rounded uppercase">{inf.commissionRate}%</span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEditInfluencer(inf)} className="p-2 text-slate-500 hover:text-primary transition-all"><span className="material-symbols-outlined text-sm">edit</span></button>
                        <button onClick={() => { if (confirm('Remover parceiro?')) actions.deleteInfluencer(inf.id) }} className="p-2 text-slate-500 hover:text-rose-500 transition-all"><span className="material-symbols-outlined text-sm">delete</span></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {state.influencers.length === 0 && (
                  <tr><td colSpan={5} className="py-20 text-center text-slate-600 font-bold uppercase text-[10px] tracking-widest italic">Nenhum influenciador cadastrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden space-y-4">
            {stats.influencerStats.map((inf: any) => (
              <div key={inf.id} className="glass-panel p-5 rounded-3xl border-white/5 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/5 flex items-center justify-center text-primary font-black text-xs">{inf.name.substring(0, 1)}</div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{inf.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 bg-neutral-800 border border-white/10 text-slate-400 text-[10px] font-black rounded uppercase">{inf.commissionRate}% Comissão</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEditInfluencer(inf)} className="p-2 bg-white/5 text-slate-500 hover:text-primary rounded-xl transition-all"><span className="material-symbols-outlined text-sm">edit</span></button>
                    <button onClick={() => { if (confirm('Remover parceiro?')) actions.deleteInfluencer(inf.id) }} className="p-2 bg-white/5 text-slate-500 hover:text-rose-500 rounded-xl transition-all"><span className="material-symbols-outlined text-sm">delete</span></button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5">
                  <div>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Vendas</p>
                    <p className="text-base text-slate-300 font-mono flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">shopping_bag</span>
                      {inf.totalSales}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Faturamento</p>
                    <p className="text-xl text-white font-black">
                      R$ {inf.revenue.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {state.influencers.length === 0 && (
              <div className="glass-panel p-10 rounded-3xl border-white/5 text-center">
                <p className="text-slate-600 font-bold uppercase text-[10px] tracking-widest italic">Nenhum influenciador cadastrado.</p>
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="space-y-8 animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2 italic">
              <span className="material-symbols-outlined text-primary">confirmation_number</span> Meus Cupons Sincronizados
            </h3>
            <button
              onClick={() => { setCouponForm({ id: '', code: '', type: 'percentage', value: 10, usageLimit: 0 }); setShowCouponModal(true); }}
              className="px-6 py-2.5 bg-primary text-neutral-950 rounded-xl font-black text-xs hover:bg-primary-dark transition-all"
            >
              Criar Novo Cupom
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {state.coupons.map((coupon) => (
              <div key={coupon.id} className="glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">CÓDIGO</p>
                    <h4 className="text-2xl font-black text-white group-hover:text-primary transition-colors">{coupon.code}</h4>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEditCoupon(coupon)} className="p-1.5 bg-white/5 text-slate-500 hover:text-primary rounded-lg transition-all"><span className="material-symbols-outlined text-sm">edit</span></button>
                    <button onClick={() => { if (confirm('Excluir cupom?')) actions.deleteCoupon(coupon.id) }} className="p-1.5 bg-white/5 text-slate-500 hover:text-rose-500 rounded-lg transition-all"><span className="material-symbols-outlined text-sm">delete</span></button>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-500 uppercase">{coupon.type === 'percentage' ? `${coupon.value}% OFF` : `R$ ${coupon.value} OFF`}</span>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${coupon.active ? 'bg-primary/10 text-primary' : 'bg-rose-500/10 text-rose-500'}`}>
                      {coupon.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  {coupon.usageLimit && coupon.usageLimit > 0 ? (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                        <span>Uso do Cupom</span>
                        <span>{coupon.usageCount} / {coupon.usageLimit}</span>
                      </div>
                      <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${(coupon.usageCount / coupon.usageLimit) * 100}%` }}></div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-600 italic font-medium">Uso ilimitado habilitado</p>
                  )}
                </div>
              </div>
            ))}
            {state.coupons.length === 0 && (
              <div className="col-span-3 py-20 border-2 border-dashed border-neutral-border rounded-3xl text-center text-slate-600 font-bold uppercase text-xs">
                Crie cupons para habilitar campanhas de marketing.
              </div>
            )}
          </div>
        </section>
      )}

      {/* MODAL CUPOM */}
      {showCouponModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-md rounded-3xl p-8 border-primary/20">
            <h3 className="text-2xl font-black text-white mb-6 italic">{couponForm.id ? 'Editar Cupom' : 'Novo Cupom Yampi'}</h3>
            <form onSubmit={handleCreateCoupon} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase">Código do Cupom</label>
                <input type="text" required className="w-full bg-panel-dark border-neutral-border rounded-xl px-4 py-3 text-sm text-white focus:ring-primary font-mono" value={couponForm.code} onChange={e => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Tipo</label>
                  <select className="w-full bg-panel-dark border-neutral-border rounded-xl px-4 py-3 text-xs text-white" value={couponForm.type} onChange={e => setCouponForm({ ...couponForm, type: e.target.value as any })}>
                    <option value="percentage">Porcentagem (%)</option>
                    <option value="fixed">Fixo (R$)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Valor</label>
                  <input type="number" required className="w-full bg-panel-dark border-neutral-border rounded-xl px-4 py-3 text-sm text-white" value={couponForm.value} onChange={e => setCouponForm({ ...couponForm, value: parseFloat(e.target.value) })} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase">Limite de Uso (0 = Ilimitado)</label>
                <input type="number" className="w-full bg-panel-dark border-neutral-border rounded-xl px-4 py-3 text-sm text-white" value={couponForm.usageLimit} onChange={e => setCouponForm({ ...couponForm, usageLimit: parseInt(e.target.value) })} />
              </div>
              <button type="submit" className="w-full py-4 bg-primary text-neutral-950 rounded-xl font-black shadow-lg shadow-primary/20">Sincronizar com Yampi</button>
              <button type="button" onClick={() => setShowCouponModal(false)} className="w-full text-slate-500 text-xs font-bold uppercase">Cancelar</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL INFLUENCIADOR */}
      {showInfluencerModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-md rounded-3xl p-8 border-primary/20">
            <h3 className="text-2xl font-black text-white mb-6 italic">{infForm.id ? 'Editar Parceiro' : 'Vincular Influenciador'}</h3>
            <form onSubmit={handleCreateInfluencer} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase">Nome Artístico</label>
                <input type="text" required className="w-full bg-panel-dark border-neutral-border rounded-xl px-4 py-3 text-sm text-white focus:ring-primary" value={infForm.name} onChange={e => setInfForm({ ...infForm, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase">Cupom Vinculado</label>
                <select className="w-full bg-panel-dark border-neutral-border rounded-xl px-4 py-3 text-xs text-white" value={infForm.couponId} onChange={e => setInfForm({ ...infForm, couponId: e.target.value })}>
                  <option value="">Selecione um cupom...</option>
                  {state.coupons.map(c => (
                    <option key={c.id} value={c.id}>{c.code} ({c.type === 'percentage' ? `${c.value}%` : `R$ ${c.value}`})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase">Comissão (%)</label>
                <input type="number" required className="w-full bg-panel-dark border-neutral-border rounded-xl px-4 py-3 text-sm text-white" value={infForm.commissionRate} onChange={e => setInfForm({ ...infForm, commissionRate: parseFloat(e.target.value) })} />
              </div>
              <button type="submit" className="w-full py-4 bg-primary text-neutral-950 rounded-xl font-black shadow-lg shadow-primary/20">Salvar Dados</button>
              <button type="button" onClick={() => setShowInfluencerModal(false)} className="w-full text-slate-500 text-xs font-bold uppercase">Cancelar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Marketing;
