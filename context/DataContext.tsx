
import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { Order, OrderStatus, AbandonedCheckout, AppSettings, AppState, User, Tenant, UserRole, Domain, Coupon, Influencer, CommSettings, Plan } from '../types';
import { AuthService, YampiService } from '../backend/mockApi'; // Keep for other data for now
import { supabase } from '../backend/supabaseClient';

interface DataContextType {
  state: AppState;
  isSyncing: boolean;
  isLoading: boolean;
  syncError: string | null;
  actions: {
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
    syncYampi: () => Promise<void>;
    updateSettings: (settings: AppSettings) => void;
    addOrder: (order: Partial<Order>) => void;
    updateOrder: (id: string, updates: Partial<Order>) => void;
    deleteOrder: (id: string) => void;
    connectYampi: (token: string, secret: string, alias: string, proxyUrl: string) => void;
    switchRole: () => void;
    saveTenant: (tenantData: Partial<Tenant>) => void;
    deleteTenant: (id: string) => void;
    saveUser: (userData: Partial<User>) => Promise<void>;
    deleteUser: (id: string) => Promise<void>;
    saveDomain: (domain: Domain) => Promise<void>;
    deleteDomain: (id: string) => void;
    syncDomains: () => Promise<void>;
    savePlan: (plan: Plan) => void;
    deletePlan: (id: string) => void;
    saveCoupon: (coupon: Partial<Coupon>) => Promise<void>;
    deleteCoupon: (id: string) => void;
    saveInfluencer: (influencer: Partial<Influencer>) => void;
    deleteInfluencer: (id: string) => void;
    saveCommSettings: (settings: CommSettings) => void;
    clearSyncError: () => void;
  };
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Helpers to map DB snake_case to Frontend camelCase
const mapTenantFromDB = (dbTenant: any): Tenant => ({
  id: dbTenant.id,
  name: dbTenant.name,
  ownerName: dbTenant.owner_name,
  ownerEmail: dbTenant.owner_email,
  password: dbTenant.password,
  yampiToken: dbTenant.yampi_token,
  yampiSecret: dbTenant.yampi_secret,
  yampiAlias: dbTenant.yampi_alias,
  yampiProxyUrl: dbTenant.yampi_proxy_url,
  lastSync: dbTenant.last_sync,
  planId: dbTenant.plan_id,
  active: dbTenant.active,
  subscriptionStatus: dbTenant.subscription_status,
  nextBilling: dbTenant.next_billing
});

const mapUserFromDB = (dbUser: any): User => ({
  id: dbUser.id,
  tenantId: dbUser.tenant_id,
  email: dbUser.email,
  role: dbUser.role as UserRole,
  name: dbUser.name,
  password: dbUser.password
});



export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Initial state is now empty/null for user
  const [state, setState] = useState<AppState>({
    currentUser: null,
    users: [],
    activeTenant: null,
    orders: [],
    abandonedCheckouts: [],
    tenants: [],
    domains: [],
    plans: [],
    coupons: [],
    influencers: [],
    commSettings: { emailProvider: 'Yampi Native', smsProvider: 'Yampi Native', activeTriggers: [] },
    settings: { companyName: "Conexx Hub", supportEmail: "suporte@conexx.com.br", description: "", darkMode: true, currency: "BRL" }
  });

  // Effect to load initial data if user is logged in (persisted session)
  useEffect(() => {
    const restoreSession = async () => {
      const storedUserId = localStorage.getItem('conexx_user_id');
      if (storedUserId) {
        try {
          const { data: user, error } = await supabase.from('users').select('*').eq('id', storedUserId).single();
          if (user && !error) {
            let tenant = null;
            if (user.tenant_id) {
              const { data: t } = await supabase.from('tenants').select('*').eq('id', user.tenant_id).single();
              tenant = t;
            }

            // Map Data
            const mappedUser = mapUserFromDB(user);
            const mappedTenant = tenant ? mapTenantFromDB(tenant) : null;

            // Load context data based on role
            let allTenants: Tenant[] = [];
            let allUsers: User[] = [];

            if (mappedUser.role === UserRole.CONEXX_ADMIN) {
              const { data: t } = await supabase.from('tenants').select('*');
              allTenants = (t || []).map(mapTenantFromDB);
              const { data: u } = await supabase.from('users').select('*');
              allUsers = (u || []).map(mapUserFromDB);
            } else if (mappedUser.tenantId) {
              const { data: u } = await supabase.from('users').select('*').eq('tenant_id', mappedUser.tenantId);
              allUsers = (u || []).map(mapUserFromDB);
            }

            const { data: dbPlans } = await supabase.from('plans').select('*');
            const opData = AuthService.getOperationalData();

            setState(prev => ({
              ...prev,
              currentUser: mappedUser,
              activeTenant: mappedTenant,
              tenants: allTenants,
              users: allUsers,
              plans: dbPlans || [],
              ...opData
            }));
          }
        } catch (e) {
          console.error("Failed to restore session", e);
          localStorage.removeItem('conexx_user_id');
        }
      }
      setIsLoading(false);
    };
    restoreSession();
  }, []);

