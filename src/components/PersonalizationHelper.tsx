import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PersonalizationVariables } from '@/types/email-template';

interface PersonalizationHelperProps {
  onInsertVariable: (variable: string) => void;
  className?: string;
}

const PERSONALIZATION_SHORTCUTS: Array<{
  key: keyof PersonalizationVariables;
  label: string;
  description: string;
  example: string;
}> = [
  {
    key: '@FirstName',
    label: 'First Name',
    description: 'Customer\'s first name',
    example: 'John'
  },
  {
    key: '@LastName', 
    label: 'Last Name',
    description: 'Customer\'s last name',
    example: 'Smith'
  },
  {
    key: '@FullName',
    label: 'Full Name',
    description: 'Customer\'s full name',
    example: 'John Smith'
  },
  {
    key: '@EventName',
    label: 'Event Name',
    description: 'Name of the event',
    example: 'Summer Music Festival'
  },
  {
    key: '@EventDate',
    label: 'Event Date',
    description: 'Date of the event',
    example: 'June 15, 2024'
  },
  {
    key: '@EventTime',
    label: 'Event Time',
    description: 'Start time of the event',
    example: '7:00 PM'
  },
  {
    key: '@EventVenue',
    label: 'Event Venue',
    description: 'Location of the event',
    example: 'Central Park Amphitheater'
  },
  {
    key: '@OrderNumber',
    label: 'Order Number',
    description: 'Unique order identifier',
    example: 'ORD-12345'
  },
  {
    key: '@TotalAmount',
    label: 'Total Amount',
    description: 'Total order amount',
    example: '$89.50'
  },
  {
    key: '@TicketCount',
    label: 'Ticket Count',
    description: 'Number of tickets purchased',
    example: '2'
  },
  {
    key: '@OrganizerName',
    label: 'Organizer Name',
    description: 'Event organizer\'s name',
    example: 'Music Events Co.'
  },
  {
    key: '@ContactEmail',
    label: 'Contact Email',
    description: 'Organizer\'s contact email',
    example: 'info@musiceventco.com'
  },
  {
    key: '@EventDescription',
    label: 'Event Description',
    description: 'Brief event description',
    example: 'An evening of live music under the stars'
  },
  {
    key: '@SpecialInstructions',
    label: 'Special Instructions',
    description: 'Event-specific instructions',
    example: 'Please arrive 30 minutes early'
  }
];

export const PersonalizationHelper: React.FC<PersonalizationHelperProps> = ({
  onInsertVariable,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredShortcuts = PERSONALIZATION_SHORTCUTS.filter(
    shortcut =>
      shortcut.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shortcut.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shortcut.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInsertVariable = (variable: string) => {
    onInsertVariable(variable);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={className}
        >
          @ Add Variable
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="start">
        <div className="space-y-4">
          <div>
            <Label htmlFor="search">Search Variables</Label>
            <Input
              id="search"
              placeholder="Search personalization variables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div className="max-h-64 overflow-y-auto space-y-2">
            {filteredShortcuts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No variables found matching "{searchTerm}"
              </p>
            ) : (
              filteredShortcuts.map((shortcut) => (
                <div
                  key={shortcut.key}
                  className="border rounded-lg p-3 hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => handleInsertVariable(shortcut.key)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {shortcut.key}
                    </Badge>
                    <span className="text-sm font-medium">{shortcut.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {shortcut.description}
                  </p>
                  <p className="text-xs text-blue-600 font-medium">
                    Example: {shortcut.example}
                  </p>
                </div>
              ))
            )}
          </div>
          
          <div className="border-t pt-3">
            <p className="text-xs text-muted-foreground">
              Click any variable to insert it at your cursor position. Variables are automatically replaced with actual values when emails are sent.
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default PersonalizationHelper;