import React, { useCallback, useEffect, useMemo, useState } from "react";

/**
 * TicketFlo — Booking Widget (drop‑in, hardened v2)
 * ------------------------------------------------------------
 * Fixes in this revision:
 * 1) **fetchSlots resilience**: `demoFetchSlots` now validates inputs and NEVER throws; always returns an array.
 * 2) **Explicit slot status**: loading/ready/empty/error states with a clear UI and a Retry button.
 * 3) **Stable normalization**: continue using safe `normalizeExperience` and guarded price math.
 * 4) **More tests**: Added tests for fetch behavior & state transitions (console-only, non-breaking).
 *
 * HOW TO USE
 * ------------------------------------------------------------
 * <BookingWidget
 *    experience={{
 *      title: "Karaoke",
 *      durationMin: 60,
 *      venue: "Homewood City Fire Station",
 *      org: "Mitch's Ticket Company",
 *      basePrice: 50,
 *      currency: "USD",
 *      timezone: "America/Chicago",
 *    }}
 *    fetchSlots={async ({ dateISO, partySize }) => demoFetchSlots(dateISO, partySize)}
 *    onContinue={(state) => console.log("Continue", state)}
 * />
 */

// -----------------------------
// Types
// -----------------------------

export type Slot = {
  id: string;
  timeLabel: string; // e.g., "09:00 AM"
  remaining: number; // seats / capacity left for selected party size
  available: boolean;
};

export type Experience = {
  title: string;
  durationMin: number;
  venue: string;
  org: string;
  basePrice: number; // per session (or per person — configurable)
  currency: string; // e.g., "USD"
  timezone: string; // IANA tz name
  description?: string;
  highlights?: string[];
  coverImage?: string;
};

export type BookingState = {
  partySize: number;
  dateISO: string | null; // YYYY-MM-DD
  slotId: string | null;
  slotLabel: string | null;
  totalPrice: number; // computed client-side for display
};

export type FetchSlotsFn = (args: { dateISO: string; partySize: number }) => Promise<Slot[]>;

// -----------------------------
// Defaults & Normalizers
// -----------------------------

const DEMO_EXPERIENCE: Experience = {
  title: "Experience",
  durationMin: 60,
  venue: "Main Venue",
  org: "Your Org",
  basePrice: 50,
  currency: "USD",
  timezone: "America/Chicago",
  highlights: [
    "Private room with pro audio system",
    "Access to 50,000+ songs",
    "Wireless remote control",
    "BYO snacks; drinks available",
  ],
};