  const stats = useMemo(() => {
    const approved = state.orders.filter(o => o.status === OrderStatus.APROVADO);
    const totalRevenue = approved.reduce((acc, curr) => acc + curr.value, 0);
    const averageTicket = approved.length > 0 ? totalRevenue / approved.length : 0;

    const influencerStats = state.influencers.map(inf => {
      const coupon = state.coupons.find(c => c.id === inf.couponId);
      const infOrders = approved.filter(o => o.couponCode === coupon?.code);
      const revenue = infOrders.reduce((acc, curr) => acc + curr.value, 0);
      return {
        ...inf,
        totalSales: infOrders.length,
        revenue,
        totalCommission: (revenue * inf.commissionRate) / 100
      };
    });

    return {
      totalRevenue: totalRevenue || 0,
      globalRevenue: totalRevenue || 0, // This should sum all tenants in a real DB
      averageTicket: averageTicket || 0,
      abandonedCount: state.abandonedCheckouts.length || 0,
      abandonedTotalValue: state.abandonedCheckouts.reduce((acc, curr) => acc + curr.value, 0),
      conversionRate: (state.orders.length + state.abandonedCheckouts.length) > 0
        ? (approved.length / (state.orders.length + state.abandonedCheckouts.length)) * 100
        : 0,
      influencerStats,
      totalTenants: state.tenants.length || 0,
      activeSyncs: state.tenants.filter(t => t.yampiToken).length || 0,
      ordersByDay: [],
      productPerformance: []
    };
  }, [state.orders, state.abandonedCheckouts, state.tenants, state.influencers, state.coupons]);

