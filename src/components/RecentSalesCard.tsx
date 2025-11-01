import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface RecentSale {
  id: string;
  event_name: string;
  customer_name: string;
  customer_email: string;
  total_amount: number;
  created_at: string;
  ticket_count: number;
}

interface RecentSalesCardProps {
  sales: RecentSale[];
  isLoading?: boolean;
  onViewAll?: () => void;
}

export const RecentSalesCard = ({ sales, isLoading = false, onViewAll }: RecentSalesCardProps) => {
  if (isLoading) {
    return (
      <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow rounded-2xl">
        <CardHeader className="pb-4">
          <div className="h-6 bg-muted rounded animate-pulse w-1/3" />
          <div className="h-4 bg-muted rounded animate-pulse w-1/2 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow rounded-2xl">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-manrope font-bold text-xl text-slate-900">Recent Sales</CardTitle>
            <CardDescription className="font-manrope text-base text-slate-600">
              Latest ticket purchases across all events
            </CardDescription>
          </div>
          {onViewAll && sales.length > 0 && (
            <button
              onClick={onViewAll}
              className="text-sm font-manrope font-medium text-[#ff4d00] hover:text-[#cc3d00] flex items-center gap-1 transition-colors"
            >
              View All
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {sales.length === 0 ? (
          <div className="text-center py-8">
            <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="font-manrope text-muted-foreground">No recent sales</p>
            <p className="font-manrope text-sm text-muted-foreground mt-1">
              Sales will appear here as customers purchase tickets
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sales.map((sale) => (
              <div
                key={sale.id}
                className="flex items-start justify-between p-3 border border-gray-200/60 rounded-lg hover:bg-gray-50/50 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-manrope font-semibold text-sm text-gray-900 truncate">
                      {sale.customer_name}
                    </h4>
                    <span className="flex-shrink-0 text-xs text-gray-500">
                      {formatDistanceToNow(new Date(sale.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="font-manrope text-xs text-gray-600 truncate mb-1">
                    {sale.customer_email}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="font-manrope text-xs font-medium text-[#ff4d00] bg-orange-50 px-2 py-0.5 rounded">
                      {sale.event_name}
                    </span>
                    <span className="font-manrope text-xs text-gray-500">
                      {sale.ticket_count} {sale.ticket_count === 1 ? 'ticket' : 'tickets'}
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-4 text-right">
                  <div className="font-manrope font-bold text-base text-gray-900">
                    ${sale.total_amount.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
