

import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { Order, OrderStatus, AbandonedCheckout, AppSettings, AppState, User, Tenant, UserRole, Domain, Coupon, Influencer, CommSettings, Plan, Category, Product, Goal } from '../types';
import { AuthService, YampiService } from '../backend/mockApi'; // Keep for other data for now
import { supabase } from '../backend/supabaseClient';
import { AsaasService } from '../backend/asaasService';

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
    fetchGoalsProgress: (startDate: string, endDate: string) => Promise<any>;
    subscribeToPlan: (planId: string, cycle: 'quarterly' | 'semiannual' | 'yearly') => Promise<string | void>;
    syncAllPlans: () => Promise<void>;
    syncAllTenants: () => Promise<void>;
    syncAllOrders: () => Promise<void>;
    confirmPayment: (tenantId: string) => Promise<void>;
    saveAsaasConfig: (config: any) => Promise<void>;
    syncAsaasConfig: () => Promise<void>;
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
  yampiOauthAccessToken: dbTenant.yampi_oauth_access_token,
  yampiOauthRefreshToken: dbTenant.yampi_oauth_refresh_token,
  yampiOauthExpiresAt: dbTenant.yampi_oauth_token_expires_at,
  lastSync: dbTenant.last_sync,
  planId: dbTenant.plan_id,
  active: dbTenant.active,
  subscriptionStatus: dbTenant.subscription_status || 'active',
  billingCycle: dbTenant.billing_cycle,
  nextBilling: dbTenant.next_billing,
  document: dbTenant.document,
  companyPercentage: Number(dbTenant.company_percentage || 0),
  cachedGrossRevenue: Number(dbTenant.cached_gross_revenue || 0),
  pendingPlanId: dbTenant.pending_plan_id,
  pendingBillingCycle: dbTenant.pending_billing_cycle,
  pendingPaymentUrl: dbTenant.pending_payment_url
});

const mapUserFromDB = (dbUser: any): User => ({
  id: dbUser.id,
  tenantId: dbUser.tenant_id,
  email: dbUser.email,
  role: dbUser.role as UserRole,
  name: dbUser.name,
  password: dbUser.password
});

const mapCategoryFromDB = (dbCat: any): Category => ({
  id: dbCat.id,
  tenantId: dbCat.tenant_id,
  name: dbCat.name
});

const mapProductFromDB = (dbProd: any): Product => ({
  id: dbProd.id,
  tenantId: dbProd.tenant_id,
  name: dbProd.name,
  sku: dbProd.sku,
  description: dbProd.description,
  price: dbProd.price,
  active: dbProd.active,
  categoryId: dbProd.category_id,
  operationType: dbProd.operation_type,
  yampiProductId: dbProd.yampi_product_id,
  images: dbProd.images || []
});

const mapPlanFromDB = (dbPlan: any): Plan => ({
  id: dbPlan.id,
  name: dbPlan.name,
  priceQuarterly: Number(dbPlan.price_quarterly || 0),
  priceSemiannual: Number(dbPlan.price_semiannual || 0),
  priceYearly: Number(dbPlan.price_yearly || 0),
  descriptionQuarterly: dbPlan.description_quarterly,
  descriptionSemiannual: dbPlan.description_semiannual,
  descriptionYearly: dbPlan.description_yearly,
  observations: dbPlan.observations,
  features: dbPlan.features || [],
  recommended: dbPlan.recommended || false,
  active: dbPlan.active || false,
  discountPercent: dbPlan.discount_percent || 0,
  trafficFeePercent: Number(dbPlan.traffic_fee_percent || 0),
  installments: Number(dbPlan.installments || 1),
  adCredit: Number(dbPlan.ad_credit || 0),
  monthlyPriceQuarterly: Number(dbPlan.monthly_price_quarterly || 0),
  monthlyPriceSemiannual: Number(dbPlan.monthly_price_semiannual || 0),
  monthlyPriceYearly: Number(dbPlan.monthly_price_yearly || 0),
  installmentsQuarterly: Number(dbPlan.installments_quarterly || 0),
  installmentsSemiannual: Number(dbPlan.installments_semiannual || 0),
  installmentsYearly: Number(dbPlan.installments_yearly || 0),
  trafficFeePercentQuarterly: Number(dbPlan.traffic_fee_percent_quarterly || 0),
  trafficFeePercentSemiannual: Number(dbPlan.traffic_fee_percent_semiannual || 0),
  trafficFeePercentYearly: Number(dbPlan.traffic_fee_percent_yearly || 0),
  adCreditQuarterly: Number(dbPlan.ad_credit_quarterly || 0),
  adCreditSemiannual: Number(dbPlan.ad_credit_semiannual || 0),
  adCreditYearly: Number(dbPlan.ad_credit_yearly || 0),
  orderIndex: Number(dbPlan.order_index || 0)
});

