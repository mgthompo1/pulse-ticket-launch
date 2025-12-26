/**
 * TeeTimeSelector - Customer-facing tee time booking component
 * Shows available tee times with player count and pricing
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Flag,
  Users,
  Clock,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Sun,
  Sunset,
  UserPlus,
} from 'lucide-react';
import { format, addDays, isSameDay, startOfDay } from 'date-fns';
import { useGolfTeeTimeSlots, useGolfConfig } from '@/hooks/useGolfConfig';
import { cn } from '@/lib/utils';

interface TeeTime {
  time: string;
  available: boolean;
  availableSpots: number;
  maxSpots: number;
  price: number;
  existingBookingId?: string;
}

interface TeeTimeSelectorProps {
  attractionId: string;
  onSelect: (data: {
    date: Date;
    time: string;
    holes: number;
    players: number;
    joinExistingId?: string;
    price: number;
  }) => void;
  basePrice?: number;
  className?: string;
}

export function TeeTimeSelector({
  attractionId,
  onSelect,
  basePrice = 75,
  className,
}: TeeTimeSelectorProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedHoles, setSelectedHoles] = useState<number>(18);
  const [selectedPlayers, setSelectedPlayers] = useState<number>(1);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  const { data: golfConfig } = useGolfConfig(attractionId);
  const { data: slots, isLoading } = useGolfTeeTimeSlots(attractionId, selectedDate);

  // Generate date options (7 days from today)
  const dateOptions = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));
  }, []);

  // Group tee times by time of day
  const groupedTeeTimes = useMemo(() => {
    if (!slots) return { morning: [], afternoon: [] };

    const morning: TeeTime[] = [];
    const afternoon: TeeTime[] = [];

    slots.forEach((slot) => {
      const hour = parseInt(slot.time.split(':')[0]);
      const teeTime: TeeTime = {
        time: slot.time,
        available: slot.available_spots >= selectedPlayers,
        availableSpots: slot.available_spots,
        maxSpots: golfConfig?.max_players_per_tee || 4,
        price: slot.price || basePrice,
        existingBookingId: slot.existing_booking_id,
      };

      if (hour < 12) {
        morning.push(teeTime);
      } else {
        afternoon.push(teeTime);
      }
    });

    return { morning, afternoon };
  }, [slots, selectedPlayers, golfConfig, basePrice]);

  const handleSelect = (time: string, teeTime: TeeTime) => {
    setSelectedTime(time);
    onSelect({
      date: selectedDate,
      time,
      holes: selectedHoles,
      players: selectedPlayers,
      joinExistingId: teeTime.existingBookingId,
      price: teeTime.price * selectedPlayers,
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const holesOptions = golfConfig?.holes_options || [9, 18];
  const maxPlayers = golfConfig?.max_players_per_tee || 4;
  const allowJoinExisting = golfConfig?.allow_join_existing ?? true;

  const TeeTimeGrid = ({ times }: { times: TeeTime[] }) => (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
      {times.map((teeTime) => {
        const isSelected = selectedTime === teeTime.time;
        const canJoin = allowJoinExisting && teeTime.existingBookingId && teeTime.availableSpots > 0;
        const isAvailable = teeTime.available || canJoin;

        return (
          <button
            key={teeTime.time}
            onClick={() => isAvailable && handleSelect(teeTime.time, teeTime)}
            disabled={!isAvailable}
            className={cn(
              'relative p-3 rounded-lg border-2 transition-all text-left',
              isSelected
                ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                : isAvailable
                ? 'border-border hover:border-primary/50 hover:bg-muted/50'
                : 'border-border bg-muted/30 opacity-50 cursor-not-allowed'
            )}
          >
            <div className="font-semibold text-sm">{formatTime(teeTime.time)}</div>
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <Users className="w-3 h-3" />
              <span>
                {teeTime.availableSpots}/{teeTime.maxSpots}
              </span>
            </div>
            {canJoin && (
              <Badge variant="secondary" className="absolute -top-2 -right-2 text-[10px] px-1.5">
                <UserPlus className="w-3 h-3 mr-1" />
                Join
              </Badge>
            )}
            <div className="text-xs text-primary font-medium mt-1">
              ${teeTime.price}
            </div>
          </button>
        );
      })}
      {times.length === 0 && (
        <div className="col-span-full text-center text-muted-foreground py-8">
          No tee times available
        </div>
      )}
    </div>
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flag className="w-5 h-5" />
          Book a Tee Time
        </CardTitle>
        <CardDescription>
          Select your preferred date, number of holes, and tee time
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Date Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Date</label>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 flex-1 overflow-x-auto pb-2">
              {dateOptions.map((date) => {
                const isSelected = isSameDay(date, selectedDate);
                const isToday = isSameDay(date, new Date());

                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => setSelectedDate(date)}
                    className={cn(
                      'flex flex-col items-center p-2 px-3 rounded-lg border-2 transition-all min-w-[60px]',
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <span className="text-xs text-muted-foreground uppercase">
                      {format(date, 'EEE')}
                    </span>
                    <span className="text-lg font-semibold">{format(date, 'd')}</span>
                    {isToday && (
                      <Badge variant="secondary" className="text-[10px] px-1 mt-0.5">
                        Today
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>

            <Popover open={showCalendar} onOpenChange={setShowCalendar}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0">
                  <CalendarIcon className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date);
                      setShowCalendar(false);
                    }
                  }}
                  disabled={(date) => date < startOfDay(new Date())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Holes & Players Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Holes</label>
            <div className="flex gap-2">
              {holesOptions.map((holes) => (
                <button
                  key={holes}
                  onClick={() => setSelectedHoles(holes)}
                  className={cn(
                    'flex-1 p-2 rounded-lg border-2 font-medium transition-all',
                    selectedHoles === holes
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  {holes} holes
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Players</label>
            <Select
              value={String(selectedPlayers)}
              onValueChange={(val) => setSelectedPlayers(parseInt(val))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: maxPlayers }, (_, i) => i + 1).map((num) => (
                  <SelectItem key={num} value={String(num)}>
                    {num} {num === 1 ? 'player' : 'players'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tee Times */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All Times</TabsTrigger>
            <TabsTrigger value="morning" className="flex items-center gap-1">
              <Sun className="w-4 h-4" />
              Morning
            </TabsTrigger>
            <TabsTrigger value="afternoon" className="flex items-center gap-1">
              <Sunset className="w-4 h-4" />
              Afternoon
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading tee times...</div>
            ) : (
              <>
                {groupedTeeTimes.morning.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Sun className="w-4 h-4" />
                      Morning
                    </h4>
                    <TeeTimeGrid times={groupedTeeTimes.morning} />
                  </div>
                )}
                {groupedTeeTimes.afternoon.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Sunset className="w-4 h-4" />
                      Afternoon
                    </h4>
                    <TeeTimeGrid times={groupedTeeTimes.afternoon} />
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="morning">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading tee times...</div>
            ) : (
              <TeeTimeGrid times={groupedTeeTimes.morning} />
            )}
          </TabsContent>

          <TabsContent value="afternoon">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading tee times...</div>
            ) : (
              <TeeTimeGrid times={groupedTeeTimes.afternoon} />
            )}
          </TabsContent>
        </Tabs>

        {/* Selected Summary */}
        {selectedTime && (
          <div className="p-4 rounded-lg border bg-primary/5 border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">
                  {format(selectedDate, 'EEEE, MMMM d')} at {formatTime(selectedTime)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedHoles} holes • {selectedPlayers} {selectedPlayers === 1 ? 'player' : 'players'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  ${((slots?.find(s => s.time === selectedTime)?.price || basePrice) * selectedPlayers).toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">total</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TeeTimeSelector;