  const actions = {
    login: async (email: string, password: string) => {
      try {
        // Query Supabase 'users' table
        console.log(`Attempting login for: ${email}`);
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', email.trim())
          .single();

        if (error) {
          console.warn('Supabase Login Warning:', error);
          if (error.code === 'PGRST116') throw new Error('Usuário não encontrado.');
          if (error.code === '42501') throw new Error('Erro de Permissão (RLS). Rode o script SQL de correção.');
          throw new Error(`Erro Supabase: ${error.message}`);
        }

        if (!user) throw new Error('Usuário não encontrado (Dados vazios).');

        // Simple password check (In production, use hashing!)
        if (user.password !== password) throw new Error('Senha incorreta.');

        let tenant = null;
        if (user.tenant_id) {
          const { data: t } = await supabase.from('tenants').select('*').eq('id', user.tenant_id).single();
          tenant = t;
        }

        // Fetch lists for state
        let allTenants: Tenant[] = [];
        let allUsers: User[] = [];

        if (user.role === UserRole.CONEXX_ADMIN) {
          const { data: t } = await supabase.from('tenants').select('*');
          allTenants = (t || []).map(mapTenantFromDB);
          const { data: u } = await supabase.from('users').select('*');
          allUsers = (u || []).map(mapUserFromDB);

        } else if (user.tenant_id) {
          const { data: u } = await supabase.from('users').select('*').eq('tenant_id', user.tenant_id);
          allUsers = (u || []).map(mapUserFromDB);
        }

        // Fetch Plans
        const { data: dbPlans } = await supabase.from('plans').select('*');

        const opData = AuthService.getOperationalData(); // Mock data for now (orders, etc)

        localStorage.setItem('conexx_user_id', user.id); // Persist login

        setState(prev => ({
          ...prev,
          currentUser: mapUserFromDB(user),
          activeTenant: tenant ? mapTenantFromDB(tenant) : null,
          tenants: allTenants,
          users: allUsers,
          plans: dbPlans || [],
          ...opData
        }));

        return true;
      } catch (err: any) {
        throw new Error(err.message || 'Falha no login.');
      }
    },
    logout: () => {
      localStorage.removeItem('conexx_user_id');
      setState(prev => ({
        ...prev,
        currentUser: null,
        activeTenant: null
      }));
    },
    clearSyncError: () => setSyncError(null),
    switchRole: () => {
      // Logic to switch between Admin and Tenant view (simplified)
      const isAdmin = state.currentUser?.role === UserRole.CONEXX_ADMIN;
      if (isAdmin && state.tenants.length > 0) {
        // "Impersonate" the first tenant for demo
        const firstTenant = state.tenants[0];
        // We just switch the active tenant in context, keeping the user as Admin
        setState(prev => ({ ...prev, activeTenant: firstTenant })); // This logic might need refinement based on exact reqs
      } else {
        setState(prev => ({ ...prev, activeTenant: null }));
      }
    },
    syncYampi: async () => {
      if (!state.activeTenant) return;
      setIsSyncing(true);
      try {
        console.log(`[SyncYampi] Iniciando sincronização para Tenant: ${state.activeTenant.id}`);
        console.log(`[SyncYampi] Credenciais: Alias=${state.activeTenant.yampiAlias}, Token=${state.activeTenant.yampiToken ? '***' : 'MISSING'}, Proxy=${state.activeTenant.yampiProxyUrl || 'LOCAL'}`);

        const { orders, abandoned } = await YampiService.syncAllData(state.activeTenant);

        console.log(`[SyncYampi] Sucesso! Pedidos: ${orders.length}, Abandonados: ${abandoned.length}`);

        // Persist Orders
        const dbOrders = orders.map(o => ({
          id: undefined, // Let DB generate UUID, but we need to match external_id for upsert? No, schema says ID is UUID.
          // Problem: Schema uses UUID as PK, but Yampi uses numeric/string.
          // We should use external_id as unique key if possible, OR just insert new ones?
          // For MVP, let's just insert new ones or try to match.
          // Actually, let's treat external_id as the key for de-duplication if we could.
          // Current schema: id uuid PK. external_id text.
          // Strategy: Delete existing for this tenant and re-insert? safely?
          // Or just fetch existing to map?
          // Simplest for now: Delete all for tenant and re-insert (sync mode).
          tenant_id: state.activeTenant?.id,
          external_id: o.externalId,
          client_name: o.client,
          client_email: o.email,
          product_name: o.product,
          order_date: o.date,
          status: o.status,
          payment_method: o.paymentMethod,
          total_value: o.value,
          coupon_code: o.couponCode
        }));

        // Delete old (Sync Replace Strategy) - Robust for MVP
        await supabase.from('orders').delete().eq('tenant_id', state.activeTenant.id);
        const { error: ordErr } = await supabase.from('orders').insert(dbOrders);
        if (ordErr) console.error("Error saving orders:", ordErr);

        // Persist Abandoned
        const dbAbandoned = abandoned.map(a => ({
          id: a.id, // ID from Yampi is string, schema we just created uses text PK? Yes.
          tenant_id: state.activeTenant?.id,
          client_name: a.clientName,
          email: a.email,
          phone: a.phone,
          value: a.value,
          date: a.date,
          items: a.items,
          recovered: a.recovered
        }));

        await supabase.from('abandoned_checkouts').delete().eq('tenant_id', state.activeTenant.id);
        const { error: abErr } = await supabase.from('abandoned_checkouts').insert(dbAbandoned);
        if (abErr) console.error("Error saving checkouts:", abErr);

        // Update State
        setState(prev => ({ ...prev, orders, abandonedCheckouts: abandoned }));

      } catch (err: any) {
        setSyncError(err.message || "Erro de sincronização.");
      } finally { setIsSyncing(false); }
    },
    saveTenant: async (data: Partial<Tenant>) => {
      setIsSyncing(true);
      try {
        let tenantId = data.id;

        // Validations
        if (!data.name) throw new Error("Nome da loja é obrigatório.");
        if (!data.ownerEmail) throw new Error("Email do proprietário é obrigatório.");

        const normalizedEmail = data.ownerEmail.trim().toLowerCase();

        // 1. Check if user already exists with this email to prevent unintentional overwrites
        // ONLY if we are creating a new tenant or changing the owner
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('*')
          .eq('email', normalizedEmail)
          .single();

        // Ignore "not found" error, it's expected if user doesn't exist
        if (checkError && checkError.code !== 'PGRST116') {
          console.warn("Erro ao verificar usuário existente:", checkError);
        }

        // If user exists and belongs to ANOTHER tenant, abort (security check)
        if (existingUser && existingUser.tenant_id && existingUser.tenant_id !== tenantId) {
          throw new Error(`Este email já está associado a outra loja (ID: ${existingUser.tenant_id}).`);
        }

        // 2. Upsert Tenant
        const tenantPayload: any = {
          id: tenantId,
          name: data.name,
          owner_name: data.ownerName,
          owner_email: normalizedEmail,
          password: data.password, // TODO: Hash this in production
          yampi_token: data.yampiToken,
          yampi_secret: data.yampiSecret,
          yampi_alias: data.yampiAlias,
          yampi_proxy_url: data.yampiProxyUrl,
          plan_id: data.planId,
          active: data.active !== undefined ? data.active : true,
        };

        Object.keys(tenantPayload).forEach(key => tenantPayload[key] === undefined && delete tenantPayload[key]);

        const { data: savedTenant, error: tenantError } = await supabase
          .from('tenants')
          .upsert(tenantPayload)
          .select()
          .single();

        if (tenantError) throw new Error(`Erro ao salvar loja: ${tenantError.message}`);
        tenantId = savedTenant.id;

        // 3. Upsert Owner User
        const userPayload: any = {
          tenant_id: tenantId,
          email: normalizedEmail,
          name: data.ownerName,
          role: UserRole.CLIENT_ADMIN,
        };

        if (data.password) {
          userPayload.password = data.password;
        }

        if (existingUser) {
          // Update existing user permissions/link
          const { error: userError } = await supabase
            .from('users')
            .update(userPayload)
            .eq('id', existingUser.id);
          if (userError) throw new Error(`Erro ao atualizar usuário vinculada: ${userError.message}`);
        } else {
          // Create new user
          const { error: userError } = await supabase
            .from('users')
            .insert({
              ...userPayload,
              password: data.password || '123456' // Default password if none provided
            });
          if (userError) throw new Error(`Erro ao criar usuário para a loja: ${userError.message}`);
        }

        // 4. Refresh List
        const { data: allTenants } = await supabase.from('tenants').select('*');
        if (allTenants) {
          const mappedTenants = allTenants.map(mapTenantFromDB);
          const { data: allUsers } = await supabase.from('users').select('*');
          const mappedUsers = (allUsers || []).map(mapUserFromDB);
          setState(prev => ({ ...prev, tenants: mappedTenants, users: mappedUsers }));
        }

      } catch (err: any) {
        console.error("Erro em saveTenant:", err);
        setSyncError(err.message || "Erro ao salvar lojista.");
        throw err; // Re-throw to let component know
      } finally {
        setIsSyncing(false);
      }
    },
    saveUser: async (data: Partial<User>) => {
      try {
        const payload: any = {
          id: data.id,
          tenant_id: data.tenantId,
          email: data.email,
          name: data.name,
          role: data.role,
          password: data.password
        };
        // Clean undefined
        if (!payload.password) delete payload.password;
        Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

        await supabase.from('users').upsert(payload);

        // Refresh users list based on current user role/context
        const { data: allUsers } = await supabase.from('users').select('*'); // Simplification: admin sees all
        setState(prev => ({ ...prev, users: (allUsers || []).map(mapUserFromDB) }));
      } catch (e) { console.error(e); }
    },
    saveDomain: async (domain: Domain) => {
      setIsSyncing(true);
      try {
        const tenant = state.tenants.find(t => t.id === domain.tenantId);
        if (tenant && tenant.yampiToken) await YampiService.registerDomainOnYampi(tenant, domain.url);
        AuthService.saveDomain(domain);
        setState(prev => ({ ...prev, domains: AuthService.getOperationalData().domains }));
      } catch (err: any) {
        setSyncError(err.details || "Falha ao registrar domínio na Yampi.");
        throw err;
      } finally { setIsSyncing(false); }
    },
    deleteDomain: (id: string) => { AuthService.deleteDomain(id); setState(prev => ({ ...prev, domains: AuthService.getOperationalData().domains })); },
    syncDomains: async () => {
      if (!state.activeTenant) return;
      const domains = await YampiService.syncDomains(state.activeTenant);
      domains.forEach(d => AuthService.saveDomain(d));
      setState(prev => ({ ...prev, domains: AuthService.getOperationalData().domains }));
    },
    savePlan: async (plan: Plan) => {
      setIsSyncing(true);
      try {
        const payload = {
          id: plan.id || `plan-${Date.now()}`,
          name: plan.name,
          price: plan.price,
          interval: plan.interval,
          features: plan.features,
          recommended: plan.recommended,
          active: plan.active
        };
        const { error } = await supabase.from('plans').upsert(payload);
        if (error) throw error;

        const { data: allPlans } = await supabase.from('plans').select('*');
        setState(prev => ({ ...prev, plans: allPlans || [] }));
      } catch (e: any) {
        console.error(e);
        setSyncError(e.message || "Falha ao salvar plano.");
      } finally { setIsSyncing(false); }
    },
    deletePlan: async (id: string) => {
      setIsSyncing(true);
      try {
        const { error } = await supabase.from('plans').delete().eq('id', id);
        if (error) throw error;
        const { data: allPlans } = await supabase.from('plans').select('*');
        setState(prev => ({ ...prev, plans: allPlans || [] }));
      } catch (e: any) {
        console.error(e);
        setSyncError(e.message || "Falha ao excluir plano.");
      } finally { setIsSyncing(false); }
    },
    saveCoupon: async (coupon: Partial<Coupon>) => {
      if (!state.activeTenant) return;
      const finalCoupon = await YampiService.createCouponOnYampi(state.activeTenant, coupon);
      AuthService.saveCoupon(finalCoupon);
      setState(prev => ({ ...prev, coupons: AuthService.getOperationalData().coupons }));
    },
    deleteCoupon: (id: string) => { AuthService.deleteCoupon(id); setState(prev => ({ ...prev, coupons: AuthService.getOperationalData().coupons })); },
    saveInfluencer: (inf: Partial<Influencer>) => {
      const newInf = { id: inf.id || 'INF-' + Date.now(), ...inf } as Influencer;
      AuthService.saveInfluencer(newInf);
      setState(prev => ({ ...prev, influencers: AuthService.getOperationalData().influencers }));
    },
    deleteInfluencer: (id: string) => { AuthService.deleteInfluencer(id); setState(prev => ({ ...prev, influencers: AuthService.getOperationalData().influencers })); },
    saveCommSettings: (settings: CommSettings) => {
      AuthService.saveCommSettings(settings);
      setState(prev => ({ ...prev, commSettings: settings }));
    },
    deleteTenant: async (id: string) => {
      try {
        await supabase.from('tenants').delete().eq('id', id);
        // Cascading delete should handle users/domains usually, but let's refresh
        const { data: allTenants } = await supabase.from('tenants').select('*');
        setState(prev => ({ ...prev, tenants: (allTenants || []).map(mapTenantFromDB) }));
      } catch (e) {
        console.error(e);
      }
    },
    deleteUser: async (id: string) => {
      try {
        await supabase.from('users').delete().eq('id', id);
        // Refresh
        const { data: allUsers } = await supabase.from('users').select('*');
        setState(prev => ({ ...prev, users: (allUsers || []).map(mapUserFromDB) }));
      } catch (e) { console.error(e); }
    },
    connectYampi: (token: string, secret: string, alias: string, proxyUrl: string) => {
      if (!state.activeTenant) return;
      const updated = AuthService.updateTenant(state.activeTenant.id, { yampiToken: token, yampiSecret: secret, yampiAlias: alias, yampiProxyUrl: proxyUrl });
      if (updated) { setState(prev => ({ ...prev, activeTenant: updated, tenants: AuthService.getAllTenants() })); setTimeout(() => actions.syncYampi(), 500); }
    },
    addOrder: (o: any) => setState(prev => ({ ...prev, orders: [o, ...prev.orders] })),
    updateOrder: (id: string, u: any) => setState(prev => ({ ...prev, orders: prev.orders.map(o => o.id === id ? { ...o, ...u } : o) })),
    deleteOrder: (id: string) => setState(prev => ({ ...prev, orders: prev.orders.filter(o => o.id !== id) })),
    updateSettings: (s: any) => setState(prev => ({ ...prev, settings: s })),
  };

  return (
    <div className="min-h-screen bg-background-deep font-display" >
      <DataContext.Provider value={{ state, stats, actions, isSyncing, isLoading, syncError }}>
        {children}
      </DataContext.Provider>
    </div >
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData error');
  return context;
};
