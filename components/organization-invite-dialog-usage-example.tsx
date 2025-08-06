'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { OrganizationInviteDialog } from '@/components/organization-invite-dialog';
import { UserPlusIcon } from 'lucide-react';

export function OrganizationInviteDialogExample() {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setInviteDialogOpen(true)} variant="outline" size="sm">
        <UserPlusIcon className="w-4 h-4 mr-2" />
        Invite Members
      </Button>

      <OrganizationInviteDialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen} />
    </>
  );
}
