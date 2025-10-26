import React, { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Organization {
  id: string;
  name: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  isOwner: boolean;
  logo_url?: string | null;
}

interface OrganizationSwitcherProps {
  organizations: Organization[];
  currentOrganization: Organization | null;
  onOrganizationChange: (org: Organization) => void;
}

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'owner':
      return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'admin':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'editor':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'viewer':
      return 'bg-gray-100 text-gray-700 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

const getRoleLabel = (role: string) => {
  return role.charAt(0).toUpperCase() + role.slice(1);
};

export const OrganizationSwitcher: React.FC<OrganizationSwitcherProps> = ({
  organizations,
  currentOrganization,
  onOrganizationChange,
}) => {
  const [open, setOpen] = useState(false);

  if (organizations.length === 0) {
    return null;
  }

  // If user only has one organization, show it without the switcher dropdown
  if (organizations.length === 1) {
    const org = organizations[0];
    return (
      <div className="flex items-center gap-3">
        {org.logo_url && (
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center flex-shrink-0">
            <img
              src={org.logo_url}
              alt={`${org.name} logo`}
              className="w-full h-full object-contain"
            />
          </div>
        )}
        <span className="text-sm font-semibold text-slate-900">{org.name}</span>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          role="combobox"
          aria-expanded={open}
          className="flex items-center gap-3 hover:bg-slate-50 p-2 rounded-lg transition-colors"
        >
          {currentOrganization?.logo_url && (
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center flex-shrink-0">
              <img
                src={currentOrganization.logo_url}
                alt={`${currentOrganization.name} logo`}
                className="w-full h-full object-contain"
              />
            </div>
          )}
          <span className="text-sm font-semibold text-slate-900">
            {currentOrganization?.name || "Select organization..."}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search organizations..." />
          <CommandList>
            <CommandEmpty>No organizations found.</CommandEmpty>
            <CommandGroup>
              {organizations.map((org) => (
                <CommandItem
                  key={org.id}
                  value={org.name}
                  onSelect={() => {
                    onOrganizationChange(org);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      currentOrganization?.id === org.id
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-medium truncate">
                      {org.name}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className={cn("text-xs", getRoleBadgeColor(org.role))}
                      >
                        {getRoleLabel(org.role)}
                      </Badge>
                      {org.isOwner && (
                        <span className="text-xs text-muted-foreground">
                          Owner
                        </span>
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