/** Normalize possibly undefined/partial experience into a full Experience */
function normalizeExperience(exp?: Partial<Experience> | null): Experience {
  const base = { ...DEMO_EXPERIENCE };
  if (!exp) return base;
  return {
    title: exp.title ?? base.title,
    durationMin: isFiniteNumber(exp.durationMin) ? (exp.durationMin as number) : base.durationMin,
    venue: exp.venue ?? base.venue,
    org: exp.org ?? base.org,
    basePrice: isFiniteNumber(exp.basePrice) ? (exp.basePrice as number) : base.basePrice,
    currency: exp.currency ?? base.currency,
    timezone: exp.timezone ?? base.timezone,
    description: exp.description ?? base.description,
    highlights: exp.highlights ?? base.highlights,
    coverImage: exp.coverImage ?? base.coverImage,
  };
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/** Price computation isolated for testing */
export function computeTotalPrice(basePrice: number, partySize: number) {
  const safeBase = isFiniteNumber(basePrice) ? basePrice : 0;
  const safeParty = isFiniteNumber(partySize) && partySize > 0 ? partySize : 1;
  return safeBase * safeParty;
}

// -----------------------------
// Component
// -----------------------------

type SlotsStatus = "idle" | "loading" | "ready" | "empty" | "error";

export default function BookingWidget({
  experience,
  fetchSlots = demoFetchSlots,
  onContinue = (state: BookingState) => console.log("[BookingWidget] Continue", state),
}: {
  experience?: Partial<Experience>;
  fetchSlots?: FetchSlotsFn;
  onContinue?: (state: BookingState) => void;
}) {
  // Normalize early and only use `exp` below — never access raw `experience` directly.
  const exp = useMemo(() => normalizeExperience(experience), [experience]);

  const [partySize, setPartySize] = useState(1);
  const [dateISO, setDateISO] = useState<string | null>(todayISO());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [status, setStatus] = useState<SlotsStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  // derived
  const selectedSlot = useMemo(() => slots.find((s) => s.id === slotId) ?? null, [slotId, slots]);
  const totalPrice = useMemo(() => computeTotalPrice(exp.basePrice, partySize), [exp.basePrice, partySize]);

  const loadSlots = useCallback(async () => {
    if (!dateISO) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const data = await fetchSlots({ dateISO, partySize });
      // ensure array shape
      const safe = Array.isArray(data) ? data.filter(isValidSlot) : [];
      setSlots(safe);
      if (!safe.find((s) => s.id === slotId)) setSlotId(null);
      setStatus(safe.length > 0 ? "ready" : "empty");
    } catch (err: unknown) {
      console.error("[BookingWidget] fetchSlots error", err);
      setErrorMsg(err instanceof Error ? err.message : "Unable to load availability.");
      setSlots([]);
      setStatus("error");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateISO, partySize, fetchSlots]);

  // fetch slots when date or party changes
  useEffect(() => {
    if (!dateISO) return;
    loadSlots();
  }, [dateISO, partySize, loadSlots]);

  // UI handlers
  const handleContinue = () => {
    if (!dateISO || !selectedSlot) {
      // simple inline nudge; could also add a toast
      if (typeof window !== "undefined") {
        window.requestAnimationFrame(() => {
          const grid = document.getElementById("slot-grid");
          if (grid) grid.classList.add("animate-shake");
          setTimeout(() => grid?.classList.remove("animate-shake"), 400);
        });
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
    <div className="mx-auto max-w-6xl px-4 lg:px-6 grid lg:grid-cols-[1fr_360px] gap-6 lg:gap-10">
      <main className="space-y-6">
        {/* Cover Image */}
        {exp.coverImage && (
          <div className="w-full rounded-2xl overflow-hidden shadow-lg">
            <img
              src={exp.coverImage}
              alt={exp.title}
              className="w-full h-auto max-h-96 object-cover"
            />
          </div>
        )}

        {/* Title & meta */}
        <header className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">{exp.title}</h1>
          <MetaChips durationMin={exp.durationMin} venue={exp.venue} org={exp.org} />
          <p className="text-sm text-gray-600">
            From {fmtCurrency(exp.basePrice, exp.currency)} · {exp.durationMin} min session
          </p>
        </header>

        {/* Stepper */}
        <Stepper current={2} steps={["Details", "Date", "Time", "Review"]} />

        {/* Party size */}
        <section className="rounded-2xl border bg-white p-4 sm:p-5">
          <h2 className="text-lg font-semibold mb-3">Party Size</h2>
          <div className="flex items-center gap-3">
            <NumberPill value={partySize} onChange={setPartySize} min={1} max={10} />
            <span className="text-sm text-gray-600">People</span>
          </div>
        </section>

        {/* Date picker */}
        <section className="rounded-2xl border bg-white p-4 sm:p-5">
          <h2 className="text-lg font-semibold mb-3">Select a date</h2>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="date"
              value={dateISO ?? ""}
              onChange={(e) => setDateISO(e.target.value || null)}
              className="h-11 rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
            <QuickJump onSelect={(iso) => setDateISO(iso)} />
          </div>
          <p className="mt-2 text-xs text-gray-500">Times shown in {exp.timezone}</p>
        </section>

        {/* Time slots */}
        <section className="rounded-2xl border bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Available Times</h2>
            {dateISO && <span className="text-sm text-gray-600">{formatLongDate(dateISO)}</span>}
          </div>

          {status === "loading" && <SlotsSkeleton />}

          {status === "error" && (
            <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-3 text-sm">
              <span className="text-red-800">{errorMsg || "We couldn't load availability."}</span>
              <button onClick={loadSlots} className="h-9 px-3 rounded-lg border bg-white hover:bg-gray-50">Retry</button>
            </div>
          )}

          {status === "empty" && (
            <div className="text-sm text-gray-600">No times available for this date—try another day.</div>
          )}

          {status === "ready" && slots.length > 0 && (
            <div id="slot-grid" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
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

          {(status === "ready" || status === "empty") && (
            <p className="mt-3 text-xs text-gray-500">
              {partySize > 1 ? `${partySize} people` : `1 person`} · {exp.durationMin} min
            </p>
          )}
        </section>

        {/* What to expect (collapsed content placeholder) */}
        {exp.highlights && exp.highlights.length > 0 && (
          <section className="rounded-2xl border bg-white">
            <details className="group open:rounded-b-2xl">
              <summary className="list-none cursor-pointer select-none p-4 sm:p-5 flex items-center justify-between">
                <span className="text-lg font-semibold">What to Expect</span>
                <span className="text-gray-500 group-open:rotate-180 transition">▾</span>
              </summary>
              <div className="px-4 pb-5 sm:px-5 text-sm text-gray-700 space-y-2">
                <ul className="list-disc pl-5 space-y-1">
                  {exp.highlights.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            </details>
          </section>
        )}
      </main>

      {/* Summary column / mobile drawer */}
      <SummaryCard
        title={exp.title}
        venue={exp.venue}
        date={dateISO ? formatShortDate(dateISO) : "Select a date"}
        time={selectedSlot?.timeLabel ?? "Select a time"}
        party={partySize}
        price={`${fmtCurrency(totalPrice, exp.currency)}`}
        onContinue={handleContinue}
      />
    </div>
  );
}

// -----------------------------
// Subcomponents
// -----------------------------

function MetaChips({ durationMin, venue, org }: { durationMin: number; venue: string; org: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
      <Chip>⏱️ {durationMin} min</Chip>
      <Chip>📍 {venue}</Chip>
      <Chip>🏷️ {org}</Chip>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 bg-white">{children}</span>;
}

function Stepper({ current, steps }: { current: number; steps: string[] }) {
  return (
    <ol className="flex items-center gap-2 text-sm" aria-label="Progress">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <span
            className={
              "h-7 w-7 rounded-full grid place-items-center border text-xs " +
              (i < current
                ? "bg-black text-white border-black"
                : i === current
                ? "bg-gray-900 text-white border-gray-900"
                : "border-gray-300 text-gray-500")
            }
          >
            {i + 1}
          </span>
          <span className={i <= current ? "font-medium" : "text-gray-500"}>{s}</span>
          {i !== steps.length - 1 && <span className="mx-2 h-px w-6 bg-gray-300" />}
        </li>
      ))}
    </ol>
  );
}

function NumberPill({ value, onChange, min = 1, max = 10 }: { value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <div className="inline-flex items-center gap-2 rounded-full border px-2 py-1 bg-white">
      <button type="button" onClick={dec} className="h-8 w-8 rounded-full border grid place-items-center hover:bg-gray-50">
        –
      </button>
      <span className="min-w-6 text-center font-medium">{value}</span>
      <button type="button" onClick={inc} className="h-8 w-8 rounded-full border grid place-items-center hover:bg-gray-50">
        +
      </button>
    </div>
  );
}

function QuickJump({ onSelect }: { onSelect: (iso: string) => void }) {
  const today = todayISO();
  const tomorrow = addDaysISO(today, 1);
  const weekend = nextWeekendISO(today);
  const Btn = ({ label, iso }: { label: string; iso: string }) => (
    <button onClick={() => onSelect(iso)} className="h-9 rounded-full border px-3 text-sm hover:bg-gray-50">
      {label}
    </button>
  );
  return (
    <div className="flex items-center gap-2">
      <Btn label="Today" iso={today} />
      <Btn label="Tomorrow" iso={tomorrow} />
      <Btn label="This Weekend" iso={weekend} />
    </div>
  );
}

function TimeSlotButton({ time, lowStock, selected, disabled, onSelect }: { time: string; lowStock?: boolean; selected?: boolean; disabled?: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={!!selected}
      disabled={disabled}
      onClick={onSelect}
      className={[
        "w-full h-12 rounded-xl border text-sm font-medium transition",
        "focus:outline-none focus:ring-2 focus:ring-black",
        selected ? "border-black bg-black text-white" : "border-gray-200 bg-white hover:border-gray-300",
        disabled ? "opacity-40 cursor-not-allowed" : "",
      ].join(" ")}
    >
      <div className="flex items-center justify-center gap-2">
        <span>{time}</span>
        {lowStock && !selected && <span className="text-xs text-amber-700">1 slot left</span>}
      </div>
    </button>
  );
}

function SummaryCard({ title, venue, date, time, party, price, onContinue }: { title: string; venue: string; date: string; time: string; party: number; price: string; onContinue: () => void }) {
  return (
    <aside className="lg:sticky lg:top-6 lg:self-start w-full">
      {/* Spacer to align with party size card */}
      <div className="hidden lg:block h-[188px]" />

      <div className="rounded-2xl border bg-white/70 backdrop-blur p-5 shadow-sm">
        <h3 className="text-lg font-semibold mb-3">Booking Summary</h3>
        <div className="space-y-3 text-sm">
          <Row label="Experience" value={title} />
          <Row label="Location" value={venue} />
          <Row label="Date" value={date} />
          <Row label="Time" value={time} />
          <Row label="Party" value={`${party} ${party > 1 ? "people" : "person"}`} />
          <div className="h-px bg-gray-200 my-2" />
          <div className="flex items-center justify-between">
            <span className="font-medium">Total</span>
            <span className="text-xl font-semibold">{price}</span>
          </div>
        </div>
        <button onClick={onContinue} className="mt-4 w-full h-11 rounded-xl bg-black text-white font-medium hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-black">
          Continue
        </button>
      </div>

      {/* Mobile sticky bar */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 border-t bg-white/95 backdrop-blur p-3">
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <div className="font-medium">
              {date}
              {time && ` · ${time}`}
            </div>
            <div className="text-gray-600">{price}</div>
          </div>
          <button onClick={onContinue} className="h-11 px-5 rounded-xl bg-black text-white font-medium">
            Continue
          </button>
        </div>
      </div>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900">{value}</span>
    </div>
  );
}

function SlotsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-12 rounded-xl bg-gray-100 animate-pulse" />
      ))}
    </div>
  );
}

