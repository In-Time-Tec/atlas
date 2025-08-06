import { pgTable, text, timestamp, boolean, json, varchar, integer, index } from 'drizzle-orm/pg-core';
import { generateId } from 'ai';
import { InferSelectModel } from 'drizzle-orm';

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  activeOrganizationId: text('active_organization_id'),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
});

export const chat = pgTable(
  'chat',
  {
    id: text('id')
      .primaryKey()
      .notNull()
      .$defaultFn(() => generateId()),
    userId: text('userId')
      .notNull()
      .references(() => user.id),
    organizationId: text('organization_id'),
    title: text('title').notNull().default('New Chat'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    visibility: varchar('visibility', { enum: ['public', 'private'] })
      .notNull()
      .default('private'),
  },
  (table) => ({
    userOrgIdx: index('chat_user_org_idx').on(table.userId, table.organizationId),
  }),
);

export const message = pgTable('message', {
  id: text('id')
    .primaryKey()
    .notNull()
    .$defaultFn(() => generateId()),
  chatId: text('chat_id')
    .notNull()
    .references(() => chat.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  parts: json('parts').notNull(),
  attachments: json('attachments').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const stream = pgTable('stream', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  chatId: text('chatId')
    .notNull()
    .references(() => chat.id, { onDelete: 'cascade' }),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});

export const subscription = pgTable(
  'subscription',
  {
    id: text('id').primaryKey(),
    createdAt: timestamp('createdAt').notNull(),
    modifiedAt: timestamp('modifiedAt'),
    amount: integer('amount').notNull(),
    currency: text('currency').notNull(),
    recurringInterval: text('recurringInterval').notNull(),
    status: text('status').notNull(),
    currentPeriodStart: timestamp('currentPeriodStart').notNull(),
    currentPeriodEnd: timestamp('currentPeriodEnd').notNull(),
    cancelAtPeriodEnd: boolean('cancelAtPeriodEnd').notNull().default(false),
    canceledAt: timestamp('canceledAt'),
    startedAt: timestamp('startedAt').notNull(),
    endsAt: timestamp('endsAt'),
    endedAt: timestamp('endedAt'),
    customerId: text('customerId').notNull(),
    productId: text('productId').notNull(),
    discountId: text('discountId'),
    checkoutId: text('checkoutId').notNull(),
    customerCancellationReason: text('customerCancellationReason'),
    customerCancellationComment: text('customerCancellationComment'),
    metadata: text('metadata'),
    customFieldData: text('customFieldData'),
    userId: text('userId').references(() => user.id),
    organizationId: text('organizationId').references(() => organization.id),
    seats: integer('seats').default(1),
    pricePerSeat: integer('pricePerSeat'),
  },
  (table) => ({
    userOrgIdx: index('subscription_user_org_idx').on(table.userId, table.organizationId),
  }),
);

export const extremeSearchUsage = pgTable(
  'extreme_search_usage',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id'),
    searchCount: integer('search_count').notNull().default(0),
    date: timestamp('date').notNull().defaultNow(),
    resetAt: timestamp('reset_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userOrgIdx: index('extreme_search_usage_user_org_idx').on(table.userId, table.organizationId),
  }),
);

export const messageUsage = pgTable(
  'message_usage',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id'),
    messageCount: integer('message_count').notNull().default(0),
    date: timestamp('date').notNull().defaultNow(),
    resetAt: timestamp('reset_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userOrgIdx: index('message_usage_user_org_idx').on(table.userId, table.organizationId),
  }),
);

export const customInstructions = pgTable(
  'custom_instructions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id'),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userOrgIdx: index('custom_instructions_user_org_idx').on(table.userId, table.organizationId),
  }),
);

export const payment = pgTable('payment', {
  id: text('id').primaryKey(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at'),
  brandId: text('brand_id'),
  businessId: text('business_id'),
  cardIssuingCountry: text('card_issuing_country'),
  cardLastFour: text('card_last_four'),
  cardNetwork: text('card_network'),
  cardType: text('card_type'),
  currency: text('currency').notNull(),
  digitalProductsDelivered: boolean('digital_products_delivered').default(false),
  discountId: text('discount_id'),
  errorCode: text('error_code'),
  errorMessage: text('error_message'),
  paymentLink: text('payment_link'),
  paymentMethod: text('payment_method'),
  paymentMethodType: text('payment_method_type'),
  settlementAmount: integer('settlement_amount'),
  settlementCurrency: text('settlement_currency'),
  settlementTax: integer('settlement_tax'),
  status: text('status'),
  subscriptionId: text('subscription_id'),
  tax: integer('tax'),
  totalAmount: integer('total_amount').notNull(),
  billing: json('billing'),
  customer: json('customer'),
  disputes: json('disputes'),
  metadata: json('metadata'),
  productCart: json('product_cart'),
  refunds: json('refunds'),
  userId: text('user_id').references(() => user.id),
});

export const fileFolder = pgTable(
  'file_folder',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id'),
    name: text('name').notNull(),
    parentId: text('parent_id'),
    color: text('color'),
    icon: text('icon'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userOrgIdx: index('file_folder_user_org_idx').on(table.userId, table.organizationId),
  }),
);

