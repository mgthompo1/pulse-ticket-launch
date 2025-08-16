import React from 'react';
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
import { CustomerInfo, CustomQuestion } from '@/types/widget';

interface CustomerDetailsProps {
  customQuestions: CustomQuestion[];
  onNext: (customerInfo: CustomerInfo) => void;
  onBack: () => void;
}

const customerFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  customAnswers: z.record(z.string()).optional(),
});

export const CustomerDetails: React.FC<CustomerDetailsProps> = ({
  customQuestions,
  onNext,
  onBack
}) => {
  const form = useForm<z.infer<typeof customerFormSchema>>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      customAnswers: {},
    },
  });

  const onSubmit = (values: z.infer<typeof customerFormSchema>) => {
    onNext(values as CustomerInfo);
  };

  const renderCustomQuestion = (question: CustomQuestion) => {
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
                <FormLabel>
                  {question.label}
                  {question.required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Input 
                    type={question.type === 'email' ? 'email' : question.type === 'phone' ? 'tel' : 'text'}
                    placeholder={question.question}
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
            rules={{ required: question.required ? 'This field is required' : false }}
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
                <FormLabel>
                  {question.label}
                  {question.required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder={question.question}
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
            rules={{ required: question.required ? 'This field is required' : false }}
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
                <FormLabel>
                  {question.label}
                  {question.required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={question.question} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {question.options?.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
            rules={{ required: question.required ? 'This field is required' : false }}
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
                <FormLabel>
                  {question.label}
                  {question.required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-1"
                  >
                    {question.options?.map((option) => (
                      <div key={option} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={option} />
                        <label htmlFor={option} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          {option}
                        </label>
                      </div>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
            rules={{ required: question.required ? 'This field is required' : false }}
          />
        );

      case 'checkbox':
        return (
          <FormField
            key={question.id}
            control={form.control}
            name={`customAnswers.${question.id}`}
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value === 'true'}
                    onCheckedChange={(checked) => field.onChange(checked ? 'true' : 'false')}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    {question.label}
                    {question.required && <span className="text-destructive ml-1">*</span>}
                  </FormLabel>
                </div>
                <FormMessage />
              </FormItem>
            )}
            rules={{ required: question.required ? 'This field is required' : false }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Your Details</h2>
        <p className="text-muted-foreground">Please provide your information to complete the purchase</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your full name" {...field} />
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
                    <FormLabel>Email Address *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter your email" {...field} />
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
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="Enter your phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {customQuestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {customQuestions.map(renderCustomQuestion)}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={onBack} size="lg">
              Back to Add-ons
            </Button>
            <Button type="submit" size="lg">
              Continue to Payment
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};