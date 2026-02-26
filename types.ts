
export enum UserRole {
  CONEXX_ADMIN = 'CONEXX_ADMIN',
  CLIENT_ADMIN = 'CLIENT_ADMIN',
  CLIENT_USER = 'CLIENT_USER'
}

export enum OrderStatus {
  APROVADO = 'APROVADO',
  AGUARDANDO = 'AGUARDANDO',
  CANCELADO = 'CANCELADO',
  ABANDONADO = 'ABANDONADO'
}

export interface Plan {
  id: string;
  name: string;
  priceQuarterly: number;
  priceSemiannual: number;
  priceYearly: number;
  descriptionQuarterly?: string;
  descriptionSemiannual?: string;
  descriptionYearly?: string;
  observations?: string;
  features: string[];
  recommended: boolean;
  active: boolean;
  discountPercent?: number;
  trafficFeePercent?: number;
  installments?: number;
  adCredit?: number;
  monthlyPriceQuarterly?: number;
  monthlyPriceSemiannual?: number;
  monthlyPriceYearly?: number;
  installmentsQuarterly?: number;
  installmentsSemiannual?: number;
  installmentsYearly?: number;
  trafficFeePercentQuarterly?: number;
  trafficFeePercentSemiannual?: number;
  trafficFeePercentYearly?: number;
  adCreditQuarterly?: number;
  adCreditSemiannual?: number;
  adCreditYearly?: number;
  orderIndex?: number;
  discountUpfrontPercent?: number;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  role: UserRole;
  name: string;
  password?: string;
}

export interface Tenant {
  id: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  password?: string;
  yampiToken?: string;
  yampiSecret?: string;
  yampiAlias?: string;
  yampiProxyUrl?: string;
  // OAuth tokens (Yampi Parceiros)
  yampiOauthAccessToken?: string;
  yampiOauthRefreshToken?: string;
  yampiOauthExpiresAt?: string;
  lastSync?: string;
  planId: string; // Referência ao ID do plano
  active: boolean;
  subscriptionStatus: 'active' | 'past_due' | 'canceled';
  billingCycle?: 'quarterly' | 'semiannual' | 'yearly';
  nextBilling: string;
  pendingPlanId?: string;
  pendingBillingCycle?: 'quarterly' | 'semiannual' | 'yearly';
  pendingPaymentUrl?: string;
  document?: string;
  metaRange?: '0-10k' | '10k-100k' | '100k-1M';
  // Admin Stats
  companyPercentage?: number;
  cachedGrossRevenue?: number;
  logoUrl?: string;

  // Integrations
  metaAccessToken?: string;
  metaAdAccountId?: string;
  ga4MeasurementId?: string;
  gaCredentials?: any;
  businessType?: 'e-commerce' | 'traffic-management' | 'both';
}

export interface Domain {
  id: string;
  tenantId: string;
  url: string;
  isMain: boolean;
  status: 'active' | 'pending' | 'error';
  ssl: boolean;
}

export interface Coupon {
  id: string;
  tenantId?: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  active: boolean;
  usageCount: number;
  usageLimit?: number;
}

export interface Influencer {
  id: string;
  name: string;
  couponId: string;
  commissionRate: number;
  totalSales: number;
  totalCommission: number;
}

export interface CommSettings {
  emailProvider: string;
  smsProvider: string;
  activeTriggers: string[];
}

export interface AbandonedCheckout {
  id: string;
  tenantId?: string;
  externalId: string;
  clientName: string;
  email: string;
  phone?: string;
  product: string;
  value: number;
  date: string;
  items: string;
  recovered: boolean;
}

export interface Order {
  id: string;
  tenantId: string;
  externalId: string;
  client: string;
  email: string;
  product: string;
  date: string;
  status: OrderStatus;
  paymentMethod: 'PIX' | 'Cartão' | 'Boleto';
  value: number;
  initials: string;
  couponCode?: string;
  // Logistics / tracking fields (from Yampi)
  rawStatusAlias?: string;
  delivered?: boolean;
  trackCode?: string;
  trackUrl?: string;
  shipmentService?: string;
  shipmentQuoteId?: number | string;
  daysDelivery?: number;
  valueShipment?: number;
}


export interface Category {
  id: string;
  tenantId: string;
  name: string;
}

export interface Product {
  id: string;
  tenantId: string;
  name: string;
  sku?: string | null;
  description?: string | null;
  price: number;
  active: boolean;
  categoryId?: string | null;
  operationType?: string | null;
  yampiProductId?: number | null;
  images?: string[];
}

export interface AppSettings {
  companyName: string;
  supportEmail: string;
  description: string;
  darkMode: boolean;
  currency: string;
}


export interface Goal {
  id: string;
  code: string;
  title: string;
  targetValue: number;
  currentValue?: number;
  achieved?: boolean;
  progressPercent?: number;
  missingValue?: number;
  currency?: string;
}

export interface GoalProgress {
  tenantId: string;
  tenantName: string;
  totalRevenue: number;
  goals: Goal[];
}

export interface AsaasSubscription {
  id: string;
  customer: string;
  value: number;
  nextDueDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'OVERDUE' | 'CANCELED';
  billingType: string;
  cycle: string;
  description?: string;
}

export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj?: string;
}

export interface AppState {
  currentUser: User | null;
  users: User[]; // All users visible to the current user
  activeTenant: Tenant | null;
  orders: Order[];
  abandonedCheckouts: AbandonedCheckout[];
  tenants: Tenant[];
  domains: Domain[];
  plans: Plan[];
  coupons: Coupon[];
  influencers: Influencer[];
  commSettings: CommSettings;
  settings: AppSettings;
  asaasConfig: { api_key: string, environment: string, webhook_secret: string };
  products: Product[];
  categories: Category[];
  goalsProgress: GoalProgress | null;
  asaasSubscriptions?: AsaasSubscription[];
  asaasCustomers?: AsaasCustomer[];
  paymentRequests?: PaymentRequest[];
  weeklyFees?: WeeklyFee[];
}

export interface PaymentRequest {
  id: string;
  userId: string;
  planId: string;
  cycle: 'quarterly' | 'semiannual' | 'yearly';
  billingType: 'monthly' | 'upfront';
  paymentMethod?: 'BOLETO' | 'PIX' | 'CREDIT_CARD';
  status: 'pending' | 'created' | 'paid' | 'canceled' | 'expired';
  asaasPaymentId?: string;
  asaasInvoiceUrl?: string;
  billingValue: number;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyFee {
  id: string;
  tenantId: string;
  weekStart: string;
  weekEnd: string;
  revenueWeek: number;
  percentApplied: number;
  amountDue: number;
  status: 'pending' | 'created' | 'paid' | 'overdue' | 'canceled';
  asaasPaymentId?: string;
  asaasInvoiceUrl?: string;
  dueDate?: string;
  paymentDate?: string;
  createdAt: string;
  updatedAt: string;
}
