import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Ticket, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleScrollTo = (sectionId: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (typeof document !== 'undefined') {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
    setIsOpen(false);
  };

  const navItems = [
    { name: "Home", href: "/" },
    { name: "Features", id: "features" },
    { name: "Pricing", id: "pricing" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <nav className="fixed top-0 w-full z-50 bg-black border-b border-gray-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a 
            className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
            href="/"
          >
            <div className="p-2 rounded-lg border border-gray-600/60 shadow-sm">
              <Ticket className="h-6 w-6 text-[#ff4d00]" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-white font-dm-sans">TicketFlo</span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              {navItems.map((item) => (
                item.href ? (
                  <a
                    key={item.name}
                    href={item.href}
                    className="text-white hover:text-[#ff4d00] px-3 py-2 rounded-md text-sm font-medium transition-smooth hover:bg-gray-800/50 font-manrope"
                  >
                    {item.name}
                  </a>
                ) : (
                  <a
                    key={item.name}
                    href={`#${item.id!}`}
                    onClick={(e) => handleScrollTo(item.id!, e)}
                    className="text-white hover:text-[#ff4d00] px-3 py-2 rounded-md text-sm font-medium transition-smooth hover:bg-gray-800/50 font-manrope"
                  >
                    {item.name}
                  </a>
                )
              ))}
            </div>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center space-x-2">
            <a href="/auth" className="text-white hover:text-[#ff4d00] hover:bg-gray-800/50 font-manrope px-3 py-2 rounded-md text-sm">
              Sign In
            </a>
            <a href="/auth" className="bg-[#ff4d00] hover:bg-[#e64400] text-white border-0 font-manrope font-medium px-3 py-2 rounded-md text-sm">
              Sign Up Now
            </a>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className={cn("md:hidden", isOpen ? "block" : "hidden")}>
        <div className="px-2 pt-2 pb-3 space-y-1 bg-black border-b border-gray-800/50">
          {navItems.map((item) => (
            item.href ? (
              <a
                key={item.name}
                href={item.href}
                className="text-white hover:text-[#ff4d00] block px-3 py-2 rounded-md text-base font-medium transition-smooth hover:bg-gray-800/50 w-full text-left font-manrope"
              >
                {item.name}
              </a>
            ) : (
              <a
                key={item.name}
                href={`#${item.id!}`}
                onClick={(e) => handleScrollTo(item.id!, e)}
                className="text-white hover:text-[#ff4d00] block px-3 py-2 rounded-md text-base font-medium transition-smooth hover:bg-gray-800/50 w-full text-left font-manrope"
              >
                {item.name}
              </a>
            )
          ))}
          <div className="border-t border-gray-800/50 pt-4 pb-3">
            <div className="flex flex-col space-y-3 px-3">
              <a href="/auth" className="justify-start text-white hover:text-[#ff4d00] hover:bg-gray-800/50 font-manrope px-3 py-2 rounded-md text-sm">
                Sign In
              </a>
              <a href="/auth" className="bg-[#ff4d00] hover:bg-[#e64400] text-white border-0 font-manrope font-medium px-3 py-2 rounded-md text-sm">
                Sign Up Now
              </a>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};