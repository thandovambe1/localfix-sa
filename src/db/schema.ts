import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const providers = pgTable("providers", {
  id: serial("id").primaryKey(),
  businessName: text("business_name").notNull(),
  ownerName: text("owner_name").notNull(),
  email: text("email").notNull(),
  /** scrypt hash in the form "salt:hash". Required for new production provider accounts. */
  passwordHash: text("password_hash"),
  phone: text("phone").notNull(),
  whatsapp: text("whatsapp"),
  province: text("province").notNull(),
  city: text("city").notNull(),
  suburb: text("suburb"),
  address: text("address"),
  lat: numeric("lat", { precision: 9, scale: 6 }).notNull(),
  lng: numeric("lng", { precision: 9, scale: 6 }).notNull(),
  serviceRadiusKm: integer("service_radius_km").notNull().default(30),
  categories: jsonb("categories").$type<string[]>().notNull().default([]),
  provinces: jsonb("provinces").$type<string[]>().notNull().default([]),
  languages: jsonb("languages").$type<string[]>().notNull().default([]),
  badges: jsonb("badges").$type<string[]>().notNull().default([]),
  bio: text("bio").notNull().default(""),
  website: text("website"),
  yearsExperience: integer("years_experience").notNull().default(1),
  employees: integer("employees").notNull().default(1),
  emergencyAvailable: boolean("emergency_available").notNull().default(false),
  operatingHours: text("operating_hours").notNull().default("Mon–Fri 08:00–17:00"),
  hourlyRate: integer("hourly_rate").notNull().default(450),
  rating: numeric("rating", { precision: 3, scale: 2 }).notNull().default("5.00"),
  reviewCount: integer("review_count").notNull().default(0),
  jobsCompleted: integer("jobs_completed").notNull().default(0),
  responseMinutes: integer("response_minutes").notNull().default(30),
  successRate: integer("success_rate").notNull().default(90),
  accent: text("accent").notNull().default("#0F9E99"),
  /** Uploaded business logo (URL or small data-URI). */
  logoUrl: text("logo_url"),
  status: text("status").notNull().default("pending"),
  plan: text("plan").notNull().default("free"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  applicationNote: text("application_note"),
  applicationDecidedBy: text("application_decided_by"),
  applicationDecidedAt: timestamp("application_decided_at", { withTimezone: true }),
});

/**
 * Compliance documents uploaded during provider registration.
 * Required documents are stored privately for admin verification and are
 * never exposed on public/customer provider views.
 */
export const providerDocuments = pgTable("provider_documents", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull(),
  /** id | cipc | insurance_schedule | proof_of_address | bank_confirmation | trade_certificate | other */
  documentType: text("document_type").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  /** Private base64 data URL. Production can later replace this with object storage. */
  fileData: text("file_data").notNull(),
  status: text("status").notNull().default("pending"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  reference: text("reference").notNull(),
  categorySlug: text("category_slug").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  address: text("address").notNull().default(""),
  suburb: text("suburb").notNull().default(""),
  city: text("city").notNull(),
  province: text("province").notNull(),
  lat: numeric("lat", { precision: 9, scale: 6 }).notNull(),
  lng: numeric("lng", { precision: 9, scale: 6 }).notNull(),
  urgency: text("urgency").notNull().default("this-week"),
  budgetMin: integer("budget_min"),
  budgetMax: integer("budget_max"),
  contactMethod: text("contact_method").notNull().default("whatsapp"),
  preferredTimes: text("preferred_times").notNull().default(""),
  photos: jsonb("photos").$type<string[]>().notNull().default([]),
  /** Linked account when the job was posted by a registered customer. */
  customerId: integer("customer_id"),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull().default(""),
  status: text("status").notNull().default("open"),
  aiSummary: text("ai_summary").notNull().default(""),
  aiComplexity: text("ai_complexity").notNull().default("standard"),
  aiBudgetLow: integer("ai_budget_low").notNull().default(0),
  aiBudgetHigh: integer("ai_budget_high").notNull().default(0),
  broadcastCount: integer("broadcast_count").notNull().default(0),
  quoteDeadline: timestamp("quote_deadline", { withTimezone: true }),
  acceptedQuoteId: integer("accepted_quote_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(),
  providerId: integer("provider_id").notNull(),
  amount: integer("amount").notNull(),
  message: text("message").notNull().default(""),
  availability: text("availability").notNull().default("Within 48 hours"),
  warrantyMonths: integer("warranty_months").notNull().default(6),
  includesMaterials: boolean("includes_materials").notNull().default(true),
  status: text("status").notNull().default("submitted"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull(),
  jobId: integer("job_id"),
  author: text("author").notNull(),
  city: text("city").notNull().default(""),
  rating: integer("rating").notNull().default(5),
  quality: integer("quality").notNull().default(5),
  communication: integer("communication").notNull().default(5),
  professionalism: integer("professionalism").notNull().default(5),
  punctuality: integer("punctuality").notNull().default(5),
  value: integer("value").notNull().default(5),
  recommend: boolean("recommend").notNull().default(true),
  comment: text("comment").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(),
  providerId: integer("provider_id"),
  sender: text("sender").notNull().default("customer"),
  authorName: text("author_name").notNull().default("Customer"),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const broadcasts = pgTable("broadcasts", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(),
  providerId: integer("provider_id").notNull(),
  distanceKm: numeric("distance_km", { precision: 6, scale: 2 }).notNull().default("0"),
  matchScore: integer("match_score").notNull().default(0),
  channels: jsonb("channels").$type<string[]>().notNull().default([]),
  status: text("status").notNull().default("sent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  source: text("source").notNull().default("footer"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Payment ledger — tracks every transaction through the platform.
 * The customer pays the full quote amount. LocalFix SA keeps a 13% admin
 * commission and pays out 87% to the service provider.
 */
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(),
  quoteId: integer("quote_id").notNull(),
  providerId: integer("provider_id").notNull(),

  /** Full amount the customer pays, in cents (ZAR). */
  totalAmountCents: integer("total_amount_cents").notNull(),

  /** 13% commission retained by LocalFix SA, in cents. */
  commissionCents: integer("commission_cents").notNull(),

  /** 87% net payout to the service provider, in cents. */
  providerPayoutCents: integer("provider_payout_cents").notNull(),

  /** Commission rate applied (stored for auditing — currently 0.13). */
  commissionRate: numeric("commission_rate", { precision: 5, scale: 4 }).notNull().default("0.1300"),

  /** Yoco checkout session ID (ch_...). */
  yocoCheckoutId: text("yoco_checkout_id"),

  /** Yoco payment ID returned by webhook (p_...). */
  yocoPaymentId: text("yoco_payment_id"),

  /** Yoco redirect URL for the hosted checkout page. */
  yocoRedirectUrl: text("yoco_redirect_url"),

  /**
   * Payment lifecycle: pending → paid → payout_pending → paid_out
   * Also: failed, refunded, disputed.
   */
  status: text("status").notNull().default("pending"),

  /**
   * Provider payout status:
   * pending | payout_pending | requested | processing | completed
   */
  payoutStatus: text("payout_status").notNull().default("pending"),

  /** Provider payout reference (EFT/bank ref). */
  payoutReference: text("payout_reference"),

  /** When the provider requested their payout. */
  payoutRequestedAt: timestamp("payout_requested_at", { withTimezone: true }),

  /** Internal admin notes on the payout. */
  payoutNotes: text("payout_notes").notNull().default(""),

  /** Admin user who processed the payout. */
  processedBy: text("processed_by"),

  /** Customer-facing payment reference. */
  reference: text("reference").notNull(),

  /** How the customer paid: yoco | wallet */
  method: text("method").notNull().default("yoco"),

  /** Freeform metadata from Yoco webhook. */
  meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),

  paidAt: timestamp("paid_at", { withTimezone: true }),
  payoutAt: timestamp("payout_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Customer wallet withdrawal requests.
 *
 * When a customer requests a withdrawal the wallet is debited immediately
 * (funds move into an on-platform "escrow"). An admin then approves and
 * completes the EFT payout to the customer's bank, or rejects it — in
 * which case the funds are automatically refunded to the wallet.
 */
export const withdrawals = pgTable("withdrawals", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  /** Requested amount in ZAR cents. */
  amountCents: integer("amount_cents").notNull(),
  /** Customer-facing reference. */
  reference: text("reference").notNull(),

  /** Bank details captured at request time. */
  bankName: text("bank_name").notNull(),
  accountHolder: text("account_holder").notNull(),
  accountNumber: text("account_number").notNull(),
  branchCode: text("branch_code").notNull().default(""),
  accountType: text("account_type").notNull().default("cheque"),

  /** requested | approved | processing | completed | rejected | cancelled */
  status: text("status").notNull().default("requested"),

  /** Bank/EFT confirmation number once paid out. */
  payoutReference: text("payout_reference"),

  /** Admin who processed it and why (for rejection notes). */
  processedBy: text("processed_by"),
  adminNotes: text("admin_notes").notNull().default(""),

  processedAt: timestamp("processed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Customer inbox — quotes and system notices land here automatically. */
export const inboxMessages = pgTable("inbox_messages", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id"),
  /** Fallback recipient match when the job was posted as a guest. */
  customerEmail: text("customer_email").notNull(),
  /** new_quote | quote_reminder | payment | payout | system */
  type: text("type").notNull().default("new_quote"),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  jobId: integer("job_id"),
  quoteId: integer("quote_id"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Registered customer accounts. */
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull().default(""),
  /** scrypt hash in the form "salt:hash" */
  passwordHash: text("password_hash").notNull(),
  province: text("province").notNull().default("Gauteng"),
  city: text("city").notNull().default("Johannesburg"),
  suburb: text("suburb").notNull().default(""),
  address: text("address").notNull().default(""),
  contactMethod: text("contact_method").notNull().default("whatsapp"),
  /** Stored wallet balance in ZAR cents. */
  walletCents: integer("wallet_cents").notNull().default(0),
  status: text("status").notNull().default("active"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Every movement of money in and out of a customer wallet. */
export const walletTransactions = pgTable("wallet_transactions", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  /** topup | payment | refund | bonus */
  type: text("type").notNull(),
  /** Signed amount in cents: positive credits, negative debits. */
  amountCents: integer("amount_cents").notNull(),
  /** Wallet balance after this transaction settled. */
  balanceAfterCents: integer("balance_after_cents").notNull().default(0),
  description: text("description").notNull().default(""),
  reference: text("reference").notNull(),
  /** pending | completed | failed */
  status: text("status").notNull().default("completed"),
  jobId: integer("job_id"),
  yocoCheckoutId: text("yoco_checkout_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Admin users who can log into the operations dashboard. */
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  /** scrypt hash in the form "salt:hash" */
  passwordHash: text("password_hash").notNull(),
  /** owner | admin | finance | support */
  role: text("role").notNull().default("admin"),
  active: boolean("active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Immutable audit trail of every privileged admin action. */
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  target: text("target").notNull().default(""),
  detail: text("detail").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Founder-approved password reset/change codes for admin users.
 * Codes are hashed; plain codes are only sent to the founder email.
 */
export const adminPasswordCodes = pgTable("admin_password_codes", {
  id: serial("id").primaryKey(),
  adminUserId: integer("admin_user_id").notNull(),
  adminEmail: text("admin_email").notNull(),
  codeHash: text("code_hash").notNull(),
  purpose: text("purpose").notNull().default("password_change"),
  requestedByIp: text("requested_by_ip"),
  used: boolean("used").notNull().default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Password reset codes for customer and provider accounts. */
export const passwordResetCodes = pgTable("password_reset_codes", {
  id: serial("id").primaryKey(),
  accountType: text("account_type").notNull(), // customer | provider
  accountId: integer("account_id").notNull(),
  email: text("email").notNull(),
  codeHash: text("code_hash").notNull(),
  requestedByIp: text("requested_by_ip"),
  used: boolean("used").notNull().default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Provider = typeof providers.$inferSelect;
export type ProviderDocument = typeof providerDocuments.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type Quote = typeof quotes.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Broadcast = typeof broadcasts.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type AdminPasswordCode = typeof adminPasswordCodes.$inferSelect;
export type PasswordResetCode = typeof passwordResetCodes.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type InboxMessage = typeof inboxMessages.$inferSelect;
export type Withdrawal = typeof withdrawals.$inferSelect;
