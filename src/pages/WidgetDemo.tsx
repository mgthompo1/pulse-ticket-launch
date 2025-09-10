import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, ExternalLink, Palette, Globe, Smartphone, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const WidgetDemo = () => {
  const { toast } = useToast();

  const copyToClipboard = (text: string, description: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied!",
        description: `${description} copied to clipboard`,
      });
    });
  };

  const embedExamples = [
    {
      title: "Basic Embed",
      description: "Simple one-line embed with default styling",
      code: `<script src="https://widget.ticketflo.org/embed.js" 
        data-event-id="your-event-id">
</script>`,
      preview: "Basic widget with light theme and default colors"
    },
    {
      title: "Custom Theme",
      description: "Dark theme with custom primary color",
      code: `<script src="https://widget.ticketflo.org/embed.js" 
        data-event-id="your-event-id"
        data-theme="dark"
        data-primary="#ff5722">
</script>`,
      preview: "Dark theme with orange primary color"
    },
    {
      title: "White Label",
      description: "Remove TicketFlo branding for white-label use",
      code: `<script src="https://widget.ticketflo.org/embed.js" 
        data-event-id="your-event-id"
        data-theme="light"
        data-primary="#your-brand-color"
        data-branding="false">
</script>`,
      preview: "Clean widget without TicketFlo branding"
    },
    {
      title: "Localized",
      description: "Custom locale and currency settings",
      code: `<script src="https://widget.ticketflo.org/embed.js" 
        data-event-id="your-event-id"
        data-locale="en-GB"
        data-currency="GBP"
        data-primary="#1f2937">
</script>`,
      preview: "British locale with GBP currency"
    }
  ];

  const features = [
    {
      icon: <Smartphone className="h-6 w-6" />,
      title: "Mobile-First Design",
      description: "Sticky bottom selector, large tap targets, optimized for mobile conversion"
    },
    {
      icon: <Palette className="h-6 w-6" />,
      title: "Full Customization",
      description: "Theme colors, fonts, branding control, and responsive design"
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: "Multi-Language Support",
      description: "Localization for different markets with currency formatting"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure & Accessible",
      description: "WCAG 2.2-AA compliant, secure iframe sandbox, trust indicators"
    }
  ];

  const improvements = [
    "Above-the-fold event info with single primary CTA",
    "Progressive loading with skeleton states", 
    "Price transparency with fee breakdown",
    "Sticky mobile selector for better UX",
    "Smart edge cases (sold out, timeouts, errors)",
    "Full accessibility with keyboard navigation"
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            TicketFlo Beta Widget
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Next-generation ticket widget with improved UX, mobile optimization, 
            and one-line embed system for seamless integration.
          </p>
          <Badge variant="secondary" className="mt-4">
            Beta Version - Request Access
          </Badge>
        </div>

        {/* Key Improvements */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ✨ Key Improvements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {improvements.map((improvement, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-gray-700">{improvement}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {features.map((feature, index) => (
            <Card key={index}>
              <CardContent className="p-6 text-center">
                <div className="text-blue-600 mb-4 flex justify-center">
                  {feature.icon}
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Live Demo */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Live Demo</CardTitle>
            <p className="text-gray-600">
              See the beta widget in action with a sample event
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Demo Controls */}
              <div className="lg:w-1/3">
                <h4 className="font-medium mb-3">Try Different Themes:</h4>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    asChild
                  >
                    <a href="/beta-widget/sample-event" target="_blank">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Light Theme (Default)
                    </a>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    asChild
                  >
                    <a href="/beta-widget/sample-event?theme=dark&primary=%23ff5722" target="_blank">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Dark Theme + Orange
                    </a>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    asChild
                  >
                    <a href="/beta-widget/sample-event?slow=true" target="_blank">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Test Loading States
                    </a>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    asChild
                  >
                    <a href="/beta-widget/sample-event?embed=true&branding=false" target="_blank">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Embed Mode (No Branding)
                    </a>
                  </Button>
                </div>
              </div>

              {/* Demo Iframe */}
              <div className="lg:w-2/3">
                <div className="border rounded-lg bg-white p-4">
                  <iframe
                    src="/beta-widget/sample-event?embed=true"
                    className="w-full h-[600px] border-0 rounded"
                    title="Beta Widget Demo"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Embed Examples */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Embed Examples</h2>
          
          {embedExamples.map((example, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-lg">{example.title}</CardTitle>
                <p className="text-gray-600">{example.description}</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Code */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">HTML Code:</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(example.code, "Embed code")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded text-sm overflow-x-auto">
                      <code>{example.code}</code>
                    </pre>
                  </div>

                  {/* Preview */}
                  <div>
                    <h4 className="font-medium mb-2">Result:</h4>
                    <div className="border rounded p-4 bg-gray-50 min-h-[120px] flex items-center justify-center">
                      <div className="text-center text-gray-600">
                        <div className="w-8 h-8 bg-blue-100 rounded mx-auto mb-2 flex items-center justify-center">
                          🎟️
                        </div>
                        <p className="text-sm">{example.preview}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Configuration Options */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Configuration Options</CardTitle>
            <p className="text-gray-600">
              All available data attributes for customizing the widget
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">Attribute</th>
                    <th className="text-left py-2 px-4">Values</th>
                    <th className="text-left py-2 px-4">Default</th>
                    <th className="text-left py-2 px-4">Description</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  <tr className="border-b">
                    <td className="py-2 px-4"><code>data-event-id</code></td>
                    <td className="py-2 px-4">string</td>
                    <td className="py-2 px-4"><em>required</em></td>
                    <td className="py-2 px-4">Your event ID from TicketFlo</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-4"><code>data-theme</code></td>
                    <td className="py-2 px-4">light, dark, auto</td>
                    <td className="py-2 px-4">light</td>
                    <td className="py-2 px-4">Widget color theme</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-4"><code>data-primary</code></td>
                    <td className="py-2 px-4">hex color</td>
                    <td className="py-2 px-4">#2563eb</td>
                    <td className="py-2 px-4">Primary brand color</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-4"><code>data-locale</code></td>
                    <td className="py-2 px-4">locale code</td>
                    <td className="py-2 px-4">en-US</td>
                    <td className="py-2 px-4">Language and region</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-4"><code>data-currency</code></td>
                    <td className="py-2 px-4">currency code</td>
                    <td className="py-2 px-4">USD</td>
                    <td className="py-2 px-4">Currency formatting</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-4"><code>data-branding</code></td>
                    <td className="py-2 px-4">true, false</td>
                    <td className="py-2 px-4">true</td>
                    <td className="py-2 px-4">Show "Powered by TicketFlo"</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Getting Started */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">1. Copy the embed code</h4>
                <p className="text-gray-600">Replace "your-event-id" with your actual event ID from TicketFlo</p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">2. Add to your website</h4>
                <p className="text-gray-600">Paste the code where you want the widget to appear</p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">3. Customize (optional)</h4>
                <p className="text-gray-600">Add data attributes to match your brand colors and preferences</p>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-gray-600">
                <strong>Note:</strong> The beta widget is currently available for testing. 
                Contact our team to enable it for your organization.
              </p>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default WidgetDemo;