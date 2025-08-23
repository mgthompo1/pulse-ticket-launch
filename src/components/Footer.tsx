import { Ticket, Twitter, Facebook, Instagram, Linkedin, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const footerLinks = {
  Product: [
    { name: "Features", href: "#features" },
    { name: "Pricing", href: "#pricing" },
  ],
  Legal: [
    { name: "Privacy Policy", href: "/privacy-policy" },
    { name: "Terms of Service", href: "/terms" },
  ],
};

export const Footer = () => {
  return (
    <footer className="bg-black border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main footer content */}
        <div className="py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Brand section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg border border-gray-600/60 shadow-sm">
                <Ticket className="h-6 w-6 text-[#ff4d00]" />
              </div>
              <span className="text-lg font-semibold tracking-tight text-white font-dm-sans">TicketFlo</span>
            </div>
            
            <p className="text-white leading-relaxed max-w-md font-manrope">
              The modern ticketing platform that helps event organizers create beautiful experiences, sell more tickets, and grow their audience.
            </p>

            <div className="space-y-3 text-sm text-white font-manrope">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>hello@ticketflo.com</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4" />
                <span>+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>San Francisco, CA</span>
              </div>
            </div>

            <div className="flex space-x-4">
              <Button variant="ghost" size="sm" className="p-2 text-gray-400 hover:text-white hover:bg-gray-800">
                <Twitter className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="p-2 text-gray-400 hover:text-white hover:bg-gray-800">
                <Facebook className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="p-2 text-gray-400 hover:text-white hover:bg-gray-800">
                <Instagram className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="p-2 text-gray-400 hover:text-white hover:bg-gray-800">
                <Linkedin className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Links sections */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category} className="space-y-4">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-dm-sans">
                {category}
              </h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    {link.href.startsWith('#') ? (
                      <a
                        href={link.href}
                        className="text-sm text-white hover:text-[#ff4d00] transition-colors font-manrope"
                      >
                        {link.name}
                      </a>
                    ) : (
                      <Link
                        to={link.href}
                        className="text-sm text-white hover:text-[#ff4d00] transition-colors font-manrope"
                      >
                        {link.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter signup */}
        {/* Removed for Beta */}

        {/* Bottom bar */}
        <div className="py-6 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          <p className="text-sm text-gray-400 font-manrope">
            © 2024 TicketFlo. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};