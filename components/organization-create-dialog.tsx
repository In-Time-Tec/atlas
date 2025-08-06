'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCreateOrganization } from '@/hooks/use-organization';
import { Loader2, Building2 } from 'lucide-react';
import { toast } from 'sonner';

const organizationSchema = z.object({
  name: z
    .string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(50, 'Organization name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s\-&.,]+$/, 'Organization name contains invalid characters'),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(30, 'Slug must be less than 30 characters')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers, and hyphens only')
    .transform((val) => val.toLowerCase()),
});

type OrganizationFormValues = z.infer<typeof organizationSchema>;

interface OrganizationCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrganizationCreateDialog({ open, onOpenChange }: OrganizationCreateDialogProps) {
  const [isCreating, setIsCreating] = useState(false);
  const createOrganization = useCreateOrganization();

  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: '',
      slug: '',
    },
    mode: 'onChange',
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 30);
  };

  const handleNameChange = (value: string) => {
    form.setValue('name', value);
    if (!form.getValues('slug') || form.getValues('slug') === generateSlug(form.watch('name'))) {
      const newSlug = generateSlug(value);
      form.setValue('slug', newSlug, { shouldValidate: true });
    }
  };

  const onSubmit = async (values: OrganizationFormValues) => {
    try {
      setIsCreating(true);
      await createOrganization.mutateAsync({
        name: values.name,
        slug: values.slug,
      });
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      if (error?.message?.includes('slug already exists')) {
        form.setError('slug', {
          type: 'manual',
          message: 'This slug is already taken. Please choose another.',
        });
      } else {
        toast.error('Failed to create organization. Please try again.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      form.reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Create Organization
          </DialogTitle>
          <DialogDescription>
            Create a new organization to collaborate with your team. You&apos;ll be the owner of this organization.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Acme Corporation"
                      disabled={isCreating}
                      onChange={(e) => handleNameChange(e.target.value)}
                      autoComplete="off"
                    />
                  </FormControl>
                  <FormDescription>The display name for your organization</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Slug</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="acme-corp" disabled={isCreating} autoComplete="off" />
                  </FormControl>
                  <FormDescription>
                    A unique identifier for your organization. Use lowercase letters, numbers, and hyphens only.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isCreating}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || !form.formState.isValid}>
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Organization'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
