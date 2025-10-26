import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  Ticket,
  DollarSign,
  BarChart3,
  AlertCircle,
  Plus,
  ArrowRight,
  FileText,
  CheckCircle,
  Clock
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Mock data
const monthlyRevenue = [
  { name: 'Jan', value: 12400 },
  { name: 'Feb', value: 18200 },
  { name: 'Mar', value: 15600 },
  { name: 'Apr', value: 21800 },
];

const sparklineData = [
  { value: 100 },
  { value: 120 },
  { value: 115 },
  { value: 134 },
  { value: 145 },
  { value: 140 },
  { value: 165 },
];

const topGroups = [
  {
    id: 1,
    name: 'Auckland Youth Ministry',
    tickets_sold: 145,
    revenue: 29000,
    sparkline: sparklineData
  },
  {
    id: 2,
    name: 'Wellington Community Church',
    tickets_sold: 98,
    revenue: 19600,
    sparkline: sparklineData.map(d => ({ value: d.value * 0.7 }))
  },
  {
    id: 3,
    name: 'Christchurch Sports Club',
    tickets_sold: 76,
    revenue: 15200,
    sparkline: sparklineData.map(d => ({ value: d.value * 0.5 }))
  },
];

const eventTotals = [
  { name: 'Summer Festival 2025', total: 45600 },
  { name: 'Youth Conference', total: 32400 },
  { name: 'Sports Tournament', total: 18900 },
];

// Trend Indicator Component
interface TrendIndicatorProps {
  value: number;
  period?: string;
}

