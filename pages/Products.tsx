
import React, { useEffect, useState } from 'react';
import { supabase } from '../backend/supabaseClient';
import { useData } from '../context/DataContext';
import { Product, Category } from '../types';
import { YampiService } from '../backend/mockApi';

const Products: React.FC = () => {
  const { state, actions } = useData();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const [showEditor, setShowEditor] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [syncingYampi, setSyncingYampi] = useState(false);

  const [editing, setEditing] = useState<Product | null>(null);

  const fetchProducts = async () => {
    if (!state.activeTenant) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('tenant_id', state.activeTenant.id)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;

      const mapped: Product[] = (data || []).map((p: any) => ({
        id: p.id,
        tenantId: p.tenant_id,
        name: p.name,
        sku: p.sku,
        description: p.description,
        price: p.price,
        active: p.active,
        categoryId: p.category_id,
        operationType: p.operation_type,
        yampiProductId: p.yampi_product_id,
        images: p.images || []
      }));
      setProducts(mapped);
    } catch (e) {
      console.error('fetchProducts', e);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchProducts(); }, [state.activeTenant]);

  const handleSave = async (p: Product) => {
    try {
      await actions.saveProduct(p);
      fetchProducts();
      setShowEditor(false);
      setEditing(null);
    } catch (e) {
      console.error('save product', e);
      alert('Erro ao salvar produto');
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id || !confirm('Excluir este produto?')) return;
    try {
      await actions.deleteProduct(id);
      fetchProducts();
    } catch (e) { console.error(e); alert('Erro ao excluir'); }
  };

  const getCategoryName = (id?: string | null) => {
    if (!id) return '-';
    return state.categories.find(c => c.id === id)?.name || '-';
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-white">Catálogo de Produtos</h2>
          <p className="text-slate-500 text-sm font-medium">Gerencie produtos, categorias e integrações.</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <button onClick={() => setShowCategoryManager(true)} className="flex-1 md:flex-none px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-xs md:text-sm">Categorias</button>
          <button
            onClick={async () => {
              setSyncingYampi(true);
              try {
                await actions.syncYampi();
                await fetchProducts();
              } catch (e) {
                alert('Erro na sincronização');
              } finally {
                setSyncingYampi(false);
              }
            }}
            disabled={syncingYampi}
            className="flex-1 md:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold text-xs md:text-sm disabled:opacity-50"
          >
            {syncingYampi ? 'Sincronizando...' : 'Sincronizar Yampi'}
          </button>
          <button onClick={() => { setEditing(null); setShowEditor(true); }} className="w-full md:w-auto px-4 py-2 bg-primary hover:bg-emerald-500 rounded-xl font-bold text-xs md:text-sm text-black">Novo Produto</button>
        </div>
      </header>

      <section className="space-y-4">
        {/* Desktop Table */}
        <div className="hidden lg:block glass-panel p-4 overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-black/40">
              <tr>
                <th className="p-3 text-xs w-16 uppercase font-black text-slate-500">Img</th>
                <th className="p-3 text-xs uppercase font-black text-slate-500">Nome</th>
                <th className="p-3 text-xs uppercase font-black text-slate-500">Categoria</th>
                <th className="p-3 text-xs uppercase font-black text-slate-500">Operação</th>
                <th className="p-3 text-xs uppercase font-black text-slate-500">SKU</th>
                <th className="p-3 text-xs uppercase font-black text-slate-500">Preço</th>
                <th className="p-3 text-xs uppercase font-black text-slate-500">Ativo</th>
                <th className="p-3 text-xs text-right uppercase font-black text-slate-500">Ações</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} className="hover:bg-white/5 border-b border-white/5">
                  <td className="p-3">
                    {p.images && p.images.length > 0 ? (
                      <img src={p.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover border border-white/10" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-black text-slate-600 border border-white/5">IMG</div>
                    )}
                  </td>
                  <td className="p-3 font-bold text-sm text-white">{p.name}</td>
                  <td className="p-3 text-xs text-slate-400">{getCategoryName(p.categoryId)}</td>
                  <td className="p-3 text-[10px] font-black uppercase text-blue-400">{p.operationType || '-'}</td>
                  <td className="p-3 text-xs font-mono text-slate-500">{p.sku || '-'}</td>
                  <td className="p-3 font-black text-white">R$ {(p.price || 0).toFixed(2)}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${p.active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                      {p.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => { setEditing(p); setShowEditor(true); }} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 transition-all">
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-lg transition-all">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-4">
          {products.map(p => (
            <div key={p.id} className="glass-panel p-5 rounded-2xl border-white/5 space-y-4">
              <div className="flex gap-4">
                {p.images && p.images.length > 0 ? (
                  <img src={p.images[0]} alt="" className="w-20 h-20 rounded-xl object-cover border border-white/10 shadow-lg" />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-white/5 flex items-center justify-center text-[10px] font-black text-slate-600 border border-white/5">SEM FOTO</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate">{getCategoryName(p.categoryId)}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${p.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {p.active ? 'Ativo' : 'Off'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white leading-snug mb-1 line-clamp-2">{p.name}</h4>
                  <p className="text-[10px] font-mono text-slate-500">SKU: {p.sku || '—'}</p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-white/5">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Preço</p>
                  <p className="text-lg font-black text-white italic">R$ {(p.price || 0).toFixed(2)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditing(p); setShowEditor(true); }} className="w-10 h-10 flex items-center justify-center bg-white/5 text-slate-400 rounded-xl border border-white/5">
                    <span className="material-symbols-outlined text-lg">edit</span>
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="w-10 h-10 flex items-center justify-center bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/10">
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {products.length === 0 && (
          <div className="text-center py-20 glass-panel rounded-2xl border-dashed">
            <span className="material-symbols-outlined text-slate-700 text-6xl mb-4">inventory_2</span>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Nenhum produto cadastrado</p>
          </div>
        )}
      </section>

      {showEditor && (
        <ProductEditor
          product={editing}
          categories={state.categories}
          onClose={() => { setShowEditor(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}

      {showCategoryManager && (
        <CategoryManager
          categories={state.categories}
          onClose={() => setShowCategoryManager(false)}
          onSave={actions.saveCategory}
          onDelete={actions.deleteCategory}
        />
      )}
    </div>
  );
};

const ProductEditor: React.FC<{
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSave: (p: Product) => void
}> = ({ product, categories, onClose, onSave }) => {
  const [form, setForm] = useState<Partial<Product>>(product || { name: '', price: 0, active: true, operationType: 'sale', images: [] });
  const [uploading, setUploading] = useState(false);

  useEffect(() => { setForm(product || { name: '', price: 0, active: true, operationType: 'sale', images: [] }); }, [product]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);

    const newImages = [...(form.images || [])];

    try {
      for (const file of Array.from(e.target.files) as any[]) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('products').getPublicUrl(filePath);
        if (data) newImages.push(data.publicUrl);
      }
      setForm(prev => ({ ...prev, images: newImages }));
    } catch (error) {
      console.error('Upload error:', error);
      alert('Erro ao fazer upload da imagem.');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setForm(prev => ({ ...prev, images: (prev.images || []).filter((_, i) => i !== index) }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-panel-dark w-full max-w-2xl rounded-2xl p-6 border border-white/10 shadow-2xl overflow-y-auto max-h-[90vh]">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          {form.id ? 'Editar Produto' : 'Novo Produto'}
          {form.yampiProductId && <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-xs rounded border border-indigo-500/30">Sync Yampi</span>}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Basic Info */}
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs text-slate-400">Nome do Produto</label>
            <input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} className="w-full p-3 bg-black/40 border border-white/5 rounded focus:border-primary outline-none text-white" />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-400">SKU</label>
            <input value={form.sku || ''} onChange={e => setForm(prev => ({ ...prev, sku: e.target.value }))} className="w-full p-3 bg-black/40 border border-white/5 rounded focus:border-primary outline-none text-white" />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-400">Preço (R$)</label>
            <input type="number" value={form.price} onChange={e => setForm(prev => ({ ...prev, price: Number(e.target.value) }))} className="w-full p-3 bg-black/40 border border-white/5 rounded focus:border-primary outline-none text-white" />
          </div>

          {/* Classification */}
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Categoria</label>
            <select
              value={form.categoryId || ''}
              onChange={e => setForm(prev => ({ ...prev, categoryId: e.target.value || null }))}
              className="w-full p-3 bg-black/40 border border-white/5 rounded focus:border-primary outline-none text-white"
            >
              <option value="">Sem Categoria</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-400">Tipo de Operação</label>
            <input
              list="operationOptions"
              value={form.operationType || ''}
              onChange={e => setForm(prev => ({ ...prev, operationType: e.target.value }))}
              className="w-full p-3 bg-black/40 border border-white/5 rounded focus:border-primary outline-none text-white"
              placeholder="Ex: Venda, Aluguel"
            />
            <datalist id="operationOptions">
              <option value="Venda" />
              <option value="Aluguel" />
              <option value="Assinatura" />
            </datalist>
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="text-xs text-slate-400">Imagens</label>
            <div className="w-full p-4 bg-black/40 border border-white/5 rounded-xl">
              <div className="flex flex-wrap gap-2 mb-3">
                {form.images?.map((img, idx) => (
                  <div key={idx} className="relative w-20 h-20 rounded overflow-hidden group">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute top-0 right-0 p-1 bg-red-600 text-white rounded-bl opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
              <div className="relative">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex items-center justify-center border-2 border-dashed border-white/20 rounded-lg p-6 hover:border-primary/50 transition-colors">
                  <span className="text-slate-400 text-sm">{uploading ? 'Enviando...' : '+ Adicionar Fotos'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="text-xs text-slate-400">Descrição</label>
            <textarea value={form.description || ''} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} className="w-full p-3 bg-black/40 border border-white/5 rounded focus:border-primary outline-none text-white h-24" />
          </div>

          <div className="md:col-span-2 flex items-center gap-2">
            <input type="checkbox" checked={form.active} onChange={e => setForm(prev => ({ ...prev, active: e.target.checked }))} className="w-4 h-4 rounded bg-white/10 border-white/20 text-primary focus:ring-primary" id="activeCheck" />
            <label htmlFor="activeCheck" className="text-sm text-white select-none">Produto Ativo no Catálogo</label>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button onClick={onClose} className="px-5 py-2 hover:bg-white/5 rounded-xl text-slate-300 transition-colors">Cancelar</button>
          <button onClick={() => onSave(form as Product)} className="px-5 py-2 bg-primary hover:bg-emerald-500 rounded-xl font-bold text-black transition-colors">{form.id ? 'Salvar Alterações' : 'Criar Produto'}</button>
        </div>
      </div>
    </div>
  );
};

const CategoryManager: React.FC<{
  categories: Category[];
  onClose: () => void;
  onSave: (c: Partial<Category>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}> = ({ categories, onClose, onSave, onDelete }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await onSave({ name });
    setName('');
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-panel-dark w-full max-w-md rounded-2xl p-6 border border-white/10 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Gerenciar Categorias</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nova categoria..."
            className="flex-1 p-2 bg-black/40 border border-white/5 rounded text-white focus:border-primary outline-none"
          />
          <button disabled={loading} type="submit" className="px-4 py-2 bg-primary text-black font-bold rounded hover:bg-emerald-500 disabled:opacity-50">Add</button>
        </form>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
          {categories.map(c => (
            <div key={c.id} className="flex items-center justify-between p-3 bg-white/5 rounded border border-white/5 group">
              <span className="font-medium text-slate-200">{c.name}</span>
              <button
                onClick={() => { if (confirm('Excluir categoria?')) onDelete(c.id); }}
                className="text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity text-sm hover:underline"
              >
                Excluir
              </button>
            </div>
          ))}
          {categories.length === 0 && <p className="text-center text-slate-500 text-sm">Nenhuma categoria criada.</p>}
        </div>
      </div>
    </div>
  );
};

export default Products;
