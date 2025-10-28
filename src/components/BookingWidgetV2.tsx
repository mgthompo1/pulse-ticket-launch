import React, { useCallback, useEffect, useMemo, useState } from "react";

/**
 * TicketFlo — Booking Widget (Polished, Single-Page)
 * ------------------------------------------------------------
 * Improvements:
 * - Removed stepper (saves vertical space)
 * - Combined Party + Date + Time into ONE card
 * - Quick jump buttons inline
 * - Cleaner spacing, consistent rounding
 * - Everything visible without scrolling
 */

// Types
export type Slot = {
  id: string;
  timeLabel: string;
  remaining: number;
  available: boolean;
};

export type Experience = {
  title: string;
  durationMin: number;
  venue: string;
  org: string;
  basePrice: number;
  currency: string;
  timezone: string;
};

export type BookingState = {
  partySize: number;
  dateISO: string | null;
  slotId: string | null;
  slotLabel: string | null;
  totalPrice: number;
};

export type FetchSlotsFn = (args: { dateISO: string; partySize: number }) => Promise<Slot[]>;

const DEMO_EXPERIENCE: Experience = {
  title: "Karaoke Session",
  durationMin: 60,
  venue: "Homewood City Fire Station",
  org: "Mitch's Ticket Company",
  basePrice: 50,
  currency: "USD",
  timezone: "America/Chicago",
};

function normalizeExperience(exp?: Partial<Experience> | null): Experience {
  const base = { ...DEMO_EXPERIENCE };
  if (!exp) return base;
  return {
    title: exp.title ?? base.title,
    durationMin: typeof exp.durationMin === "number" && Number.isFinite(exp.durationMin) ? exp.durationMin : base.durationMin,
    venue: exp.venue ?? base.venue,
    org: exp.org ?? base.org,
    basePrice: typeof exp.basePrice === "number" && Number.isFinite(exp.basePrice) ? exp.basePrice : base.basePrice,
    currency: exp.currency ?? base.currency,
    timezone: exp.timezone ?? base.timezone,
  };
}

export function computeTotalPrice(basePrice: number, partySize: number) {
  const safeBase = typeof basePrice === "number" && Number.isFinite(basePrice) ? basePrice : 0;
  const safeParty = typeof partySize === "number" && partySize > 0 ? partySize : 1;
  return safeBase * safeParty;
}

type SlotsStatus = "idle" | "loading" | "ready" | "empty" | "error";

