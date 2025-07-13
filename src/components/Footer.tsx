import { Ticket, Twitter, Facebook, Instagram, Linkedin, Mail, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

const footerLinks = {
  Product: [
    { name: "Features", href: "#features" },
    { name: "Pricing", href: "#pricing" },
    { name: "Templates", href: "#templates" },
    { name: "Integrations", href: "#integrations" },
    { name: "API Docs", href: "/docs" },
  ],
  Company: [
    { name: "About Us", href: "/about" },
    { name: "Careers", href: "/careers" },
    { name: "Press", href: "/press" },
    { name: "Blog", href: "/blog" },
    { name: "Contact", href: "/contact" },
  ],
  Resources: [
    { name: "Help Center", href: "/help" },
    { name: "Community", href: "/community" },
    { name: "Webinars", href: "/webinars" },
    { name: "Case Studies", href: "/case-studies" },
    { name: "Event Planning Guide", href: "/guides" },
  ],
  Legal: [
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms of Service", href: "/terms" },
    { name: "Cookie Policy", href: "/cookies" },
    { name: "Data Processing", href: "/data" },
    { name: "Security", href: "/security" },
  ],
};

export const Footer = () => {
  return (
    <footer className="bg-muted/30 border-t border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main footer content */}
        <div className="py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Brand section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-primary p-2 rounded-lg">
                <Ticket className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Ticket2
              </span>
            </div>
            
            <p className="text-muted-foreground leading-relaxed max-w-md">
              The modern ticketing platform that helps event organizers create beautiful experiences, sell more tickets, and grow their audience.
            </p>

            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>hello@ticket2.com</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4" />
                <span>+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4" />
                <span>San Francisco, CA</span>
              </div>
            </div>

            <div className="flex space-x-4">
              <Button variant="ghost" size="sm" className="p-2">
                <Twitter className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="p-2">
                <Facebook className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="p-2">
                <Instagram className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="p-2">
                <Linkedin className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Links sections */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category} className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                {category}
              </h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter signup */}
        <div className="py-8 border-t border-border/50">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Stay Updated
              </h3>
              <p className="text-sm text-muted-foreground">
                Get the latest features, tips, and event industry insights.
              </p>
            </div>
            
            <div className="flex space-x-3 w-full md:w-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 md:w-64 px-4 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
              />
              <Button variant="gradient" size="sm">
                Subscribe
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="py-6 border-t border-border/50 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          <p className="text-sm text-muted-foreground">
            © 2024 Ticket2. All rights reserved.
          </p>
          
          <div className="flex items-center space-x-6 text-sm text-muted-foreground">
            <span>Made with ❤️ for event organizers</span>
          </div>
        </div>
      </div>
    </footer>
  );
};