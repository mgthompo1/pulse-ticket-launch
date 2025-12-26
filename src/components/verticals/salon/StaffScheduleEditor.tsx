/**
 * StaffScheduleEditor - Manage staff working hours and time off
 * Used in salon/spa/fitness verticals
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Clock,
  User,
  CalendarIcon,
  CalendarOff,
  Plus,
  Edit,
  Trash2,
  Save,
  Copy,
} from 'lucide-react';
import {
  useStaffSchedules,
  useUpdateStaffSchedule,
  useStaffTimeOff,
  useCreateTimeOff,
  useDeleteTimeOff,
} from '@/hooks/useSalonServices';
import type { StaffSchedule, StaffTimeOff } from '@/types/verticals';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

interface DaySchedule {
  is_working: boolean;
  start_time: string;
  end_time: string;
  break_start: string | null;
  break_end: string | null;
}

interface StaffScheduleEditorProps {
  attractionId: string;
  staffId: string;
  staffName?: string;
  className?: string;
}

export function StaffScheduleEditor({
  attractionId,
  staffId,
  staffName = 'Staff Member',
  className,
}: StaffScheduleEditorProps) {
  const { toast } = useToast();
  const { data: schedules, isLoading: schedulesLoading } = useStaffSchedules(attractionId, staffId);
  const { data: timeOffData, isLoading: timeOffLoading } = useStaffTimeOff({ resourceId: staffId });
  const updateSchedule = useUpdateStaffSchedule();
  const createTimeOff = useCreateTimeOff();
  const deleteTimeOff = useDeleteTimeOff();

  const [weekSchedule, setWeekSchedule] = useState<Record<number, DaySchedule>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isTimeOffDialogOpen, setIsTimeOffDialogOpen] = useState(false);
  const [timeOffForm, setTimeOffForm] = useState({
    start_date: new Date(),
    end_date: new Date(),
    reason: '',
  });

  // Initialize schedule from data
  useEffect(() => {
    if (schedules) {
      const initialSchedule: Record<number, DaySchedule> = {};
      DAYS_OF_WEEK.forEach((day) => {
        const existing = schedules.find((s) => s.day_of_week === day.value);
        initialSchedule[day.value] = existing
          ? {
              is_working: existing.is_working,
              start_time: existing.start_time || '09:00',
              end_time: existing.end_time || '17:00',
              break_start: existing.break_start,
              break_end: existing.break_end,
            }
          : {
              is_working: day.value !== 0 && day.value !== 6, // Default M-F
              start_time: '09:00',
              end_time: '17:00',
              break_start: null,
              break_end: null,
            };
      });
      setWeekSchedule(initialSchedule);
      setHasChanges(false);
    }
  }, [schedules]);

  const handleDayChange = (dayOfWeek: number, field: keyof DaySchedule, value: any) => {
    setWeekSchedule((prev) => ({
      ...prev,
      [dayOfWeek]: {
        ...prev[dayOfWeek],
        [field]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleCopyToAll = (sourceDayOfWeek: number) => {
    const source = weekSchedule[sourceDayOfWeek];
    setWeekSchedule((prev) => {
      const updated = { ...prev };
      DAYS_OF_WEEK.forEach((day) => {
        if (day.value !== sourceDayOfWeek) {
          updated[day.value] = { ...source };
        }
      });
      return updated;
    });
    setHasChanges(true);
  };

  const handleSaveSchedule = async () => {
    try {
      for (const [dayOfWeek, schedule] of Object.entries(weekSchedule)) {
        await updateSchedule.mutateAsync({
          staffId,
          attractionId,
          dayOfWeek: parseInt(dayOfWeek),
          ...schedule,
        });
      }
      setHasChanges(false);
      toast({
        title: 'Schedule saved',
        description: 'Working hours updated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error saving schedule',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleAddTimeOff = async () => {
    try {
      await createTimeOff.mutateAsync({
        staff_id: staffId,
        start_date: format(timeOffForm.start_date, 'yyyy-MM-dd'),
        end_date: format(timeOffForm.end_date, 'yyyy-MM-dd'),
        reason: timeOffForm.reason || null,
      });
      setIsTimeOffDialogOpen(false);
      setTimeOffForm({ start_date: new Date(), end_date: new Date(), reason: '' });
      toast({
        title: 'Time off added',
        description: 'Time off has been scheduled.',
      });
    } catch (error) {
      toast({
        title: 'Error adding time off',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTimeOff = async (timeOffId: string) => {
    if (confirm('Are you sure you want to delete this time off?')) {
      await deleteTimeOff.mutateAsync(timeOffId);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Schedule for {staffName}
            </CardTitle>
            <CardDescription>
              Set working hours, breaks, and time off
            </CardDescription>
          </div>
          <Button onClick={handleSaveSchedule} disabled={!hasChanges || updateSchedule.isPending}>
            <Save className="w-4 h-4 mr-2" />
            Save Schedule
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="hours">
          <TabsList>
            <TabsTrigger value="hours">Working Hours</TabsTrigger>
            <TabsTrigger value="timeoff">
              Time Off
              {timeOffData && timeOffData.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {timeOffData.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hours" className="space-y-4 mt-4">
            {DAYS_OF_WEEK.map((day) => {
              const schedule = weekSchedule[day.value];
              if (!schedule) return null;

              return (
                <div
                  key={day.value}
                  className={cn(
                    'p-4 rounded-lg border transition-colors',
                    schedule.is_working ? 'bg-background' : 'bg-muted/50'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={schedule.is_working}
                        onCheckedChange={(checked) => handleDayChange(day.value, 'is_working', checked)}
                      />
                      <span className={cn('font-medium w-24', !schedule.is_working && 'text-muted-foreground')}>
                        {day.label}
                      </span>
                    </div>

                    {schedule.is_working ? (
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={schedule.start_time}
                            onChange={(e) => handleDayChange(day.value, 'start_time', e.target.value)}
                            className="w-28"
                          />
                          <span className="text-muted-foreground">to</span>
                          <Input
                            type="time"
                            value={schedule.end_time}
                            onChange={(e) => handleDayChange(day.value, 'end_time', e.target.value)}
                            className="w-28"
                          />
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyToAll(day.value)}
                          title="Copy to all days"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Badge variant="secondary">Day Off</Badge>
                    )}
                  </div>

                  {schedule.is_working && (
                    <div className="mt-3 pl-12">
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`break-${day.value}`}
                          checked={!!schedule.break_start}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              handleDayChange(day.value, 'break_start', '12:00');
                              handleDayChange(day.value, 'break_end', '13:00');
                            } else {
                              handleDayChange(day.value, 'break_start', null);
                              handleDayChange(day.value, 'break_end', null);
                            }
                          }}
                        />
                        <Label htmlFor={`break-${day.value}`} className="text-sm">Break</Label>

                        {schedule.break_start && (
                          <div className="flex items-center gap-2 ml-4">
                            <Input
                              type="time"
                              value={schedule.break_start}
                              onChange={(e) => handleDayChange(day.value, 'break_start', e.target.value)}
                              className="w-24 h-8"
                            />
                            <span className="text-muted-foreground text-sm">to</span>
                            <Input
                              type="time"
                              value={schedule.break_end || ''}
                              onChange={(e) => handleDayChange(day.value, 'break_end', e.target.value)}
                              className="w-24 h-8"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="timeoff" className="mt-4">
            <div className="space-y-4">
              <Dialog open={isTimeOffDialogOpen} onOpenChange={setIsTimeOffDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Time Off
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Schedule Time Off</DialogTitle>
                    <DialogDescription>
                      Add vacation days, sick leave, or other time off
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {format(timeOffForm.start_date, 'MMM d, yyyy')}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={timeOffForm.start_date}
                              onSelect={(date) => {
                                if (date) {
                                  setTimeOffForm((prev) => ({
                                    ...prev,
                                    start_date: date,
                                    end_date: date > prev.end_date ? date : prev.end_date,
                                  }));
                                }
                              }}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label>End Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {format(timeOffForm.end_date, 'MMM d, yyyy')}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={timeOffForm.end_date}
                              onSelect={(date) => {
                                if (date) {
                                  setTimeOffForm((prev) => ({ ...prev, end_date: date }));
                                }
                              }}
                              disabled={(date) => date < timeOffForm.start_date}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Reason (optional)</Label>
                      <Input
                        value={timeOffForm.reason}
                        onChange={(e) => setTimeOffForm((prev) => ({ ...prev, reason: e.target.value }))}
                        placeholder="Vacation, sick leave, etc."
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsTimeOffDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddTimeOff} disabled={createTimeOff.isPending}>
                      Add Time Off
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {timeOffLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading time off...</div>
              ) : timeOffData && timeOffData.length > 0 ? (
                <div className="space-y-2">
                  {timeOffData.map((timeOff) => (
                    <div
                      key={timeOff.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <CalendarOff className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {format(new Date(timeOff.start_date), 'MMM d, yyyy')}
                            {timeOff.start_date !== timeOff.end_date && (
                              <> - {format(new Date(timeOff.end_date), 'MMM d, yyyy')}</>
                            )}
                          </div>
                          {timeOff.reason && (
                            <div className="text-sm text-muted-foreground">{timeOff.reason}</div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTimeOff(timeOff.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarOff className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No time off scheduled</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default StaffScheduleEditor;
