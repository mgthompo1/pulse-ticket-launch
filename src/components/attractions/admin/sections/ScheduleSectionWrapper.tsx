/**
 * ScheduleSectionWrapper - Self-contained schedule management with Supabase
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Calendar, Clock, Save, Plus, Trash2, Sparkles, RefreshCw } from 'lucide-react';

interface Schedule {
  id: string;
  attraction_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration: number;
  slot_capacity: number;
  is_active: boolean;
}

interface Blackout {
  id: string;
  attraction_id: string;
  date: string;
  reason: string | null;
}

interface ScheduleSectionWrapperProps {
  attractionId: string;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const ScheduleSectionWrapper: React.FC<ScheduleSectionWrapperProps> = ({ attractionId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [generateStartDate, setGenerateStartDate] = useState('');
  const [generateEndDate, setGenerateEndDate] = useState('');

  // Fetch schedules
  const { data: schedules = [], isLoading: schedulesLoading } = useQuery({
    queryKey: ['attraction-schedules', attractionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attraction_schedules')
        .select('*')
        .eq('attraction_id', attractionId)
        .order('day_of_week');

      if (error) throw error;
      return data as Schedule[];
    },
  });

  // Fetch blackout dates
  const { data: blackouts = [], isLoading: blackoutsLoading } = useQuery({
    queryKey: ['attraction-blackouts', attractionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attraction_blackouts')
        .select('*')
        .eq('attraction_id', attractionId)
        .order('date');

      if (error) throw error;
      return data as Blackout[];
    },
  });

  // Create schedule mutation
  const createScheduleMutation = useMutation({
    mutationFn: async (dayOfWeek: number) => {
      const { data, error } = await supabase
        .from('attraction_schedules')
        .insert({
          attraction_id: attractionId,
          day_of_week: dayOfWeek,
          start_time: '09:00',
          end_time: '17:00',
          slot_duration: 60,
          slot_capacity: 10,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attraction-schedules', attractionId] });
      toast({ title: 'Schedule added' });
    },
  });

  // Update schedule mutation
  const updateScheduleMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Schedule> }) => {
      const { error } = await supabase
        .from('attraction_schedules')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attraction-schedules', attractionId] });
    },
  });

  // Delete schedule mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('attraction_schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attraction-schedules', attractionId] });
      toast({ title: 'Schedule removed' });
    },
  });

  // Add blackout mutation
  const addBlackoutMutation = useMutation({
    mutationFn: async ({ date, reason }: { date: string; reason?: string }) => {
      const { error } = await supabase
        .from('attraction_blackouts')
        .insert({
          attraction_id: attractionId,
          date,
          reason,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attraction-blackouts', attractionId] });
      toast({ title: 'Blackout date added' });
    },
  });

  // Remove blackout mutation
  const removeBlackoutMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('attraction_blackouts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attraction-blackouts', attractionId] });
      toast({ title: 'Blackout date removed' });
    },
  });

  // Generate slots mutation
  const generateSlotsMutation = useMutation({
    mutationFn: async ({ startDate, endDate }: { startDate: string; endDate: string }) => {
      const { data, error } = await supabase.functions.invoke('generate-attraction-slots', {
        body: {
          attractionId,
          startDate,
          endDate,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Slots generated!',
        description: `Created ${data.slotsCreated} booking slots`,
      });
      setGenerateStartDate('');
      setGenerateEndDate('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to generate slots',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleGenerateSlots = () => {
    if (!generateStartDate || !generateEndDate) {
      toast({ title: 'Please select start and end dates', variant: 'destructive' });
      return;
    }
    generateSlotsMutation.mutate({ startDate: generateStartDate, endDate: generateEndDate });
  };

  const isLoading = schedulesLoading || blackoutsLoading;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  // Group schedules by day
  const schedulesByDay = DAYS.map((day, index) => ({
    day,
    dayIndex: index,
    schedule: schedules.find(s => s.day_of_week === index),
  }));

  return (
    <div className="space-y-6">
      {/* Operating Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Operating Hours
          </CardTitle>
          <CardDescription>
            Set your regular operating hours for each day of the week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {schedulesByDay.map(({ day, dayIndex, schedule }) => (
              <DayScheduleRow
                key={dayIndex}
                day={day}
                schedule={schedule}
                onAdd={() => createScheduleMutation.mutate(dayIndex)}
                onUpdate={(updates) => schedule && updateScheduleMutation.mutate({ id: schedule.id, updates })}
                onDelete={() => schedule && deleteScheduleMutation.mutate(schedule.id)}
                isAdding={createScheduleMutation.isPending}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Blackout Dates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Blackout Dates
          </CardTitle>
          <CardDescription>
            Block specific dates when bookings are not available
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BlackoutManager
            blackouts={blackouts}
            onAdd={(date, reason) => addBlackoutMutation.mutate({ date, reason })}
            onRemove={(id) => removeBlackoutMutation.mutate(id)}
          />
        </CardContent>
      </Card>

      {/* Generate Slots */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Generate Booking Slots
          </CardTitle>
          <CardDescription>
            Create available time slots based on your operating hours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={generateStartDate}
                  onChange={(e) => setGenerateStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-48"
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={generateEndDate}
                  onChange={(e) => setGenerateEndDate(e.target.value)}
                  min={generateStartDate || new Date().toISOString().split('T')[0]}
                  className="w-48"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button
                onClick={handleGenerateSlots}
                disabled={!generateStartDate || !generateEndDate || generateSlotsMutation.isPending || schedules.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {generateSlotsMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Generate Slots
              </Button>
              {schedules.length === 0 && (
                <p className="text-sm text-orange-600">
                  Add operating hours above first
                </p>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              This will create booking slots for the selected date range based on your operating hours.
              Existing slots won't be duplicated. Maximum 90 days at a time.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Day schedule row component
const DayScheduleRow: React.FC<{
  day: string;
  schedule?: Schedule;
  onAdd: () => void;
  onUpdate: (updates: Partial<Schedule>) => void;
  onDelete: () => void;
  isAdding: boolean;
}> = ({ day, schedule, onAdd, onUpdate, onDelete, isAdding }) => {
  const [localSchedule, setLocalSchedule] = useState(schedule);

  useEffect(() => {
    setLocalSchedule(schedule);
  }, [schedule]);

  const handleBlur = () => {
    if (localSchedule && schedule) {
      onUpdate(localSchedule);
    }
  };

  if (!schedule) {
    return (
      <div className="flex items-center justify-between py-3 px-4 border border-border rounded-lg bg-muted/50">
        <span className="font-medium text-muted-foreground">{day}</span>
        <Button variant="outline" size="sm" onClick={onAdd} disabled={isAdding}>
          <Plus className="w-4 h-4 mr-1" />
          Add Hours
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 py-3 px-4 border border-border rounded-lg">
      <div className="w-24">
        <span className="font-medium text-foreground">{day}</span>
      </div>

      <div className="flex items-center gap-2">
        <Input
          type="time"
          value={localSchedule?.start_time || ''}
          onChange={(e) => setLocalSchedule(s => s ? { ...s, start_time: e.target.value } : s)}
          onBlur={handleBlur}
          className="w-32"
        />
        <span className="text-muted-foreground">to</span>
        <Input
          type="time"
          value={localSchedule?.end_time || ''}
          onChange={(e) => setLocalSchedule(s => s ? { ...s, end_time: e.target.value } : s)}
          onBlur={handleBlur}
          className="w-32"
        />
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-sm text-muted-foreground">Slot:</Label>
        <Input
          type="number"
          min={15}
          step={15}
          value={localSchedule?.slot_duration || 60}
          onChange={(e) => setLocalSchedule(s => s ? { ...s, slot_duration: parseInt(e.target.value) || 60 } : s)}
          onBlur={handleBlur}
          className="w-20"
        />
        <span className="text-sm text-muted-foreground">min</span>
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-sm text-muted-foreground">Capacity:</Label>
        <Input
          type="number"
          min={1}
          value={localSchedule?.slot_capacity || 10}
          onChange={(e) => setLocalSchedule(s => s ? { ...s, slot_capacity: parseInt(e.target.value) || 1 } : s)}
          onBlur={handleBlur}
          className="w-20"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <Switch
          checked={localSchedule?.is_active ?? true}
          onCheckedChange={(checked) => {
            setLocalSchedule(s => s ? { ...s, is_active: checked } : s);
            onUpdate({ is_active: checked });
          }}
        />
        <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-600 hover:bg-red-500/10">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

// Blackout manager component
const BlackoutManager: React.FC<{
  blackouts: Blackout[];
  onAdd: (date: string, reason?: string) => void;
  onRemove: (id: string) => void;
}> = ({ blackouts, onAdd, onRemove }) => {
  const [newDate, setNewDate] = useState('');
  const [newReason, setNewReason] = useState('');

  const handleAdd = () => {
    if (newDate) {
      onAdd(newDate, newReason || undefined);
      setNewDate('');
      setNewReason('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Add new blackout */}
      <div className="flex gap-2">
        <Input
          type="date"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          className="w-48"
        />
        <Input
          value={newReason}
          onChange={(e) => setNewReason(e.target.value)}
          placeholder="Reason (optional)"
          className="flex-1"
        />
        <Button onClick={handleAdd} disabled={!newDate}>
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Existing blackouts */}
      {blackouts.length === 0 ? (
        <p className="text-center text-muted-foreground py-4">
          No blackout dates set. Add dates when you're unavailable.
        </p>
      ) : (
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {blackouts.map((blackout) => (
            <div
              key={blackout.id}
              className="flex items-center justify-between p-3 border border-red-500/30 rounded-lg bg-red-500/10"
            >
              <div>
                <div className="font-medium text-foreground">
                  {new Date(blackout.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
                {blackout.reason && (
                  <div className="text-sm text-muted-foreground">{blackout.reason}</div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(blackout.id)}
                className="text-red-600 hover:bg-red-500/20"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScheduleSectionWrapper;
