import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CustomerInfo, CustomQuestion, EventData } from '@/types/widget';
import { Theme } from '@/types/theme';
import { Heart } from 'lucide-react';
import { AttendeeDetailsForm, AttendeeInfo } from './AttendeeDetailsForm';

interface CustomerDetailsProps {
  customQuestions: CustomQuestion[];
  onNext: (customerInfo: CustomerInfo, attendees?: AttendeeInfo[]) => void;
  onBack: () => void;
  theme: Theme;
  isStripePayment?: boolean;
  eventData?: EventData;
  ticketCount?: number;
  cartItems?: Array<{ name: string; quantity: number; attendees_per_ticket?: number }>;
}

const customerFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  customAnswers: z.record(z.string()).optional(),
  donationAmount: z.number().optional(),
});

export const CustomerDetails: React.FC<CustomerDetailsProps> = ({
  customQuestions,
  onNext,
  onBack,
  theme,
  isStripePayment = false,
  eventData,
  ticketCount = 0,
  cartItems = []
}) => {
  // Safety check - ensure customQuestions is always an array
  const safeCustomQuestions = Array.isArray(customQuestions) ? customQuestions : [];

  // Check if donations are enabled - if organizations is missing, check if we have crm_enabled at the event level
  const crmEnabled = eventData?.organizations?.crm_enabled ?? (eventData as any)?.crm_enabled;
  const isDonationsEnabled = eventData?.donations_enabled && crmEnabled;

  const donationSuggestedAmounts = (eventData?.donation_suggested_amounts || [5, 10, 25, 50, 100]).map(amount =>
    typeof amount === 'string' ? parseFloat(amount) : amount
  );
  const donationTitle = eventData?.donation_title || 'Support Our Cause';
  const donationDescription = eventData?.donation_description;

  const [selectedDonationAmount, setSelectedDonationAmount] = useState<number | null>(null);
  const [customDonationAmount, setCustomDonationAmount] = useState<string>('');
  const [attendees, setAttendees] = useState<AttendeeInfo[]>([]);

  const form = useForm<z.infer<typeof customerFormSchema>>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      customAnswers: {},
      donationAmount: undefined,
    },
  });

  const onSubmit = (values: z.infer<typeof customerFormSchema>) => {
    // Validate attendee information if multiple tickets
    if (ticketCount > 1) {
      const hasAllAttendeeInfo = attendees.length === ticketCount &&
        attendees.every(a => a.attendee_name?.trim() && a.attendee_email?.trim());

      if (!hasAllAttendeeInfo) {
        form.setError('name', {
          type: 'manual',
          message: 'Please provide details for all ticket holders'
        });
        return;
      }
    }

    // Include donation amount if selected
    const customerInfoWithDonation: CustomerInfo = {
      ...values,
      donationAmount: selectedDonationAmount && selectedDonationAmount > 0 ? selectedDonationAmount : undefined
    };

    onNext(customerInfoWithDonation, ticketCount > 1 ? attendees : undefined);
  };

  const handleDonationAmountSelect = (amount: number) => {
    setSelectedDonationAmount(amount);
    setCustomDonationAmount('');
    form.setValue('donationAmount', amount);
  };

  const handleCustomDonationChange = (value: string) => {
    setCustomDonationAmount(value);
    const amount = parseFloat(value);
    if (!isNaN(amount) && amount > 0) {
      setSelectedDonationAmount(amount);
      form.setValue('donationAmount', amount);
    } else {
      setSelectedDonationAmount(null);
      form.setValue('donationAmount', undefined);
    }
  };

  const renderCustomQuestion = (question: CustomQuestion, index: number) => {
    // Generate a user-friendly label fallback
    const getQuestionLabel = () => {
      if (question.label && !question.label.startsWith('question_')) {
        return question.label;
      }
      // Fallback to "Question 1", "Question 2", etc. if label is empty or is an ID
      return `Question ${index + 1}`;
    };

    const questionLabel = getQuestionLabel();

    // Safety check for options - handle both array and string formats
    let safeOptions: string[] = [];
    if (Array.isArray(question.options)) {
      safeOptions = question.options;
    } else if (typeof question.options === 'string' && question.options.trim()) {
      // Split by newlines and filter out empty strings
      safeOptions = question.options.split('\n').map((opt: string) => opt.trim()).filter((opt: string) => opt.length > 0);
    }
    
    switch (question.type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <FormField
            key={question.id}
            control={form.control}
            name={`customAnswers.${question.id}`}
            render={({ field }) => (
              <FormItem>
                <FormLabel style={{ color: theme.bodyTextColor }}>
                  {questionLabel}
                  {question.required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Input
                    type={question.type === 'email' ? 'email' : question.type === 'phone' ? 'tel' : 'text'}
                    placeholder="Type your response..."
                    {...field}
                    style={{ backgroundColor: theme.inputBackgroundColor }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
            rules={{ required: question.required ? { value: true, message: 'This field is required' } : false }}
          />
        );

      case 'textarea':
        return (
          <FormField
            key={question.id}
            control={form.control}
            name={`customAnswers.${question.id}`}
            render={({ field }) => (
              <FormItem>
                <FormLabel style={{ color: theme.bodyTextColor }}>
                  {questionLabel}
                  {question.required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Type your response..."
                    {...field}
                    style={{ backgroundColor: theme.inputBackgroundColor }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
            rules={{ required: question.required ? { value: true, message: 'This field is required' } : false }}
          />
        );

      case 'select':
        return (
          <FormField
            key={question.id}
            control={form.control}
            name={`customAnswers.${question.id}`}
            render={({ field }) => (
              <FormItem>
                <FormLabel style={{ color: theme.bodyTextColor }}>
                  {questionLabel}
                  {question.required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger style={{ backgroundColor: theme.inputBackgroundColor }}>
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                  </FormControl>
                   <SelectContent>
                     {safeOptions.map((option) => (
                       <SelectItem key={option} value={option}>
                         {option}
                       </SelectItem>
                     ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
            rules={{ required: question.required ? { value: true, message: 'This field is required' } : false }}
          />
        );

      case 'radio':
        return (
          <FormField
            key={question.id}
            control={form.control}
            name={`customAnswers.${question.id}`}
            render={({ field }) => (
              <FormItem>
                <FormLabel style={{ color: theme.bodyTextColor }}>
                  {questionLabel}
                  {question.required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-1"
                  >
                     {safeOptions.map((option) => (
                       <div key={option} className="flex items-center space-x-2">
                         <RadioGroupItem value={option} id={option} />
                         <label htmlFor={option} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" style={{ color: theme.bodyTextColor }}>
                           {option}
                         </label>
                      </div>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
            rules={{ required: question.required ? { value: true, message: 'This field is required' } : false }}
          />
        );

      case 'checkbox':
        return (
          <FormField
            key={question.id}
            control={form.control}
            name={`customAnswers.${question.id}`}
            render={({ field }) => (
              <FormItem>
                <FormLabel style={{ color: theme.bodyTextColor }}>
                  {questionLabel}
                  {question.required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <div className="space-y-2">
                  {safeOptions.map((option) => {
                    // Parse current value as array of selected options
                    const selectedOptions = field.value ? String(field.value).split(',').map((v: string) => v.trim()) : [];
                    const isChecked = selectedOptions.includes(option);

                    return (
                      <div key={option} className="flex items-center space-x-2">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            let newSelectedOptions;
                            if (checked) {
                              // Add option to selected
                              newSelectedOptions = [...selectedOptions, option];
                            } else {
                              // Remove option from selected
                              newSelectedOptions = selectedOptions.filter((v: string) => v !== option);
                            }
                            // Store as comma-separated string
                            field.onChange(newSelectedOptions.join(', '));
                          }}
                        />
                        <label htmlFor={option} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" style={{ color: theme.bodyTextColor }}>
                          {option}
                        </label>
                      </div>
                    );
                  })}
                </div>
                <FormMessage />
              </FormItem>
            )}
            rules={{ required: question.required ? { value: true, message: 'This field is required' } : false }}
          />
        );

      default:
        return null;
    }
  };

  const showAttendeeForms = ticketCount > 1;
  const contactLabel = showAttendeeForms
    ? (eventData?.widget_customization?.textCustomization?.primaryContactLabel || 'Primary Contact Information')
    : 'Contact Information';
  const headerTitle = showAttendeeForms
    ? (eventData?.widget_customization?.textCustomization?.primaryContactLabel || 'Primary Contact Information')
    : 'Your Details';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: theme.headerTextColor }}>{headerTitle}</h2>
        <p style={{ color: theme.bodyTextColor}}>Please provide your information to complete the purchase</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card style={{ backgroundColor: theme.cardBackgroundColor, border: theme.borderEnabled ? `1px solid ${theme.borderColor}` : undefined }}>
            <CardHeader>
              <CardTitle style={{ color: theme.headerTextColor }}>{contactLabel}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel style={{ color: theme.bodyTextColor }}>Full Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your full name" {...field} style={{ backgroundColor: theme.inputBackgroundColor, border: theme.borderEnabled ? `1px solid ${theme.borderColor}` : undefined }} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel style={{ color: theme.bodyTextColor }}>Email Address *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter your email" {...field} style={{ backgroundColor: theme.inputBackgroundColor, border: theme.borderEnabled ? `1px solid ${theme.borderColor}` : undefined }} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel style={{ color: theme.bodyTextColor }}>Phone Number</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="Enter your phone number" {...field} style={{ backgroundColor: theme.inputBackgroundColor, border: theme.borderEnabled ? `1px solid ${theme.borderColor}` : undefined }} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {safeCustomQuestions.length > 0 && ticketCount <= 1 && (
            <Card style={{ backgroundColor: theme.cardBackgroundColor, border: theme.borderEnabled ? `1px solid ${theme.borderColor}` : undefined }}>
              <CardHeader>
                <CardTitle style={{ color: theme.headerTextColor }}>Additional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {safeCustomQuestions.map((question, index) => renderCustomQuestion(question, index))}
              </CardContent>
            </Card>
           )}

          {/* Attendee Details Form - only shown when purchasing multiple tickets */}
          {ticketCount > 1 && (
            <AttendeeDetailsForm
              ticketCount={ticketCount}
              buyerName={form.watch('name')}
              buyerEmail={form.watch('email')}
              buyerPhone={form.watch('phone')}
              attendees={attendees}
              onChange={setAttendees}
              customQuestions={safeCustomQuestions}
              textCustomization={eventData?.widget_customization?.textCustomization}
              cartItems={cartItems}
            />
          )}

          {/* Donation Card */}
          {isDonationsEnabled && (
            <Card style={{ backgroundColor: theme.cardBackgroundColor, border: theme.borderEnabled ? `1px solid ${theme.borderColor}` : undefined }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ color: theme.headerTextColor }}>
                  <Heart className="h-5 w-5" style={{ color: theme.primaryColor }} />
                  {donationTitle}
                </CardTitle>
                {donationDescription && (
                  <p className="text-sm mt-2" style={{ color: theme.bodyTextColor }}>
                    {donationDescription}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Suggested Amounts */}
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {donationSuggestedAmounts.map((amount) => (
                    <Button
                      key={amount}
                      type="button"
                      variant="outline"
                      onClick={() => handleDonationAmountSelect(amount)}
                      className={`font-semibold ${selectedDonationAmount === amount && !customDonationAmount ? 'ring-2' : ''}`}
                      style={{
                        borderColor: selectedDonationAmount === amount && !customDonationAmount ? theme.primaryColor : theme.borderColor,
                        color: selectedDonationAmount === amount && !customDonationAmount ? theme.primaryColor : theme.bodyTextColor,
                        backgroundColor: selectedDonationAmount === amount && !customDonationAmount ? `${theme.primaryColor}10` : theme.cardBackgroundColor
                      }}
                    >
                      ${amount}
                    </Button>
                  ))}
                </div>

                {/* Custom Amount */}
                <div className="space-y-2">
                  <FormLabel style={{ color: theme.bodyTextColor }}>Or enter a custom amount</FormLabel>
                  <div className="flex items-center gap-2">
                    <span style={{ color: theme.bodyTextColor }}>$</span>
                    <Input
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="0.00"
                      value={customDonationAmount}
                      onChange={(e) => handleCustomDonationChange(e.target.value)}
                      style={{ backgroundColor: theme.inputBackgroundColor, border: theme.borderEnabled ? `1px solid ${theme.borderColor}` : undefined }}
                    />
                  </div>
                </div>

                {/* No donation option */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedDonationAmount(null);
                    setCustomDonationAmount('');
                    form.setValue('donationAmount', undefined);
                  }}
                  className="text-sm"
                  style={{ color: theme.bodyTextColor }}
                >
                  Continue without donating
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons Below Content */}
          <div className="flex justify-between pt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onBack} 
              size="lg"
              style={{ 
                borderColor: theme.primaryColor,
                color: theme.primaryColor
              }}
            >
              Back to Add-ons
            </Button>
            <Button 
              type="submit" 
              size="lg" 
              className="border-0"
              style={{ 
                backgroundColor: theme.primaryColor,
                color: theme.buttonTextColor
              }}
            >
              {isStripePayment ? 'Complete Purchase' : 'Continue to Payment'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};