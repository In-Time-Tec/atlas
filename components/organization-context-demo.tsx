'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OrganizationContextIndicator, OrganizationContextDisplay } from '@/components/organization-context-indicator';
import { ResourceOrganizationBadge } from '@/components/resource-organization-badge';
import { useCurrentOrganization } from '@/hooks/use-organization';

export function OrganizationContextDemo() {
  const { organization } = useCurrentOrganization();
  const organizationName = organization?.name;
  const organizationId = organization?.id;
  const isPersonalContext = !organization;

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Organization Context Components</h2>
        <p className="text-sm text-muted-foreground">
          Components to display the current organization context throughout the application.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Context Indicator</CardTitle>
            <CardDescription>Shows current organization context</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <OrganizationContextIndicator
              organizationName={organizationName}
              organizationId={organizationId}
              size="sm"
            />
            <OrganizationContextIndicator
              organizationName={organizationName}
              organizationId={organizationId}
              size="md"
            />
            <OrganizationContextIndicator
              organizationName={organizationName}
              organizationId={organizationId}
              size="lg"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Context Display</CardTitle>
            <CardDescription>Full context display with label</CardDescription>
          </CardHeader>
          <CardContent>
            <OrganizationContextDisplay organizationName={organizationName} organizationId={organizationId} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Resource Badge</CardTitle>
            <CardDescription>For individual resources</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <ResourceOrganizationBadge organizationId={organizationId} organizationName={organizationName} size="xs" />
            <ResourceOrganizationBadge organizationId={organizationId} organizationName={organizationName} size="sm" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Current Context Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Is Personal Context:</span> {isPersonalContext ? 'Yes' : 'No'}
            </div>
            <div>
              <span className="font-medium">Organization ID:</span> {organizationId || 'None'}
            </div>
            <div>
              <span className="font-medium">Organization Name:</span> {organizationName || 'Personal'}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Example Resource Items</CardTitle>
          <CardDescription>How resources would look with organization context</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">📄</div>
                <div>
                  <div className="font-medium text-sm">example-document.pdf</div>
                  <div className="text-xs text-muted-foreground">PDF • 2.3 MB</div>
                </div>
              </div>
              <ResourceOrganizationBadge
                organizationId={organizationId}
                organizationName={organizationName}
                size="xs"
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">📊</div>
                <div>
                  <div className="font-medium text-sm">quarterly-report.xlsx</div>
                  <div className="text-xs text-muted-foreground">Excel • 1.8 MB</div>
                </div>
              </div>
              <ResourceOrganizationBadge organizationId="org-123" organizationName="Acme Corp" size="xs" />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">🖼️</div>
                <div>
                  <div className="font-medium text-sm">team-photo.jpg</div>
                  <div className="text-xs text-muted-foreground">Image • 5.2 MB</div>
                </div>
              </div>
              <ResourceOrganizationBadge organizationId={null} organizationName={null} size="xs" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