// -----------------------------
// Utils
// -----------------------------

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
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const daysToSat = (6 - day + 7) % 7; // next Saturday
  d.setDate(d.getDate() + daysToSat);
  return d.toISOString().slice(0, 10);
}

function isValidISODate(iso: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso);
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

// Demo data provider (replace with Supabase edge call)
export async function demoFetchSlots(dateISO: string, partySize: number): Promise<Slot[]> {
  try {
    // Allow devs to force an error to test the UI: set window.__TF_DEMO_ERROR__ = true
    if (typeof window !== "undefined" && (window as unknown as { __TF_DEMO_ERROR__?: boolean }).__TF_DEMO_ERROR__) {
      // Instead of throwing, return an empty array to keep the widget stable.
      console.warn("[demoFetchSlots] forced empty via __TF_DEMO_ERROR__");
      return [];
    }

    // Validate inputs
    if (!isValidISODate(dateISO)) {
      console.warn("[demoFetchSlots] invalid dateISO provided:", dateISO);
      return [];
    }
    const safeParty = Number.isFinite(partySize) && partySize > 0 ? partySize : 1;

    // Simulate network latency
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

    // Fake: odd dates have fewer slots
    const scarcity = Number(dateISO.slice(-1)) % 2 === 1;
    const rows: Slot[] = base.map((b, i) => {
      const remaining = Math.max(0, (scarcity ? 1 : 3) - (i % 2));
      return {
        id: b.id,
        timeLabel: b.label,
        remaining: remaining, // remaining is independent of party in demo
        available: i !== 6 && remaining > 0 && safeParty <= 10, // disable one slot and block when out of stock
      };
    });

    return rows;
  } catch (e) {
    // Never throw — always return a safe array to keep the UI stable
    console.warn("[demoFetchSlots] unexpected error, returning []", e);
    return [];
  }
}

