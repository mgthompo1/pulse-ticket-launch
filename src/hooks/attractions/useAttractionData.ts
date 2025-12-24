import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AttractionData,
  AttractionResource,
  PaymentProvider,
  extractTheme
} from '@/types/attraction';
import { Theme } from '@/types/theme';

interface UseAttractionDataReturn {
  attractionData: AttractionData | null;
  resources: AttractionResource[];
  theme: Theme;
  paymentProvider: PaymentProvider;
  loading: boolean;
  error: Error | null;
  reload: () => Promise<void>;
  getResourceLabel: () => string;
  getResourceName: (resourceId: string | null) => string;
}

export function useAttractionData(attractionId: string): UseAttractionDataReturn {
  const { toast } = useToast();
  const [attractionData, setAttractionData] = useState<AttractionData | null>(null);
  const [resources, setResources] = useState<AttractionResource[]>([]);
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>('stripe');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadAttractionData = useCallback(async () => {
    if (!attractionId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('attractions')
        .select(`
          *,
          organizations (
            id,
            payment_provider,
            currency,
            name,
            logo_url
          )
        `)
        .eq('id', attractionId)
        .single();

      if (fetchError) throw fetchError;

      setAttractionData(data as AttractionData);

      // Set payment provider from organization
      if (data.organizations?.payment_provider) {
        setPaymentProvider(data.organizations.payment_provider as PaymentProvider);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load attraction');
      setError(error);
      toast({
        title: 'Error',
        description: 'Failed to load attraction details',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [attractionId, toast]);

  const loadResources = useCallback(async () => {
    if (!attractionId) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('attraction_resources')
        .select('*')
        .eq('attraction_id', attractionId)
        .eq('is_active', true)
        .order('name');

      if (fetchError) throw fetchError;

      setResources(data || []);
    } catch (err) {
      console.error('Error loading resources:', err);
    }
  }, [attractionId]);

  const reload = useCallback(async () => {
    await Promise.all([loadAttractionData(), loadResources()]);
  }, [loadAttractionData, loadResources]);

  useEffect(() => {
    if (attractionId) {
      reload();
    }
  }, [attractionId, reload]);

  // Extract theme from widget customization
  const theme = extractTheme(
    attractionData?.widget_customization as any || null
  );

  // Get user-configured resource label with fallback
  const getResourceLabel = useCallback(() => {
    return attractionData?.resource_label || 'Resource';
  }, [attractionData?.resource_label]);

  // Get resource name by ID
  const getResourceName = useCallback((resourceId: string | null) => {
    const label = getResourceLabel();
    if (!resourceId) return `Any ${label}`;
    const resource = resources.find(r => r.id === resourceId);
    return resource?.name || `Unknown ${label}`;
  }, [resources, getResourceLabel]);

  return {
    attractionData,
    resources,
    theme,
    paymentProvider,
    loading,
    error,
    reload,
    getResourceLabel,
    getResourceName
  };
}
