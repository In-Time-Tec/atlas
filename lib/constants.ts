export const SEARCH_LIMITS = {
  DAILY_SEARCH_LIMIT: Number(process.env.NEXT_PUBLIC_DAILY_SEARCH_LIMIT ?? process.env.DAILY_SEARCH_LIMIT ?? 100),
  EXTREME_SEARCH_LIMIT: Number(
    process.env.NEXT_PUBLIC_EXTREME_SEARCH_LIMIT ?? process.env.EXTREME_SEARCH_LIMIT ?? 5,
  ),
} as const;

export const PRICING = {
  PRO_MONTHLY: Number(process.env.NEXT_PUBLIC_PRO_MONTHLY_USD ?? process.env.PRO_MONTHLY_USD ?? 15),
  PRO_MONTHLY_INR: Number(process.env.NEXT_PUBLIC_PRO_MONTHLY_INR ?? process.env.PRO_MONTHLY_INR ?? 1299),
  TEAM_PER_SEAT_MONTHLY: Number(process.env.NEXT_PUBLIC_TEAM_PER_SEAT_USD ?? process.env.TEAM_PER_SEAT_USD ?? 12),
  TEAM_PER_SEAT_MONTHLY_INR: Number(
    process.env.NEXT_PUBLIC_TEAM_PER_SEAT_INR ?? process.env.TEAM_PER_SEAT_INR ?? 999,
  ),
  ENTERPRISE_PER_SEAT_MONTHLY: Number(
    process.env.NEXT_PUBLIC_ENTERPRISE_PER_SEAT_USD ?? process.env.ENTERPRISE_PER_SEAT_USD ?? 10,
  ),
  ENTERPRISE_PER_SEAT_MONTHLY_INR: Number(
    process.env.NEXT_PUBLIC_ENTERPRISE_PER_SEAT_INR ?? process.env.ENTERPRISE_PER_SEAT_INR ?? 799,
  ),
  MIN_TEAM_SEATS: Number(process.env.NEXT_PUBLIC_MIN_TEAM_SEATS ?? process.env.MIN_TEAM_SEATS ?? 3),
  MIN_ENTERPRISE_SEATS: Number(
    process.env.NEXT_PUBLIC_MIN_ENTERPRISE_SEATS ?? process.env.MIN_ENTERPRISE_SEATS ?? 10,
  ),
} as const;

export const CURRENCIES = {
  USD: 'USD',
  INR: 'INR',
} as const;

export const SNAPSHOT_NAME = process.env.SNAPSHOT_NAME || 'atlas-analysis:1752127473';
