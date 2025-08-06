'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  CreditCard,
  TrendingUp,
  Package,
  Calendar,
  AlertCircle,
  ChevronRight,
  Plus,
  Settings,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { PRICING } from '@/lib/constants';
import {
  getOrganizationSubscriptionDetails,
  checkOrganizationSeatAvailability,
  type SubscriptionDetailsResult,
} from '@/lib/subscription';
import { getOrganizationUsageStats } from '@/lib/db/queries';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';

interface OrganizationBillingProps {
  organizationId: string;
  organizationName: string;
  isOwner: boolean;
}

interface UsageStats {
  totalMessages: number;
  totalExtremeSearches: number;
  memberCount: number;
  dailyMessages: { date: Date; messageCount: number }[];
}

interface SeatAvailability {
  hasAvailableSeats: boolean;
  usedSeats: number;
  totalSeats: number;
}

export function OrganizationBilling({ organizationId, organizationName, isOwner }: OrganizationBillingProps) {
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetailsResult | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [seatAvailability, setSeatAvailability] = useState<SeatAvailability | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBillingData();
  }, [organizationId]);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      const [subscription, seats, stats] = await Promise.all([
        getOrganizationSubscriptionDetails(organizationId),
        checkOrganizationSeatAvailability(organizationId),
        getOrganizationUsageStats(organizationId),
      ]);

      setSubscriptionDetails(subscription);
      setSeatAvailability(seats);
      setUsageStats(stats);
    } catch (error) {
      console.error('Error fetching billing data:', error);
      toast.error('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      await authClient.customer.portal();
    } catch (error) {
      console.error('Failed to open customer portal:', error);
      toast.error('Failed to open subscription management');
    }
  };

  const handleUpgrade = async () => {
    try {
      const productId = getRecommendedProductId();
      await authClient.checkout({
        products: [productId],
        metadata: {
          organizationId,
          seats: getRecommendedSeats(),
        },
      });
    } catch (error) {
      console.error('Checkout failed:', error);
      toast.error('Something went wrong. Please try again.');
    }
  };

  const getRecommendedProductId = () => {
    if (!seatAvailability) return 'team_tier';

    if (seatAvailability.usedSeats >= PRICING.MIN_ENTERPRISE_SEATS) {
      return 'enterprise_tier';
    } else if (seatAvailability.usedSeats >= PRICING.MIN_TEAM_SEATS) {
      return 'team_tier';
    }
    return 'team_tier';
  };

  const getRecommendedSeats = () => {
    if (!seatAvailability) return PRICING.MIN_TEAM_SEATS;

    const buffer = 2;
    const recommendedSeats = seatAvailability.usedSeats + buffer;

    if (recommendedSeats >= PRICING.MIN_ENTERPRISE_SEATS) {
      return Math.max(recommendedSeats, PRICING.MIN_ENTERPRISE_SEATS);
    } else {
      return Math.max(recommendedSeats, PRICING.MIN_TEAM_SEATS);
    }
  };

  const calculateMonthlyCost = () => {
    if (!subscriptionDetails?.subscription) return 0;

    const seats = subscriptionDetails.subscription.seats || 1;
    const pricePerSeat = subscriptionDetails.subscription.pricePerSeat || 0;

    return seats * pricePerSeat;
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount / 100);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-lg"></div>
        <div className="h-48 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-lg"></div>
        <div className="h-64 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-lg"></div>
      </div>
    );
  }

  const hasActiveSubscription =
    subscriptionDetails?.hasSubscription && subscriptionDetails?.subscription?.status === 'active';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Organization Billing</CardTitle>
              <CardDescription>{organizationName}</CardDescription>
            </div>
            {hasActiveSubscription && (
              <Badge variant="default" className="h-8 px-3">
                <Package className="w-4 h-4 mr-1" />
                {subscriptionDetails?.subscription?.productId?.includes('enterprise') ? 'Enterprise' : 'Team'} Plan
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {hasActiveSubscription ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Monthly Cost</p>
                  <p className="text-3xl font-bold">
                    {formatCurrency(calculateMonthlyCost(), subscriptionDetails?.subscription?.currency)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {subscriptionDetails?.subscription?.seats} seats ×{' '}
                    {formatCurrency(
                      subscriptionDetails?.subscription?.pricePerSeat || 0,
                      subscriptionDetails?.subscription?.currency,
                    )}
                    /seat
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Billing Period</p>
                  <p className="text-lg font-medium">
                    {subscriptionDetails?.subscription?.recurringInterval === 'month' ? 'Monthly' : 'Annual'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Next billing:{' '}
                    {new Date(subscriptionDetails?.subscription?.currentPeriodEnd || '').toLocaleDateString()}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <p className="text-lg font-medium">Active</p>
                  </div>
                  {subscriptionDetails?.subscription?.cancelAtPeriodEnd && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">Cancels at period end</p>
                  )}
                </div>
              </div>

              {isOwner && (
                <div className="flex gap-3">
                  <Button onClick={handleManageSubscription} variant="outline">
                    <Settings className="w-4 h-4 mr-2" />
                    Manage Subscription
                  </Button>
                  {seatAvailability && !seatAvailability.hasAvailableSeats && (
                    <Button onClick={handleUpgrade}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add More Seats
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Subscription</h3>
              <p className="text-muted-foreground mb-6">
                Upgrade to a team plan to unlock collaboration features and unlimited usage for your organization.
              </p>
              {isOwner && (
                <Button onClick={handleUpgrade} size="lg">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Upgrade to Team Plan
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {seatAvailability && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Seat Usage
            </CardTitle>
            <CardDescription>Monitor your organization&apos;s seat allocation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>
                  {seatAvailability.usedSeats} of {seatAvailability.totalSeats || '∞'} seats used
                </span>
                <span className="text-muted-foreground">
                  {seatAvailability.totalSeats > 0
                    ? `${Math.round((seatAvailability.usedSeats / seatAvailability.totalSeats) * 100)}%`
                    : 'N/A'}
                </span>
              </div>
              {seatAvailability.totalSeats > 0 && (
                <Progress value={(seatAvailability.usedSeats / seatAvailability.totalSeats) * 100} className="h-2" />
              )}
            </div>

            {!seatAvailability.hasAvailableSeats && seatAvailability.totalSeats > 0 && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Seat limit reached</p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                    You&apos;ve used all available seats. Add more seats to invite additional team members.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {usageStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Usage Statistics
            </CardTitle>
            <CardDescription>Organization-wide usage over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total Messages</p>
                <p className="text-2xl font-bold">{usageStats.totalMessages.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Across {usageStats.memberCount} members</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Extreme Searches</p>
                <p className="text-2xl font-bold">{usageStats.totalExtremeSearches.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Deep research queries</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Average Daily Messages</p>
                <p className="text-2xl font-bold">{Math.round(usageStats.totalMessages / 30).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Per organization</p>
              </div>
            </div>

            {usageStats.dailyMessages.length > 0 && (
              <div className="mt-6 h-32 flex items-end gap-1">
                {usageStats.dailyMessages.map((day, index) => {
                  const maxCount = Math.max(...usageStats.dailyMessages.map((d) => d.messageCount));
                  const height = (day.messageCount / maxCount) * 100;

                  return (
                    <div
                      key={index}
                      className="flex-1 bg-primary/20 hover:bg-primary/30 transition-colors rounded-t"
                      style={{ height: `${height}%` }}
                      title={`${new Date(day.date).toLocaleDateString()}: ${day.messageCount} messages`}
                    />
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!hasActiveSubscription && isOwner && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle>Recommended Plan</CardTitle>
            <CardDescription>Based on your organization size and usage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-primary/5 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold">
                      {seatAvailability && seatAvailability.usedSeats >= PRICING.MIN_ENTERPRISE_SEATS
                        ? 'Enterprise Plan'
                        : 'Team Plan'}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">{getRecommendedSeats()} seats recommended</p>
                  </div>
                  <Badge variant="secondary">Best Value</Badge>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <ChevronRight className="w-4 h-4 text-primary" />
                    <span>Unlimited searches for all members</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <ChevronRight className="w-4 h-4 text-primary" />
                    <span>Priority support</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <ChevronRight className="w-4 h-4 text-primary" />
                    <span>Advanced analytics and reporting</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <ChevronRight className="w-4 h-4 text-primary" />
                    <span>Centralized billing</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <p className="text-2xl font-bold">
                      $
                      {seatAvailability && seatAvailability.usedSeats >= PRICING.MIN_ENTERPRISE_SEATS
                        ? PRICING.ENTERPRISE_PER_SEAT_MONTHLY * getRecommendedSeats()
                        : PRICING.TEAM_PER_SEAT_MONTHLY * getRecommendedSeats()}
                      <span className="text-sm font-normal text-muted-foreground">/month</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      $
                      {seatAvailability && seatAvailability.usedSeats >= PRICING.MIN_ENTERPRISE_SEATS
                        ? PRICING.ENTERPRISE_PER_SEAT_MONTHLY
                        : PRICING.TEAM_PER_SEAT_MONTHLY}{' '}
                      per seat
                    </p>
                  </div>
                  <Button onClick={handleUpgrade}>
                    Get Started
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
