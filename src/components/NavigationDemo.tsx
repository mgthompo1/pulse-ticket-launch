import { useState } from "react";
import { Ticket, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const NavigationDemo = () => {
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
    { name: "Product", id: "features" },
    { name: "Pricing", id: "pricing" },
    { name: "Customers", href: "#customers" },
    { name: "Resources", href: "#" },
  ];

  return (
    <nav className="fixed top-0 w-full z-50 bg-black/95 backdrop-blur-sm border-b border-gray-800/50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <a
            className="flex items-center space-x-3 cursor-pointer hover:opacity-90 transition-opacity"
            href="/demo-landing"
          >
            <div className="p-2 rounded-lg bg-[#ff4d00]/10 border border-[#ff4d00]/20">
              <Ticket className="h-6 w-6 text-[#ff4d00]" />
            </div>
            <span className="text-xl font-semibold tracking-tight text-white font-dm-sans">TicketFlo</span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="flex items-baseline space-x-1">
              {navItems.map((item) => (
                item.href ? (
                  <a
                    key={item.name}
                    href={item.href}
                    className="text-gray-300 hover:text-white px-4 py-2 rounded-md text-sm font-medium transition-colors font-manrope"
                  >
                    {item.name}
                  </a>
                ) : (
                  <a
                    key={item.name}
                    href={`#${item.id!}`}
                    onClick={(e) => handleScrollTo(item.id!, e)}
                    className="text-gray-300 hover:text-white px-4 py-2 rounded-md text-sm font-medium transition-colors font-manrope"
                  >
                    {item.name}
                  </a>
                )
              ))}
            </div>
          </div>

          {/* Desktop CTA - Highnote Style with 3 buttons */}
          <div className="hidden md:flex items-center space-x-3">
            <a
              href="/auth"
              className="text-gray-300 hover:text-white font-manrope px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Login
            </a>
            <a
              href="/contact"
              className="text-gray-300 hover:text-white font-manrope px-5 py-2.5 rounded-md text-sm font-medium transition-all border border-gray-700 hover:border-gray-500"
            >
              Contact Sales
            </a>
            <a
              href="/auth"
              className="bg-[#ff4d00] hover:bg-[#e64400] text-white font-manrope font-semibold px-6 py-2.5 rounded-md text-sm transition-all shadow-sm hover:shadow-lg hover:shadow-[#ff4d00]/20 hover:-translate-y-0.5"
            >
              Get Started
            </a>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#ff4d00]"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className={cn("md:hidden", isOpen ? "block" : "hidden")}>
        <div className="px-4 pt-2 pb-4 space-y-1 bg-black border-b border-gray-800/50">
          {navItems.map((item) => (
            item.href ? (
              <a
                key={item.name}
                href={item.href}
                className="text-gray-300 hover:text-white block px-4 py-3 rounded-md text-base font-medium transition-colors hover:bg-gray-800/50 font-manrope"
              >
                {item.name}
              </a>
            ) : (
              <a
                key={item.name}
                href={`#${item.id!}`}
                onClick={(e) => handleScrollTo(item.id!, e)}
                className="text-gray-300 hover:text-white block px-4 py-3 rounded-md text-base font-medium transition-colors hover:bg-gray-800/50 font-manrope"
              >
                {item.name}
              </a>
            )
          ))}
          <div className="border-t border-gray-800/50 pt-4 mt-4">
            <div className="flex flex-col space-y-3 px-2">
              <a
                href="/auth"
                className="text-center text-gray-300 hover:text-white hover:bg-gray-800/50 font-manrope px-4 py-3 rounded-md text-sm font-medium"
              >
                Login
              </a>
              <a
                href="/contact"
                className="text-center text-gray-300 hover:text-white font-manrope px-4 py-3 rounded-md text-sm font-medium border border-gray-700 hover:border-gray-500"
              >
                Contact Sales
              </a>
              <a
                href="/auth"
                className="text-center bg-[#ff4d00] hover:bg-[#e64400] text-white font-manrope font-semibold px-4 py-3 rounded-md text-sm"
              >
                Get Started
              </a>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
