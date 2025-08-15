import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleScrollTo = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsOpen(false);
  };

  const handleSignIn = () => {
    navigate('/auth');
  };

  const handleStartTrial = () => {
    navigate('/auth');
  };

  const navItems = [
    { name: "Features", id: "features" },
    { name: "Pricing", id: "pricing" },
    { name: "Support", id: "support" },
  ];

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="bg-gradient-primary p-2 rounded-lg">
              <Ticket className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              TicketFlo
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              {navItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleScrollTo(item.id)}
                  className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm font-medium transition-smooth hover:bg-accent/50"
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={handleSignIn}>
              Sign In
            </Button>
            <Button variant="gradient" size="sm" onClick={handleStartTrial}>
              Sign Up Now
            </Button>
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
        <div className="px-2 pt-2 pb-3 space-y-1 bg-background/95 backdrop-blur-lg border-b border-border/50">
          {navItems.map((item) => (
            <button
              key={item.name}
              onClick={() => handleScrollTo(item.id)}
              className="text-muted-foreground hover:text-foreground block px-3 py-2 rounded-md text-base font-medium transition-smooth hover:bg-accent/50 w-full text-left"
            >
              {item.name}
            </button>
          ))}
          <div className="border-t border-border/50 pt-4 pb-3">
            <div className="flex flex-col space-y-3 px-3">
              <Button variant="ghost" size="sm" className="justify-start" onClick={handleSignIn}>
                Sign In
              </Button>
              <Button variant="gradient" size="sm" onClick={handleStartTrial}>
                Sign Up Now
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};