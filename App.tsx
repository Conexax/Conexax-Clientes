
import React from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
// This tool call seems to be for `multi_replace_file_content` based on logic, but I selected `replace_file_content` in thought.
// I will use `replace_file_content` for the import first.
// This tool call seems to be for `multi_replace_file_content` based on logic, but I selected `replace_file_content` in thought.
// I will use `replace_file_content` for the import first.
import MobileNavigation from './components/MobileNavigation';
import IOSInstallPrompt from './components/IOSInstallPrompt';
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
import Login from './pages/Login';
import AdminGoals from './pages/AdminGoals';

import YampiOAuthCallback from './pages/YampiOAuthCallback';
import Products from './pages/Products';

import Importer from './pages/Importer';
import Coupons from './pages/Coupons';
import AdminStatement from './pages/AdminStatement';
import AdminWeeklyFees from './pages/AdminWeeklyFees';
import AsaasConfig from './pages/AsaasConfig';
import UpgradeSuccess from './pages/UpgradeSuccess';
import UpgradeError from './pages/UpgradeError';
import Subscriptions from './pages/Subscriptions';
import SubscriptionDetails from './pages/SubscriptionDetails';

import ConfirmPayment from './pages/ConfirmPayment';
import WeeklyFees from './pages/WeeklyFees';
import AdminMetrics from './pages/AdminMetrics';
import TenantMetricsDetails from './pages/TenantMetricsDetails';
import { NotificationProvider } from './context/NotificationContext';
import ToastContainer from './components/ToastContainer';
import NotificationCenter from './components/NotificationCenter';


const SidebarItem: React.FC<{
  to: string;
  icon: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
}> = ({ to, icon, label, active, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active
      ? 'bg-primary/10 text-primary font-bold'
      : 'text-slate-400 hover:bg-white/5 hover:text-white'
      }`}
  >
    <span className="material-symbols-outlined text-lg">{icon}</span>
    <span className="text-sm">{label}</span>
  </Link>
);

const SidebarGroup: React.FC<{
  label: string;
  icon: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ label, icon, isOpen, onToggle, children }) => {
  return (
    <div className="space-y-1">
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${isOpen ? 'text-white' : 'text-slate-500 hover:bg-white/5'
          }`}
      >
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-lg">{icon}</span>
          <span className="text-xs font-black uppercase tracking-widest">{label}</span>
        </div>
        <span className={`material-symbols-outlined text-sm transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100 mb-4' : 'max-h-0 opacity-0'}`}>
        <div className="pl-4 space-y-1">
          {children}
        </div>
      </div>
    </div>
  );
};

const Sidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const currentPath = location.pathname.substring(1) || 'dashboard';
  const { state, actions } = useData();
  const isAdmin = state.currentUser?.role === UserRole.CONEXX_ADMIN;

  const [openGroup, setOpenGroup] = React.useState<string | null>(() => {
    // Try to auto-open the group containing the current path
    if (['orders', 'marketing', 'automations'].includes(currentPath)) return 'sales';
    if (['logistics', 'abandoned-carts', 'products'].includes(currentPath)) return 'operations';
    if (['plans', 'domains', 'billing'].includes(currentPath)) return 'financial';
    return null;
  });

  const toggleGroup = (group: string) => {
    setOpenGroup(openGroup === group ? null : group);
  };

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      <aside className={`fixed left-0 top-0 h-screen w-64 glass-panel border-r border-neutral-border flex flex-col z-[60] overflow-y-auto scrollbar-thin transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 pb-4">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center justify-start gap-4 mb-8">
              <img src="/logo-conexx.png" alt="Conexx" className="h-10 w-auto object-contain" />
              <h1 className="text-2xl font-bold tracking-tight text-white italic">ConexaX</h1>
            </div>
            <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <nav className="space-y-2">
            {isAdmin ? (
              <>
                <SidebarItem to="/" icon="monitoring" label="Dashboard Global" active={currentPath === ''} onClick={onClose} />

                <SidebarGroup label="Gestão Corp" icon="corporate_fare" isOpen={openGroup === 'admin_mgmt'} onToggle={() => toggleGroup('admin_mgmt')}>
                  <SidebarItem to="/tenants" icon="storefront" label="Lojistas" active={currentPath === 'tenants'} onClick={onClose} />
                  <SidebarItem to="/admin/goals" icon="flag" label="Metas" active={currentPath === 'admin/goals'} onClick={onClose} />
                  <SidebarItem to="/plan-management" icon="receipt_long" label="Planos" active={currentPath === 'plan-management'} onClick={onClose} />
                  <SidebarItem to="/users" icon="manage_accounts" label="Admins" active={currentPath === 'users'} onClick={onClose} />
                  <SidebarItem to="/admin/asaas" icon="api" label="Configuração Asaas" active={currentPath === 'admin/asaas'} onClick={onClose} />
                </SidebarGroup>

                <SidebarGroup label="Financeiro" icon="account_balance" isOpen={openGroup === 'admin_fin'} onToggle={() => toggleGroup('admin_fin')}>
                  <SidebarItem to="/admin/metrics" icon="monitoring" label="Métricas" active={currentPath === 'admin/metrics'} onClick={onClose} />
                  <SidebarItem to="/assinaturas" icon="card_membership" label="Assinaturas" active={currentPath === 'assinaturas'} onClick={onClose} />
                  <SidebarItem to="/admin/fees" icon="payments" label="Taxas Semanais" active={currentPath === 'admin/fees'} onClick={onClose} />
                </SidebarGroup>
              </>
            ) : (
              <>
                <SidebarItem to="/" icon="dashboard" label="Dashboard" active={currentPath === ''} onClick={onClose} />

                <SidebarGroup label="Vendas & Mkt" icon="campaign" isOpen={openGroup === 'sales'} onToggle={() => toggleGroup('sales')}>
                  <SidebarItem to="/orders" icon="shopping_bag" label="Vendas Live" active={currentPath === 'orders'} onClick={onClose} />
                  <SidebarItem to="/marketing" icon="celebration" label="Influenciadores" active={currentPath === 'marketing'} onClick={onClose} />
                  <SidebarItem to="/automations" icon="hub" label="Automações SMS" active={currentPath === 'automations'} onClick={onClose} />
                </SidebarGroup>

                <SidebarGroup label="Operações" icon="inventory_2" isOpen={openGroup === 'operations'} onToggle={() => toggleGroup('operations')}>
                  <SidebarItem to="/logistics" icon="local_shipping" label="Logística" active={currentPath === 'logistics'} onClick={onClose} />
                  <SidebarItem to="/abandoned-carts" icon="shopping_cart_checkout" label="Carrinhos" active={currentPath === 'abandoned-carts'} onClick={onClose} />
                  <SidebarItem to="/products" icon="inventory_2" label="Produtos" active={currentPath === 'products'} onClick={onClose} />
                </SidebarGroup>

                <SidebarGroup label="Financeiro & Web" icon="language" isOpen={openGroup === 'financial'} onToggle={() => toggleGroup('financial')}>
                  <SidebarItem to="/plans" icon="credit_card" label="Planos & Cobrança" active={currentPath === 'plans'} onClick={onClose} />
                  <SidebarItem to="/pagamentos-semanais" icon="payments" label="Taxas Semanais" active={currentPath === 'pagamentos-semanais'} onClick={onClose} />
                  <SidebarItem to="/domains" icon="language" label="Domínios & Web" active={currentPath === 'domains'} onClick={onClose} />
                </SidebarGroup>
              </>
            )}
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-neutral-border/30">

          <button
            onClick={() => { actions.logout(); onClose(); }}
            className="w-full py-2 px-3 bg-red-500/10 border border-red-500/20 rounded-lg text-[10px] font-black uppercase text-red-400 hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">logout</span> Sair
          </button>
          <div className="flex items-center gap-4 mt-4">
            <NotificationCenter />
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-neutral-border flex items-center justify-center font-black text-xs text-primary">
              {state.currentUser?.name.substring(0, 1)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{state.currentUser?.name}</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{isAdmin ? 'Conexx Hub' : 'Gestor de Loja'}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
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
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  return (
    <div className="flex flex-col lg:flex-row">
      {/* Mobile Top Header */}
      <header className="lg:hidden h-16 bg-neutral-900/50 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 sticky top-0 z-[50]">
        <div className="flex items-center gap-3">
          <img src="/logo-conexx.png" alt="Conexx" className="h-8 w-auto object-contain" />
          <span className="text-lg font-bold text-white italic">ConexaX</span>
        </div>
        <div className="flex items-center gap-3">
          <NotificationCenter />
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>
      </header>

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content with bottom padding for mobile nav */}
      <main className="lg:ml-64 flex-1 p-6 lg:p-10 min-h-screen pb-24 lg:pb-10">
        <div className="max-w-screen-2xl mx-auto">
          <Routes>
            <Route path="/" element={isAdmin ? <AdminDashboard /> : <Dashboard />} />
            <Route path="/admin/statement" element={<AdminStatement />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/marketing" element={<Marketing />} />
            <Route path="/automations" element={<Automations />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/logistics" element={<Logistics />} />
            <Route path="/abandoned-carts" element={<AbandonedCarts />} />
            <Route path="/domains" element={<Domains />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/yampi-callback" element={<YampiOAuthCallback />} />
            <Route path="/products" element={<Products />} />
            <Route path="/admin/goals" element={<AdminGoals />} />

            <Route path="/admin/import" element={<Importer />} />
            <Route path="/coupons" element={<Coupons />} />
            <Route path="/tenants" element={<TenantManagement />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/plans" element={<BillingPlans />} />
            <Route path="/plan-management" element={<PlanManagement />} />
            <Route path="/admin/asaas" element={<AsaasConfig />} />
            <Route path="/assinaturas" element={<Subscriptions />} />
            <Route path="/assinaturas/:id" element={<SubscriptionDetails />} />
            <Route path="/assinatura/sucesso" element={<UpgradeSuccess />} />
            <Route path="/assinatura/erro" element={<UpgradeError />} />
            <Route path="/pagamento/confirmar" element={<ConfirmPayment />} />
            <Route path="/admin/fees" element={<AdminWeeklyFees />} />
            <Route path="/pagamentos-semanais" element={<WeeklyFees />} />
            <Route path="/admin/metrics" element={<AdminMetrics />} />
            <Route path="/admin/metrics/:id" element={<TenantMetricsDetails />} />
          </Routes>
        </div>
      </main>

      <MobileNavigation />
      <IOSInstallPrompt />
    </div>
  );
};

import { registerServiceWorker } from './utils/push';

const App: React.FC = () => {
  React.useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <DataProvider>
      <NotificationProvider>
        <ToastContainer />
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
      </NotificationProvider>
    </DataProvider>
  );
};

export default App;
