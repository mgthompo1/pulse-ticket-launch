import { Button } from "@/components/ui/button";
import { ArrowRight, Smartphone, Users, BarChart3, Ticket, UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLandingPageContent } from "@/hooks/useLandingPageContent";

export const Hero = () => {
  const navigate = useNavigate();
  const { getContentByKey } = useLandingPageContent();

  const handleStartTrial = () => {
    navigate('/auth');
  };

  return (
    <section className="relative pt-24 pb-0 overflow-hidden">
      {/* Background with subtle gradient */}
      <div className="absolute inset-0 bg-black" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#ff4d00]/5 via-transparent to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Spacer */}
          <div className="mb-6" />

          {/* Main headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tight text-white mb-6 leading-[1.05] font-dm-sans">
            The <span className="underline decoration-[#ff4d00] decoration-4 underline-offset-4">complete</span> platform for
            <span className="block bg-gradient-to-r from-[#ff4d00] to-[#ff6b2c] bg-clip-text text-transparent">
              event ticketing
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed font-manrope">
            Sell tickets, manage groups, track attendees and keep more of what you earn to help you grow.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
            <Button variant="default" size="xl" className="group bg-[#ff4d00] hover:bg-[#e64400] text-white border-0 font-manrope font-medium px-8 py-4 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-[#ff4d00]/25" onClick={handleStartTrial}>
              {getContentByKey('hero', 'cta_primary') || 'Start for free'}
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="outline" size="xl" className="group border-white/30 bg-white/5 text-white hover:bg-white/10 hover:border-white/50 font-manrope font-medium px-8 py-4 rounded-xl transition-all duration-300" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
              See features
            </Button>
          </div>

          {/* Feature highlights instead of fake stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto mb-16">
            <div className="flex flex-col items-center p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <Smartphone className="h-6 w-6 text-[#ff4d00] mb-2" />
              <span className="text-sm font-medium text-white font-manrope">Organiser App</span>
            </div>
            <div className="flex flex-col items-center p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <Ticket className="h-6 w-6 text-[#ff4d00] mb-2" />
              <span className="text-sm font-medium text-white font-manrope">Event Ticketing</span>
            </div>
            <div className="flex flex-col items-center p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <Users className="h-6 w-6 text-[#ff4d00] mb-2" />
              <span className="text-sm font-medium text-white font-manrope">Group Sales & CRM</span>
            </div>
            <div className="flex flex-col items-center p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <BarChart3 className="h-6 w-6 text-[#ff4d00] mb-2" />
              <span className="text-sm font-medium text-white font-manrope">Real-time Analytics</span>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="relative max-w-5xl mx-auto">
            {/* Glow effect behind dashboard */}
            <div className="absolute -inset-4 bg-gradient-to-r from-[#ff4d00]/20 via-[#ff4d00]/10 to-[#ff4d00]/20 rounded-3xl blur-3xl opacity-50" />

            {/* Dashboard mockup container */}
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950 shadow-2xl">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 bg-zinc-900/80 border-b border-white/10">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-zinc-800 rounded-md px-3 py-1.5 text-xs text-gray-400 font-mono max-w-xs mx-auto">
                    dashboard.ticketflo.org
                  </div>
                </div>
              </div>

              {/* Dashboard content mockup */}
              <div className="p-3 sm:p-6 bg-zinc-950">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-[#ff4d00]" />
                    <div className="h-3 sm:h-4 w-20 sm:w-32 bg-zinc-800 rounded" />
                  </div>
                  <div className="flex gap-2">
                    <div className="hidden sm:block h-9 w-24 bg-zinc-800 rounded-lg" />
                    <div className="h-7 sm:h-9 w-20 sm:w-32 bg-[#ff4d00] rounded-lg" />
                  </div>
                </div>

                {/* Stats cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
                  {[
                    { label: 'Total Events', value: '12', icon: Ticket },
                    { label: 'Tickets Sold', value: '847', icon: UserCheck },
                    { label: 'Revenue', value: '$24,580', icon: BarChart3 },
                    { label: 'Customers', value: '623', icon: Users },
                  ].map((stat, i) => (
                    <div key={i} className="p-2 sm:p-4 rounded-lg sm:rounded-xl bg-zinc-900 border border-zinc-800">
                      <div className="flex items-center justify-between mb-1 sm:mb-2">
                        <span className="text-[10px] sm:text-xs text-gray-500 font-manrope">{stat.label}</span>
                        <stat.icon className="h-3 w-3 sm:h-4 sm:w-4 text-[#ff4d00]" />
                      </div>
                      <div className="text-sm sm:text-xl font-bold text-white font-dm-sans">{stat.value}</div>
                    </div>
                  ))}
                </div>

                {/* Chart placeholder */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                  <div className="sm:col-span-2 h-24 sm:h-40 rounded-lg sm:rounded-xl bg-zinc-900 border border-zinc-800 p-2 sm:p-4">
                    <div className="h-2 sm:h-3 w-16 sm:w-24 bg-zinc-800 rounded mb-2 sm:mb-4" />
                    <div className="flex items-end gap-1 sm:gap-2 h-14 sm:h-24">
                      {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 95, 80].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-gradient-to-t from-[#ff4d00] to-[#ff6b2c] rounded-t opacity-80"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="hidden sm:block h-40 rounded-xl bg-zinc-900 border border-zinc-800 p-4">
                    <div className="h-3 w-20 bg-zinc-800 rounded mb-4" />
                    <div className="space-y-3">
                      {['General Admission', 'VIP Pass', 'Early Bird'].map((label, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[#ff4d00]" style={{ opacity: 1 - i * 0.25 }} />
                          <div className="h-2 flex-1 bg-zinc-800 rounded" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating badges */}
            <div className="absolute -left-4 top-1/3 hidden lg:block">
              <div className="bg-white rounded-xl p-3 shadow-xl animate-float">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <UserCheck className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-900">Check-in Complete</div>
                    <div className="text-xs text-gray-500">Via iOS App</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -right-4 top-1/2 hidden lg:block">
              <div className="bg-white rounded-xl p-3 shadow-xl animate-float" style={{ animationDelay: '1s' }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-900">Group Booking</div>
                    <div className="text-xs text-gray-500">25 tickets reserved</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Gradient fade to white for features section */}
      <div className="h-32 bg-gradient-to-b from-black to-white mt-16" />
    </section>
  );
};