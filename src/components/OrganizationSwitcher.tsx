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
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg border">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <div className="flex flex-col">
          <span className="text-sm font-medium">{org.name}</span>
          <Badge
            variant="outline"
            className={cn("text-xs w-fit", getRoleBadgeColor(org.role))}
          >
            {getRoleLabel(org.role)}
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex flex-col items-start min-w-0">
              <span className="text-sm font-medium truncate">
                {currentOrganization?.name || "Select organization..."}
              </span>
              {currentOrganization && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    getRoleBadgeColor(currentOrganization.role)
                  )}
                >
                  {getRoleLabel(currentOrganization.role)}
                </Badge>
              )}
            </div>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
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
