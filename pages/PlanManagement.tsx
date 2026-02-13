
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Plan } from '../types';


const PlanManagement: React.FC = () => {
  const { state, actions } = useData();
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Partial<Plan> | null>(null);

  const [formData, setFormData] = useState<Partial<Plan>>({
    name: '',
    priceQuarterly: 0,
    priceSemiannual: 0,
    priceYearly: 0,
    observations: '',
    recommended: false,
    active: true,
    features: [''],
    trafficFeePercent: 0,
    installments: 1,
    adCredit: 0,
    monthlyPriceQuarterly: 0,
    monthlyPriceSemiannual: 0,
    monthlyPriceYearly: 0,
    installmentsQuarterly: 1,
    installmentsSemiannual: 1,
    installmentsYearly: 1,
    trafficFeePercentQuarterly: 0,
    trafficFeePercentSemiannual: 0,
    trafficFeePercentYearly: 0,
    adCreditQuarterly: 0,
    adCreditSemiannual: 0,
    adCreditYearly: 0,
    orderIndex: 0
  });

  const handleOpenModal = (plan?: Plan) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData(plan);
    } else {
      setEditingPlan(null);
      setFormData({
        name: '',
        priceQuarterly: 0,
        priceSemiannual: 0,
        priceYearly: 0,
        observations: '',
        recommended: false,
        active: true,
        features: [''],
        trafficFeePercent: 0,
        installments: 1,
        adCredit: 0,
        monthlyPriceQuarterly: 0,
        monthlyPriceSemiannual: 0,
        monthlyPriceYearly: 0,
        installmentsQuarterly: 1,
        installmentsSemiannual: 1,
        installmentsYearly: 1,
        trafficFeePercentQuarterly: 0,
        trafficFeePercentSemiannual: 0,
        trafficFeePercentYearly: 0,
        adCreditQuarterly: 0,
        adCreditSemiannual: 0,
        adCreditYearly: 0,
        orderIndex: 0
      });
    }
    setShowModal(true);
  };

  const handleAddFeature = () => {
    setFormData({ ...formData, features: [...(formData.features || []), ''] });
  };

  const handleFeatureChange = (index: number, val: string) => {
    const newFeatures = [...(formData.features || [])];
    newFeatures[index] = val;
    setFormData({ ...formData, features: newFeatures });
  };

  const handleRemoveFeature = (index: number) => {
    setFormData({ ...formData, features: (formData.features || []).filter((_, i) => i !== index) });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    actions.savePlan(formData as Plan);
    setShowModal(false);
  };

  return (
    <div className="space-y-10">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black text-white mb-2 italic">Catálogo de <span className="text-primary italic">Planos</span></h2>
          <p className="text-slate-500 font-medium">Configure as ofertas, preços e funcionalidades visíveis para os lojistas.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-6 py-3 bg-primary text-neutral-950 rounded-xl font-black shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined">add_card</span> Novo Plano
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...state.plans].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0)).map((plan) => (
          <div key={plan.id} className="glass-panel p-8 rounded-3xl group relative overflow-hidden">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-black text-white">{plan.name}</h3>
                <div className="flex flex-col gap-1 mt-2">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Trimestral: R$ {plan.priceQuarterly}</p>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Semestral: R$ {plan.priceSemiannual}</p>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Anual: R$ {plan.priceYearly}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded">+ {plan.trafficFeePercent}% Taxa</span>
                    <span className="px-2 py-0.5 bg-white/5 text-slate-300 text-[10px] font-bold rounded">Até {plan.installments}x</span>
                    {plan.adCredit && plan.adCredit > 0 && (
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded">R$ {plan.adCredit} Ads</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleOpenModal(plan)} className="p-2 bg-white/5 text-slate-400 hover:text-primary rounded-lg transition-all"><span className="material-symbols-outlined text-sm">edit</span></button>
                <button onClick={() => { if (confirm('Excluir plano?')) actions.deletePlan(plan.id) }} className="p-2 bg-white/5 text-slate-400 hover:text-rose-500 rounded-lg transition-all"><span className="material-symbols-outlined text-sm">delete</span></button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-3 bg-black/30 rounded-xl border border-white/5">
                <p className="text-[10px] font-black text-slate-500 uppercase">Status</p>
                <span className={`text-xs font-bold ${plan.active ? 'text-primary' : 'text-rose-500'}`}>{plan.active ? 'Ativo' : 'Inativo'}</span>
              </div>
              <div className="p-3 bg-black/30 rounded-xl border border-white/5">
                <p className="text-[10px] font-black text-slate-500 uppercase">Destaque</p>
                <span className="text-xs font-bold text-white">{plan.recommended ? 'Sim' : 'Não'}</span>
              </div>
            </div>

            {plan.observations && (
              <div className="mb-6 p-3 bg-white/5 rounded-xl border border-white/5">
                <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Observações</p>
                <p className="text-xs text-slate-300">{plan.observations}</p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Funcionalidades Inclusas</p>
              {plan.features.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="material-symbols-outlined text-primary text-sm">done</span> {f}
                </div>
              ))}
            </div>

            <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none">
              <span className="material-symbols-outlined text-[100px]">auto_awesome</span>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-10 border-primary/20 shadow-2xl">
            <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
              <h3 className="text-2xl font-black text-white italic">{editingPlan ? 'Editar Plano' : 'Novo Plano Comercial'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white transition-all"><span className="material-symbols-outlined">close</span></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Nome do Plano</label>
                  <input type="text" required className="w-full bg-black/40 border-neutral-border rounded-xl px-4 py-3 text-sm text-white focus:ring-primary" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Ordem de Exibição (0 = Primeiro)</label>
                  <input type="number" className="w-full bg-black/40 border-neutral-border rounded-xl px-4 py-3 text-sm text-white focus:ring-primary" value={formData.orderIndex ?? 0} onChange={e => setFormData({ ...formData, orderIndex: parseInt(e.target.value) })} />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Trimestral (R$ Total)</label>
                  <input type="number" required className="w-full bg-black/40 border-neutral-border rounded-xl px-4 py-3 text-sm text-white focus:ring-primary" value={formData.priceQuarterly} onChange={e => setFormData({ ...formData, priceQuarterly: parseFloat(e.target.value) })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Display Mensal (R$)</label>
                    <input type="number" className="w-full bg-black/40 border-neutral-border rounded-xl px-4 py-2 text-sm text-white focus:ring-primary" value={formData.monthlyPriceQuarterly || ''} onChange={e => setFormData({ ...formData, monthlyPriceQuarterly: parseFloat(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Parcelas Máx.</label>
                    <input type="number" className="w-full bg-black/40 border-neutral-border rounded-xl px-4 py-2 text-sm text-white focus:ring-primary" value={formData.installmentsQuarterly || ''} onChange={e => setFormData({ ...formData, installmentsQuarterly: parseInt(e.target.value) })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Taxa Tráfego (%)</label>
                    <input type="number" step="0.1" className="w-full bg-black/40 border-neutral-border rounded-xl px-4 py-2 text-sm text-white focus:ring-primary" value={formData.trafficFeePercentQuarterly || ''} onChange={e => setFormData({ ...formData, trafficFeePercentQuarterly: parseFloat(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Crédito Ads (R$)</label>
                    <input type="number" className="w-full bg-black/40 border-neutral-border rounded-xl px-4 py-2 text-sm text-white focus:ring-primary" value={formData.adCreditQuarterly || ''} onChange={e => setFormData({ ...formData, adCreditQuarterly: parseFloat(e.target.value) })} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Semestral (R$ Total)</label>
                  <input type="number" required className="w-full bg-black/40 border-neutral-border rounded-xl px-4 py-3 text-sm text-white focus:ring-primary" value={formData.priceSemiannual} onChange={e => setFormData({ ...formData, priceSemiannual: parseFloat(e.target.value) })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Display Mensal (R$)</label>
                    <input type="number" className="w-full bg-black/40 border-neutral-border rounded-xl px-4 py-2 text-sm text-white focus:ring-primary" value={formData.monthlyPriceSemiannual || ''} onChange={e => setFormData({ ...formData, monthlyPriceSemiannual: parseFloat(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Parcelas Máx.</label>
                    <input type="number" className="w-full bg-black/40 border-neutral-border rounded-xl px-4 py-2 text-sm text-white focus:ring-primary" value={formData.installmentsSemiannual || ''} onChange={e => setFormData({ ...formData, installmentsSemiannual: parseInt(e.target.value) })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Taxa Tráfego (%)</label>
                    <input type="number" step="0.1" className="w-full bg-black/40 border-neutral-border rounded-xl px-4 py-2 text-sm text-white focus:ring-primary" value={formData.trafficFeePercentSemiannual || ''} onChange={e => setFormData({ ...formData, trafficFeePercentSemiannual: parseFloat(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Crédito Ads (R$)</label>
                    <input type="number" className="w-full bg-black/40 border-neutral-border rounded-xl px-4 py-2 text-sm text-white focus:ring-primary" value={formData.adCreditSemiannual || ''} onChange={e => setFormData({ ...formData, adCreditSemiannual: parseFloat(e.target.value) })} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Anual (R$ Total)</label>
                  <input type="number" required className="w-full bg-black/40 border-neutral-border rounded-xl px-4 py-3 text-sm text-white focus:ring-primary" value={formData.priceYearly} onChange={e => setFormData({ ...formData, priceYearly: parseFloat(e.target.value) })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Display Mensal (R$)</label>
                    <input type="number" className="w-full bg-black/40 border-neutral-border rounded-xl px-4 py-2 text-sm text-white focus:ring-primary" value={formData.monthlyPriceYearly || ''} onChange={e => setFormData({ ...formData, monthlyPriceYearly: parseFloat(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Parcelas Máx.</label>
                    <input type="number" className="w-full bg-black/40 border-neutral-border rounded-xl px-4 py-2 text-sm text-white focus:ring-primary" value={formData.installmentsYearly || ''} onChange={e => setFormData({ ...formData, installmentsYearly: parseInt(e.target.value) })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Taxa Tráfego (%)</label>
                    <input type="number" step="0.1" className="w-full bg-black/40 border-neutral-border rounded-xl px-4 py-2 text-sm text-white focus:ring-primary" value={formData.trafficFeePercentYearly || ''} onChange={e => setFormData({ ...formData, trafficFeePercentYearly: parseFloat(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Crédito Ads (R$)</label>
                    <input type="number" className="w-full bg-black/40 border-neutral-border rounded-xl px-4 py-2 text-sm text-white focus:ring-primary" value={formData.adCreditYearly || ''} onChange={e => setFormData({ ...formData, adCreditYearly: parseFloat(e.target.value) })} />
                  </div>
                </div>
              </div>


              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Descrição Mensagens (Ex: "Cobrado a cada 3 meses")</label>
                  <div className="grid grid-cols-3 gap-4">
                    <input type="text" placeholder="Tri" className="bg-black/40 border-neutral-border rounded-xl px-4 py-2 text-[10px] text-white" value={formData.descriptionQuarterly || ''} onChange={e => setFormData({ ...formData, descriptionQuarterly: e.target.value })} />
                    <input type="text" placeholder="Sem" className="bg-black/40 border-neutral-border rounded-xl px-4 py-2 text-[10px] text-white" value={formData.descriptionSemiannual || ''} onChange={e => setFormData({ ...formData, descriptionSemiannual: e.target.value })} />
                    <input type="text" placeholder="Anu" className="bg-black/40 border-neutral-border rounded-xl px-4 py-2 text-[10px] text-white" value={formData.descriptionYearly || ''} onChange={e => setFormData({ ...formData, descriptionYearly: e.target.value })} />
                  </div>
                </div>

              </div>


              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase">Observações</label>
                <textarea className="w-full bg-black/40 border-neutral-border rounded-xl px-4 py-3 text-sm text-white focus:ring-primary h-24" value={formData.observations || ''} onChange={e => setFormData({ ...formData, observations: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="rec" className="rounded bg-black border-neutral-border text-primary" checked={formData.recommended} onChange={e => setFormData({ ...formData, recommended: e.target.checked })} />
                  <label htmlFor="rec" className="text-xs font-bold text-white">Recomendado</label>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="act" className="rounded bg-black border-neutral-border text-primary" checked={formData.active} onChange={e => setFormData({ ...formData, active: e.target.checked })} />
                  <label htmlFor="act" className="text-xs font-bold text-white">Ativo no Catálogo</label>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Funcionalidades</label>
                  <button type="button" onClick={handleAddFeature} className="text-[10px] font-black text-primary uppercase">+ Add Feature</button>
                </div>
                {formData.features?.map((feat, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input type="text" placeholder="Ex: Pedidos Ilimitados" className="flex-1 bg-black/40 border-neutral-border rounded-xl px-4 py-2 text-xs text-white" value={feat} onChange={e => handleFeatureChange(idx, e.target.value)} />
                    <button type="button" onClick={() => handleRemoveFeature(idx)} className="text-slate-500 hover:text-rose-500"><span className="material-symbols-outlined text-lg">remove_circle</span></button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-4 pt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 font-bold text-slate-500">Cancelar</button>
                <button type="submit" className="px-10 py-3 bg-primary text-neutral-950 rounded-xl font-black shadow-lg shadow-primary/20">Salvar Plano</button>
              </div>
            </form>
          </div>
        </div >
      )}
    </div >
  );
};

export default PlanManagement;
