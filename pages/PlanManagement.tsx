
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Plan } from '../types';
import toast from 'react-hot-toast';


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
    orderIndex: 0,
    discountUpfrontPercent: 0
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
        orderIndex: 0,
        discountUpfrontPercent: 0
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await actions.savePlan(formData as Plan);
      toast.success('Plano salvo com sucesso!');
      setShowModal(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar plano.');
    }
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
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded">+ {plan.trafficFeePercentQuarterly || plan.trafficFeePercentSemiannual || plan.trafficFeePercentYearly || plan.trafficFeePercent || 0}% Taxa</span>
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
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">NOME DO PLANO</label>
                  <input type="text" required className="w-full bg-[#050505] border border-[#1e2a22] rounded-xl px-4 py-3 text-sm text-white focus:border-[#00D189] focus:outline-none transition-colors" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ORDEM DE EXIBIÇÃO</label>
                  <input type="number" className="w-full bg-[#050505] border border-[#1e2a22] rounded-xl px-4 py-3 text-sm text-white focus:border-[#00D189] focus:outline-none transition-colors" value={formData.orderIndex ?? 0} onChange={e => setFormData({ ...formData, orderIndex: parseInt(e.target.value) })} />
                </div>
              </div>

              {/* Trimestral Section */}
              <div className="space-y-4 pt-6 border-t border-[#1e2a22]">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">TRIMESTRAL (R$ TOTAL)</label>
                  <input type="number" required className="w-full bg-[#050505] border border-[#1e2a22] rounded-xl px-4 py-3 text-sm text-white focus:border-[#00D189] focus:outline-none transition-colors" value={formData.priceQuarterly} onChange={e => setFormData({ ...formData, priceQuarterly: parseFloat(e.target.value) })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">DISPLAY MENSAL (R$)</label>
                    <input type="number" className="w-full bg-[#050505] border border-[#1e2a22] rounded-xl px-4 py-3 text-sm text-white focus:border-[#00D189] focus:outline-none transition-colors" value={formData.monthlyPriceQuarterly || ''} onChange={e => setFormData({ ...formData, monthlyPriceQuarterly: parseFloat(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">PARCELAS MÁX.</label>
                    <input type="number" className="w-full bg-[#050505] border border-[#1e2a22] rounded-xl px-4 py-3 text-sm text-white focus:border-[#00D189] focus:outline-none transition-colors" value={formData.installmentsQuarterly || ''} onChange={e => setFormData({ ...formData, installmentsQuarterly: parseInt(e.target.value) })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">TAXA TRÁFEGO (%)</label>
                    <input type="number" step="0.1" className="w-full bg-[#050505] border border-[#1e2a22] rounded-xl px-4 py-3 text-sm text-white focus:border-[#00D189] focus:outline-none transition-colors" value={formData.trafficFeePercentQuarterly || ''} onChange={e => {
                      const val = parseFloat(e.target.value);
                      setFormData({
                        ...formData,
                        trafficFeePercentQuarterly: val,
                        descriptionQuarterly: e.target.value ? `${e.target.value}% das vendas realizadas através do tráfego pago` : ''
                      });
                    }} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">CRÉDITO ADS (R$)</label>
                    <input type="number" className="w-full bg-[#050505] border border-[#1e2a22] rounded-xl px-4 py-3 text-sm text-white focus:border-[#00D189] focus:outline-none transition-colors" value={formData.adCreditQuarterly || ''} onChange={e => setFormData({ ...formData, adCreditQuarterly: parseFloat(e.target.value) })} />
                  </div>
                </div>
              </div>

              {/* Semestral Section */}
              <div className="space-y-4 pt-6 mt-6 border-t border-[#1e2a22]">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">SEMESTRAL (R$ TOTAL)</label>
                  <input type="number" required className="w-full bg-[#050505] border border-[#1e2a22] rounded-xl px-4 py-3 text-sm text-white focus:border-[#00D189] focus:outline-none transition-colors" value={formData.priceSemiannual} onChange={e => setFormData({ ...formData, priceSemiannual: parseFloat(e.target.value) })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">DISPLAY MENSAL (R$)</label>
                    <input type="number" className="w-full bg-[#050505] border border-[#1e2a22] rounded-xl px-4 py-3 text-sm text-white focus:border-[#00D189] focus:outline-none transition-colors" value={formData.monthlyPriceSemiannual || ''} onChange={e => setFormData({ ...formData, monthlyPriceSemiannual: parseFloat(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">PARCELAS MÁX.</label>
                    <input type="number" className="w-full bg-[#050505] border border-[#1e2a22] rounded-xl px-4 py-3 text-sm text-white focus:border-[#00D189] focus:outline-none transition-colors" value={formData.installmentsSemiannual || ''} onChange={e => setFormData({ ...formData, installmentsSemiannual: parseInt(e.target.value) })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">TAXA TRÁFEGO (%)</label>
                    <input type="number" step="0.1" className="w-full bg-[#050505] border border-[#1e2a22] rounded-xl px-4 py-3 text-sm text-white focus:border-[#00D189] focus:outline-none transition-colors" value={formData.trafficFeePercentSemiannual || ''} onChange={e => {
                      const val = parseFloat(e.target.value);
                      setFormData({
                        ...formData,
                        trafficFeePercentSemiannual: val,
                        descriptionSemiannual: e.target.value ? `${e.target.value}% das vendas realizadas através do tráfego pago` : ''
                      });
                    }} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">CRÉDITO ADS (R$)</label>
                    <input type="number" className="w-full bg-[#050505] border border-[#1e2a22] rounded-xl px-4 py-3 text-sm text-white focus:border-[#00D189] focus:outline-none transition-colors" value={formData.adCreditSemiannual || ''} onChange={e => setFormData({ ...formData, adCreditSemiannual: parseFloat(e.target.value) })} />
                  </div>
                </div>
              </div>

              {/* Anual Section matching screenshot exactly */}
              <div className="space-y-4 pt-6 mt-6 border-t border-[#1e2a22]">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ANUAL (R$ TOTAL)</label>
                  <input type="number" required className="w-full bg-[#050505] border border-[#1e2a22] rounded-xl px-4 py-3 text-sm text-white focus:border-[#00D189] focus:outline-none transition-colors" value={formData.priceYearly} onChange={e => setFormData({ ...formData, priceYearly: parseFloat(e.target.value) })} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">DISPLAY MENSAL (R$)</label>
                    <input type="number" className="w-full bg-[#050505] border border-[#1e2a22] rounded-xl px-4 py-3 text-sm text-white focus:border-[#00D189] focus:outline-none transition-colors" value={formData.monthlyPriceYearly || ''} onChange={e => setFormData({ ...formData, monthlyPriceYearly: parseFloat(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">PARCELAS MÁX.</label>
                    <input type="number" className="w-full bg-[#050505] border border-[#1e2a22] rounded-xl px-4 py-3 text-sm text-white focus:border-[#00D189] focus:outline-none transition-colors" value={formData.installmentsYearly || ''} onChange={e => setFormData({ ...formData, installmentsYearly: parseInt(e.target.value) })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">TAXA TRÁFEGO (%)</label>
                    <input type="number" step="0.1" className="w-full bg-[#050505] border border-[#1e2a22] rounded-xl px-4 py-3 text-sm text-white focus:border-[#00D189] focus:outline-none transition-colors" value={formData.trafficFeePercentYearly || ''} onChange={e => {
                      const val = parseFloat(e.target.value);
                      setFormData({
                        ...formData,
                        trafficFeePercentYearly: val,
                        descriptionYearly: e.target.value ? `${e.target.value}% das vendas realizadas através do tráfego pago` : ''
                      });
                    }} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">CRÉDITO ADS (R$)</label>
                    <input type="number" className="w-full bg-[#050505] border border-[#1e2a22] rounded-xl px-4 py-3 text-sm text-white focus:border-[#00D189] focus:outline-none transition-colors" value={formData.adCreditYearly || ''} onChange={e => setFormData({ ...formData, adCreditYearly: parseFloat(e.target.value) })} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 mt-6 border-t border-[#1e2a22]">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest">DESCONTO PAGAMENTO À VISTA (%)</label>
                  <input type="number" min="0" max="100" className="w-full bg-[#050505] border border-[#1e2a22] rounded-xl px-4 py-3 text-sm text-white focus:border-rose-500 focus:outline-none transition-colors" value={formData.discountUpfrontPercent || 0} onChange={e => setFormData({ ...formData, discountUpfrontPercent: parseFloat(e.target.value) })} />
                  <p className="text-[10px] text-slate-500 mt-1">Percentual de desconto aplicado apenas na opção "Pagar à Vista".</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">DESCRIÇÃO MENSAGENS (EX: "COBRADO A CADA 3 MESES")</label>
                  <div className="grid grid-cols-3 gap-3">
                    <input type="text" placeholder="Tri" className="w-full bg-[#050505] border border-[#1e2a22] rounded-xl px-4 py-3 text-xs text-white focus:border-[#00D189] focus:outline-none transition-colors text-center" value={formData.descriptionQuarterly || ''} onChange={e => setFormData({ ...formData, descriptionQuarterly: e.target.value })} />
                    <input type="text" placeholder="Sem" className="w-full bg-[#050505] border border-[#1e2a22] rounded-xl px-4 py-3 text-xs text-white focus:border-[#00D189] focus:outline-none transition-colors text-center" value={formData.descriptionSemiannual || ''} onChange={e => setFormData({ ...formData, descriptionSemiannual: e.target.value })} />
                    <input type="text" placeholder="Anu" className="w-full bg-[#050505] border border-[#1e2a22] rounded-xl px-4 py-3 text-xs text-white focus:border-[#00D189] focus:outline-none transition-colors text-center" value={formData.descriptionYearly || ''} onChange={e => setFormData({ ...formData, descriptionYearly: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">OBSERVAÇÕES</label>
                <textarea className="w-full bg-[#050505] border border-[#1e2a22] rounded-xl px-4 py-3 text-sm text-white focus:border-[#00D189] focus:outline-none transition-colors h-28 resize-none" value={formData.observations || ''} onChange={e => setFormData({ ...formData, observations: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center justify-center">
                    <input type="checkbox" id="rec" className="w-5 h-5 rounded border border-[#1e2a22] bg-[#050505] appearance-none checked:bg-[#00D189] checked:border-[#00D189] transition-colors cursor-pointer" checked={formData.recommended} onChange={e => setFormData({ ...formData, recommended: e.target.checked })} />
                    {formData.recommended && <span className="material-symbols-outlined text-black text-sm absolute pointer-events-none">check</span>}
                  </div>
                  <label htmlFor="rec" className="text-sm font-bold text-white cursor-pointer select-none">Recomendado</label>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative flex items-center justify-center">
                    <input type="checkbox" id="act" className="w-5 h-5 rounded border border-[#1e2a22] bg-[#050505] appearance-none checked:bg-[#00D189] checked:border-[#00D189] transition-colors cursor-pointer" checked={formData.active} onChange={e => setFormData({ ...formData, active: e.target.checked })} />
                    {formData.active && <span className="material-symbols-outlined text-black text-sm absolute pointer-events-none">check</span>}
                  </div>
                  <label htmlFor="act" className="text-sm font-bold text-white cursor-pointer select-none">Ativo no Catálogo</label>
                </div>
              </div>


              <div className="space-y-4 pt-6 border-t border-[#1e2a22]">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">FUNCIONALIDADES</label>
                  <button type="button" onClick={handleAddFeature} className="text-[10px] font-black text-[#00D189] uppercase tracking-widest hover:text-[#00b375] transition-colors">+ ADD FEATURE</button>
                </div>

                {formData.features?.map((feat, idx) => (
                  <div key={idx} className="flex gap-3 items-center">
                    <input type="text" placeholder="Ex: Pedidos Ilimitados" className="flex-1 bg-[#050505] border border-[#1e2a22] rounded-xl px-4 py-3 text-sm text-white focus:border-[#00D189] focus:outline-none transition-colors" value={feat} onChange={e => handleFeatureChange(idx, e.target.value)} />
                    <button type="button" onClick={() => handleRemoveFeature(idx)} className="text-[#a1a1aa] hover:text-white transition-colors shrink-0 flex items-center justify-center p-2">
                      <span className="material-symbols-outlined text-xl">remove_circle_outline</span>
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-8 pt-8 mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="text-[#a1a1aa] font-bold text-lg hover:text-white transition-colors">Cancelar</button>
                <button type="submit" className="px-8 py-3.5 bg-[#00D189] text-[#050505] rounded-xl font-bold text-lg hover:bg-[#00b375] shadow-[0_0_20px_rgba(0,209,137,0.3)] transition-all">Salvar Plano</button>
              </div>
            </form>
          </div>
        </div >
      )}
    </div >
  );
};

export default PlanManagement;
