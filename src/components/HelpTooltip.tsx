import React, { useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HelpTooltipProps {
  title: string;
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({ 
  title, 
  content, 
  children, 
  position = 'top',
  className = '' 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 transform -translate-x-1/2 border-t-gray-900',
    bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-b-gray-900',
    left: 'right-full top-1/2 transform -translate-y-1/2 border-l-gray-900',
    right: 'left-full top-1/2 transform -translate-y-1/2 border-r-gray-900'
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <div 
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="inline-block"
      >
        {children}
      </div>
      
      {isVisible && (
        <div className={`absolute z-50 ${positionClasses[position]}`}>
          <Card className="w-80 shadow-xl border-gray-900 bg-gray-900 text-white">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  {title}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsVisible(false)}
                  className="h-6 w-6 p-0 text-white hover:bg-gray-800"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-300 leading-relaxed">
                {content}
              </p>
            </CardContent>
          </Card>
          
          {/* Arrow */}
          <div className={`absolute w-0 h-0 border-4 border-transparent ${arrowClasses[position]}`}></div>
        </div>
      )}
    </div>
  );
};

// Inline help icon component
export const HelpIcon: React.FC<{ 
  title: string; 
  content: string; 
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ title, content, size = 'sm', className = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <HelpTooltip title={title} content={content} className={className}>
      <HelpCircle className={`${sizeClasses[size]} text-muted-foreground hover:text-primary cursor-help transition-colors`} />
    </HelpTooltip>
  );
};
