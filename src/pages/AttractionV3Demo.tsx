/**
 * AttractionV3Demo - Test page for the V3 booking widget
 * Displays the new premium booking experience with mock data
 */

import React from 'react';
import { AttractionBookingWidgetV3 } from '@/components/attractions/v3';
import { AttractionRequirement, CustomFormField } from '@/types/attraction-v3';

// Mock attraction data
const mockAttraction = {
  id: 'demo-attraction-001',
  name: 'Sunset Kayak Adventure',
  description: 'Experience the breathtaking beauty of the coastline as the sun sets over the water. Our expert guides will lead you through calm waters, past sea caves, and alongside marine wildlife. Perfect for beginners and experienced kayakers alike.',
  base_price: 89,
  currency: 'NZD',
  duration_minutes: 120,
  location: 'Auckland, New Zealand',
  image_url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&h=800&fit=crop',
  gallery_images: [
    'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1472745942893-4b9f730c7668?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1526188717906-ab4a2f949f78?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop',
  ],
  resource_label: 'Guide',
};

// Mock requirements
const mockRequirements: AttractionRequirement[] = [
  {
    id: 'req-1',
    attraction_id: 'demo-attraction-001',
    requirement_type: 'age_minimum',
    title: 'Minimum Age',
    description: 'Participants must be at least 12 years old',
    value: '12',
    unit: 'years',
    is_blocking: true,
    acknowledgement_required: true,
    display_order: 0,
  },
  {
    id: 'req-2',
    attraction_id: 'demo-attraction-001',
    requirement_type: 'health',
    title: 'Swimming Ability',
    description: 'All participants must be able to swim at least 50 meters',
    is_blocking: true,
    acknowledgement_required: true,
    display_order: 1,
  },
  {
    id: 'req-3',
    attraction_id: 'demo-attraction-001',
    requirement_type: 'equipment',
    title: 'What to Bring',
    description: 'Sunscreen, sunglasses with strap, water bottle. We provide all kayaking equipment and life jackets.',
    is_blocking: false,
    acknowledgement_required: false,
    display_order: 2,
  },
];

// Mock custom fields
const mockCustomFields: CustomFormField[] = [
  {
    id: 'field-1',
    attraction_id: 'demo-attraction-001',
    field_type: 'select',
    label: 'Experience Level',
    placeholder: 'Select your experience level',
    options: [
      { value: 'beginner', label: 'Beginner - Never kayaked before' },
      { value: 'intermediate', label: 'Intermediate - Kayaked a few times' },
      { value: 'advanced', label: 'Advanced - Regular kayaker' },
    ],
    is_required: true,
    display_order: 0,
    is_active: true,
  },
  {
    id: 'field-2',
    attraction_id: 'demo-attraction-001',
    field_type: 'textarea',
    label: 'Dietary Requirements',
    placeholder: 'Let us know if you have any dietary requirements for the snacks provided',
    is_required: false,
    display_order: 1,
    is_active: true,
  },
];

const AttractionV3Demo: React.FC = () => {
  const handleBookingComplete = (booking: any) => {
    console.log('Booking completed:', booking);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Demo Banner */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white py-3 px-4 text-center">
        <p className="text-sm font-medium">
          🎨 V3 Booking Widget Preview - This is a demo with mock data
        </p>
      </div>

      {/* Widget */}
      <AttractionBookingWidgetV3
        attractionId={mockAttraction.id}
        attraction={mockAttraction}
        requirements={mockRequirements}
        customFields={mockCustomFields}
        showStaffSelector={true}
        showAddons={true}
        showPackages={true}
        showReviews={true}
        showUrgency={true}
        showSocialProof={true}
        onBookingComplete={handleBookingComplete}
      />
    </div>
  );
};

export default AttractionV3Demo;
