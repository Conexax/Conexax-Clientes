

import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { Order, OrderStatus, AbandonedCheckout, AppSettings, AppState, User, Tenant, UserRole, Domain, Coupon, Influencer, CommSettings, Plan, Category, Product, Goal } from '../types';
import { AuthService, YampiService } from '../backend/mockApi'; // Keep for other data for now
import { supabase } from '../backend/supabaseClient';
import { toast } from 'react-hot-toast';

interface DataContextType {
  state: AppState;
  isSyncing: boolean;
  isLoading: boolean;
  syncError: string | null;
  actions: {
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
    syncYampi: (targetTenantId?: string) => Promise<void>;
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
    deleteInfluencer: (id: string) => Promise<void>;
    saveCommSettings: (settings: CommSettings, triggerId?: string, active?: boolean) => Promise<void>;
    fetchGoalsProgress: (startDate: string, endDate: string) => Promise<any>;
    subscribeToPlan: (planId: string, cycle: 'quarterly' | 'semiannual' | 'yearly', billingType?: 'monthly' | 'upfront', paymentMethod?: 'CREDIT_CARD' | 'BOLETO' | 'PIX') => Promise<any>;
    generateCharge: (requestId: string, paymentMethod: string) => Promise<any>;
    cancelPaymentRequest: (requestId: string) => Promise<void>;
    syncAllPlans: () => Promise<void>;
    syncAllTenants: () => Promise<void>;
    syncAllOrders: () => Promise<void>;
    confirmPayment: (tenantId: string) => Promise<void>;
    saveAsaasConfig: (config: any) => Promise<void>;
    syncAsaasConfig: () => Promise<void>;
    syncAsaasData: () => Promise<void>;
    forceSyncAsaasData: () => Promise<void>;
    fetchAdminSubscriptions: () => Promise<any>;
    fetchAdminClientDetails: (clientId: string) => Promise<any>;
    fetchWeeklyFees: (tenantId: string) => Promise<void>;
    generateWeeklyCharge: (id: string, paymentMethod: string) => Promise<any>;
    cancelWeeklyFee: (id: string) => Promise<void>;
    calculateWeeklyFees: (startDate: string, endDate: string) => Promise<any>;
    markFeeAsPaid: (id: string, password: string) => Promise<any>;
    previewWeeklyFees: (startDate: string, endDate: string) => Promise<any>;
    clearSyncError: () => void;
    fetchMyPayments: () => Promise<void>;
    fetchTeam: () => Promise<void>;
    addTeamMember: (payload: any) => Promise<void>;
    deleteTeamMember: (userId: string) => Promise<void>;
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
  metaRange: dbTenant.meta_range,
  companyPercentage: Number(dbTenant.company_percentage || 0),
  cachedGrossRevenue: Number(dbTenant.cached_gross_revenue || 0),
  pendingPlanId: dbTenant.pending_plan_id,
  pendingBillingCycle: dbTenant.pending_billing_cycle,
  pendingPaymentUrl: dbTenant.pending_payment_url,
  logoUrl: dbTenant.logo_url,
  metaAccessToken: dbTenant.meta_access_token,
  metaAdAccountId: dbTenant.meta_ad_account_id,
  ga4MeasurementId: dbTenant.ga4_measurement_id,
  gaCredentials: dbTenant.ga_credentials,
  businessType: dbTenant.business_type || 'e-commerce'
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
  orderIndex: Number(dbPlan.order_index || 0),
  discountUpfrontPercent: Number(dbPlan.discount_upfront_percent || 0)
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
  client: r.client,
  email: r.email,
  product: r.product,
  date: r.date,
  status: r.status,
  paymentMethod: r.payment_method,
  value: Number(r.value) || 0,
  initials: (r.client?.[0] || 'C').toUpperCase(),
  couponCode: r.coupon_code,
  trackCode: r.track_code,
  shipmentService: r.shipment_service
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

const mapPaymentRequestFromDB = (pr: any): any => ({
  id: pr.id,
  userId: pr.user_id,
  planId: pr.plan_id,
  cycle: pr.cycle,
  billingType: pr.billing_type,
  paymentMethod: pr.payment_method,
  status: pr.status,
  asaasPaymentId: pr.asaas_payment_id,
  asaasInvoiceUrl: pr.asaas_invoice_url,
  billingValue: Number(pr.billing_value || 0),
  dueDate: pr.due_date,
  createdAt: pr.created_at,
  updatedAt: pr.updated_at
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
    sales: [],
    incomes: [],
    outcomes: [],
    categories: [],
    team: [],
    goalsProgress: null,
    asaasSubscriptions: [],
    asaasCustomers: [],
    weeklyFees: []
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

            const mappedUser = mapUserFromDB(user);
            const mappedTenant = tenant ? mapTenantFromDB(tenant) : null;

            // Pre-fetch critical data in parallel
            const [plansRes, usersRes, tenantsRes] = await Promise.all([
              supabase.from('plans').select('*'),
              mappedUser.role === UserRole.CONEXX_ADMIN
                ? supabase.from('users').select('*')
                : supabase.from('users').select('*').eq('tenant_id', mappedUser.tenantId),
              mappedUser.role === UserRole.CONEXX_ADMIN
                ? supabase.from('tenants').select('*')
                : Promise.resolve({ data: [] })
            ]);

            // Update state in one batch to ensure consistency for ProtectedRoutes
            setState(prev => ({
              ...prev,
              currentUser: mappedUser,
              activeTenant: mappedTenant,
              tenants: (tenantsRes.data || []).map(mapTenantFromDB),
              users: (usersRes.data || []).map(mapUserFromDB),
              plans: (plansRes.data || []).map(mapPlanFromDB)
            }));

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

    // cache coupons for faster lookup
    const couponMap = new Map(state.coupons.map(c => [c.id, c]));

    const influencerStats = state.influencers.map(inf => {
      const coupon = couponMap.get(inf.couponId) as any;
      const infOrders = coupon ? approved.filter(o => o.couponCode === coupon.code) : [];
      const revenue = infOrders.reduce((acc, curr) => acc + curr.value, 0);
      return {
        ...inf,
        totalSales: infOrders.length,
        revenue,
        totalCommission: (revenue * inf.commissionRate) / 100
      };
    });

    const ordersByDayMap = new Map<string, number>();
    const productPerfMap = new Map<string, { name: string, revenue: number, sales: number }>();

    approved.forEach(o => {
      // Avoid new Date().toLocaleDateString in loop if possible, or at least minimize it
      const dateKey = o.date.split('T')[0]; // YYYY-MM-DD is faster and consistent
      ordersByDayMap.set(dateKey, (ordersByDayMap.get(dateKey) || 0) + o.value);

      const pName = o.product || 'Desconhecido';
      const curr = productPerfMap.get(pName) || { name: pName, revenue: 0, sales: 0 };
      curr.revenue += o.value;
      curr.sales += 1;
      productPerfMap.set(pName, curr);
    });

    const ordersByDay = Array.from(ordersByDayMap.entries())
      .map(([day, value]) => ({ day, value }))
      .sort((a, b) => a.day.localeCompare(b.day));

    const productPerformance = Array.from(productPerfMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      totalRevenue: totalRevenue || 0,
      globalRevenue: totalRevenue || 0,
      averageTicket: averageTicket || 0,
      abandonedCount: state.abandonedCheckouts.length || 0,
      abandonedTotalValue: state.abandonedCheckouts.reduce((acc, curr) => acc + curr.value, 0),
      conversionRate: (state.orders.length + state.abandonedCheckouts.length) > 0
        ? (approved.length / (state.orders.length + state.abandonedCheckouts.length)) * 100
        : 0,
      influencerStats,
      totalTenants: state.tenants.length || 0,
      activeSyncs: state.tenants.filter(t => t.yampiToken).length || 0,
      ordersByDay,
      productPerformance
    };
  }, [state.orders, state.abandonedCheckouts, state.tenants, state.influencers, state.coupons]);

  const actions = useMemo(() => ({
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

        // Fetch Real Operational Data (Orders, Abandoned Carts)
        let realOrders: Order[] = [];
        let realAbandoned: AbandonedCheckout[] = [];

        if (user.role === UserRole.CONEXX_ADMIN) {
          // Admin sees all? Or maybe just empty initially and uses AdminMetrics page.
          // For Dashboard.tsx to work for admin, we might need all orders, but that's heavy.
          // Let's assume Admin Dashboard shows global stats.
          const { data: ord } = await supabase.from('orders').select('*').order('order_date', { ascending: false }).limit(1000); // Limit for performance
          realOrders = (ord || []).map(mapOrderFromDB);
        } else if (user.tenant_id) {
          const { data: ord } = await supabase.from('orders').select('*').eq('tenant_id', user.tenant_id).order('order_date', { ascending: false }).limit(2000);
          realOrders = (ord || []).map(mapOrderFromDB);
        }

        localStorage.setItem('conexx_user_id', user.id); // Persist login
        console.log("[loginAction] Session persisted. Navigating to dashboard.");

        setState(prev => ({
          ...prev,
          currentUser: mapUserFromDB(user),
          activeTenant: tenant ? mapTenantFromDB(tenant) : null,
          tenants: allTenants,
          users: allUsers,
          orders: realOrders, // Use Real Data
          abandonedCheckouts: realAbandoned, // Todo: fetch real abandoned carts if table exists
          plans: (dbPlans || []).map(mapPlanFromDB) // Ensure Supabase wins
        }));

        console.log("[loginAction] State updated successfully.");
        return true;
      } catch (err: any) {
        console.error("[loginAction] Critical Error:", err);
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
    syncAllOrders: async () => {
      // Re-fetch orders from Supabase to update state
      const { currentUser } = state;
      if (!currentUser) return;

      try {
        let fetchedOrders: any[] = [];
        console.log(`[syncAllOrders] Syncing orders for user role: ${currentUser.role}, Tenant: ${currentUser.tenantId}`);

        if (currentUser.role === UserRole.CONEXX_ADMIN) {
          const { data } = await supabase.from('orders').select('*').order('date', { ascending: false }).limit(1000);
          fetchedOrders = data || [];
        } else if (currentUser.tenantId) {
          const { data } = await supabase.from('orders').select('*').eq('tenant_id', currentUser.tenantId).order('date', { ascending: false });
          fetchedOrders = data || [];
        }

        console.log(`[syncAllOrders] Fetched ${fetchedOrders.length} orders from Supabase.`);

        setState(prev => ({
          ...prev,
          orders: fetchedOrders.map(mapOrderFromDB)
        }));
      } catch (e) {
        console.error("Error syncing orders:", e);
      }
    },
    syncAllProducts: async () => {
      const { currentUser, activeTenant } = state;
      if (!currentUser) return;

      try {
        let fetchedProducts: any[] = [];
        if (currentUser.role === UserRole.CONEXX_ADMIN) {
          const { data } = await supabase.from('products').select('*');
          fetchedProducts = data || [];
        } else if (activeTenant) {
          const { data } = await supabase.from('products').select('*').eq('tenant_id', activeTenant.id);
          fetchedProducts = data || [];
        }

        setState(prev => ({
          ...prev,
          products: fetchedProducts.map(mapProductFromDB)
        }));
      } catch (e) {
        console.error("Error syncing products:", e);
      }
    },
    syncYampi: async (targetTenantId?: string) => {
      setIsSyncing(true);
      try {
        const payload = targetTenantId
          ? { tenantId: targetTenantId }
          : state.currentUser?.role === UserRole.CONEXX_ADMIN
            ? {} // Sync all for Admin if no ID specified
            : { tenantId: state.activeTenant?.id }; // Sync specific for Tenant user

        // Call backend to trigger sync
        const res = await fetch('/api/admin/metricas/yampi/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Falha na sincronização.');
        }

        // Refresh state
        await syncAllOrders();
        await actions.syncAllProducts();

        if (state.currentUser?.role === UserRole.CONEXX_ADMIN) {
          const { data: allTenants } = await supabase.from('tenants').select('*');
          if (allTenants) {
            setState(prev => ({ ...prev, tenants: allTenants.map(mapTenantFromDB) }));
          }
        } else if (state.activeTenant) {
          const { data: updatedTenant } = await supabase.from('tenants').select('*').eq('id', state.activeTenant.id).single();
          if (updatedTenant) {
            setState(prev => ({
              ...prev,
              activeTenant: mapTenantFromDB(updatedTenant)
            }));
          }
        }

      } catch (err: any) {
        console.error("Sync error:", err);
        setSyncError(err.message || "Erro de sincronização.");
      } finally {
        setIsSyncing(false);
      }
    },

    saveTenant: async (data: Partial<Tenant>) => {
      setIsSyncing(true);
      try {
        console.log("saveTenant called with:", data); // DEBUG LOG
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
          plan_id: data.planId || null,
          billing_cycle: data.billingCycle,
          active: data.active !== undefined ? data.active : true,
          document: data.document,
          meta_range: data.metaRange,
          company_percentage: data.companyPercentage || 0,
          logo_url: data.logoUrl,
          meta_access_token: data.metaAccessToken,
          meta_ad_account_id: data.metaAdAccountId,
          ga4_measurement_id: data.ga4MeasurementId,
          ga_credentials: data.gaCredentials,
          business_type: data.businessType || 'e-commerce'
        };

        Object.keys(tenantPayload).forEach(key => tenantPayload[key] === undefined && delete tenantPayload[key]);

        console.log("Tenant Payload to Supabase:", tenantPayload); // DEBUG LOG

        let savedTenant;
        let tenantError;

        if (tenantId) {
          // 1. Try RPC V2 (Bypass RLS)
          const { error: rpcError } = await supabase.rpc('admin_update_tenant_v2', {
            _id: tenantId,
            _name: tenantPayload.name,
            _owner_email: tenantPayload.owner_email,
            _yampi_alias: tenantPayload.yampi_alias || null,
            _yampi_token: tenantPayload.yampi_token || null,
            _yampi_secret: tenantPayload.yampi_secret || null,
            _yampi_proxy_url: tenantPayload.yampi_proxy_url || null,
            _company_percentage: tenantPayload.company_percentage || 0,
            _logo_url: tenantPayload.logo_url || null,
            _document: tenantPayload.document || null
          });

          if (rpcError) {
            console.error("RPC V2 update failed:", rpcError);
            // Fallback to V1 or standard if V2 missing
            const { error: rpcErrorOld } = await supabase.rpc('admin_update_tenant', {
              _id: tenantId,
              _name: tenantPayload.name,
              _owner_email: tenantPayload.owner_email,
              _yampi_alias: tenantPayload.yampi_alias || null,
              _yampi_token: tenantPayload.yampi_token || null,
              _yampi_secret: tenantPayload.yampi_secret || null,
              _yampi_proxy_url: tenantPayload.yampi_proxy_url || null,
              _company_percentage: tenantPayload.company_percentage || 0,
              _logo_url: tenantPayload.logo_url || null,
              _document: tenantPayload.document || null
            });

            if (rpcErrorOld) {
              // Final attempt: standard update
              const { data, error } = await supabase
                .from('tenants')
                .update(tenantPayload)
                .eq('id', tenantId)
                .select()
                .single();
              savedTenant = data;
              tenantError = error;
            }
          }

          // Force update for new Meta/GA fields using standard update, since RPCs might not support them yet
          const extrasPayload: any = {};
          if (data.metaAccessToken !== undefined) extrasPayload.meta_access_token = data.metaAccessToken;
          if (data.metaAdAccountId !== undefined) extrasPayload.meta_ad_account_id = data.metaAdAccountId;
          if (data.ga4MeasurementId !== undefined) extrasPayload.ga4_measurement_id = data.ga4MeasurementId;
          if (data.gaCredentials !== undefined) extrasPayload.ga_credentials = data.gaCredentials;
          if (data.businessType !== undefined) extrasPayload.business_type = data.businessType;

          if (Object.keys(extrasPayload).length > 0) {
            await supabase.from('tenants').update(extrasPayload).eq('id', tenantId);
          }

          // Fetch updated to return valid object if savedTenant is null
          const { data: updatedData } = await supabase.from('tenants').select().eq('id', tenantId).single();
          savedTenant = updatedData;

        } else {
          // Insert new
          const { data, error } = await supabase
            .from('tenants')
            .insert(tenantPayload)
            .select()
            .single();
          savedTenant = data;
          tenantError = error;
        }

        if (tenantError) {
          console.error("Supabase Error saving tenant:", tenantError); // DEBUG LOG
          throw new Error(`Erro ao salvar loja: ${tenantError.message} `);
        }
        console.log("Supabase Success saved tenant:", savedTenant); // DEBUG LOG

        tenantId = savedTenant.id;

        // 3. Upsert Owner User via RPC to bypass RLS
        const { error: userRpcError } = await supabase.rpc('admin_upsert_user_owner', {
          _id: existingUser?.id || null, // If null, RPC handles creation
          _email: normalizedEmail,
          _tenant_id: tenantId,
          _name: data.ownerName,
          _password: data.password || null
        });

        if (userRpcError) {
          console.error("User RPC failed, falling back to standard upsert:", userRpcError);
          // Fallback to standard upsert logic if RPC fails
          const userPayload: any = {
            tenant_id: tenantId,
            email: normalizedEmail,
            name: data.ownerName,
            role: UserRole.CLIENT_ADMIN,
          };

          if (data.password) userPayload.password = data.password;

          // If the user already exists AND belongs to this tenant, update them
          if (existingUser && existingUser.tenant_id === tenantId) {
            const { error: userError } = await supabase.from('users').update(userPayload).eq('id', existingUser.id);
            if (userError) throw new Error(`Erro ao atualizar usuário vinculado: ${userError.message}`);
          } else {
            // Find if there's an existing user for THIS tenant to update its email, rather than relying on the email search
            const { data: tenantUser } = await supabase.from('users').select('*').eq('tenant_id', tenantId).eq('role', UserRole.CLIENT_ADMIN).single();

            if (tenantUser) {
              const { error: userError } = await supabase.from('users').update(userPayload).eq('id', tenantUser.id);
              if (userError) throw new Error(`Erro ao atualizar email do usuário: ${userError.message}`);
            } else {
              const { error: userError } = await supabase.from('users').insert({ ...userPayload, password: data.password || '123456' });
              if (userError) throw new Error(`Erro ao criar usuário: ${userError.message}`);
            }
          }
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
          order_index: plan.orderIndex || 0,
          discount_upfront_percent: plan.discountUpfrontPercent || 0
        };

        // If id is falsy, let the DB generate it
        if (!payload.id) delete payload.id;

        // Clean undefined values
        Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

        console.debug('savePlan payload via API', payload);

        const res = await fetch('/api/admin/plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('Servidor backend não atualizado (Erro 404). Reinicie o terminal do servidor backend (Node) para aplicar as novas rotas!');
          }
          let errData;
          try { errData = await res.json(); } catch { throw new Error('Erro de comunicação com o servidor. Tente reiniciar o backend.'); }
          throw new Error(errData?.error || 'Erro ao salvar plano na API.');
        }

        const data = await res.json();
        const mappedPlan = mapPlanFromDB(data);

        // Update local state immediately in case real-time listener is not configured
        setState(prev => {
          const exists = prev.plans.find(p => p.id === mappedPlan.id);
          if (exists) {
            return { ...prev, plans: prev.plans.map(p => p.id === mappedPlan.id ? mappedPlan : p) };
          }
          return { ...prev, plans: [...prev.plans, mappedPlan] };
        });

        return mappedPlan;
      } catch (e: any) {
        console.error('savePlan error', e);
        setSyncError(e.message || "Falha ao salvar plano.");
        throw e;
      } finally { setIsSyncing(false); }
    },
    deletePlan: async (id: string) => {
      setIsSyncing(true);
      try {
        const res = await fetch(`/api/admin/plans/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('Servidor backend não atualizado (Erro 404). Reinicie o terminal do servidor backend (Node) para aplicar as novas rotas!');
          }
          let errData;
          try { errData = await res.json(); } catch { throw new Error('Erro de comunicação com o servidor. Tente reiniciar o backend.'); }
          throw new Error(errData?.error || 'Erro ao excluir plano na API.');
        }

        // Update local state immediately
        setState(prev => ({ ...prev, plans: prev.plans.filter(p => p.id !== id) }));
      } catch (e: any) {
        console.error(e);
        setSyncError(e.message || "Falha ao excluir plano.");
      } finally { setIsSyncing(false); }
    },


    saveCoupon: async (coupon: Partial<Coupon>) => {
      if (!state.activeTenant) return;
      setIsSyncing(true);
      try {
        const payload = {
          tenantId: state.activeTenant.id,
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          usageLimit: coupon.usageLimit
        };

        const res = await fetch('/api/coupons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Falha ao salvar cupom na Yampi.');
        }

        const savedCoupon = await res.json();

        const mapped = mapCouponFromDB(savedCoupon);
        setState(prev => {
          const exists = prev.coupons.find(c => c.id === mapped.id);
          if (exists) return { ...prev, coupons: prev.coupons.map(c => c.id === mapped.id ? mapped : c) };
          return { ...prev, coupons: [...prev.coupons, mapped] };
        });
        toast.success("Cupom sincronizado com Yampi!");
      } catch (e: any) {
        toast.error(e.message);
      } finally { setIsSyncing(false); }
    },
    syncCoupons: async () => {
      // Re-use syncYampi which now includes coupons
      return actions.syncYampi(state.activeTenant?.id);
    },
    deleteCoupon: async (id: string) => {
      try {
        const { error } = await supabase.from('coupons').delete().eq('id', id);
        if (error) throw error;
        setState(prev => ({ ...prev, coupons: prev.coupons.filter(c => c.id !== id) }));
        toast.success("Cupom removido localmente.");
      } catch (e: any) {
        toast.error("Erro ao remover cupom.");
      }
    },
    saveInfluencer: async (influencer: Partial<Influencer>) => {
      setIsSyncing(true);
      try {
        const coupon = state.coupons.find(c => c.id === influencer.couponId);
        const payload = {
          tenantId: state.activeTenant?.id,
          name: influencer.name,
          couponCode: coupon?.code || influencer.name?.toUpperCase().replace(/\s/g, ''),
          commissionRate: influencer.commissionRate
        };

        const res = await fetch('/api/influencers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Falha ao salvar influenciador.');

        const savedInf = await res.json();

        setState(prev => {
          const exists = prev.influencers.find(i => i.id === savedInf.id);
          if (exists) return { ...prev, influencers: prev.influencers.map(i => i.id === savedInf.id ? savedInf : i) };
          return { ...prev, influencers: [...prev.influencers, savedInf] };
        });
        toast.success("Influenciador vinculado!");
        // Refresh coupons to ensure we have the newly created one if applicable
        await syncAllTenants();
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        setIsSyncing(false);
      }
    },
    deleteInfluencer: async (id: string) => {
      try {
        const { error } = await supabase.from('influencers').delete().eq('id', id);
        if (error) throw error;
        setState(prev => ({ ...prev, influencers: prev.influencers.filter(i => i.id !== id) }));
        toast.success("Influenciador removido.");
      } catch (e: any) {
        toast.error("Erro ao remover influenciador.");
      }
    },
    saveCommSettings: async (settings: CommSettings, triggerId?: string, active?: boolean) => {
      if (!state.activeTenant) return;
      try {
        const payload = {
          tenantId: state.activeTenant.id,
          triggerId: triggerId,
          active: active,
          allTriggers: settings.activeTriggers
        };

        const res = await fetch('/api/comm-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Falha ao sincronizar com Yampi.');

        setState(prev => ({ ...prev, commSettings: settings }));
        toast.success("Configurações sincronizadas!");
      } catch (e: any) {
        toast.error(e.message || "Erro ao salvar configurações.");
      }
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
    connectYampi: async (token: string, secret: string, alias: string, proxyUrl: string) => {
      if (!state.activeTenant) return;
      try {
        const { error } = await supabase.from('tenants').update({
          yampi_token: token,
          yampi_secret: secret,
          yampi_alias: alias,
          yampi_proxy_url: proxyUrl
        }).eq('id', state.activeTenant.id);

        if (error) throw error;

        toast.success("Credenciais Yampi salvas!");
        await syncAllTenants(); // Re-fetch active tenant
        setTimeout(() => actions.syncYampi(), 500);
      } catch (e: any) {
        toast.error("Erro ao conectar Yampi.");
      }
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
    syncAsaasData: async () => {
      try {
        const response = await fetch('/api/admin/assinaturas');
        const resData = await response.json();

        if (resData.data && Array.isArray(resData.data)) {
          setState(prev => ({ ...prev, asaasSubscriptions: resData.data }));
        }
      } catch (e) {
        console.error("Failed to sync Asaas data", e);
      }
    },
    forceSyncAsaasData: async () => {
      setIsSyncing(true);
      try {
        // 1. Trigger backend sync
        await fetch('/api/asaas/sync-data', { method: 'POST' });

        // 2. Refresh local data
        const response = await fetch('/api/admin/assinaturas');
        const resData = await response.json();

        if (resData.data && Array.isArray(resData.data)) {
          setState(prev => ({ ...prev, asaasSubscriptions: resData.data }));
        }
        toast.success("Dados sincronizados com sucesso!");
      } catch (e: any) {
        console.error("Failed to force sync Asaas data", e);
        toast.error("Falha na sincronização.");
      } finally {
        setIsSyncing(false);
      }
    },
    fetchAdminSubscriptions: async () => {
      try {
        const response = await fetch('/api/admin/assinaturas');
        const data = await response.json();
        if (data.data) {
          setState(prev => ({ ...prev, asaasSubscriptions: data.data }));
        }
        return data;
      } catch (e) {
        console.error("fetchAdminSubscriptions error", e);
        throw e;
      }
    },
    fetchAdminClientDetails: async (clientId: string) => {
      try {
        const response = await fetch(`/api/admin/assinaturas/${clientId}`);
        const data = await response.json();
        return data;
      } catch (e) {
        console.error("fetchAdminClientDetails error", e);
        throw e;
      }
    },
    fetchWeeklyFees: async (tenantId: string) => {
      try {
        const response = await fetch(`/api/weekly-fees?tenantId=${tenantId}`);
        const data = await response.json();
        if (response.ok) {
          setState(prev => ({ ...prev, weeklyFees: data }));
        }
      } catch (e) {
        console.error("Failed to fetch weekly fees", e);
      }
    },
    generateWeeklyCharge: async (id: string, paymentMethod: string) => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/weekly-fees/${id}/gerar-cobranca`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentMethod })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Erro ao gerar cobrança.");
        return data;
      } catch (err: any) {
        console.error(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    markFeeAsPaid: async (id: string, password: string) => {
      setIsLoading(true);
      try {
        if (!state.currentUser) throw new Error("Usuário não autenticado.");

        const response = await fetch(`/api/admin/weekly-fees/${id}/pay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password, email: state.currentUser.email })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Erro ao confirmar pagamento.");
        return data;
      } catch (err: any) {
        console.error(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    cancelWeeklyFee: async (id: string) => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/weekly-fees/${id}/cancelar`, { method: 'POST' });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Erro ao cancelar.");
        }
      } catch (err: any) {
        console.error(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    calculateWeeklyFees: async (startDate: string, endDate: string) => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/admin/weekly-fees/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startDate, endDate })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Erro no cálculo.");
        return data;
      } catch (err: any) {
        console.error(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    previewWeeklyFees: async (startDate: string, endDate: string) => {
      // Don't set global loading state for specific previews to avoid unmounting components or aggressive re-renders
      try {
        const response = await fetch('/api/admin/weekly-fees/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startDate, endDate })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Erro ao gerar prévia.");
        return data.data; // Returns array of preview items
      } catch (err: any) {
        console.error(err);
        throw err;
      }
    },
    subscribeToPlan: async (planId: string, cycle: 'quarterly' | 'semiannual' | 'yearly', type: 'monthly' | 'upfront' = 'upfront', paymentMethod: 'CREDIT_CARD' | 'BOLETO' | 'PIX' = 'CREDIT_CARD') => {
      setIsLoading(true);
      try {
        const userId = state.currentUser?.id;
        if (!userId) throw new Error("Usuário não identificado.");

        const response = await fetch('/api/asaas/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId
          },
          body: JSON.stringify({
            planId,
            billingCycle: cycle,
            billingType: type,
            paymentMethod, // sent as 'CREDIT_CARD', 'BOLETO', 'PIX'
            userId
          })
        });

        const ct = response.headers.get('content-type') || '';
        let data: any = null;
        let textBody: string | null = null;
        if (ct.includes('application/json')) {
          data = await response.json();
        } else {
          textBody = await response.text();
        }

        if (!response.ok) {
          const errMsg = data?.message || data?.error || textBody || `Request failed with status ${response.status}`;
          throw new Error(errMsg);
        }

        // Normalize return shape so callers can rely on checkoutUrl
        const normalized: any = {
          success: data.success,
          checkoutUrl: data.checkoutUrl,
          subscriptionId: data.subscriptionId,
          raw: data
        };

        console.log('[Debug] DataContext subscribeToPlan normalized:', normalized);
        return normalized;
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Erro ao processar assinatura.');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    generateCharge: async (requestId: string, paymentMethod: string) => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/pagamentos/${requestId}/gerar-cobranca`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentMethod })
        });
        const ct = response.headers.get('content-type') || '';
        let data: any = null;
        let textBody: string | null = null;
        if (ct.includes('application/json')) data = await response.json();
        else textBody = await response.text();
        if (!response.ok) {
          const errMsg = data?.message || data?.error || textBody || `Request failed with status ${response.status}`;
          throw new Error(errMsg);
        }
        return data || { success: true, data: null, message: 'ok' };
      } catch (err: any) {
        console.error(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    cancelPaymentRequest: async (requestId: string) => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/pagamentos/${requestId}/cancelar`, {
          method: 'POST'
        });
        if (!response.ok) {
          const ct = response.headers.get('content-type') || '';
          let data: any = null;
          let textBody: string | null = null;
          if (ct.includes('application/json')) data = await response.json();
          else textBody = await response.text();
          const errMsg = data?.message || data?.error || textBody || `Request failed with status ${response.status}`;
          throw new Error(errMsg);
        }
      } catch (err: any) {
        console.error(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },

    // Team Management
    fetchTeam: async () => {
      if (!state.activeTenant) return;
      try {
        const response = await fetch(`/api/team/${state.activeTenant.id}`);
        const data = await response.json();
        if (response.ok) {
          setState(prev => ({ ...prev, team: data }));
        }
      } catch (err) {
        console.error('Fetch team err:', err);
      }
    },
    addTeamMember: async (payload: any) => {
      try {
        const response = await fetch('/api/team', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, tenantId: state.activeTenant?.id })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erro ao adicionar membro.');
        setState(prev => ({ ...prev, team: [...(prev.team || []), data] }));
      } catch (err: any) {
        console.error(err);
        throw err;
      }
    },
    deleteTeamMember: async (userId: string) => {
      try {
        const response = await fetch(`/api/team/${userId}`, { method: 'DELETE' });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Erro ao remover membro.');
        }
        setState(prev => ({ ...prev, team: (prev.team || []).filter((u: any) => u.id !== userId) }));
      } catch (err: any) {
        console.error(err);
        throw err;
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

    // Payments
    fetchMyPayments: async () => {
      // The instruction implies 'user' is available in the scope where actions is defined.
      // Assuming 'user' is a dependency for the useMemo that wraps 'actions'.
      // The instruction also implies that the 'fetchMyPayments' method itself might need 'user' directly.
      // However, the instruction only asks to add 'user' to the useMemo dependency array.
      // If 'user' is needed inside this function, it should be accessed from 'state.currentUser'.
      // The instruction's snippet for fetchMyPayments is:
      // if (!user) return;
      // This suggests 'user' is a direct dependency of the useMemo, and also used within this function.
      if (!state.currentUser) return;
      try {
        const userId = state.currentUser?.id;
        if (!userId) return;

        // Fetch from new subscriptions table
        const { data: subs, error: subErr } = await supabase
          .from('subscriptions')
          .select('*, plans(name)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (subErr) throw subErr;

        // We can still support legacy payment_requests if needed, but let's prioritize subscriptions
        if (subs) {
          const mapped = subs.map(s => ({
            id: s.id,
            userId: s.user_id,
            planId: s.plan_id,
            planName: s.plans?.name || 'Plano',
            cycle: s.billing_cycle,
            billingType: s.billing_type,
            status: s.status,
            asaasSubscriptionId: s.asaas_subscription_id,
            billingValue: Number(s.value || 0),
            createdAt: s.created_at,
            // Mocking some fields needed by UI
            paymentMethod: s.billing_type === 'monthly' ? 'CREDIT_CARD' : 'BOLETO',
            checkoutUrl: s.checkout_url,
            asaasInvoiceUrl: s.checkout_url // Fallback/Alias
          }));
          setState(prev => ({ ...prev, paymentRequests: mapped }));
        }
      } catch (e) {
        console.error("fetchMyPayments error", e);
      }
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
      setIsSyncing(true); // Add syncing state to disable buttons during remote call
      try {
        let finalId = prod.id;
        let yampiProductId = prod.yampiProductId;

        // Try to push to Yampi first if integration is active
        if (state.activeTenant.yampiAlias) {
          try {
            const yampiRes = await YampiService.createProductOnYampi(state.activeTenant, prod);
            if (yampiRes && yampiRes.id) {
              yampiProductId = typeof yampiRes.id === 'number' ? yampiRes.id : parseInt(yampiRes.id);
            }
          } catch (ye) {
            console.error("Yampi push failed, continuing with local save:", ye);
            // Optionally show a toast, but typically we want to save local anyway and sync later
          }
        }

        // Duplicate Check: If no ID but has Yampi ID, try to find existing
        if (!finalId && yampiProductId) {
          const { data: existing } = await supabase
            .from('products')
            .select('id')
            .eq('tenant_id', state.activeTenant.id)
            .eq('yampi_product_id', yampiProductId)
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
          yampi_product_id: yampiProductId, // Use the potentially newly created ID
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
      } finally {
        setIsSyncing(false);
      }
    },
    deleteProduct: async (id: string) => {
      try {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
        setState(prev => ({ ...prev, products: prev.products.filter(p => p.id !== id) }));
      } catch (e) { console.error(e); }
    },

    // Team Management
    fetchTeam: async () => {
      try {
        const tenantId = state.activeTenant?.id || state.currentUser?.tenantId;
        if (!tenantId) return;
        // Fetch all users for this tenant EXCEPT the current user (owner)
        const { data, error } = await supabase
          .from('users')
          .select('id, name, email, role, tenant_id')
          .eq('tenant_id', tenantId)
          .neq('id', state.currentUser?.id || '');
        if (error) throw error;
        setState(prev => ({ ...prev, team: (data || []).map(mapUserFromDB) }));
      } catch (e: any) {
        console.error('fetchTeam error:', e);
      }
    },

    addTeamMember: async (payload: { name: string; email: string; password: string; role: string }) => {
      try {
        const tenantId = state.activeTenant?.id || state.currentUser?.tenantId;
        if (!tenantId) throw new Error('Tenant não identificado.');

        const normalizedEmail = payload.email.trim().toLowerCase();

        // Check if email is already in use
        const { data: existing } = await supabase
          .from('users')
          .select('id, tenant_id')
          .eq('email', normalizedEmail)
          .single();

        if (existing) {
          if (existing.tenant_id === tenantId) throw new Error('Este email já está cadastrado na sua equipe.');
          throw new Error('Este email já está em uso por outra loja.');
        }

        // Create user with CLIENT_USER role linked to this tenant
        const { data: newUser, error } = await supabase
          .from('users')
          .insert({
            name: payload.name.trim(),
            email: normalizedEmail,
            password: payload.password,
            role: UserRole.CLIENT_USER,
            tenant_id: tenantId
          })
          .select()
          .single();

        if (error) throw error;

        setState(prev => ({ ...prev, team: [...prev.team, mapUserFromDB(newUser)] }));
      } catch (e: any) {
        console.error('addTeamMember error:', e);
        throw e;
      }
    },

    deleteTeamMember: async (userId: string) => {
      try {
        const tenantId = state.activeTenant?.id || state.currentUser?.tenantId;
        // Safety: only delete users from same tenant and only CLIENT_USER/manager roles
        const { data: userToDelete } = await supabase
          .from('users')
          .select('id, tenant_id, role')
          .eq('id', userId)
          .single();

        if (!userToDelete) throw new Error('Usuário não encontrado.');
        if (userToDelete.tenant_id !== tenantId) throw new Error('Acesso negado.');
        if (userToDelete.role === UserRole.CONEXX_ADMIN || userToDelete.role === UserRole.CLIENT_ADMIN) {
          throw new Error('Não é possível remover o proprietário da loja.');
        }

        const { error } = await supabase.from('users').delete().eq('id', userId);
        if (error) throw error;

        setState(prev => ({ ...prev, team: prev.team.filter(m => m.id !== userId) }));
      } catch (e: any) {
        console.error('deleteTeamMember error:', e);
        throw e;
      }
    }
  }), [state.activeTenant?.id, state.currentUser?.id, initialSyncRequested]);


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
