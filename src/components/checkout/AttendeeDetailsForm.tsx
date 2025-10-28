import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users } from "lucide-react";

export interface AttendeeInfo {
  attendee_name: string;
  attendee_email: string;
}

interface AttendeeDetailsFormProps {
  ticketCount: number;
  buyerName: string;
  buyerEmail: string;
  attendees: AttendeeInfo[];
  onChange: (attendees: AttendeeInfo[]) => void;
}

export const AttendeeDetailsForm: React.FC<AttendeeDetailsFormProps> = ({
  ticketCount,
  buyerName,
  buyerEmail,
  attendees,
  onChange
}) => {
  // Initialize attendees array when ticket count changes
  useEffect(() => {
    if (ticketCount > 0 && attendees.length !== ticketCount) {
      const newAttendees: AttendeeInfo[] = [];

      for (let i = 0; i < ticketCount; i++) {
        // Pre-fill first attendee with buyer info
        if (i === 0) {
          newAttendees.push({
            attendee_name: buyerName || '',
            attendee_email: buyerEmail || ''
          });
        } else {
          // Check if we have existing data for this attendee
          newAttendees.push(attendees[i] || {
            attendee_name: '',
            attendee_email: ''
          });
        }
      }

      onChange(newAttendees);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketCount, buyerName, buyerEmail]);

  const handleAttendeeChange = (index: number, field: keyof AttendeeInfo, value: string) => {
    const newAttendees = [...attendees];
    newAttendees[index] = {
      ...newAttendees[index],
      [field]: value
    };
    onChange(newAttendees);
  };

  // Don't show if only 1 ticket (buyer info is enough)
  if (ticketCount <= 1) {
    return null;
  }

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          Attendee Information
        </CardTitle>
        <CardDescription>
          Please provide the name and email for each ticket holder. This helps us identify attendees at check-in.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {attendees.map((attendee, index) => (
          <div key={index} className="bg-white p-4 rounded-lg border border-slate-200">
            <h4 className="font-medium text-sm text-slate-700 mb-3">
              Ticket {index + 1} {index === 0 && <span className="text-xs text-slate-500">(Primary Ticket Holder)</span>}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor={`attendee-name-${index}`} className="text-sm">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id={`attendee-name-${index}`}
                  type="text"
                  placeholder="Enter full name"
                  value={attendee.attendee_name}
                  onChange={(e) => handleAttendeeChange(index, 'attendee_name', e.target.value)}
                  required
                  className="bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`attendee-email-${index}`} className="text-sm">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id={`attendee-email-${index}`}
                  type="email"
                  placeholder="Enter email address"
                  value={attendee.attendee_email}
                  onChange={(e) => handleAttendeeChange(index, 'attendee_email', e.target.value)}
                  required
                  className="bg-white"
                />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