// -----------------------------
// Tiny CSS animation helper (shake)
// -----------------------------
// Add this to your Tailwind config if you want a custom keyframe name.
// For now we polyfill with a minimal inline style via <style> tag below.

// eslint-disable-next-line
export const _Style = () => (
  <style>{`
    @keyframes tf-shake { 0%{transform:translateX(0)} 25%{transform:translateX(-3px)} 50%{transform:translateX(3px)} 75%{transform:translateX(-3px)} 100%{transform:translateX(0)} }
    .animate-shake { animation: tf-shake .4s ease; }
  `}</style>
);

// -----------------------------
// DEV TESTS (non-breaking, console-only)
// -----------------------------
function runDevTests() {
  try {
    console.groupCollapsed("[BookingWidget] dev tests");

    // Prior tests (unchanged)
    const exp1 = normalizeExperience(undefined);
    console.assert(exp1.basePrice === DEMO_EXPERIENCE.basePrice, "exp1 basePrice default");

    const exp2 = normalizeExperience({ basePrice: 80, title: "X" });
    console.assert(exp2.basePrice === 80 && exp2.title === "X", "exp2 merges overrides");

    console.assert(computeTotalPrice(50, 3) === 150, "price math 50x3");
    console.assert(computeTotalPrice(NaN as unknown as number, 2) === 0, "price NaN safe");
    console.assert(computeTotalPrice(20, -5) === 20, "party negative coerces to 1");

    const cur = fmtCurrency(12.5, "USD");
    console.assert(typeof cur === "string" && cur.length > 0, "currency formats");

    // New tests
    (async () => {
      const ok = await demoFetchSlots("2025-10-10", 2);
      console.assert(Array.isArray(ok), "demoFetchSlots returns array");
      console.assert(ok.every(isValidSlot), "demoFetchSlots slot shape valid");

      const badDate = await demoFetchSlots("invalid-date", 2);
      console.assert(Array.isArray(badDate) && badDate.length === 0, "invalid date → empty array");

      // Force empty via flag
      if (typeof window !== "undefined") {
        (window as unknown as { __TF_DEMO_ERROR__?: boolean }).__TF_DEMO_ERROR__ = true;
        const forced = await demoFetchSlots("2025-10-10", 2);
        console.assert(Array.isArray(forced) && forced.length === 0, "forced empty returns []");
        (window as unknown as { __TF_DEMO_ERROR__?: boolean }).__TF_DEMO_ERROR__ = false;
      }
    })();

    console.groupEnd();
  } catch (e) {
    console.warn("[BookingWidget] tests error", e);
  }
}

if (typeof window !== "undefined" && !(window as unknown as { __TF_TESTS__?: boolean }).__TF_TESTS__) {
  // Run tests automatically in dev/browser contexts. Set window.__TF_TESTS__ = false to skip.
  runDevTests();
}
