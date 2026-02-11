
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Plan } from '../types';

const PlanManagement: React.FC = () => {
  const { state, actions } = useData();
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Partial<Plan> | null>(null);
  
  const [formData, setFormData] = useState<Partial<Plan>>({
    name: '',
    price: 0,
    interval: 'monthly',
    recommended: false,
    active: true,
    features: ['']
  });

  const handleOpenModal = (plan?: Plan) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData(plan);
    } else {
      setEditingPlan(null);
      setFormData({ name: '', price: 0, interval: 'monthly', recommended: false, active: true, features: [''] });
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
        {state.plans.map((plan) => (
          <div key={plan.id} className="glass-panel p-8 rounded-3xl group relative overflow-hidden">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-black text-white">{plan.name}</h3>
                <p className="text-slate-500 text-xs font-bold mt-1 uppercase tracking-widest italic">R$ {plan.price} / {plan.interval}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleOpenModal(plan)} className="p-2 bg-white/5 text-slate-400 hover:text-primary rounded-lg transition-all"><span className="material-symbols-outlined text-sm">edit</span></button>
                <button onClick={() => { if(confirm('Excluir plano?')) actions.deletePlan(plan.id) }} className="p-2 bg-white/5 text-slate-400 hover:text-rose-500 rounded-lg transition-all"><span className="material-symbols-outlined text-sm">delete</span></button>
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
                   <label className="text-[10px] font-black text-slate-500 uppercase">Nome do Plano</label>
                   <input type="text" required className="w-full bg-black/40 border-neutral-border rounded-xl px-4 py-3 text-sm text-white focus:ring-primary" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase">Preço (R$)</label>
                   <input type="number" required className="w-full bg-black/40 border-neutral-border rounded-xl px-4 py-3 text-sm text-white focus:ring-primary" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} />
                 </div>
               </div>

               <div className="grid grid-cols-3 gap-6">
                 <div className="flex items-center gap-3">
                   <input type="checkbox" id="rec" className="rounded bg-black border-neutral-border text-primary" checked={formData.recommended} onChange={e => setFormData({...formData, recommended: e.target.checked})} />
                   <label htmlFor="rec" className="text-xs font-bold text-white">Recomendado</label>
                 </div>
                 <div className="flex items-center gap-3">
                   <input type="checkbox" id="act" className="rounded bg-black border-neutral-border text-primary" checked={formData.active} onChange={e => setFormData({...formData, active: e.target.checked})} />
                   <label htmlFor="act" className="text-xs font-bold text-white">Ativo no Catálogo</label>
                 </div>
                 <div className="space-y-2">
                   <select className="w-full bg-black/40 border-neutral-border rounded-xl px-4 py-2 text-xs text-white" value={formData.interval} onChange={e => setFormData({...formData, interval: e.target.value as any})}>
                     <option value="monthly">Mensal</option>
                     <option value="yearly">Anual</option>
                   </select>
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
        </div>
      )}
    </div>
  );
};

export default PlanManagement;
