import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Users } from "lucide-react";
import { CustomQuestion } from '@/types/widget';

export interface AttendeeInfo {
  attendee_name: string;
  attendee_email: string;
  attendee_phone?: string;
  custom_answers?: Record<string, string>;
}

interface AttendeeDetailsFormProps {
  ticketCount: number;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  attendees: AttendeeInfo[];
  onChange: (attendees: AttendeeInfo[]) => void;
  customQuestions?: CustomQuestion[];
  textCustomization?: {
    attendeeInfoTitle?: string;
    attendeeInfoDescription?: string;
    primaryTicketLabel?: string;
    ticketLabelPrefix?: string;
    ticketLabels?: Record<number, string>;
  };
  cartItems?: Array<{ name: string; quantity: number; attendees_per_ticket?: number }>;
}

export const AttendeeDetailsForm: React.FC<AttendeeDetailsFormProps> = ({
  ticketCount,
  buyerName,
  buyerEmail,
  buyerPhone,
  attendees,
  onChange,
  customQuestions = [],
  textCustomization,
  cartItems = []
}) => {
  // Safety check - ensure customQuestions is always an array
  const safeCustomQuestions = Array.isArray(customQuestions) ? customQuestions : [];

  // Get text customization with defaults
  const attendeeInfoTitle = textCustomization?.attendeeInfoTitle || "Attendee Information";
  const attendeeInfoDescription = textCustomization?.attendeeInfoDescription || "Please provide the name and email for each ticket holder. This helps us identify attendees at check-in.";
  const primaryTicketLabel = textCustomization?.primaryTicketLabel || "(Primary Ticket Holder)";
  const ticketLabelPrefix = textCustomization?.ticketLabelPrefix || "Ticket";
  const ticketLabels = textCustomization?.ticketLabels || {};

  // Generate ticket labels from cart items
  const generateTicketLabels = (): string[] => {
    const labels: string[] = [];

    if (cartItems && cartItems.length > 0) {
      // Generate labels based on actual cart items
      cartItems.forEach((item) => {
        const attendeesPerTicket = item.attendees_per_ticket || 1;
        const totalForThisItem = item.quantity * attendeesPerTicket;

        for (let i = 0; i < totalForThisItem; i++) {
          labels.push(item.name);
        }
      });
    } else {
      // Fallback to generic numbering if no cart items
      for (let i = 0; i < ticketCount; i++) {
        labels.push(`${ticketLabelPrefix} ${i + 1}`);
      }
    }

    return labels;
  };

  const generatedTicketLabels = generateTicketLabels();

  // Initialize attendees array when ticket count changes
  useEffect(() => {
    if (ticketCount > 0 && attendees.length !== ticketCount) {
      const newAttendees: AttendeeInfo[] = [];

      for (let i = 0; i < ticketCount; i++) {
        // Pre-fill first attendee with buyer info
        if (i === 0) {
          newAttendees.push({
            attendee_name: buyerName || '',
            attendee_email: buyerEmail || '',
            attendee_phone: buyerPhone || '',
            custom_answers: attendees[i]?.custom_answers || {}
          });
        } else {
          // Check if we have existing data for this attendee
          newAttendees.push(attendees[i] || {
            attendee_name: '',
            attendee_email: '',
            attendee_phone: '',
            custom_answers: {}
          });
        }
      }

      onChange(newAttendees);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketCount, buyerName, buyerEmail, buyerPhone]);

  const handleAttendeeChange = (index: number, field: keyof AttendeeInfo, value: string) => {
    const newAttendees = [...attendees];
    newAttendees[index] = {
      ...newAttendees[index],
      [field]: value
    };
    onChange(newAttendees);
  };

  const handleCustomAnswerChange = (attendeeIndex: number, questionId: string, value: string) => {
    const newAttendees = [...attendees];
    newAttendees[attendeeIndex] = {
      ...newAttendees[attendeeIndex],
      custom_answers: {
        ...(newAttendees[attendeeIndex].custom_answers || {}),
        [questionId]: value
      }
    };
    onChange(newAttendees);
  };

  const handleSameAsPrimaryContact = (checked: boolean) => {
    if (checked && attendees.length > 0) {
      const newAttendees = [...attendees];
      newAttendees[0] = {
        ...newAttendees[0],
        attendee_name: buyerName || '',
        attendee_email: buyerEmail || '',
        attendee_phone: buyerPhone || ''
      };
      onChange(newAttendees);
    }
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
          {attendeeInfoTitle}
        </CardTitle>
        <CardDescription>
          {attendeeInfoDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {attendees.map((attendee, index) => {
          // Use custom label if provided, otherwise use generated label from cart items
          const customLabel = ticketLabels[index];
          const ticketLabel = customLabel || generatedTicketLabels[index] || `${ticketLabelPrefix} ${index + 1}`;
          const isPrimary = index === 0;

          return (
            <div key={index} className="bg-white p-4 rounded-lg border border-slate-200">
            <h4 className="font-medium text-sm text-slate-700 mb-3">
              {ticketLabel}
            </h4>

            {/* "Same as primary contact" checkbox - only on first attendee */}
            {isPrimary && (
              <div className="flex items-center space-x-2 mb-3 pb-3 border-b border-slate-200">
                <Checkbox
                  id={`same-as-primary-${index}`}
                  onCheckedChange={handleSameAsPrimaryContact}
                />
                <Label
                  htmlFor={`same-as-primary-${index}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  Same as primary contact information
                </Label>
              </div>
            )}

            <div className="space-y-3">
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

              <div className="space-y-2">
                <Label htmlFor={`attendee-phone-${index}`} className="text-sm">
                  Phone Number
                </Label>
                <Input
                  id={`attendee-phone-${index}`}
                  type="tel"
                  placeholder="Enter phone number"
                  value={attendee.attendee_phone || ''}
                  onChange={(e) => handleAttendeeChange(index, 'attendee_phone', e.target.value)}
                  className="bg-white"
                />
              </div>

              {/* Custom Questions for this Attendee */}
              {safeCustomQuestions.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <p className="text-sm font-medium text-slate-700">Additional Information</p>
                  {safeCustomQuestions.map((question) => {
                    const questionId = question.id || question.question;
                    const currentValue = attendee.custom_answers?.[questionId] || '';

                    // Generate user-friendly label
                    const questionLabel = question.label && !question.label.startsWith('question_')
                      ? question.label
                      : question.question;

                    // Parse options - handle both JSON array and newline-separated string formats
                    let questionOptions: string[] = [];
                    if (question.options) {
                      if (Array.isArray(question.options)) {
                        questionOptions = question.options;
                      } else if (typeof question.options === 'string' && question.options.trim()) {
                        // First try to parse as JSON
                        try {
                          const parsed = JSON.parse(question.options);
                          if (Array.isArray(parsed)) {
                            questionOptions = parsed;
                          } else {
                            // If not an array, fall back to newline splitting
                            questionOptions = question.options.split('\n').map((opt: string) => opt.trim()).filter((opt: string) => opt.length > 0);
                          }
                        } catch {
                          // If JSON parse fails, split by newlines
                          questionOptions = question.options.split('\n').map((opt: string) => opt.trim()).filter((opt: string) => opt.length > 0);
                        }
                      }
                    }

                    return (
                      <div key={questionId} className="space-y-2">
                        <Label htmlFor={`attendee-${index}-${questionId}`} className="text-sm">
                          {question.label || question.question}
                          {question.required && <span className="text-red-500 ml-1">*</span>}
                        </Label>

                        {/* Text Input */}
                        {question.type === 'text' && (
                          <Input
                            id={`attendee-${index}-${questionId}`}
                            type="text"
                            value={currentValue}
                            onChange={(e) => handleCustomAnswerChange(index, questionId, e.target.value)}
                            required={question.required}
                            placeholder="Type your response..."
                            className="bg-white"
                          />
                        )}

                        {/* Textarea */}
                        {question.type === 'textarea' && (
                          <Textarea
                            id={`attendee-${index}-${questionId}`}
                            value={currentValue}
                            onChange={(e) => handleCustomAnswerChange(index, questionId, e.target.value)}
                            required={question.required}
                            placeholder="Type your response..."
                            rows={3}
                            className="bg-white"
                          />
                        )}

                        {/* Select Dropdown */}
                        {question.type === 'select' && questionOptions.length > 0 && (
                          <Select
                            value={currentValue}
                            onValueChange={(value) => handleCustomAnswerChange(index, questionId, value)}
                            required={question.required}
                          >
                            <SelectTrigger className="bg-white">
                              <SelectValue placeholder="Select an option" />
                            </SelectTrigger>
                            <SelectContent>
                              {questionOptions.map((option, optIdx) => (
                                <SelectItem key={optIdx} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        {/* Radio Buttons */}
                        {question.type === 'radio' && questionOptions.length > 0 && (
                          <RadioGroup
                            value={currentValue}
                            onValueChange={(value) => handleCustomAnswerChange(index, questionId, value)}
                            required={question.required}
                          >
                            {questionOptions.map((option, optIdx) => (
                              <div key={optIdx} className="flex items-center space-x-2">
                                <RadioGroupItem value={option} id={`attendee-${index}-${questionId}-${optIdx}`} />
                                <Label htmlFor={`attendee-${index}-${questionId}-${optIdx}`} className="font-normal cursor-pointer">
                                  {option}
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        )}

                        {/* Checkbox - Multiple Selection */}
                        {question.type === 'checkbox' && questionOptions.length > 0 && (
                          <div className="space-y-2">
                            {questionOptions.map((option, optIdx) => {
                              // Parse current value as array of selected options
                              const selectedOptions = currentValue ? currentValue.split(',').map(v => v.trim()) : [];
                              const isChecked = selectedOptions.includes(option);

                              return (
                                <div key={optIdx} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`attendee-${index}-${questionId}-${optIdx}`}
                                    checked={isChecked}
                                    onCheckedChange={(checked) => {
                                      let newSelectedOptions;
                                      if (checked) {
                                        // Add option to selected
                                        newSelectedOptions = [...selectedOptions, option];
                                      } else {
                                        // Remove option from selected
                                        newSelectedOptions = selectedOptions.filter(v => v !== option);
                                      }
                                      // Store as comma-separated string
                                      handleCustomAnswerChange(index, questionId, newSelectedOptions.join(', '));
                                    }}
                                  />
                                  <Label htmlFor={`attendee-${index}-${questionId}-${optIdx}`} className="font-normal cursor-pointer">
                                    {option}
                                  </Label>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
      </CardContent>
    </Card>
  );
};
