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
  Clock,
  Sparkles,
  LayoutDashboard,
  Play,
  Link,
  Monitor,
  Smartphone,
  Tablet,
  Shield,
  Bell,
  Globe2
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

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

const onboardingSteps: Array<{ title: string; helper: string; state: 'ready' | 'active' | 'next' | 'optional' }> = [
  { title: 'Create your first event', helper: 'Start from a pre-built template', state: 'ready' },
  { title: 'Connect payouts', helper: 'Stripe in under 2 minutes', state: 'active' },
  { title: 'Publish & share', helper: 'Widget link + QR in one click', state: 'next' },
  { title: 'Invite your team', helper: 'Assign Finance and Ops roles', state: 'optional' },
];

const navConcept = ['Plan', 'Sell', 'Operate', 'Admin'];

const quickWins = [
  { title: 'Enable low-fee checkout', impact: '+0.8% conversion' },
  { title: 'Add express payment', impact: '-12s to complete' },
  { title: 'Turn on fraud shield', impact: 'Fewer chargebacks' },
];

const funnelData = [
  { step: 'Views', value: 100 },
  { step: 'Tickets Selected', value: 72 },
  { step: 'Checkout Started', value: 58 },
  { step: 'Paid', value: 47 },
];

const ticketMix = [
  { name: 'General Admission', value: 62 },
  { name: 'VIP', value: 18 },
  { name: 'Early Bird', value: 12 },
  { name: 'Group Pack', value: 8 },
];

const deviceMix = [
  { name: 'Desktop', value: 48, icon: Monitor },
  { name: 'Mobile', value: 42, icon: Smartphone },
  { name: 'Tablet', value: 10, icon: Tablet },
];

const geoBreakdown = [
  { country: 'US', share: 52 },
  { country: 'AU', share: 18 },
  { country: 'NZ', share: 14 },
  { country: 'UK', share: 9 },
  { country: 'SG', share: 7 },
];

const recentOrders = [
  { id: '#4821', buyer: 'Jordan D.', event: 'Summer Festival', total: 186.40, status: 'paid', method: 'Apple Pay', time: '2m ago' },
  { id: '#4820', buyer: 'Casey L.', event: 'Youth Conference', total: 74.00, status: 'paid', method: 'Card', time: '7m ago' },
  { id: '#4819', buyer: 'Amira K.', event: 'Sports Tournament', total: 128.50, status: 'paid', method: 'Google Pay', time: '12m ago' },
  { id: '#4818', buyer: 'Logan P.', event: 'Evening Gala', total: 92.00, status: 'refunded', method: 'Card', time: '34m ago' },
  { id: '#4817', buyer: 'Sofia R.', event: 'Summer Festival', total: 256.00, status: 'paid', method: 'Card', time: '1h ago' },
];

const supportTickets = [
  { title: 'Resend ticket email', priority: 'low', time: '5m ago' },
  { title: 'Bulk import groups', priority: 'medium', time: '22m ago' },
  { title: 'Refund partial order', priority: 'high', time: '42m ago' },
];

