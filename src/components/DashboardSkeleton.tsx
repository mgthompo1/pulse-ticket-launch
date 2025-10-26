import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const DashboardSkeleton = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-slate-200 rounded-2xl shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 bg-slate-200 rounded" />
                <div className="h-5 w-5 bg-slate-200 rounded" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-8 w-20 bg-slate-200 rounded" />
                <div className="h-3 w-16 bg-slate-200 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200 rounded-2xl shadow-sm">
          <CardHeader className="pb-3">
            <div className="h-5 w-32 bg-slate-200 rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-slate-100 rounded" />
          </CardContent>
        </Card>
        <Card className="border-slate-200 rounded-2xl shadow-sm">
          <CardHeader className="pb-3">
            <div className="h-5 w-32 bg-slate-200 rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-slate-100 rounded" />
          </CardContent>
        </Card>
      </div>

      {/* Events List Skeleton */}
      <Card className="border-slate-200 rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <div className="h-5 w-32 bg-slate-200 rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-48 bg-slate-200 rounded" />
                  <div className="h-3 w-32 bg-slate-200 rounded" />
                </div>
                <div className="flex gap-2">
                  <div className="h-9 w-20 bg-slate-200 rounded" />
                  <div className="h-9 w-20 bg-slate-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