export default function BookingWidget({
  experience,
  fetchSlots = demoFetchSlots,
  onContinue = (state: BookingState) => console.log("[BookingWidget]", state),
}: {
  experience?: Partial<Experience>;
  fetchSlots?: FetchSlotsFn;
  onContinue?: (state: BookingState) => void;
}) {
  const exp = useMemo(() => normalizeExperience(experience), [experience]);

  const [partySize, setPartySize] = useState(1);
  const [dateISO, setDateISO] = useState<string | null>(todayISO());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [status, setStatus] = useState<SlotsStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const selectedSlot = useMemo(() => slots.find((s) => s.id === slotId) ?? null, [slotId, slots]);
  const totalPrice = useMemo(() => computeTotalPrice(exp.basePrice, partySize), [exp.basePrice, partySize]);

  const loadSlots = useCallback(async () => {
    if (!dateISO) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const data = await fetchSlots({ dateISO, partySize });
      const safe = Array.isArray(data) ? data.filter(isValidSlot) : [];
      setSlots(safe);
      if (!safe.find((s) => s.id === slotId)) setSlotId(null);
      setStatus(safe.length > 0 ? "ready" : "empty");
    } catch (err: unknown) {
      console.error("[BookingWidget] error", err);
      setErrorMsg(err instanceof Error ? err.message : "Unable to load availability");
      setSlots([]);
      setStatus("error");
    }
  }, [dateISO, partySize, fetchSlots, slotId]);

  useEffect(() => {
    if (dateISO) loadSlots();
  }, [dateISO, partySize, loadSlots]);

  const handleContinue = () => {
    if (!dateISO || !selectedSlot) {
      const grid = document.getElementById("slot-grid");
      if (grid) {
        grid.classList.add("animate-shake");
        setTimeout(() => grid.classList.remove("animate-shake"), 400);
      }
      return;
    }
    onContinue({
      partySize,
      dateISO,
      slotId: selectedSlot.id,
      slotLabel: selectedSlot.timeLabel,
      totalPrice,
    });
  };

  return (
    <>
      <style>{`
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }
        .animate-shake { animation: shake .3s ease; }
      `}</style>

      {/* Background */}
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="mx-auto max-w-6xl px-4 py-8 lg:px-6">
          <div className="grid gap-8 lg:grid-cols-[1fr_360px]">

            {/* Main Content */}
            <main className="space-y-6">

              {/* Header */}
              <header className="space-y-3">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{exp.title}</h1>
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                  <Chip>⏱️ {exp.durationMin} min</Chip>
                  <Chip>📍 {exp.venue}</Chip>
                  <Chip>🏷️ {exp.org}</Chip>
                </div>
                <p className="text-base text-gray-700">
                  From {fmtCurrency(exp.basePrice, exp.currency)} · {exp.durationMin} min session
                </p>
              </header>

              {/* Single Unified Card */}
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="space-y-6 p-6 sm:p-8">

                  {/* Row 1: Party + Date */}
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-900">Party Size</label>
                      <NumberPill value={partySize} onChange={setPartySize} min={1} max={10} />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-900">Select Date</label>
                      <input
                        type="date"
                        value={dateISO ?? ""}
                        onChange={(e) => setDateISO(e.target.value || null)}
                        className="h-11 w-full rounded-xl border border-gray-300 px-3 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                  </div>

                  {/* Quick Jump Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <QuickBtn onClick={() => setDateISO(todayISO())}>Today</QuickBtn>
                    <QuickBtn onClick={() => setDateISO(addDaysISO(todayISO(), 1))}>Tomorrow</QuickBtn>
                    <QuickBtn onClick={() => setDateISO(nextWeekendISO(todayISO()))}>This Weekend</QuickBtn>
                  </div>

                  <div className="h-px bg-gray-100" />

                  {/* Available Times */}
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-base font-semibold text-gray-900">Available Times</h2>
                      {dateISO && <span className="text-sm text-gray-500">{formatLongDate(dateISO)}</span>}
                    </div>

                    {status === "loading" && <SlotsSkeleton />}

                    {status === "error" && (
                      <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4">
                        <span className="text-sm text-red-800">{errorMsg || "Could not load times"}</span>
                        <button
                          onClick={loadSlots}
                          className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                        >
                          Retry
                        </button>
                      </div>
                    )}

                    {status === "empty" && (
                      <p className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-600">
                        No times available—try another day
                      </p>
                    )}

                    {status === "ready" && slots.length > 0 && (
                      <div id="slot-grid" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {slots.map((s) => (
                          <TimeSlotButton
                            key={s.id}
                            time={s.timeLabel}
                            lowStock={s.remaining <= 3 && s.available}
                            selected={s.id === slotId}
                            disabled={!s.available || s.remaining <= 0}
                            onSelect={() => setSlotId(s.id)}
                          />
                        ))}
                      </div>
                    )}

                    <p className="mt-3 text-xs text-gray-500">
                      Times shown in {exp.timezone} ·{" "}
                      {partySize > 1 ? `${partySize} people` : "1 person"}
                    </p>
                  </div>
                </div>
              </div>

              {/* What to Expect */}
              <details className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between p-5 hover:bg-gray-50">
                  <span className="text-base font-semibold text-gray-900">What to Expect</span>
                  <svg
                    className="h-5 w-5 text-gray-400 transition group-open:rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="border-t border-gray-100 px-5 pb-5 pt-4">
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Private room with pro audio</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Song queue & remote control</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>BYO snacks; drinks available on-site</span>
                    </li>
                  </ul>
                </div>
              </details>
            </main>

            {/* Summary Sidebar */}
            <aside className="lg:sticky lg:top-8 lg:self-start">
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
                <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
                  <h3 className="text-lg font-bold text-gray-900">Booking Summary</h3>
                </div>
                <div className="space-y-4 p-6">
                  <Row label="Experience" value={exp.title} />
                  <Row label="Location" value={exp.venue} />
                  <Row label="Date" value={dateISO ? formatShortDate(dateISO) : "Select a date"} />
                  <Row label="Time" value={selectedSlot?.timeLabel ?? "Select a time"} />
                  <Row label="Party" value={`${partySize} ${partySize > 1 ? "people" : "person"}`} />
                  <div className="h-px bg-gray-100" />
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-gray-900">{fmtCurrency(totalPrice, exp.currency)}</span>
                  </div>
                  <button
                    onClick={handleContinue}
                    disabled={!dateISO || !selectedSlot}
                    className={[
                      "w-full rounded-xl py-3 text-base font-semibold transition",
                      dateISO && selectedSlot
                        ? "bg-black text-white shadow-sm hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-black"
                        : "cursor-not-allowed bg-gray-200 text-gray-500",
                    ].join(" ")}
                  >
                    Continue
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>

        {/* Mobile sticky drawer */}
        <div className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white/95 p-4 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-gray-900">
                {dateISO ? formatShortDate(dateISO) : "Pick date"}
                {selectedSlot && ` · ${selectedSlot.timeLabel}`}
              </div>
              <div className="text-sm text-gray-600">{fmtCurrency(totalPrice, exp.currency)}</div>
            </div>
            <button
              onClick={handleContinue}
              disabled={!dateISO || !selectedSlot}
              className={[
                "rounded-xl px-5 py-2.5 text-sm font-semibold",
                dateISO && selectedSlot
                  ? "bg-black text-white"
                  : "cursor-not-allowed bg-gray-200 text-gray-500",
              ].join(" ")}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Subcomponents
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1">
      {children}
    </span>
  );
}

