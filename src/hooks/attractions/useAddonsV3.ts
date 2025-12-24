/**
 * useAddonsV3 - Add-ons and packages state management
 * Fetches add-ons/packages and manages selection state
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  AttractionAddon,
  AttractionPackage,
  isAddonAvailable,
} from '@/types/attraction-v3';

interface UseAddonsV3Props {
  attractionId: string;
  partySize?: number;
  selectedDate?: string;
  resourceId?: string | null;
  enabled?: boolean;
}

interface UseAddonsV3Return {
  // Data
  addons: AttractionAddon[];
  packages: AttractionPackage[];

  // Available items (filtered by context)
  availableAddons: AttractionAddon[];
  availablePackages: AttractionPackage[];

  // Selection state
  selectedAddons: Map<string, number>;
  selectedPackageId: string | null;

  // Loading/Error
  isLoading: boolean;
  error: Error | null;

  // Actions
  selectAddon: (addonId: string, quantity: number) => void;
  removeAddon: (addonId: string) => void;
  incrementAddon: (addonId: string) => void;
  decrementAddon: (addonId: string) => void;
  clearAddons: () => void;
  selectPackage: (packageId: string | null) => void;

  // Calculations
  getAddonTotal: () => number;
  getPackagePrice: () => number | null;
  getPackageSavings: (basePrice: number) => number;

  // Utilities
  getAddonById: (id: string) => AttractionAddon | undefined;
  getPackageById: (id: string) => AttractionPackage | undefined;
  getPackageAddons: (packageId: string) => AttractionAddon[];
}

export function useAddonsV3({
  attractionId,
  partySize = 1,
  selectedDate = '',
  resourceId = null,
  enabled = true,
}: UseAddonsV3Props): UseAddonsV3Return {
  const [selectedAddons, setSelectedAddons] = useState<Map<string, number>>(new Map());
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);

  // Fetch add-ons
  const {
    data: addonsData,
    isLoading: isLoadingAddons,
    error: addonsError,
  } = useQuery({
    queryKey: ['attraction-addons-v3', attractionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attraction_addons')
        .select('*')
        .eq('attraction_id', attractionId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return (data || []) as AttractionAddon[];
    },
    enabled: enabled && !!attractionId,
  });

  // Fetch packages
  const {
    data: packagesData,
    isLoading: isLoadingPackages,
    error: packagesError,
  } = useQuery({
    queryKey: ['attraction-packages-v3', attractionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attraction_packages')
        .select('*')
        .eq('attraction_id', attractionId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return (data || []) as AttractionPackage[];
    },
    enabled: enabled && !!attractionId,
  });

  // Memoize addons and packages to prevent dependency issues
  const addons = useMemo(() => addonsData || [], [addonsData]);
  const packages = useMemo(() => packagesData || [], [packagesData]);

  // Filter available addons based on context
  const availableAddons = useMemo(() => {
    return addons.filter((addon) =>
      isAddonAvailable(addon, partySize, selectedDate, resourceId)
    );
  }, [addons, partySize, selectedDate, resourceId]);

  // Filter available packages based on party size
  const availablePackages = useMemo(() => {
    return packages.filter((pkg) => {
      if (pkg.party_size_min && partySize < pkg.party_size_min) return false;
      if (pkg.party_size_max && partySize > pkg.party_size_max) return false;
      return true;
    });
  }, [packages, partySize]);

  // Actions
  const selectAddon = useCallback((addonId: string, quantity: number) => {
    setSelectedAddons((prev) => {
      const newMap = new Map(prev);
      if (quantity <= 0) {
        newMap.delete(addonId);
      } else {
        const addon = addons.find((a) => a.id === addonId);
        const maxQty = addon?.max_quantity ?? 99;
        newMap.set(addonId, Math.min(quantity, maxQty));
      }
      return newMap;
    });
  }, [addons]);

  const removeAddon = useCallback((addonId: string) => {
    setSelectedAddons((prev) => {
      const newMap = new Map(prev);
      newMap.delete(addonId);
      return newMap;
    });
  }, []);

  const incrementAddon = useCallback((addonId: string) => {
    const currentQty = selectedAddons.get(addonId) || 0;
    selectAddon(addonId, currentQty + 1);
  }, [selectedAddons, selectAddon]);

  const decrementAddon = useCallback((addonId: string) => {
    const currentQty = selectedAddons.get(addonId) || 0;
    if (currentQty > 1) {
      selectAddon(addonId, currentQty - 1);
    } else {
      removeAddon(addonId);
    }
  }, [selectedAddons, selectAddon, removeAddon]);

  const clearAddons = useCallback(() => {
    setSelectedAddons(new Map());
  }, []);

  const selectPackage = useCallback((packageId: string | null) => {
    setSelectedPackageId(packageId);
    // Optionally clear individual addons when selecting a package
    if (packageId) {
      setSelectedAddons(new Map());
    }
  }, []);

  // Calculations
  const getAddonTotal = useCallback(() => {
    let total = 0;
    selectedAddons.forEach((quantity, addonId) => {
      const addon = addons.find((a) => a.id === addonId);
      if (addon) {
        if (addon.pricing_type === 'per_person') {
          total += addon.price * quantity * partySize;
        } else {
          total += addon.price * quantity;
        }
      }
    });
    return total;
  }, [selectedAddons, addons, partySize]);

  const getPackagePrice = useCallback(() => {
    if (!selectedPackageId) return null;
    const pkg = packages.find((p) => p.id === selectedPackageId);
    return pkg?.price ?? null;
  }, [selectedPackageId, packages]);

  const getPackageSavings = useCallback((basePrice: number) => {
    if (!selectedPackageId) return 0;
    const pkg = packages.find((p) => p.id === selectedPackageId);
    if (!pkg) return 0;

    if (pkg.original_price) {
      return pkg.original_price - pkg.price;
    }

    // Calculate savings based on included addons
    const includedAddons = (pkg.included_addon_ids || [])
      .map((id) => addons.find((a) => a.id === id))
      .filter(Boolean) as AttractionAddon[];

    const addonsTotal = includedAddons.reduce((sum, addon) => sum + addon.price, 0);
    const individualTotal = (basePrice * partySize) + addonsTotal;

    return Math.max(0, individualTotal - pkg.price);
  }, [selectedPackageId, packages, addons, partySize]);

  // Utilities
  const getAddonById = useCallback((id: string) => {
    return addons.find((a) => a.id === id);
  }, [addons]);

  const getPackageById = useCallback((id: string) => {
    return packages.find((p) => p.id === id);
  }, [packages]);

  const getPackageAddons = useCallback((packageId: string) => {
    const pkg = packages.find((p) => p.id === packageId);
    if (!pkg) return [];
    return (pkg.included_addon_ids || [])
      .map((id) => addons.find((a) => a.id === id))
      .filter(Boolean) as AttractionAddon[];
  }, [packages, addons]);

  return {
    addons,
    packages,
    availableAddons,
    availablePackages,
    selectedAddons,
    selectedPackageId,
    isLoading: isLoadingAddons || isLoadingPackages,
    error: (addonsError || packagesError) as Error | null,
    selectAddon,
    removeAddon,
    incrementAddon,
    decrementAddon,
    clearAddons,
    selectPackage,
    getAddonTotal,
    getPackagePrice,
    getPackageSavings,
    getAddonById,
    getPackageById,
    getPackageAddons,
  };
}

export default useAddonsV3;