const TrendIndicator = ({ value, period = "vs last month" }: TrendIndicatorProps) => {
  const isPositive = value > 0;
  return (
    <div className={`flex items-center gap-1 text-sm mt-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      <span className="font-medium">{Math.abs(value)}%</span>
      <span className="text-slate-500 text-xs">{period}</span>
    </div>
  );
};

// Mini Sparkline Component
const MiniSparkline = ({ data }: { data: any[] }) => (
  <ResponsiveContainer width={80} height={32}>
    <LineChart data={data}>
      <Line
        type="monotone"
        dataKey="value"
        stroke="#3b82f6"
        strokeWidth={2}
        dot={false}
      />
    </LineChart>
  </ResponsiveContainer>
);

// Skeleton Loader Component
const DashboardSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="grid gap-4 md:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-32 bg-slate-100 rounded-2xl" />
      ))}
    </div>
    <div className="h-96 bg-slate-100 rounded-2xl" />
    <div className="grid gap-4 md:grid-cols-2">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="h-64 bg-slate-100 rounded-2xl" />
      ))}
    </div>
  </div>
);

// Empty State Component
interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const EmptyState = ({ icon: Icon, title, description, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="rounded-full bg-slate-100 p-4 mb-4">
      <Icon className="h-8 w-8 text-slate-400" />
    </div>
    <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
    <p className="text-sm text-slate-500 max-w-sm mb-6">{description}</p>
    {action && (
      <Button onClick={action.onClick} className="gap-2">
        <Plus className="h-4 w-4" />
        {action.label}
      </Button>
    )}
  </div>
);

// OLD STYLE KPI Card (Current)
const OldKPICard = ({ title, value, icon: Icon }: any) => (
  <Card className="bg-white border border-gray-200 rounded-lg">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-gray-700">{title}</CardTitle>
      <Icon className="h-4 w-4 text-gray-500" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <p className="text-xs text-gray-500 mt-1">Total for this month</p>
    </CardContent>
  </Card>
);

// NEW STYLE KPI Card (Improved)
const NewKPICard = ({ title, value, icon: Icon, trend, sparkline }: any) => (
  <Card className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
      <Icon className="h-4 w-4 text-blue-600" />
    </CardHeader>
    <CardContent>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-3xl font-bold text-slate-900 tabular-nums">{value}</div>
          <TrendIndicator value={trend} />
        </div>
        <MiniSparkline data={sparkline} />
      </div>
    </CardContent>
  </Card>
);

export default function DashboardMockup() {
  const [view, setView] = useState<'before' | 'after' | 'split'>('split');
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Dashboard Mockup Comparison</h1>
        <p className="text-slate-600 mb-6">See the visual improvements from Phase 1 enhancements</p>

        {/* View Toggle */}
        <div className="flex gap-2 p-1 bg-white rounded-lg border border-slate-200 w-fit">
          <Button
            variant={view === 'before' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('before')}
          >
            Current Design
          </Button>
          <Button
            variant={view === 'split' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('split')}
          >
            Side by Side
          </Button>
          <Button
            variant={view === 'after' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('after')}
          >
            Improved Design
          </Button>
        </div>

        {/* Loading Demo */}
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsLoading(true);
              setTimeout(() => setIsLoading(false), 3000);
            }}
          >
            Simulate Loading State
          </Button>
        </div>
      </div>

      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <div className={view === 'split' ? 'grid grid-cols-2 gap-8' : ''}>
          {/* BEFORE (Current Design) */}
          {(view === 'before' || view === 'split') && (
            <div>
              {view === 'split' && (
                <div className="mb-4">
                  <Badge variant="secondary" className="mb-2">Current Design</Badge>
                  <h2 className="text-2xl font-bold text-slate-900">Before</h2>
                </div>
              )}

              {/* Old KPI Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                <OldKPICard
                  title="Total Revenue"
                  value="$68,200"
                  icon={DollarSign}
                />
                <OldKPICard
                  title="Total Tickets"
                  value="1,247"
                  icon={Ticket}
                />
                <OldKPICard
                  title="Active Events"
                  value="12"
                  icon={Calendar}
                />
                <OldKPICard
                  title="Active Groups"
                  value="8"
                  icon={Users}
                />
              </div>

              {/* Old Chart */}
              <Card className="mb-6 border border-gray-200 rounded-lg">
                <CardHeader>
                  <CardTitle>Monthly Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyRevenue}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#6366f1" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Old Event List */}
              <Card className="border border-gray-200 rounded-lg">
                <CardHeader>
                  <CardTitle>Total Revenue by Event</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {eventTotals.map((e) => (
                      <div key={e.name} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div className="text-sm font-medium text-gray-900">{e.name}</div>
                        <div className="text-sm font-semibold text-gray-900">${e.total.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* AFTER (Improved Design) */}
          {(view === 'after' || view === 'split') && (
            <div>
              {view === 'split' && (
                <div className="mb-4">
                  <Badge className="mb-2 bg-green-100 text-green-800 hover:bg-green-100">Improved Design</Badge>
                  <h2 className="text-2xl font-bold text-slate-900">After</h2>
                </div>
              )}

              {/* New KPI Cards with Trends & Sparklines */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                <NewKPICard
                  title="Total Revenue"
                  value="$68,200"
                  icon={DollarSign}
                  trend={12.5}
                  sparkline={sparklineData}
                />
                <NewKPICard
                  title="Total Tickets"
                  value="1,247"
                  icon={Ticket}
                  trend={8.2}
                  sparkline={sparklineData}
                />
                <NewKPICard
                  title="Active Events"
                  value="12"
                  icon={Calendar}
                  trend={-3.1}
                  sparkline={sparklineData.map(d => ({ value: d.value * 0.8 }))}
                />
                <NewKPICard
                  title="Active Groups"
                  value="8"
                  icon={Users}
                  trend={15.3}
                  sparkline={sparklineData}
                />
              </div>

              {/* Improved Chart */}
              <Card className="mb-6 border border-slate-200 rounded-2xl shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold text-slate-900">Monthly Revenue by Event</CardTitle>
                      <CardDescription className="text-sm text-slate-500">Revenue trends over the last 4 months</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Calendar className="h-4 w-4" />
                      Last 30 days
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyRevenue} margin={{ left: 8, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} className="text-sm" />
                        <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 1000}k`} className="text-sm" />
                        <Tooltip
                          formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]}
                          cursor={{ fill: "rgba(59,130,246,0.06)" }}
                        />
                        <Bar dataKey="value" radius={[10, 10, 6, 6]} fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2 mb-6">
                {/* Improved Event List */}
                <Card className="border border-slate-200 rounded-2xl shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold text-slate-900">Total Revenue by Event</CardTitle>
                    <CardDescription className="text-sm text-slate-500">All-time revenue for each event</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {eventTotals.map((e) => (
                        <div key={e.name} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                          <div>
                            <div className="text-sm font-medium text-slate-900">{e.name}</div>
                            <div className="text-xs text-slate-500">Total Revenue</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold tabular-nums text-slate-900">${e.total.toLocaleString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Performing Groups (NEW) */}
                <Card className="border border-slate-200 rounded-2xl shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      Top Performing Groups
                    </CardTitle>
                    <CardDescription className="text-sm text-slate-500">Highest ticket sales this month</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {topGroups.map((group, index) => (
                        <div key={group.id} className="flex items-center gap-3 py-2">
                          <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                            index === 0 ? "bg-yellow-100 text-yellow-700" :
                            index === 1 ? "bg-slate-200 text-slate-700" :
                            "bg-orange-100 text-orange-700"
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{group.name}</p>
                            <p className="text-xs text-slate-500">{group.tickets_sold} tickets</p>
                          </div>
                          <div className="text-right flex items-center gap-2">
                            <div>
                              <p className="text-sm font-semibold text-slate-900 tabular-nums">${group.revenue.toLocaleString()}</p>
                            </div>
                            <ResponsiveContainer width={60} height={24}>
                              <LineChart data={group.sparkline}>
                                <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={1.5} dot={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Pending Invoices Alert (NEW) */}
              <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-orange-900 mb-1">Pending Group Invoices</h4>
                  <p className="text-sm text-orange-800 mb-3">
                    You have 3 pending invoices totaling $12,450 that need attention.
                  </p>
                  <Button variant="outline" size="sm" className="border-orange-300 text-orange-700 hover:bg-orange-100">
                    Review Invoices
                    <ArrowRight className="ml-2 h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Empty State Example */}
              <Card className="mt-6 border border-slate-200 rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-slate-900">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <EmptyState
                    icon={FileText}
                    title="No activity yet"
                    description="Activity from ticket sales, refunds, and group purchases will appear here"
                    action={{
                      label: "View All Events",
                      onClick: () => alert('Navigate to events')
                    }}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Feature Highlights */}
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        <Card className="border border-slate-200 rounded-2xl shadow-sm">
          <CardHeader>
            <div className="rounded-full bg-blue-100 w-10 h-10 flex items-center justify-center mb-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <CardTitle className="text-base">Trend Indicators</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              See performance changes at a glance with color-coded percentage indicators on all KPIs.
            </p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 rounded-2xl shadow-sm">
          <CardHeader>
            <div className="rounded-full bg-green-100 w-10 h-10 flex items-center justify-center mb-2">
              <BarChart3 className="h-5 w-5 text-green-600" />
            </div>
            <CardTitle className="text-base">Mini Sparklines</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              7-day trend sparklines show data movement without cluttering the interface.
            </p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 rounded-2xl shadow-sm">
          <CardHeader>
            <div className="rounded-full bg-purple-100 w-10 h-10 flex items-center justify-center mb-2">
              <CheckCircle className="h-5 w-5 text-purple-600" />
            </div>
            <CardTitle className="text-base">Visual Polish</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Subtle shadows, rounded corners, and refined spacing create a premium feel.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Key Improvements List */}
      <Card className="mt-8 border border-slate-200 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Key Improvements in Phase 1</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Visual Polish
              </h4>
              <ul className="space-y-2 text-sm text-slate-600 ml-6">
                <li>• Increased border radius to <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">rounded-2xl</code></li>
                <li>• Added subtle shadows with hover effects</li>
                <li>• Right-aligned all numerical values</li>
                <li>• Refined color palette (slate instead of gray)</li>
                <li>• Improved typography hierarchy</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Enhanced Data Visibility
              </h4>
              <ul className="space-y-2 text-sm text-slate-600 ml-6">
                <li>• Trend indicators with color coding</li>
                <li>• Mini sparklines on KPI cards</li>
                <li>• Improved chart styling and tooltips</li>
                <li>• Better data hierarchy and scanning</li>
                <li>• Tabular numbers for alignment</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Better UX States
              </h4>
              <ul className="space-y-2 text-sm text-slate-600 ml-6">
                <li>• Skeleton loaders for perceived performance</li>
                <li>• Friendly empty states with CTAs</li>
                <li>• Contextual alert banners</li>
                <li>• Better loading feedback</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Groups Integration
              </h4>
              <ul className="space-y-2 text-slate-600 text-sm ml-6">
                <li>• Top performing groups widget</li>
                <li>• Pending invoices alerts</li>
                <li>• Group-specific analytics</li>
                <li>• Leaderboard with sparklines</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