const opsTasks = [
  { title: 'Publish seating map for Gala', owner: 'Ops', due: 'Today', status: 'in-progress' },
  { title: 'Enable payouts for AU org', owner: 'Finance', due: 'Tomorrow', status: 'blocked' },
  { title: 'QA mobile checkout', owner: 'QA', due: 'Today', status: 'ready' },
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

const StepItem = ({ title, helper, state, tone }: { title: string; helper: string; state: 'ready' | 'active' | 'next' | 'optional'; tone: (light: string, dark: string) => string }) => {
  const stateStyles: Record<string, string> = {
    active: 'bg-amber-500 text-amber-900',
    ready: 'bg-emerald-500 text-emerald-900',
    next: 'bg-blue-500 text-blue-900',
    optional: tone('bg-slate-400 text-slate-900', 'bg-slate-600 text-slate-100'),
  };

  return (
    <div className={`flex items-start gap-3 rounded-xl border px-3 py-3 ${tone('border-slate-200 bg-slate-100', 'border-slate-800 bg-slate-900/60')}`}>
      <div className={`mt-0.5 h-6 w-6 shrink-0 rounded-full text-[11px] font-semibold grid place-items-center ${stateStyles[state]}`}>
        {state === 'optional' ? '?' : '•'}
      </div>
      <div className="flex-1">
        <p className={`text-sm font-semibold ${tone('text-slate-900', 'text-slate-50')}`}>{title}</p>
        <p className={`text-xs ${tone('text-slate-600', 'text-slate-400')}`}>{helper}</p>
      </div>
      <ArrowRight className={`h-4 w-4 ${tone('text-slate-400', 'text-slate-500')}`} />
    </div>
  );
};

const NavChip = ({ label, tone }: { label: string; tone: (light: string, dark: string) => string }) => (
  <div className={`rounded-full border px-3 py-1 text-xs font-semibold flex items-center gap-2 ${tone('border-slate-300 bg-white text-slate-700', 'border-slate-800 bg-slate-900/70 text-slate-200')}`}>
    <LayoutDashboard className="h-3 w-3 text-amber-500" />
    {label}
  </div>
);

const FunnelBar = ({ step, value, max, tone }: { step: string; value: number; max: number; tone: (light: string, dark: string) => string }) => {
  const width = Math.max(8, Math.round((value / max) * 100));
  return (
    <div className="space-y-1">
      <div className={`flex items-center justify-between text-xs ${tone('text-slate-600', 'text-slate-500')}`}>
        <span>{step}</span>
        <span className={`tabular-nums ${tone('text-slate-800', 'text-slate-300')}`}>{value}%</span>
      </div>
      <div className={`h-2 rounded-full ${tone('bg-slate-200', 'bg-slate-800')}`}>
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 transition-all"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
};

const StatusBadge = ({ status, tone }: { status: 'paid' | 'refunded'; tone: (light: string, dark: string) => string }) => {
  const base = status === 'paid'
    ? tone('bg-emerald-100 text-emerald-700 border-emerald-300', 'bg-emerald-500/10 text-emerald-200 border-emerald-500/40')
    : tone('bg-orange-100 text-orange-700 border-orange-300', 'bg-orange-500/10 text-orange-200 border-orange-500/40');
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${base}`}>
      {status === 'paid' ? 'Paid' : 'Refunded'}
    </span>
  );
};

const PriorityBadge = ({ level, tone }: { level: 'low' | 'medium' | 'high'; tone: (light: string, dark: string) => string }) => {
  const stylesLight: Record<string, string> = {
    low: 'bg-slate-100 text-slate-700 border-slate-300',
    medium: 'bg-amber-100 text-amber-800 border-amber-300',
    high: 'bg-rose-100 text-rose-800 border-rose-300',
  };
  const stylesDark: Record<string, string> = {
    low: 'bg-slate-800 text-slate-200 border-slate-700',
    medium: 'bg-amber-500/15 text-amber-100 border-amber-500/30',
    high: 'bg-rose-500/15 text-rose-100 border-rose-500/30',
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${tone(stylesLight[level], stylesDark[level])}`}>{level}</span>
  );
};

const DeviceRow = ({ name, value, icon: Icon, tone }: { name: string; value: number; icon: any; tone: (l: string, d: string) => string }) => (
  <div className={`flex items-center justify-between py-2 border-b last:border-0 ${tone('border-slate-200','border-slate-800')}`}>
    <div className="flex items-center gap-2">
      <div className={`rounded-lg p-2 border ${tone('bg-white border-slate-200','bg-slate-900 border-slate-800')}`}>
        <Icon className="h-4 w-4 text-amber-300" />
      </div>
      <span className={`text-sm ${tone('text-slate-800','text-slate-200')}`}>{name}</span>
    </div>
    <span className={`text-sm font-semibold ${tone('text-slate-900','text-slate-50')}`}>{value}%</span>
  </div>
);

