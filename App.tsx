
import React from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { DataProvider, useData } from './context/DataContext';
import { UserRole } from './types';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Marketing from './pages/Marketing';
import Performance from './pages/Performance';
import Logistics from './pages/Logistics';
import AbandonedCarts from './pages/AbandonedCarts';
import Domains from './pages/Domains';
import Billing from './pages/Billing';
import AdminDashboard from './pages/AdminDashboard';
import TenantManagement from './pages/TenantManagement';
import UserManagement from './pages/UserManagement';
import Automations from './pages/Automations';
import BillingPlans from './pages/BillingPlans';
import PlanManagement from './pages/PlanManagement';
import Login from './pages/Login'; // Import Login

const SidebarItem: React.FC<{
  to: string;
  icon: string;
  label: string;
  active?: boolean
}> = ({ to, icon, label, active }) => (
  <Link
    to={to}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active
      ? 'bg-primary/10 text-primary font-bold'
      : 'text-slate-400 hover:bg-white/5 hover:text-white'
      }`}
  >
    <span className="material-symbols-outlined">{icon}</span> {label}
  </Link>
);

const Sidebar = () => {
  const location = useLocation();
  const currentPath = location.pathname.substring(1) || 'dashboard';
  const { state, actions } = useData();
  const isAdmin = state.currentUser?.role === UserRole.CONEXX_ADMIN;

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 glass-panel border-r border-neutral-border hidden lg:flex flex-col z-50 overflow-y-auto scrollbar-thin">
      <div className="p-8">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-neutral-950 font-black text-2xl leading-none italic">C</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white italic">Conexx</h1>
        </div>

        <nav className="space-y-2">
          {isAdmin ? (
            <>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-4">Administração</p>
              <SidebarItem to="/" icon="monitoring" label="Dashboard Global" active={currentPath === ''} />
              <SidebarItem to="/tenants" icon="storefront" label="Gestão de Lojistas" active={currentPath === 'tenants'} />
              <SidebarItem to="/plan-management" icon="receipt_long" label="Catálogo de Planos" active={currentPath === 'plan-management'} />
              <SidebarItem to="/users" icon="manage_accounts" label="Gestão de Admins" active={currentPath === 'users'} />
              <SidebarItem to="/performance" icon="analytics" label="Performance Corp" active={currentPath === 'performance'} />
            </>
          ) : (
            <>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-4">Geral</p>
              <SidebarItem to="/" icon="dashboard" label="Dashboard" active={currentPath === ''} />
              <SidebarItem to="/orders" icon="shopping_bag" label="Vendas Live" active={currentPath === 'orders'} />

              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mt-10 mb-4">Marketing</p>
              <SidebarItem to="/marketing" icon="campaign" label="Influenciadores" active={currentPath === 'marketing'} />
              <SidebarItem to="/automations" icon="hub" label="Automações SMS" active={currentPath === 'automations'} />

              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mt-10 mb-4">Operações</p>
              <SidebarItem to="/logistics" icon="local_shipping" label="Logística" active={currentPath === 'logistics'} />
              <SidebarItem to="/abandoned-carts" icon="shopping_cart_checkout" label="Carrinhos" active={currentPath === 'abandoned-carts'} />

              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mt-10 mb-4">Financeiro & Web</p>
              <SidebarItem to="/plans" icon="credit_card" label="Planos & Cobrança" active={currentPath === 'plans'} />
              <SidebarItem to="/domains" icon="language" label="Domínios & Web" active={currentPath === 'domains'} />
              <SidebarItem to="/billing" icon="settings_input_component" label="Conexão Yampi" active={currentPath === 'billing'} />
            </>
          )}
        </nav>
      </div>

      <div className="mt-auto p-8 border-t border-neutral-border/30">
        <button
          onClick={() => actions.switchRole()}
          className="w-full mb-4 py-2 px-3 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black uppercase text-slate-400 hover:text-primary hover:border-primary/50 transition-all"
        >
          {isAdmin ? 'Simular Lojista' : 'Voltar para Admin'}
        </button>
        <button
          onClick={() => actions.logout()}
          className="w-full py-2 px-3 bg-red-500/10 border border-red-500/20 rounded-lg text-[10px] font-black uppercase text-red-400 hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">logout</span> Sair
        </button>
        <div className="flex items-center gap-4 mt-4">
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-neutral-border flex items-center justify-center font-black text-xs text-primary">
            {state.currentUser?.name.substring(0, 1)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{state.currentUser?.name}</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{isAdmin ? 'Conexx Corp' : 'Gestor de Loja'}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { state, isLoading } = useData();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Carregando Sessão...</p>
        </div>
      </div>
    );
  }

  if (!state.currentUser) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const MainLayout = () => {
  const { state } = useData();
  const isAdmin = state.currentUser?.role === UserRole.CONEXX_ADMIN;

  return (
    <div className="flex">
      <Sidebar />
      <main className="lg:ml-64 flex-1 p-6 lg:p-10 min-h-screen max-w-7xl mx-auto w-full">
        <Routes>
          <Route path="/" element={isAdmin ? <AdminDashboard /> : <Dashboard />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/marketing" element={<Marketing />} />
          <Route path="/automations" element={<Automations />} />
          <Route path="/performance" element={<Performance />} />
          <Route path="/logistics" element={<Logistics />} />
          <Route path="/abandoned-carts" element={<AbandonedCarts />} />
          <Route path="/domains" element={<Domains />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/tenants" element={<TenantManagement />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/plans" element={<BillingPlans />} />
          <Route path="/plan-management" element={<PlanManagement />} />
        </Routes>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <DataProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          } />
        </Routes>
      </HashRouter>
    </DataProvider>
  );
};

export default App;
