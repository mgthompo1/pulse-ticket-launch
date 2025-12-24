/**
 * AddOnsSection - Add-ons and packages CRUD management
 * Visual cards with pricing, images, and drag-drop reordering
 */

import React, { useState } from 'react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import {
  Package,
  Plus,
  Trash2,
  GripVertical,
  Camera,
  DollarSign,
  Tag,
  Star,
  X,
  Check,
  Edit2,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AttractionAddon, AttractionPackage, formatPrice } from '@/types/attraction-v3';

interface AddOnsSectionProps {
  addons: AttractionAddon[];
  packages: AttractionPackage[];
  currency?: string;
  onAddonsChange: (addons: AttractionAddon[]) => void;
  onPackagesChange: (packages: AttractionPackage[]) => void;
  onImageUpload?: (id: string, file: File) => Promise<string>;
  className?: string;
}

export const AddOnsSection: React.FC<AddOnsSectionProps> = ({
  addons,
  packages,
  currency = 'USD',
  onAddonsChange,
  onPackagesChange,
  onImageUpload,
  className,
}) => {
  const [activeTab, setActiveTab] = useState<'addons' | 'packages'>('addons');
  const [editingAddonId, setEditingAddonId] = useState<string | null>(null);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);

  // Add-on CRUD
  const addAddon = () => {
    const newAddon: AttractionAddon = {
      id: crypto.randomUUID(),
      attraction_id: '',
      name: '',
      description: '',
      price: 0,
      pricing_type: 'flat',
      is_required: false,
      is_active: true,
      display_order: addons.length,
    };
    onAddonsChange([...addons, newAddon]);
    setEditingAddonId(newAddon.id);
  };

  const updateAddon = (id: string, updates: Partial<AttractionAddon>) => {
    onAddonsChange(addons.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  };

  const removeAddon = (id: string) => {
    onAddonsChange(addons.filter((a) => a.id !== id));
  };

  const handleAddonsReorder = (newOrder: AttractionAddon[]) => {
    onAddonsChange(newOrder.map((a, idx) => ({ ...a, display_order: idx })));
  };

  // Package CRUD
  const addPackage = () => {
    const newPackage: AttractionPackage = {
      id: crypto.randomUUID(),
      attraction_id: '',
      name: '',
      description: '',
      price: 0,
      included_addon_ids: [],
      is_featured: false,
      is_active: true,
      display_order: packages.length,
    };
    onPackagesChange([...packages, newPackage]);
    setEditingPackageId(newPackage.id);
  };

  const updatePackage = (id: string, updates: Partial<AttractionPackage>) => {
    onPackagesChange(packages.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const removePackage = (id: string) => {
    onPackagesChange(packages.filter((p) => p.id !== id));
  };

  const handlePackagesReorder = (newOrder: AttractionPackage[]) => {
    onPackagesChange(newOrder.map((p, idx) => ({ ...p, display_order: idx })));
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-gray-500" />
            Add-ons & Packages
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Create upsells and bundle deals for your customers
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('addons')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'addons'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          Add-ons ({addons.length})
        </button>
        <button
          onClick={() => setActiveTab('packages')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'packages'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          Packages ({packages.length})
        </button>
      </div>

      {/* Add-ons Tab */}
      <AnimatePresence mode="wait">
        {activeTab === 'addons' && (
          <motion.div
            key="addons"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Add Button */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={addAddon}
              className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add New Add-on
            </motion.button>

            {/* Add-ons List */}
            {addons.length > 0 && (
              <Reorder.Group
                axis="y"
                values={addons}
                onReorder={handleAddonsReorder}
                className="space-y-3"
              >
                {addons.map((addon) => (
                  <AddonCard
                    key={addon.id}
                    addon={addon}
                    currency={currency}
                    isEditing={editingAddonId === addon.id}
                    onEdit={() => setEditingAddonId(addon.id)}
                    onSave={() => setEditingAddonId(null)}
                    onUpdate={(updates) => updateAddon(addon.id, updates)}
                    onRemove={() => removeAddon(addon.id)}
                    onImageUpload={onImageUpload}
                  />
                ))}
              </Reorder.Group>
            )}
          </motion.div>
        )}

        {/* Packages Tab */}
        {activeTab === 'packages' && (
          <motion.div
            key="packages"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Add Button */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={addPackage}
              className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create New Package
            </motion.button>

            {/* Packages List */}
            {packages.length > 0 && (
              <Reorder.Group
                axis="y"
                values={packages}
                onReorder={handlePackagesReorder}
                className="space-y-3"
              >
                {packages.map((pkg) => (
                  <PackageCard
                    key={pkg.id}
                    pkg={pkg}
                    addons={addons}
                    currency={currency}
                    isEditing={editingPackageId === pkg.id}
                    onEdit={() => setEditingPackageId(pkg.id)}
                    onSave={() => setEditingPackageId(null)}
                    onUpdate={(updates) => updatePackage(pkg.id, updates)}
                    onRemove={() => removePackage(pkg.id)}
                    onImageUpload={onImageUpload}
                  />
                ))}
              </Reorder.Group>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Add-on Card
const AddonCard: React.FC<{
  addon: AttractionAddon;
  currency: string;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onUpdate: (updates: Partial<AttractionAddon>) => void;
  onRemove: () => void;
  onImageUpload?: (id: string, file: File) => Promise<string>;
}> = ({
  addon,
  currency,
  isEditing,
  onEdit,
  onSave,
  onUpdate,
  onRemove,
  onImageUpload,
}) => {
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImageUpload) return;
    try {
      const url = await onImageUpload(addon.id, file);
      onUpdate({ image_url: url });
    } catch (error) {
      console.error('Failed to upload image:', error);
    }
  };

  return (
    <Reorder.Item
      value={addon}
      className={cn(
        'bg-white border rounded-xl overflow-hidden',
        !addon.is_active && 'opacity-60'
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Drag Handle */}
          <div className="pt-2 cursor-grab active:cursor-grabbing">
            <GripVertical className="w-5 h-5 text-gray-400" />
          </div>

          {/* Image */}
          <div className="relative group w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
            {addon.image_url ? (
              <img
                src={addon.image_url}
                alt={addon.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Tag className="w-6 h-6 text-gray-400" />
              </div>
            )}
            {isEditing && onImageUpload && (
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-5 h-5 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="sr-only"
                />
              </label>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={addon.name}
                  onChange={(e) => onUpdate({ name: e.target.value })}
                  placeholder="Add-on name"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  autoFocus
                />
                <textarea
                  value={addon.description || ''}
                  onChange={(e) => onUpdate({ description: e.target.value })}
                  placeholder="Description (optional)"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                />
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={addon.price}
                      onChange={(e) => onUpdate({ price: parseFloat(e.target.value) || 0 })}
                      className="w-32 pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                  <select
                    value={addon.pricing_type}
                    onChange={(e) => onUpdate({ pricing_type: e.target.value as 'flat' | 'per_person' })}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="flat">Flat rate</option>
                    <option value="per_person">Per person</option>
                  </select>
                </div>
                <div className="flex items-center gap-4 pt-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={addon.is_required}
                      onChange={(e) => onUpdate({ is_required: e.target.checked })}
                      className="rounded"
                    />
                    Required add-on
                  </label>
                  <button
                    onClick={onSave}
                    className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-sm rounded-lg ml-auto"
                  >
                    <Check className="w-4 h-4" />
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-900">{addon.name || 'Unnamed'}</h4>
                  {addon.is_required && (
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                      Required
                    </span>
                  )}
                </div>
                {addon.description && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-1">{addon.description}</p>
                )}
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  {formatPrice(addon.price, currency)}
                  {addon.pricing_type === 'per_person' && (
                    <span className="text-gray-500 font-normal"> /person</span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          {!isEditing && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onUpdate({ is_active: !addon.is_active })}
                className={cn(
                  'w-10 h-6 rounded-full transition-colors relative',
                  addon.is_active ? 'bg-green-500' : 'bg-gray-300'
                )}
              >
                <span
                  className={cn(
                    'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow',
                    addon.is_active ? 'left-5' : 'left-1'
                  )}
                />
              </button>
              <button onClick={onEdit} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={onRemove} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </Reorder.Item>
  );
};

// Package Card
const PackageCard: React.FC<{
  pkg: AttractionPackage;
  addons: AttractionAddon[];
  currency: string;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onUpdate: (updates: Partial<AttractionPackage>) => void;
  onRemove: () => void;
  onImageUpload?: (id: string, file: File) => Promise<string>;
}> = ({
  pkg,
  addons,
  currency,
  isEditing,
  onEdit,
  onSave,
  onUpdate,
  onRemove,
  onImageUpload,
}) => {
  const includedAddons = (pkg.included_addon_ids || [])
    .map((id) => addons.find((a) => a.id === id))
    .filter(Boolean) as AttractionAddon[];

  const toggleIncludedAddon = (addonId: string) => {
    const current = pkg.included_addon_ids || [];
    const updated = current.includes(addonId)
      ? current.filter((id) => id !== addonId)
      : [...current, addonId];
    onUpdate({ included_addon_ids: updated });
  };

  return (
    <Reorder.Item
      value={pkg}
      className={cn(
        'bg-white border rounded-xl overflow-hidden',
        !pkg.is_active && 'opacity-60',
        pkg.is_featured && 'ring-2 ring-yellow-400'
      )}
    >
      {pkg.is_featured && (
        <div className="bg-yellow-400 text-yellow-900 text-xs font-medium py-1 px-3 flex items-center gap-1">
          <Star className="w-3 h-3 fill-current" />
          Featured Package
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start gap-4">
          <div className="pt-2 cursor-grab active:cursor-grabbing">
            <GripVertical className="w-5 h-5 text-gray-400" />
          </div>

          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={pkg.name}
                  onChange={(e) => onUpdate({ name: e.target.value })}
                  placeholder="Package name"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  autoFocus
                />
                <textarea
                  value={pkg.description || ''}
                  onChange={(e) => onUpdate({ description: e.target.value })}
                  placeholder="Description"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                />
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={pkg.price}
                      onChange={(e) => onUpdate({ price: parseFloat(e.target.value) || 0 })}
                      placeholder="Package price"
                      className="w-32 pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={pkg.original_price || ''}
                      onChange={(e) => onUpdate({ original_price: parseFloat(e.target.value) || undefined })}
                      placeholder="Original price"
                      className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                </div>

                {/* Included Add-ons */}
                {addons.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">
                      Included Add-ons
                    </label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {addons.map((addon) => {
                        const isIncluded = pkg.included_addon_ids?.includes(addon.id);
                        return (
                          <button
                            key={addon.id}
                            onClick={() => toggleIncludedAddon(addon.id)}
                            className={cn(
                              'px-3 py-1.5 text-sm rounded-lg border transition-colors',
                              isIncluded
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-gray-200 text-gray-600 hover:border-gray-300'
                            )}
                          >
                            {isIncluded && <Check className="w-3 h-3 inline mr-1" />}
                            {addon.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4 pt-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={pkg.is_featured}
                      onChange={(e) => onUpdate({ is_featured: e.target.checked })}
                      className="rounded"
                    />
                    Featured package
                  </label>
                  <button
                    onClick={onSave}
                    className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-sm rounded-lg ml-auto"
                  >
                    <Check className="w-4 h-4" />
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h4 className="font-medium text-gray-900">{pkg.name || 'Unnamed'}</h4>
                {pkg.description && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-1">{pkg.description}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className="font-semibold text-gray-900">{formatPrice(pkg.price, currency)}</span>
                  {pkg.original_price && (
                    <span className="text-sm text-gray-400 line-through">
                      {formatPrice(pkg.original_price, currency)}
                    </span>
                  )}
                </div>
                {includedAddons.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {includedAddons.slice(0, 3).map((a) => (
                      <span key={a.id} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {a.name}
                      </span>
                    ))}
                    {includedAddons.length > 3 && (
                      <span className="text-xs text-gray-400">+{includedAddons.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {!isEditing && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onUpdate({ is_active: !pkg.is_active })}
                className={cn(
                  'w-10 h-6 rounded-full transition-colors relative',
                  pkg.is_active ? 'bg-green-500' : 'bg-gray-300'
                )}
              >
                <span
                  className={cn(
                    'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow',
                    pkg.is_active ? 'left-5' : 'left-1'
                  )}
                />
              </button>
              <button onClick={onEdit} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={onRemove} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </Reorder.Item>
  );
};

export default AddOnsSection;
