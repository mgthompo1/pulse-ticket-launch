import React, { useState } from 'react';
import { Plus, Calendar, Ticket } from 'lucide-react';

interface QuickActionsProps {
  onCreateEvent: () => void;
  isEventsMode: boolean;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ onCreateEvent, isEventsMode }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="fixed bottom-6 left-6 z-50">
      {/* Quick action options */}
      {isOpen && (
        <div className="absolute bottom-20 left-0 flex flex-col gap-2 animate-in slide-in-from-bottom-2 fade-in-0 duration-200">
          <button
            onClick={() => {
              onCreateEvent();
              setIsOpen(false);
            }}
            className="group flex items-center gap-3 bg-white hover:bg-slate-50 px-4 py-3 rounded-xl shadow-md border border-slate-200 transition-all hover:shadow-lg"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center group-hover:bg-slate-800 transition-colors">
              {isEventsMode ? <Calendar className="h-4 w-4 text-white" /> : <Ticket className="h-4 w-4 text-white" />}
            </div>
            <span className="font-manrope font-semibold text-sm text-slate-900 whitespace-nowrap">
              {isEventsMode ? 'New Event' : 'New Attraction'}
            </span>
          </button>
        </div>
      )}

      {/* Main FAB button */}
      <button
        onClick={toggleMenu}
        className={`w-14 h-14 rounded-full shadow-md border border-slate-200 flex items-center justify-center transition-all duration-300 hover:shadow-lg ${
          isOpen
            ? 'bg-slate-900 hover:bg-slate-800 rotate-45'
            : 'bg-white hover:bg-slate-50'
        }`}
      >
        <Plus className={`h-6 w-6 transition-colors ${isOpen ? 'text-white' : 'text-slate-900'}`} />
      </button>
    </div>
  );
};