function NumberPill({ value, onChange, min, max }: { value: number; onChange: (n: number) => void; min: number; max: number }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-xl border border-gray-300 bg-white px-3 py-2 shadow-sm">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="grid h-8 w-8 place-items-center rounded-full border border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        –
      </button>
      <span className="min-w-[2ch] text-center font-semibold text-gray-900">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="grid h-8 w-8 place-items-center rounded-full border border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}

function QuickBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
    >
      {children}
    </button>
  );
}

function TimeSlotButton({ time, lowStock, selected, disabled, onSelect }: { time: string; lowStock?: boolean; selected?: boolean; disabled?: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={[
        "h-12 w-full rounded-xl border text-sm font-medium transition",
        "focus:outline-none focus:ring-2 focus:ring-black",
        selected
          ? "border-black bg-black text-white"
          : "border-gray-200 bg-white hover:border-gray-300",
        disabled && "cursor-not-allowed opacity-40",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-center justify-center gap-2">
        <span>{time}</span>
        {lowStock && !selected && <span className="text-xs text-amber-700">1 left</span>}
      </div>
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

function SlotsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-100" />
      ))}
    </div>
  );
}

// Utils
function fmtCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatShortDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatLongDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

function nextWeekendISO(fromISO: string) {
  const d = new Date(fromISO + "T00:00:00");
  const day = d.getDay();
  const daysToSat = (6 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + daysToSat);
  return d.toISOString().slice(0, 10);
}

function isValidSlot(x: unknown): x is Slot {
  if (!x || typeof x !== "object") return false;
  const s = x as Record<string, unknown>;
  return (
    typeof s.id === "string" &&
    typeof s.timeLabel === "string" &&
    typeof s.available === "boolean" &&
    typeof s.remaining === "number"
  );
}

// Demo fetch
export async function demoFetchSlots(dateISO: string, partySize: number): Promise<Slot[]> {
  await new Promise((r) => setTimeout(r, 150));

  const base = [
    { id: "t-0900", label: "09:00 AM" },
    { id: "t-1000", label: "10:00 AM" },
    { id: "t-1100", label: "11:00 AM" },
    { id: "t-1200", label: "12:00 PM" },
    { id: "t-1300", label: "01:00 PM" },
    { id: "t-1400", label: "02:00 PM" },
    { id: "t-1500", label: "03:00 PM" },
    { id: "t-1600", label: "04:00 PM" },
  ];

  const scarcity = Number(dateISO.slice(-1)) % 2 === 1;
  return base.map((b, i) => {
    const remaining = Math.max(0, (scarcity ? 1 : 3) - (i % 2));
    return {
      id: b.id,
      timeLabel: b.label,
      remaining,
      available: i !== 6 && remaining > 0 && partySize <= 10,
    };
  });
}
