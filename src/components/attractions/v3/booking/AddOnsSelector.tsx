/**
 * AddOnsSelector - Visual add-on selection with quantity controls
 * Category tabs, images, and real-time price updates
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Minus,
  ShoppingBag,
  Check,
  AlertCircle,
  Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AttractionAddon,
  formatPrice,
  isAddonAvailable,
} from '@/types/attraction-v3';
import { staggerContainer, staggerItem, buttonTap, scaleIn } from '@/lib/animations';

interface AddOnsSelectorProps {
  addons: AttractionAddon[];
  selectedAddons: Map<string, number>;
  partySize: number;
  selectedDate: string;
  resourceId?: string | null;
  currency?: string;
  onAddonsChange: (addons: Map<string, number>) => void;
  className?: string;
}

export const AddOnsSelector: React.FC<AddOnsSelectorProps> = ({
  addons,
  selectedAddons,
  partySize,
  selectedDate,
  resourceId,
  currency = 'USD',
  onAddonsChange,
  className,
}) => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Filter active addons and check availability
  const availableAddons = useMemo(() => {
    if (!addons || !Array.isArray(addons)) return [];
    return addons
      .filter((addon) => addon.is_active)
      .filter((addon) => isAddonAvailable(addon, partySize, selectedDate, resourceId))
      .sort((a, b) => {
        // Required first, then by display_order
        if (a.is_required !== b.is_required) return a.is_required ? -1 : 1;
        return a.display_order - b.display_order;
      });
  }, [addons, partySize, selectedDate, resourceId]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    availableAddons.forEach((addon) => {
      if (addon.category) cats.add(addon.category);
    });
    return Array.from(cats);
  }, [availableAddons]);

  // Filter by category
  const displayedAddons = useMemo(() => {
    if (!activeCategory) return availableAddons;
    return availableAddons.filter((addon) => addon.category === activeCategory);
  }, [availableAddons, activeCategory]);

  // Calculate addon price
  const calculateAddonPrice = (addon: AttractionAddon, quantity: number): number => {
    switch (addon.pricing_type) {
      case 'per_person':
        return addon.price * quantity * partySize;
      case 'percentage':
        // Percentage-based pricing handled in summary
        return addon.price * quantity;
      case 'flat':
      default:
        return addon.price * quantity;
    }
  };

  // Update addon quantity
  const updateQuantity = (addonId: string, delta: number) => {
    const addon = addons.find((a) => a.id === addonId);
    if (!addon) return;

    const currentQty = selectedAddons.get(addonId) || 0;
    const newQty = Math.max(addon.min_quantity || 0, currentQty + delta);
    const maxQty = addon.max_quantity ?? 99;
    const finalQty = Math.min(maxQty, newQty);

    const newAddons = new Map(selectedAddons);
    if (finalQty === 0 && !addon.is_required) {
      newAddons.delete(addonId);
    } else {
      newAddons.set(addonId, finalQty);
    }

    onAddonsChange(newAddons);
  };

  // No addons available
  if (availableAddons.length === 0) {
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
      <motion.div variants={staggerItem} className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Enhance your experience</h3>
        </div>
        {selectedAddons.size > 0 && (
          <span className="text-sm text-primary font-medium">
            {selectedAddons.size} selected
          </span>
        )}
      </motion.div>

      {/* Category Tabs */}
      {categories.length > 1 && (
        <motion.div variants={staggerItem} className="flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveCategory(null)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              activeCategory === null
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors capitalize',
                activeCategory === category
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {category}
            </button>
          ))}
        </motion.div>
      )}

      {/* Add-ons List */}
      <motion.div variants={staggerContainer} className="space-y-3">
        <AnimatePresence mode="popLayout">
          {displayedAddons.map((addon) => {
            const quantity = selectedAddons.get(addon.id) || 0;
            const isSelected = quantity > 0;
            const price = calculateAddonPrice(addon, Math.max(1, quantity));

            return (
              <motion.div
                key={addon.id}
                variants={staggerItem}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  'addon-card',
                  isSelected && 'addon-card-selected',
                  addon.is_required && 'addon-card-required'
                )}
              >
                {/* Required Badge */}
                {addon.is_required && (
                  <div className="absolute -top-2 left-4 px-2 py-0.5 bg-orange-500 text-white text-xs font-medium rounded-full">
                    Required
                  </div>
                )}

                {/* Image */}
                {addon.image_url ? (
                  <img
                    src={addon.image_url}
                    alt={addon.name}
                    className="addon-image"
                  />
                ) : (
                  <div className="addon-image bg-muted flex items-center justify-center">
                    <Tag className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-medium text-foreground">{addon.name}</h4>
                      {addon.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {addon.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Price & Quantity */}
                  <div className="flex items-center justify-between mt-3">
                    <div>
                      <span className="font-semibold text-foreground">
                        {formatPrice(addon.price, currency)}
                      </span>
                      {addon.pricing_type === 'per_person' && (
                        <span className="text-sm text-muted-foreground"> /person</span>
                      )}
                      {isSelected && quantity > 1 && (
                        <span className="text-sm text-primary ml-2">
                          = {formatPrice(price, currency)}
                        </span>
                      )}
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2">
                      {isSelected ? (
                        <>
                          <motion.button
                            whileTap={buttonTap}
                            onClick={() => updateQuantity(addon.id, -1)}
                            disabled={addon.is_required && quantity <= 1}
                            className={cn(
                              'addon-quantity-btn',
                              addon.is_required && quantity <= 1 && 'addon-quantity-btn-disabled'
                            )}
                          >
                            <Minus className="w-4 h-4" />
                          </motion.button>

                          <span className="w-8 text-center font-medium">{quantity}</span>

                          <motion.button
                            whileTap={buttonTap}
                            onClick={() => updateQuantity(addon.id, 1)}
                            disabled={addon.max_quantity ? quantity >= addon.max_quantity : false}
                            className={cn(
                              'addon-quantity-btn',
                              addon.max_quantity && quantity >= addon.max_quantity && 'addon-quantity-btn-disabled'
                            )}
                          >
                            <Plus className="w-4 h-4" />
                          </motion.button>
                        </>
                      ) : (
                        <motion.button
                          whileTap={buttonTap}
                          onClick={() => updateQuantity(addon.id, 1)}
                          className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          Add
                        </motion.button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* Selected Summary */}
      {selectedAddons.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-primary/5 border border-primary/20 rounded-xl"
        >
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              <Check className="w-4 h-4 inline mr-1 text-green-500" />
              {selectedAddons.size} add-on{selectedAddons.size !== 1 ? 's' : ''} selected
            </span>
            <span className="font-medium text-primary">
              +{formatPrice(
                Array.from(selectedAddons.entries()).reduce((total, [id, qty]) => {
                  const addon = addons.find((a) => a.id === id);
                  return total + (addon ? calculateAddonPrice(addon, qty) : 0);
                }, 0),
                currency
              )}
            </span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

// Compact single-row version
export const AddOnsStrip: React.FC<{
  addons: AttractionAddon[];
  selectedAddons: Map<string, number>;
  currency?: string;
  onAddonsChange: (addons: Map<string, number>) => void;
  className?: string;
}> = ({ addons, selectedAddons, currency = 'USD', onAddonsChange, className }) => {
  const activeAddons = (addons || []).filter((a) => a.is_active);

  const toggleAddon = (addonId: string) => {
    const newAddons = new Map(selectedAddons);
    if (newAddons.has(addonId)) {
      newAddons.delete(addonId);
    } else {
      newAddons.set(addonId, 1);
    }
    onAddonsChange(newAddons);
  };

  return (
    <div className={cn('overflow-x-auto scrollbar-hide', className)}>
      <div className="flex gap-3 pb-2 scroll-snap-x">
        {activeAddons.map((addon) => {
          const isSelected = selectedAddons.has(addon.id);

          return (
            <motion.button
              key={addon.id}
              whileTap={buttonTap}
              onClick={() => toggleAddon(addon.id)}
              className={cn(
                'flex-shrink-0 scroll-snap-item',
                'flex items-center gap-3 p-3 rounded-xl border-2 min-w-[180px]',
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-muted-foreground/30'
              )}
            >
              {addon.image_url ? (
                <img
                  src={addon.image_url}
                  alt={addon.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <Tag className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <div className="text-left flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground block truncate">
                  {addon.name}
                </span>
                <span className="text-sm text-muted-foreground">
                  +{formatPrice(addon.price, currency)}
                </span>
              </div>
              {isSelected && (
                <Check className="w-5 h-5 text-primary flex-shrink-0" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default AddOnsSelector;