export const fileLibrary = pgTable(
  'file_library',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id'),
    filename: text('filename').notNull(),
    originalName: text('original_name').notNull(),
    contentType: text('content_type').notNull(),
    size: integer('size').notNull(),
    url: text('url').notNull(),
    thumbnailUrl: text('thumbnail_url'),
    folderId: text('folder_id').references(() => fileFolder.id, { onDelete: 'set null' }),
    tags: json('tags').$type<string[]>(),
    description: text('description'),
    metadata: json('metadata'),
    isPublic: boolean('is_public').notNull().default(false),
    publicId: text('public_id').unique(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userOrgIdx: index('file_library_user_org_idx').on(table.userId, table.organizationId),
  }),
);

export const fileUsage = pgTable('file_usage', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  fileId: text('file_id')
    .notNull()
    .references(() => fileLibrary.id, { onDelete: 'cascade' }),
  messageId: text('message_id')
    .notNull()
    .references(() => message.id, { onDelete: 'cascade' }),
  chatId: text('chat_id')
    .notNull()
    .references(() => chat.id, { onDelete: 'cascade' }),
  usedAt: timestamp('used_at').notNull().defaultNow(),
});

export const fileShare = pgTable('file_share', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => generateId()),
  fileId: text('file_id')
    .notNull()
    .references(() => fileLibrary.id, { onDelete: 'cascade' }),
  sharedByUserId: text('shared_by_user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  sharedWithUserId: text('shared_with_user_id').references(() => user.id, { onDelete: 'cascade' }),
  shareToken: text('share_token').unique(),
  permissions: text('permissions').notNull().default('read'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const tasks = pgTable(
  'tasks',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id'),
    title: text('title').notNull(),
    prompt: text('prompt').notNull(),
    frequency: text('frequency').notNull(),
    cronSchedule: text('cron_schedule').notNull(),
    timezone: text('timezone').notNull().default('UTC'),
    nextRunAt: timestamp('next_run_at').notNull(),
    qstashScheduleId: text('qstash_schedule_id'),
    status: text('status').notNull().default('active'),
    lastRunAt: timestamp('last_run_at'),
    lastRunChatId: text('last_run_chat_id'),
    runHistory: json('run_history')
      .$type<
        Array<{
          runAt: string;
          chatId: string;
          status: 'success' | 'error' | 'timeout';
          error?: string;
          duration?: number;
          tokensUsed?: number;
          searchesPerformed?: number;
        }>
      >()
      .default([]),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userOrgIdx: index('tasks_user_org_idx').on(table.userId, table.organizationId),
  }),
);

export const organization = pgTable(
  'organization',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    logo: text('logo'),
    metadata: json('metadata').$type<Record<string, any>>().default({}),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    slugIdx: index('organization_slug_idx').on(table.slug),
  }),
);

export type OrganizationRole = 'owner' | 'admin' | 'member' | 'viewer';

export const organizationMember = pgTable(
  'organization_member',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('member'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userOrgIdx: index('org_member_user_org_idx').on(table.userId, table.organizationId),
    orgIdx: index('org_member_org_idx').on(table.organizationId),
  }),
);

export const organizationInvitation = pgTable(
  'organization_invitation',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: text('role').$type<OrganizationRole>().notNull().default('member'),
    invitedBy: text('invited_by')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    acceptedAt: timestamp('accepted_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    tokenIdx: index('org_invitation_token_idx').on(table.token),
    emailOrgIdx: index('org_invitation_email_org_idx').on(table.email, table.organizationId),
  }),
);

export const userOrganizationSession = pgTable('user_organization_session', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  activeOrganizationId: text('active_organization_id').references(() => organization.id, { onDelete: 'set null' }),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type User = InferSelectModel<typeof user>;
export type Session = InferSelectModel<typeof session>;
export type Account = InferSelectModel<typeof account>;
export type Verification = InferSelectModel<typeof verification>;
export type Chat = InferSelectModel<typeof chat>;
export type Message = InferSelectModel<typeof message>;
export type Stream = InferSelectModel<typeof stream>;
export type Subscription = InferSelectModel<typeof subscription>;
export type Payment = InferSelectModel<typeof payment>;
export type ExtremeSearchUsage = InferSelectModel<typeof extremeSearchUsage>;
export type MessageUsage = InferSelectModel<typeof messageUsage>;
export type CustomInstructions = InferSelectModel<typeof customInstructions>;
export type FileLibrary = InferSelectModel<typeof fileLibrary>;
export type FileFolder = InferSelectModel<typeof fileFolder>;
export type FileUsage = InferSelectModel<typeof fileUsage>;
export type FileShare = InferSelectModel<typeof fileShare>;
export type Tasks = InferSelectModel<typeof tasks>;
export type Organization = InferSelectModel<typeof organization>;
export type OrganizationMember = InferSelectModel<typeof organizationMember>;
export type OrganizationInvitation = InferSelectModel<typeof organizationInvitation>;
export type UserOrganizationSession = InferSelectModel<typeof userOrganizationSession>;
