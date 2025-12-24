/**
 * PackageSelector - Package/Bundle selection with savings display
 * Shows package deals with included add-ons and discount information
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Check,
  Star,
  Tag,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AttractionPackage, AttractionAddon, formatPrice } from '@/types/attraction-v3';
import { staggerContainer, staggerItem, cardHover, buttonTap } from '@/lib/animations';

interface PackageSelectorProps {
  packages: AttractionPackage[];
  addons: AttractionAddon[];
  selectedPackageId: string | null;
  basePrice: number;
  partySize: number;
  currency?: string;
  onPackageSelect: (packageId: string | null) => void;
  className?: string;
}

export const PackageSelector: React.FC<PackageSelectorProps> = ({
  packages,
  addons,
  selectedPackageId,
  basePrice,
  partySize,
  currency = 'USD',
  onPackageSelect,
  className,
}) => {
  const activePackages = (packages || [])
    .filter((p) => p.is_active)
    .sort((a, b) => {
      // Featured first, then by display_order
      if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
      return a.display_order - b.display_order;
    });

  // Get included addon names
  const getIncludedAddons = (pkg: AttractionPackage): AttractionAddon[] => {
    return (pkg.included_addon_ids || [])
      .map((id) => (addons || []).find((a) => a.id === id))
      .filter(Boolean) as AttractionAddon[];
  };

  // Calculate savings
  const calculateSavings = (pkg: AttractionPackage): number => {
    if (pkg.original_price) {
      return pkg.original_price - pkg.price;
    }

    // Calculate what items would cost individually
    const includedAddons = getIncludedAddons(pkg);
    const addonsTotal = includedAddons.reduce((sum, addon) => sum + addon.price, 0);
    const individualTotal = (basePrice * partySize) + addonsTotal;

    return Math.max(0, individualTotal - pkg.price);
  };

  if (activePackages.length === 0) {
    return null;
  }

  // Check if party size is valid for packages
  const validPackages = activePackages.filter((pkg) => {
    if (pkg.party_size_min && partySize < pkg.party_size_min) return false;
    if (pkg.party_size_max && partySize > pkg.party_size_max) return false;
    return true;
  });

  if (validPackages.length === 0) {
    return null;
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={cn('space-y-4', className)}
    >
      {/* Header */}
      <motion.div variants={staggerItem} className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-gray-900">Special Packages</h3>
        <span className="text-sm text-gray-500">Save more when you bundle</span>
      </motion.div>

      {/* Packages List */}
      <motion.div variants={staggerContainer} className="space-y-4">
        {/* Standard Option */}
        <motion.button
          variants={staggerItem}
          whileHover={cardHover}
          whileTap={buttonTap}
          onClick={() => onPackageSelect(null)}
          className={cn(
            'w-full text-left p-4 rounded-xl border-2 transition-all',
            selectedPackageId === null
              ? 'border-primary bg-primary/5'
              : 'border-gray-200 bg-white hover:border-gray-300'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Tag className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Standard Booking</h4>
                <p className="text-sm text-gray-500">Base experience only</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-gray-900">
                {formatPrice(basePrice * partySize, currency)}
              </span>
              {selectedPackageId === null && (
                <Check className="w-5 h-5 text-primary" />
              )}
            </div>
          </div>
        </motion.button>

        {/* Package Options */}
        <AnimatePresence>
          {validPackages.map((pkg) => {
            const isSelected = selectedPackageId === pkg.id;
            const includedAddons = getIncludedAddons(pkg);
            const savings = calculateSavings(pkg);

            return (
              <motion.button
                key={pkg.id}
                variants={staggerItem}
                whileHover={cardHover}
                whileTap={buttonTap}
                onClick={() => onPackageSelect(pkg.id)}
                className={cn(
                  'w-full text-left rounded-xl border-2 transition-all overflow-hidden',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 bg-white hover:border-gray-300',
                  pkg.is_featured && 'ring-2 ring-yellow-400 ring-offset-2'
                )}
              >
                {/* Featured Badge */}
                {pkg.is_featured && (
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-medium py-1 px-4 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-white" />
                    Most Popular
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Image */}
                    {pkg.image_url ? (
                      <img
                        src={pkg.image_url}
                        alt={pkg.name}
                        className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-primary/20 to-primary/30 flex items-center justify-center flex-shrink-0">
                        <Package className="w-8 h-8 text-primary" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-gray-900">{pkg.name}</h4>
                          {pkg.description && (
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                              {pkg.description}
                            </p>
                          )}
                        </div>

                        {isSelected && (
                          <Check className="w-5 h-5 text-primary flex-shrink-0" />
                        )}
                      </div>

                      {/* Included Add-ons */}
                      {includedAddons.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                            Includes:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {includedAddons.slice(0, 3).map((addon) => (
                              <span
                                key={addon.id}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700"
                              >
                                <Check className="w-3 h-3 mr-1 text-green-500" />
                                {addon.name}
                              </span>
                            ))}
                            {includedAddons.length > 3 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                                +{includedAddons.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Price */}
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-lg font-bold text-gray-900">
                          {formatPrice(pkg.price, currency)}
                        </span>

                        {pkg.original_price && (
                          <span className="text-sm text-gray-400 line-through">
                            {formatPrice(pkg.original_price, currency)}
                          </span>
                        )}

                        {savings > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            Save {formatPrice(savings, currency)}
                          </span>
                        )}

                        {pkg.discount_label && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            {pkg.discount_label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

// Compact horizontal cards
export const PackageCards: React.FC<{
  packages: AttractionPackage[];
  selectedPackageId: string | null;
  currency?: string;
  onPackageSelect: (packageId: string | null) => void;
  className?: string;
}> = ({ packages, selectedPackageId, currency = 'USD', onPackageSelect, className }) => {
  const activePackages = (packages || []).filter((p) => p.is_active);

  return (
    <div className={cn('overflow-x-auto scrollbar-hide', className)}>
      <div className="flex gap-4 pb-2 scroll-snap-x">
        {activePackages.map((pkg) => {
          const isSelected = selectedPackageId === pkg.id;

          return (
            <motion.button
              key={pkg.id}
              whileTap={buttonTap}
              onClick={() => onPackageSelect(pkg.id)}
              className={cn(
                'flex-shrink-0 scroll-snap-item',
                'w-64 p-4 rounded-xl border-2 text-left',
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 bg-white hover:border-gray-300',
                pkg.is_featured && 'ring-2 ring-yellow-400'
              )}
            >
              {pkg.is_featured && (
                <div className="flex items-center gap-1 text-xs text-yellow-600 font-medium mb-2">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  Best Value
                </div>
              )}

              <h4 className="font-semibold text-gray-900 mb-1">{pkg.name}</h4>

              {pkg.description && (
                <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                  {pkg.description}
                </p>
              )}

              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-gray-900">
                  {formatPrice(pkg.price, currency)}
                </span>
                {pkg.original_price && (
                  <span className="text-sm text-gray-400 line-through">
                    {formatPrice(pkg.original_price, currency)}
                  </span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default PackageSelector;
