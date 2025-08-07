'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { Crown02Icon, AlarmClockIcon, Clock01Icon } from '@hugeicons/core-free-icons';
import { Lightning } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Navbar } from './navbar';

interface ProUpgradeScreenProps {
  user: any;
  isProUser: boolean;
  isProStatusLoading: boolean;
}

// Deprecated: Tasks are no longer gated behind Pro. This component is unused but kept to avoid import errors during refactors.
export function ProUpgradeScreen() {
  return null;
}