const TaskBadge = ({ status, tone }: { status: 'in-progress' | 'blocked' | 'ready'; tone: (light: string, dark: string) => string }) => {
  const mapLight: Record<string, string> = {
    'in-progress': 'bg-blue-100 text-blue-700 border-blue-300',
    blocked: 'bg-rose-100 text-rose-700 border-rose-300',
    ready: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  };
  const mapDark: Record<string, string> = {
    'in-progress': 'bg-blue-500/10 text-blue-100 border-blue-500/30',
    blocked: 'bg-rose-500/10 text-rose-100 border-rose-500/30',
    ready: 'bg-emerald-500/10 text-emerald-100 border-emerald-500/30',
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone(mapLight[status], mapDark[status])}`}>{status}</span>
  );
};

export default function DashboardMockup() {
  const [view, setView] = useState<'before' | 'after' | 'split'>('split');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isLoading, setIsLoading] = useState(false);
  const tone = (light: string, dark: string) => (theme === 'light' ? light : dark);
  const surface = tone('bg-white border border-slate-200 text-slate-900', 'bg-slate-950 border border-slate-800 text-slate-50');
  const softSurface = tone('bg-slate-50 border border-slate-200', 'bg-slate-900/60 border border-slate-800');
  const mutedText = tone('text-slate-600', 'text-slate-400');

  return (
    <div className={theme === 'light' ? "min-h-screen bg-slate-50 p-8" : "min-h-screen bg-slate-950 p-8 text-slate-50"}>
      {/* Header */}
      <div className="mb-8">
        <h1 className={`text-4xl font-bold mb-2 ${tone('text-slate-900', 'text-slate-50')}`}>Dashboard Mockup Comparison</h1>
        <p className={tone('text-slate-600', 'text-slate-300')}>See the visual improvements from Phase 1 enhancements</p>

        <div className="mt-4 flex flex-wrap gap-3 items-center">
          {/* View Toggle */}
          <div className={`flex gap-2 p-1 rounded-lg border w-fit ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
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

          {/* Theme Toggle */}
          <div className={`flex gap-1 p-1 rounded-lg border w-fit ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
            <Button
              variant={theme === 'light' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTheme('light')}
            >
              Light
            </Button>
            <Button
              variant={theme === 'dark' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTheme('dark')}
            >
              Dark
            </Button>
          </div>

          {/* Loading Demo */}
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
                  <Badge className={tone('mb-2 bg-green-100 text-green-800 hover:bg-green-100', 'mb-2 bg-emerald-500/20 text-emerald-100 border border-emerald-500/40')}>
                    Improved Design
                  </Badge>
                  <h2 className={`text-2xl font-bold ${tone('text-slate-900', 'text-slate-50')}`}>After</h2>
                </div>
              )}

              <div className="space-y-6">
                {/* Hero + onboarding */}
                <div className={`relative overflow-hidden rounded-3xl ${tone('border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 text-slate-900', 'border border-slate-800 bg-slate-950 text-slate-50')} shadow-2xl`}>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_-10%,rgba(248,180,0,0.12),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.18),transparent_35%)]" />
                  <div className="relative grid gap-6 md:grid-cols-[1.4fr,1fr] p-6 md:p-8">
                    <div className="space-y-4">
                      <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${tone('bg-white border-slate-200 text-slate-800', 'bg-slate-900/70 border-slate-800 text-slate-200')}`}>
                        <Sparkles className="h-3 w-3 text-amber-400" />
                        First-time experience
                      </div>
                      <h3 className={`text-3xl md:text-4xl font-bold leading-tight ${tone('text-slate-900', 'text-slate-50')}`}>Launch with clarity, then explore.</h3>
                      <p className={`text-sm md:text-base ${mutedText} max-w-2xl`}>
                        A guided first 10 minutes that ships a sandbox event, connects payouts, and shows live buyer flow without making you hunt through settings.
                      </p>
                      <div className="flex flex-wrap items-center gap-3">
                        <Button className="bg-amber-400 text-slate-950 hover:bg-amber-300 font-semibold">
                          Create your first event
                        </Button>
                        <Button variant="secondary" className={tone('border border-slate-200 bg-white text-slate-900 hover:bg-slate-100 gap-2', 'border border-slate-800 bg-slate-900 text-slate-50 hover:bg-slate-800 gap-2')}>
                          <Play className="h-4 w-4" />
                          Preview buyer flow
                        </Button>
                        <Button variant="ghost" className={tone('text-slate-600 hover:bg-slate-100 gap-2', 'text-slate-300 hover:bg-slate-900 gap-2')}>
                          <Link className="h-4 w-4" />
                          Import from Eventbrite
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {navConcept.map((item) => (
                          <NavChip key={item} label={item} tone={tone} />
                        ))}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3 pt-4">
                        {quickWins.map((item) => (
                          <div key={item.title} className={`rounded-2xl p-3 ${softSurface}`}>
                            <p className="text-xs uppercase text-amber-500 font-semibold">{item.impact}</p>
                            <p className={tone('text-slate-900', 'text-slate-100')}>{item.title}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className={`rounded-2xl p-4 shadow-inner ${softSurface}`}>
                      <div className="flex items-center justify-between">
                        <p className={`text-xs uppercase tracking-wide ${mutedText}`}>First 10 minutes</p>
                        <Badge variant="secondary" className={tone('bg-emerald-100 text-emerald-800 border border-emerald-200', 'bg-emerald-500/20 text-emerald-200 border-emerald-600')}>Guided</Badge>
                      </div>
                      <div className="mt-4 space-y-3">
                        {onboardingSteps.map((step) => (
                          <StepItem key={step.title} title={step.title} helper={step.helper} state={step.state} tone={tone} />
                        ))}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" className={tone('border-amber-300 text-amber-700 hover:bg-amber-50', 'border-amber-300 text-amber-200 hover:bg-amber-500/10')}>
                          <Play className="mr-2 h-4 w-4" />
                          Launch sandbox
                        </Button>
                        <Button size="sm" variant="ghost" className={tone('text-slate-700 hover:bg-slate-100', 'text-slate-200 hover:bg-slate-800')}>
                          Invite teammate
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats row with unified accent */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {[
                    { title: 'Net revenue', value: '$68,200', delta: '+12.5%', tone: 'text-emerald-400', icon: DollarSign },
                    { title: 'Tickets sold', value: '1,247', delta: '+8.2%', tone: 'text-emerald-400', icon: Ticket },
                    { title: 'Avg order value', value: '$54.70', delta: '+2.1%', tone: 'text-emerald-400', icon: BarChart3 },
                    { title: 'Refund rate', value: '1.2%', delta: '-0.3%', tone: 'text-emerald-400', icon: AlertCircle },
                  ].map((stat) => (
                    <Card key={stat.title} className={`${surface} rounded-2xl shadow-md`}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className={`text-sm font-medium ${tone('text-slate-700', 'text-slate-200')}`}>{stat.title}</CardTitle>
                        <stat.icon className="h-4 w-4 text-amber-400" />
                      </CardHeader>
                      <CardContent className="flex items-center justify-between">
                        <div>
                          <div className="text-3xl font-bold tabular-nums">{stat.value}</div>
                          <p className={`text-xs font-semibold ${stat.tone}`}>{stat.delta} vs last 30d</p>
                        </div>
                        <MiniSparkline data={sparklineData} />
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <Card className={tone("border border-emerald-100 bg-emerald-50 text-emerald-900 rounded-2xl","border border-emerald-500/30 bg-emerald-500/5 text-emerald-50 rounded-2xl")}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                        Payouts connected
                      </CardTitle>
                      <CardDescription className={tone("text-xs text-emerald-800","text-xs text-emerald-100/80")}>Stripe verified • Next deposit Friday</CardDescription>
                    </CardHeader>
                    <CardContent className={tone("text-sm text-emerald-900","text-sm text-emerald-50")}>No action required.</CardContent>
                  </Card>
                  <Card className={tone("border border-orange-200 bg-orange-50 text-orange-900 rounded-2xl","border border-orange-400/30 bg-orange-500/5 text-orange-50 rounded-2xl")}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        Pending invoices
                      </CardTitle>
                      <CardDescription className={tone("text-xs text-orange-800","text-xs text-orange-100/80")}>3 group invoices • $12,450</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" size="sm" className={tone("border-orange-300 text-orange-800 hover:bg-orange-100","border-orange-300 text-orange-50 hover:bg-orange-500/10")}>
                        Review invoices
                      </Button>
                    </CardContent>
                  </Card>
                  <Card className={tone("border border-blue-200 bg-blue-50 text-blue-900 rounded-2xl","border border-blue-400/30 bg-blue-500/5 text-blue-50 rounded-2xl")}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        Upcoming launches
                      </CardTitle>
                      <CardDescription className={tone("text-xs text-blue-800","text-xs text-blue-100/80")}>2 events need schedules</CardDescription>
                    </CardHeader>
                    <CardContent className={tone("text-sm text-blue-900","text-sm text-blue-50")}>Block dates now to avoid conflicts.</CardContent>
                  </Card>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                  <Card className={`lg:col-span-2 rounded-2xl shadow-md ${surface}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base font-semibold">Revenue & buyer flow</CardTitle>
                          <CardDescription className={`text-sm ${mutedText}`}>Single accent palette, zero clutter</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" className={tone('border-slate-200 text-slate-900 hover:bg-slate-100 gap-2','border-slate-700 text-slate-100 hover:bg-slate-800 gap-2')}>
                          <Clock className="h-4 w-4" />
                          Last 30 days
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={monthlyRevenue} margin={{ left: 8, right: 8, top: 10, bottom: 10 }}>
                            <defs>
                              <linearGradient id="accentLine" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.8} />
                                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.1} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'light' ? '#e2e8f0' : '#1f2937'} />
                            <XAxis dataKey="name" tickLine={false} axisLine={false} stroke={theme === 'light' ? '#64748b' : '#9ca3af'} />
                            <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 1000}k`} stroke={theme === 'light' ? '#64748b' : '#9ca3af'} />
                            <Tooltip
                              formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']}
                              contentStyle={theme === 'light'
                                ? { backgroundColor: '#ffffff', border: '1px solid #e2e8f0', color: '#1e293b' }
                                : { backgroundColor: '#0f172a', border: '1px solid #1e293b', color: '#e2e8f0' }
                              }
                            />
                            <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b', stroke: theme === 'light' ? '#ffffff' : '#0f172a', strokeWidth: 2 }} activeDot={{ r: 5 }} />
                            <Area type="monotone" dataKey="value" stroke="none" fill="url(#accentLine)" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={`rounded-2xl shadow-md ${surface}`}>
                    <CardHeader>
                      <CardTitle className="text-base font-semibold">Checkout funnel</CardTitle>
                      <CardDescription className={`text-sm ${mutedText}`}>Zero drop-off assumptions</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {funnelData.map((item) => (
                        <FunnelBar key={item.step} step={item.step} value={item.value} max={100} tone={tone} />
                      ))}
                      <div className={tone("rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800","rounded-xl border border-emerald-600/40 bg-emerald-500/10 p-3 text-xs text-emerald-50")}>
                        Add express pay and remove optional questions to lift conversion by ~0.8%.
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Event list in dark mode */}
                  <Card className={`rounded-2xl shadow-md ${surface}`}>
                    <CardHeader>
                      <CardTitle className="text-base font-semibold">Total revenue by event</CardTitle>
                      <CardDescription className={`text-sm ${mutedText}`}>All-time numbers, right aligned</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {eventTotals.map((e) => (
                          <div key={e.name} className={`flex items-center justify-between py-3 border-b last:border-0 ${tone('border-slate-200','border-slate-800')}`}>
                            <div>
                              <div className={`text-sm font-semibold ${tone('text-slate-900','text-slate-50')}`}>{e.name}</div>
                              <div className={`text-xs ${mutedText}`}>Total revenue</div>
                            </div>
                            <div className="text-right">
                              <div className={`text-sm font-semibold tabular-nums ${tone('text-slate-900','text-slate-50')}`}>${e.total.toLocaleString()}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top groups */}
                  <Card className={`rounded-2xl shadow-md ${surface}`}>
                    <CardHeader>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Users className="h-4 w-4 text-amber-400" />
                        Top performing groups
                      </CardTitle>
                      <CardDescription className={`text-sm ${mutedText}`}>With sparklines for pace</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {topGroups.map((group, index) => (
                          <div key={group.id} className="flex items-center gap-3 py-2">
                            <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                              index === 0 ? "bg-amber-300 text-amber-900" :
                              index === 1 ? "bg-slate-200 text-slate-800" :
                              "bg-orange-200 text-orange-900"
                            }`}>
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold truncate ${tone('text-slate-900','text-slate-50')}`}>{group.name}</p>
                              <p className={`text-xs ${mutedText}`}>{group.tickets_sold} tickets</p>
                            </div>
                            <div className="text-right flex items-center gap-2">
                              <div className={`text-sm font-semibold tabular-nums ${tone('text-slate-900','text-slate-50')}`}>${group.revenue.toLocaleString()}</div>
                              <ResponsiveContainer width={60} height={24}>
                                <LineChart data={group.sparkline}>
                                  <Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={1.5} dot={false} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Empty state refreshed */}
                <Card className={`rounded-2xl shadow-md ${surface}`}>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Recent activity</CardTitle>
                    <CardDescription className={`text-sm ${mutedText}`}>Sandbox data until live orders arrive</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <EmptyState
                      icon={FileText}
                      title="No activity yet"
                      description="We will stream sales, refunds, and group invoices here. Load the sandbox to see a realistic feed."
                      action={{
                        label: "Load sandbox data",
                        onClick: () => alert('Load sandbox activity')
                      }}
                    />
                  </CardContent>
                </Card>

                {/* Simulated live ops */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className={`text-lg font-semibold ${tone('text-slate-900', 'text-slate-50')}`}>Simulated live dashboard</h4>
                      <p className={`text-sm ${tone('text-slate-600', 'text-slate-400')}`}>End-to-end view with revenue, devices, orders, and operational queue.</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className={tone('border-slate-300 text-slate-700 hover:bg-slate-100', 'border-slate-700 text-slate-100 hover:bg-slate-800')}>
                        <Shield className="h-4 w-4 mr-2" />
                        Fraud shield on
                      </Button>
                      <Button size="sm" className="bg-amber-400 text-slate-950 hover:bg-amber-300 font-semibold">
                        Simulate spike
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-3">
                    {/* Orders table */}
                    <Card className={`lg:col-span-2 rounded-2xl shadow-md ${surface}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base font-semibold">Recent orders</CardTitle>
                          <Badge variant="secondary" className={tone('bg-emerald-100 text-emerald-800 border border-emerald-200','bg-emerald-500/20 text-emerald-100 border-emerald-500/40')}>Live</Badge>
                        </div>
                        <CardDescription className={`text-sm ${mutedText}`}>Simulated payments flowing in</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {recentOrders.map((order) => (
                          <div key={order.id} className={`grid grid-cols-[1.2fr,1fr,1fr,1fr,1fr] items-center gap-3 rounded-xl px-3 py-2 text-sm ${softSurface}`}>
                            <div className={`font-semibold ${tone('text-slate-900','text-slate-50')}`}>{order.id}</div>
                            <div className={tone('text-slate-800','text-slate-200')}>{order.buyer}</div>
                            <div className={mutedText}>{order.event}</div>
                            <div className={`text-right tabular-nums ${tone('text-slate-900','text-slate-50')}`}>${order.total.toFixed(2)}</div>
                            <div className="flex items-center justify-end gap-2">
                              <StatusBadge status={order.status as 'paid' | 'refunded'} tone={tone} />
                              <span className={`text-xs ${mutedText}`}>{order.method}</span>
                              <span className={`text-xs ${mutedText}`}>{order.time}</span>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    {/* Ops board */}
                    <Card className={`rounded-2xl shadow-md ${surface}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <Bell className="h-4 w-4 text-amber-300" />
                          Ops queue
                        </CardTitle>
                        <CardDescription className={`text-sm ${mutedText}`}>Tasks tied to revenue</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {opsTasks.map((task) => (
                          <div key={task.title} className={`rounded-xl p-3 space-y-1 ${softSurface}`}>
                            <div className="flex items-center justify-between">
                              <p className={`text-sm font-semibold ${tone('text-slate-900','text-slate-50')}`}>{task.title}</p>
                              <TaskBadge status={task.status as any} tone={tone} />
                            </div>
                            <div className={`flex items-center gap-3 text-xs ${mutedText}`}>
                              <span>{task.owner}</span>
                              <span className={`rounded-full px-2 py-0.5 text-[11px] ${tone('bg-slate-100 text-slate-700 border border-slate-200','bg-slate-800 text-slate-200 border border-slate-700')}`}>{task.due}</span>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-3">
                    <Card className={`rounded-2xl shadow-md ${surface}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold">Ticket mix</CardTitle>
                        <CardDescription className={`text-sm ${mutedText}`}>What people are buying</CardDescription>
                      </CardHeader>
                      <CardContent className="flex items-center gap-4">
                        <ResponsiveContainer width="55%" height={180}>
                          <PieChart>
                            <Pie data={ticketMix} dataKey="value" nameKey="name" outerRadius={70} innerRadius={40} paddingAngle={3}>
                              {ticketMix.map((entry, index) => (
                                <Cell key={entry.name} fill={['#f59e0b', '#38bdf8', '#a855f7', '#22c55e'][index % 4]} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex-1 space-y-2">
                          {ticketMix.map((ticket, index) => (
                            <div key={ticket.name} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ['#f59e0b', '#38bdf8', '#a855f7', '#22c55e'][index % 4] }} />
                                <span className={tone('text-slate-700', 'text-slate-200')}>{ticket.name}</span>
                              </div>
                              <span className={`font-semibold ${tone('text-slate-900', 'text-slate-50')}`}>{ticket.value}%</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className={`rounded-2xl shadow-md ${surface}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold">Device mix</CardTitle>
                        <CardDescription className={`text-sm ${mutedText}`}>Optimized mobile flow</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-1">
                        {deviceMix.map((device) => (
                          <DeviceRow key={device.name} name={device.name} value={device.value} icon={device.icon} tone={tone} />
                        ))}
                        <div className={tone("rounded-xl border border-blue-200 bg-blue-50 p-2 text-xs text-blue-800","rounded-xl border border-blue-500/30 bg-blue-500/10 p-2 text-xs text-blue-50")}>
                          Mobile checkout under 18s; no scroll traps.
                        </div>
                      </CardContent>
                    </Card>

                    <Card className={`rounded-2xl shadow-md ${surface}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <Globe2 className="h-4 w-4 text-amber-300" />
                          Geography
                        </CardTitle>
                        <CardDescription className={`text-sm ${mutedText}`}>Where buyers are</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {geoBreakdown.map((geo) => (
                          <div key={geo.country} className="flex items-center justify-between text-sm">
                            <span className={tone('text-slate-700', 'text-slate-200')}>{geo.country}</span>
                            <div className="flex items-center gap-2">
                              <div className={`h-2 w-24 rounded-full ${tone('bg-slate-200', 'bg-slate-800')}`}>
                                <div className="h-full rounded-full bg-amber-400" style={{ width: `${geo.share}%` }} />
                              </div>
                              <span className={`font-semibold ${tone('text-slate-900','text-slate-50')}`}>{geo.share}%</span>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
                    <Card className={`rounded-2xl shadow-md ${surface}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold">Support queue</CardTitle>
                        <CardDescription className={`text-sm ${mutedText}`}>Auto-sorted by priority</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {supportTickets.map((ticket) => (
                          <div key={ticket.title} className={`flex items-center justify-between rounded-xl p-3 ${softSurface}`}>
                            <div>
                              <p className={`text-sm font-semibold ${tone('text-slate-900','text-slate-50')}`}>{ticket.title}</p>
                              <p className={`text-xs ${mutedText}`}>{ticket.time}</p>
                            </div>
                            <PriorityBadge level={ticket.priority as any} tone={tone} />
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card className={`rounded-2xl shadow-md ${surface}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold">Reliability</CardTitle>
                        <CardDescription className={`text-sm ${mutedText}`}>Live status</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className={tone('text-slate-700','text-slate-200')}>Checkout uptime</span>
                          <span className={tone('font-semibold text-emerald-700','font-semibold text-emerald-300')}>99.98%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={tone('text-slate-700','text-slate-200')}>P95 checkout time</span>
                          <span className={tone('font-semibold text-slate-900','font-semibold text-slate-50')}>1.9s</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={tone('text-slate-700','text-slate-200')}>Webhooks</span>
                          <span className={tone('font-semibold text-emerald-700','font-semibold text-emerald-300')}>Healthy</span>
                        </div>
                        <div className={tone("rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800","rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2 text-xs text-emerald-50")}>
                          Auto-switch to fallback processor if latency spikes.
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
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