const mapCouponFromDB = (dbCoupon: any): Coupon => ({
  id: dbCoupon.id,
  tenantId: dbCoupon.tenant_id,
  code: dbCoupon.code,
  type: dbCoupon.type,
  value: Number(dbCoupon.value),
  active: dbCoupon.active,
  usageCount: dbCoupon.usage_count || 0,
  usageLimit: dbCoupon.usage_limit
});

const mapOrderFromDB = (r: any): Order => ({
  id: r.id || `#${r.external_id} `,
  tenantId: r.tenant_id,
  externalId: r.external_id,
  client: r.client_name,
  email: r.client_email,
  product: r.product_name,
  date: r.order_date,
  status: r.status,
  paymentMethod: r.payment_method,
  value: Number(r.total_value) || 0,
  initials: (r.client_name?.[0] || 'C').toUpperCase(),
  couponCode: r.coupon_code
});

const mapAbCheckoutFromDB = (r: any): AbandonedCheckout => ({
  id: r.id,
  tenantId: r.tenant_id,
  externalId: r.external_id,
  clientName: r.client_name,
  email: r.email,
  phone: r.phone,
  product: r.product_name,
  value: Number(r.value),
  date: r.date,
  items: r.items,
  recovered: r.recovered
});

const mapGoalFromDB = (g: any): Goal => ({
  id: g.id || '',
  code: g.code || '',
  title: g.title || '',
  targetValue: Number(g.target_value || g.targetValue || 0),
  currentValue: Number(g.current_value || g.currentValue || 0),
  achieved: !!g.achieved,
  progressPercent: Number(g.progress_percent || g.progressPercent || 0),
  missingValue: Number(g.missing_value || g.missingValue || 0),
  currency: g.currency || 'R$'
});

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [initialSyncRequested, setInitialSyncRequested] = useState(false);

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
    settings: { companyName: "Conexx Hub", supportEmail: "suporte@conexx.com.br", description: "", darkMode: true, currency: "BRL" },
    asaasConfig: { api_key: '', environment: 'sandbox', webhook_secret: '' },
    products: [],
    categories: [],
    goalsProgress: null
  });

  const syncAllPlans = async () => {
    const { data } = await supabase.from('plans').select('*').order('created_at', { ascending: true });
    if (data) setState(prev => ({ ...prev, plans: data.map(mapPlanFromDB) }));
  };

  const syncAllTenants = async () => {
    const storedUserId = localStorage.getItem('conexx_user_id');
    if (!storedUserId) return;

    // Fetch fresh user data to know role/tenantId
    const { data: user } = await supabase.from('users').select('*').eq('id', storedUserId).single();
    if (!user) return;

    if (user.role === UserRole.CONEXX_ADMIN) {
      const { data } = await supabase.from('tenants').select('*');
      if (data) setState(prev => ({ ...prev, tenants: data.map(mapTenantFromDB) }));
    } else if (user.tenant_id) {
      const { data: t } = await supabase.from('tenants').select('*').eq('id', user.tenant_id).single();
      if (t) setState(prev => ({ ...prev, activeTenant: mapTenantFromDB(t) }));
    }
  };

  const syncAllOrders = async () => {
    const storedUserId = localStorage.getItem('conexx_user_id');
    if (!storedUserId) return;

    const { data: user } = await supabase.from('users').select('*').eq('id', storedUserId).single();
    if (!user) return;

    if (user.role === UserRole.CONEXX_ADMIN) {
      const { data } = await supabase.from('orders').select('*');
      if (data) setState(prev => ({ ...prev, orders: data.map(mapOrderFromDB) }));
    } else if (user.tenant_id) {
      const { data } = await supabase.from('orders').select('*').eq('tenant_id', user.tenant_id);
      if (data) setState(prev => ({ ...prev, orders: data.map(mapOrderFromDB) }));
    }
  };

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

              const { data: allOrders } = await supabase.from('orders').select('*');
              const { data: allAbandoned } = await supabase.from('abandoned_checkouts').select('*');

              actions.syncAsaasConfig();

              setState(prev => ({
                ...prev,
                orders: (allOrders || []).map(mapOrderFromDB),
                abandonedCheckouts: (allAbandoned || []).map(mapAbCheckoutFromDB)
              }));
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
              ...opData,
              plans: (dbPlans || []).map(mapPlanFromDB)
            }));

            // Fetch Products & Categories
            if (mappedUser.role === UserRole.CONEXX_ADMIN || mappedTenant) { // Admin or Tenant User
              const tId = mappedTenant ? mappedTenant.id : null;
              if (tId) {
                const { data: dbCats } = await supabase.from('categories').select('*').eq('tenant_id', tId);
                const { data: dbProds } = await supabase.from('products').select('*').eq('tenant_id', tId);
                const { data: dbCoupons } = await supabase.from('coupons').select('*').eq('tenant_id', tId);

                setState(prev => ({
                  ...prev,
                  categories: (dbCats || []).map(mapCategoryFromDB),
                  products: (dbProds || []).map(mapProductFromDB),
                  coupons: (dbCoupons || []).map(mapCouponFromDB)
                }));
              }
            }
            // request an initial sync if tenant has Yampi credentials (token or oauth)
            if (mappedTenant && (mappedTenant.yampiToken || mappedTenant.yampiOauthAccessToken)) {
              setInitialSyncRequested(true);
            }
          }
        } catch (e) {
          console.error("Failed to restore session", e);
          localStorage.removeItem('conexx_user_id');
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };
    restoreSession();

    // --- Real-time Listeners ---
    const plansChannel = supabase.channel('public:plans')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plans' }, () => {
        syncAllPlans();
      })
      .subscribe();

    const tenantsChannel = supabase.channel('public:tenants')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants' }, () => {
        syncAllTenants();
      })
      .subscribe();

    const ordersChannel = supabase.channel('public:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        syncAllOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(plansChannel);
      supabase.removeChannel(tenantsChannel);
      supabase.removeChannel(ordersChannel);
    };
  }, []);

  // Trigger initial sync if requested
  useEffect(() => {
    if (initialSyncRequested && state.activeTenant) {
      actions.syncYampi();
      setInitialSyncRequested(false);
    }
  }, [initialSyncRequested, state.activeTenant]);

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
        console.log(`Attempting login for: ${email} `);
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', email.trim())
          .single();

        if (error) {
          console.warn('Supabase Login Warning:', error);
          if (error.code === 'PGRST116') throw new Error('Usuário não encontrado.');
          if (error.code === '42501') throw new Error('Erro de Permissão (RLS). Rode o script SQL de correção.');
          throw new Error(`Erro Supabase: ${error.message} `);
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
          ...opData,
          plans: (dbPlans || []).map(mapPlanFromDB) // Ensure Supabase wins
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
    confirmPayment: async (tenantId: string) => {
      setIsLoading(true);
      try {
        const { data: tenant, error: fetchErr } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', tenantId)
          .single();

        if (fetchErr || !tenant) throw new Error("Lojista não encontrado.");
        if (!tenant.pending_plan_id) throw new Error("Nenhuma alteração de plano pendente.");

        const planId = tenant.pending_plan_id;
        const cycle = tenant.pending_billing_cycle || 'quarterly';
        const nextDate = new Date();
        const months = cycle === 'quarterly' ? 3 : cycle === 'semiannual' ? 6 : 12;
        nextDate.setMonth(nextDate.getMonth() + months);

        const { error: updateErr } = await supabase
          .from('tenants')
          .update({
            plan_id: planId,
            billing_cycle: cycle,
            next_billing: nextDate.toISOString(),
            pending_plan_id: null,
            pending_billing_cycle: null,
            pending_payment_url: null,
            subscription_status: 'active'
          })
          .eq('id', tenantId);

        if (updateErr) throw updateErr;

        // Refresh local state if active
        if (state.activeTenant?.id === tenantId) {
          setState(prev => ({
            ...prev,
            activeTenant: prev.activeTenant ? {
              ...prev.activeTenant,
              planId,
              billingCycle: cycle,
              nextBilling: nextDate.toISOString(),
              pendingPlanId: undefined,
              pendingBillingCycle: undefined,
              pendingPaymentUrl: undefined,
              subscriptionStatus: 'active'
            } : null
          }));
        }
      } catch (e: any) {
        console.error("Payment confirmation failed:", e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    clearSyncError: () => setSyncError(null),
    syncAllPlans,
    syncAllTenants,
    syncAllOrders,
    syncYampi: async () => {
      // Admin behavior: Sync ALL tenants with Yampi credentials
      if (state.currentUser?.role === UserRole.CONEXX_ADMIN) {
        setIsSyncing(true);
        try {
          const { data: tenants, error: tErr } = await supabase
            .from('tenants')
            .select('*')
            .not('yampi_token', 'is', null);

          if (tErr) throw tErr;

          for (const t of (tenants || [])) {
            const mappedTenant = mapTenantFromDB(t);
            try {
              const { orders, abandoned } = await YampiService.syncAllData(mappedTenant);

              // Persist Orders (replace)
              const dbOrders = orders.map(o => ({
                tenant_id: mappedTenant.id,
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
              await supabase.from('orders').delete().eq('tenant_id', mappedTenant.id);
              if (dbOrders.length > 0) {
                const { error: ordErr } = await supabase.from('orders').insert(dbOrders);
                if (ordErr) throw ordErr;
              }

              // Persist Abandoned (replace)
              const dbAbandoned = abandoned.map(a => ({
                tenant_id: mappedTenant.id,
                external_id: a.externalId,
                client_name: a.clientName,
                client_email: a.email,
                client_phone: a.phone,
                product_name: a.product,
                value: a.value,
                abandoned_at: a.date,
                items: a.items,
                recovered: a.recovered
              }));
              await supabase.from('abandoned_checkouts').delete().eq('tenant_id', mappedTenant.id);
              if (dbAbandoned.length > 0) {
                const { error: abErr } = await supabase.from('abandoned_checkouts').insert(dbAbandoned);
                if (abErr) throw abErr;
              }
            } catch (err) {
              console.error(`Failed to sync tenant ${mappedTenant.name}:`, err);
            }
          }

          // Refresh state with consolidated data
          await syncAllOrders();
        } catch (e: any) {
          console.error("Admin global sync failed:", e);
          setSyncError(e.message || "Erro na sincronização global.");
        } finally {
          setIsSyncing(false);
        }
        return;
      }

      // Tenant behavior: sync a single tenant via Yampi
      if (!state.activeTenant) return;
      setIsSyncing(true);
      try {
        console.log(`[SyncYampi] Iniciando sincronização para Tenant: ${state.activeTenant.id} `);
        const { orders, abandoned } = await YampiService.syncAllData(state.activeTenant);

        // Persist Orders (replace)
        const dbOrders = orders.map(o => ({
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
        await supabase.from('orders').delete().eq('tenant_id', state.activeTenant.id);
        const { error: ordErr } = await supabase.from('orders').insert(dbOrders);
        if (ordErr) console.error("Error saving orders:", ordErr);

        // Persist Abandoned (replace)
        const dbAbandoned = abandoned.map(a => ({
          tenant_id: state.activeTenant?.id,
          external_id: a.externalId,
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

        // Sync Products
        const yampiProducts = await YampiService.syncProductsFromYampi(state.activeTenant);
        if (yampiProducts.length > 0) {
          const dbProducts = yampiProducts.map(p => ({
            id: p.id, // Use ID from Yampi or generated
            tenant_id: state.activeTenant?.id,
            name: p.name,
            sku: p.sku,
            description: p.description,
            price: p.price,
            active: true, // Default active
            yampi_product_id: typeof p.id === 'string' && !isNaN(Number(p.id)) ? Number(p.id) : null,
            images: p.images || [] // syncProductsFromYampi needs to return images
          }));

          // Upsert products to avoid duplicates but update prices/names
          const { error: prodErr } = await supabase.from('products').upsert(dbProducts);
          if (prodErr) console.error("Error saving products:", prodErr);

          // Fetch updated products to get consistent state
          const { data: updatedProds } = await supabase.from('products').select('*').eq('tenant_id', state.activeTenant.id);
          setState(prev => ({ ...prev, products: (updatedProds || []).map(mapProductFromDB) }));
        }

        // Calculate and Update Total Revenue Cache for Tenant
        const totalRevenue = orders
          .filter(o => o.status === OrderStatus.APROVADO || (o.status as any) === 'paid' || (o.status as any) === 'approved')
          .reduce((sum, o) => sum + (Number(o.value) || 0), 0);

        if (totalRevenue > 0) {
          await supabase.from('tenants')
            .update({ cached_gross_revenue: totalRevenue, last_sync: new Date().toISOString() })
            .eq('id', state.activeTenant.id);
        } else {
          await supabase.from('tenants')
            .update({ last_sync: new Date().toISOString() })
            .eq('id', state.activeTenant.id);
        }

        // Update local state for tenant view
        setState(prev => ({
          ...prev,
          orders,
          abandonedCheckouts: abandoned,
          // Update active tenant stats in local state immediately
          activeTenant: prev.activeTenant ? { ...prev.activeTenant, cachedGrossRevenue: totalRevenue } : null
        }));
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
          throw new Error(`Este email já está associado a outra loja(ID: ${existingUser.tenant_id}).`);
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
          plan_id: data.planId || 'p_free',
          billing_cycle: data.billingCycle,
          active: data.active !== undefined ? data.active : true,
          document: data.document,
          company_percentage: data.companyPercentage || 0,
        };

        Object.keys(tenantPayload).forEach(key => tenantPayload[key] === undefined && delete tenantPayload[key]);

        const { data: savedTenant, error: tenantError } = await supabase
          .from('tenants')
          .upsert(tenantPayload)
          .select()
          .single();

        if (tenantError) throw new Error(`Erro ao salvar loja: ${tenantError.message} `);
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
          if (userError) throw new Error(`Erro ao atualizar usuário vinculada: ${userError.message} `);
        } else {
          // Create new user
          const { error: userError } = await supabase
            .from('users')
            .insert({
              ...userPayload,
              password: data.password || '123456' // Default password if none provided
            });
          if (userError) throw new Error(`Erro ao criar usuário para a loja: ${userError.message} `);
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
        const payload: any = {
          id: plan.id,
          name: plan.name,
          price_quarterly: plan.priceQuarterly,
          price_semiannual: plan.priceSemiannual,
          price_yearly: plan.priceYearly,
          description_quarterly: plan.descriptionQuarterly,
          description_semiannual: plan.descriptionSemiannual,
          description_yearly: plan.descriptionYearly,
          observations: plan.observations,
          features: plan.features || [],
          recommended: plan.recommended,
          active: plan.active !== undefined ? plan.active : true,
          discount_percent: (plan as any).discountPercent ?? (plan as any).discount_percent ?? 0,
          traffic_fee_percent: plan.trafficFeePercent || 0,
          installments: plan.installments || 1,
          ad_credit: plan.adCredit || 0,
          monthly_price_quarterly: plan.monthlyPriceQuarterly || 0,
          monthly_price_semiannual: plan.monthlyPriceSemiannual || 0,
          monthly_price_yearly: plan.monthlyPriceYearly || 0,
          installments_quarterly: plan.installmentsQuarterly || 0,
          installments_semiannual: plan.installmentsSemiannual || 0,
          installments_yearly: plan.installmentsYearly || 0,
          traffic_fee_percent_quarterly: plan.trafficFeePercentQuarterly || 0,
          traffic_fee_percent_semiannual: plan.trafficFeePercentSemiannual || 0,
          traffic_fee_percent_yearly: plan.trafficFeePercentYearly || 0,
          ad_credit_quarterly: plan.adCreditQuarterly || 0,
          ad_credit_semiannual: plan.adCreditSemiannual || 0,
          ad_credit_yearly: plan.adCreditYearly || 0,
          order_index: plan.orderIndex || 0
        };

        // If id is falsy, let the DB generate it
        if (!payload.id) delete payload.id;

        // Clean undefined values
        Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

        // Debug: log payload
        console.debug('savePlan payload', payload);

        const { data, error } = await supabase.from('plans').upsert(payload).select().single();
        if (error) throw error;

        // Note: Real-time listener will trigger syncAllPlans() automatically
        return mapPlanFromDB(data);
      } catch (e: any) {
        console.error('savePlan error', e);
        setSyncError(e.message || "Falha ao salvar plano.");
        throw e;
      } finally { setIsSyncing(false); }
    },
    deletePlan: async (id: string) => {
      setIsSyncing(true);
      try {
        const { error } = await supabase.from('plans').delete().eq('id', id);
        if (error) throw error;
        // Real-time listener will handle local state update
      } catch (e: any) {
        console.error(e);
        setSyncError(e.message || "Falha ao excluir plano.");
      } finally { setIsSyncing(false); }
    },


    saveCoupon: async (coupon: Partial<Coupon>) => {
      if (!state.activeTenant) return;
      setIsSyncing(true);
      try {
        // 1. Create/Update on Yampi
        const finalCoupon = await YampiService.createCouponOnYampi(state.activeTenant, coupon);

        // 2. Persist to Supabase
        const payload = {
          id: coupon.id || undefined, // Let Supabase gen ID if new and not provided, or use Yampi ID if mapped? 
          // Better: use the ID returned from Yampi or existing ID
          // If Yampi generated an ID "YCP-...", we use that.
          // If Supabase has UUIDs, we might need a mapping. 
          // implementation_plan said: "Coupons created in Conexx should be created in Yampi."
          // Let's assume we use the Yampi ID as the canonical ID if possible, or store it. 
          // But Supabase uses UUIDs by default in schema. 
          // Let's use the ID from finalCoupon which might be Yampi's ID (integer/string) 
          // Schema has `id uuid`. This is a conflict if Yampi returns int ID.
          // MOCK API returns "YCP-" + Date. 
          // Schema says `id uuid primary key default uuid_generate_v4()`.
          // We should use a separate `external_id` for Yampi or change ID to text.
          // checking schema: "id uuid default uuid_generate_v4()". 
          // If we send a non-UUID it will fail.
          // For now, let's let Supabase generate UUID and store Yampi ID in a new column? 
          // Or just rely on `code` being unique.
          tenant_id: state.activeTenant.id,
          code: finalCoupon.code,
          type: finalCoupon.type,
          value: finalCoupon.value,
          active: finalCoupon.active,
          usage_count: finalCoupon.usageCount,
          usage_limit: finalCoupon.usageLimit
        };

        // Upsert by CODE (since it's unique) or ID if we had it.
        const { data, error } = await supabase.from('coupons').upsert(payload, { onConflict: 'code' }).select().single();
        if (error) throw error;

        const mapped = mapCouponFromDB(data);
        setState(prev => {
          const exists = prev.coupons.find(c => c.id === mapped.id);
          if (exists) return { ...prev, coupons: prev.coupons.map(c => c.id === mapped.id ? mapped : c) };
          return { ...prev, coupons: [...prev.coupons, mapped] };
        });

      } catch (e: any) {
        console.error(e);
        setSyncError(e.message || "Erro ao salvar cupom.");
      } finally { setIsSyncing(false); }
    },
    syncCoupons: async () => {
      if (!state.activeTenant) return;
      setIsSyncing(true);
      try {
        // 1. Fetch from Yampi
        const yampiCoupons = await YampiService.syncCoupons(state.activeTenant);

        // 2. Upsert to Supabase
        const dbCoupons = yampiCoupons.map(c => ({
          tenant_id: state.activeTenant!.id,
          code: c.code,
          type: c.type,
          value: c.value,
          active: c.active,
          usage_count: c.usageCount
        }));

        if (dbCoupons.length > 0) {
          const { error } = await supabase.from('coupons').upsert(dbCoupons, { onConflict: 'code' });
          if (error) throw error;
        }

        // 3. Refresh from Supabase
        const { data: all } = await supabase.from('coupons').select('*').eq('tenant_id', state.activeTenant.id);
        setState(prev => ({ ...prev, coupons: (all || []).map(mapCouponFromDB) }));

      } catch (e: any) {
        setSyncError(e.message || 'Erro ao sincronizar cupons.');
      } finally {
        setIsSyncing(false);
      }
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
    syncAsaasConfig: async () => {
      const { data, error } = await supabase.from('platform_settings').select('value').eq('key', 'asaas_config').single();
      if (data && !error) {
        setState(prev => ({ ...prev, asaasConfig: data.value }));
      }
    },
    saveAsaasConfig: async (config: any) => {
      const { error } = await supabase.from('platform_settings').upsert({
        key: 'asaas_config',
        value: config,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
      if (!error) {
        setState(prev => ({ ...prev, asaasConfig: config }));
      } else {
        throw error;
      }
    },
    subscribeToPlan: async (planId: string, cycle: 'quarterly' | 'semiannual' | 'yearly') => {
      setIsLoading(true);
      try {
        const userId = state.currentUser?.id;
        if (!userId) throw new Error("Usuário não identificado.");

        // 1. Ensure Customer exists in Asaas
        const { data: customerData, error: customerError } = await supabase.functions.invoke('create-customer', {
          body: { user_id: userId }
        });

        if (customerError) {
          throw new Error(customerError.message || "Falha ao registrar cliente no Asaas.");
        }

        // 2. Create Subscription
        const { data: subData, error: subError } = await supabase.functions.invoke('create-subscription', {
          body: {
            plan_id: planId,
            billing_cycle: cycle,
            user_id: userId
          }
        });

        if (subError) {
          throw new Error(subError.message || "Falha ao criar assinatura.");
        }

        return subData.paymentUrl || subData.asaas_data?.invoiceUrl;

      } catch (e: any) {
        console.error("Subscription flow failed:", e);
        setSyncError(e.message || "Erro ao processar assinatura.");
        throw e;
      } finally {
        setIsLoading(false);
      }
    },

    // Categories
    saveCategory: async (cat: Partial<Category>) => {
      if (!state.activeTenant) return;
      try {
        const payload = {
          id: cat.id,
          tenant_id: state.activeTenant.id,
          name: cat.name
        };
        if (!payload.id) delete payload.id;

        const { data, error } = await supabase.from('categories').upsert(payload).select().single();
        if (error) throw error;

        const mapped = mapCategoryFromDB(data);
        setState(prev => {
          const exists = prev.categories.find(c => c.id === mapped.id);
          if (exists) return { ...prev, categories: prev.categories.map(c => c.id === mapped.id ? mapped : c) };
          return { ...prev, categories: [...prev.categories, mapped] };
        });
      } catch (e: any) {
        console.error("saveCategory error", e);
        throw e;
      }
    },
    deleteCategory: async (id: string) => {
      try {
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) throw error;
        setState(prev => ({ ...prev, categories: prev.categories.filter(c => c.id !== id) }));
      } catch (e) { console.error("deleteCategory error", e); }
    },

    // Goals
    fetchGoalsProgress: async (startDate: string, endDate: string) => {
      try {
        const currentUser = state.currentUser;
        const tenantId = state.activeTenant?.id;

        const { data, error } = await supabase.rpc('get_goals_progress', {
          p_start_date: startDate,
          p_end_date: endDate,
          p_tenant_id: currentUser?.role !== UserRole.CONEXX_ADMIN ? tenantId : null
        });

        if (error) throw error;

        // Map goals_status JSON array within each row
        return (data || []).map((row: any) => ({
          ...row,
          goals_status: (row.goals_status || []).map(mapGoalFromDB)
        }));
      } catch (e: any) {
        console.error("fetchGoalsProgress error", e);
        return null;
      }
    },

    saveProduct: async (prod: Partial<Product>) => {
      if (!state.activeTenant) return;
      try {
        let finalId = prod.id;

        // Duplicate Check: If no ID but has Yampi ID, try to find existing
        if (!finalId && prod.yampiProductId) {
          const { data: existing } = await supabase
            .from('products')
            .select('id')
            .eq('tenant_id', state.activeTenant.id)
            .eq('yampi_product_id', prod.yampiProductId)
            .single();
          if (existing) finalId = existing.id;
        }

        const payload: any = {
          id: finalId,
          tenant_id: state.activeTenant.id,
          name: prod.name,
          sku: prod.sku,
          description: prod.description,
          price: prod.price,
          active: prod.active,
          category_id: prod.categoryId,
          operation_type: prod.operationType,
          yampi_product_id: prod.yampiProductId,
          images: prod.images
        };
        if (!payload.id) delete payload.id;
        // Clean undefined
        Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

        const { data, error } = await supabase.from('products').upsert(payload).select().single();
        if (error) throw error;

        const mapped = mapProductFromDB(data);
        setState(prev => {
          const exists = prev.products.find(p => p.id === mapped.id);
          if (exists) return { ...prev, products: prev.products.map(p => p.id === mapped.id ? mapped : p) };
          return { ...prev, products: [...prev.products, mapped] };
        });
      } catch (e: any) {
        console.error("saveProduct error", e);
        throw e;
      }
    },
    deleteProduct: async (id: string) => {
      try {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
        setState(prev => ({ ...prev, products: prev.products.filter(p => p.id !== id) }));
      } catch (e) { console.error(e); }
    }
  };

  // Trigger initial sync once after restoreSession if requested and tenant present
  useEffect(() => {
    if (initialSyncRequested && state.activeTenant) {
      // Only sync when tenant has credentials
      if (state.activeTenant.yampiToken || (state.activeTenant as any).yampiOauthAccessToken) {
        setTimeout(() => { actions.syncYampi(); }, 300); // slight delay to ensure UI ready
      }
      setInitialSyncRequested(false);
    }
  }, [initialSyncRequested, state.activeTenant]);

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
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};
