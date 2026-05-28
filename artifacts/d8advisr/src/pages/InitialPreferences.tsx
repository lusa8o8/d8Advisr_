import { useState } from 'react';
import { useLocation } from "wouter";
import { ChevronLeft, Check, MapPin } from 'lucide-react';
import { cn } from "@/components/SharedUI";

const PLAN_TYPES = [
  {
    id: "romantic",
    emoji: "💑",
    label: "Romantic Dates",
    sub: "Perfect evenings, unforgettable moments",
  },
  {
    id: "group",
    emoji: "👥",
    label: "Group Outings",
    sub: "Friends, family & good company",
  },
  {
    id: "occasions",
    emoji: "🎉",
    label: "Special Occasions",
    sub: "Birthdays, anniversaries & milestones",
  },
  {
    id: "solo",
    emoji: "🧭",
    label: "Solo Exploration",
    sub: "Adventures on your own terms",
  },
];

const VIBE_CHIPS = [
  { label: "Foodie",     emoji: "🍽️" },
  { label: "Romantic",   emoji: "❤️" },
  { label: "Outdoor",    emoji: "🌿" },
  { label: "Adventure",  emoji: "⚡" },
  { label: "Nightlife",  emoji: "🌙" },
  { label: "Cultural",   emoji: "🎭" },
  { label: "Live Music", emoji: "🎷" },
  { label: "Coffee",     emoji: "☕" },
  { label: "Artsy",      emoji: "🎨" },
  { label: "Relaxing",   emoji: "🛁" },
  { label: "Sports",     emoji: "🏅" },
  { label: "Casual",     emoji: "😎" },
];

const CITIES = [
  { id: "lagos",  name: "Lagos",  flag: "🇳🇬", sub: "Available now",        live: true  },
  { id: "lusaka", name: "Lusaka", flag: "🇿🇲", sub: "Available now",        live: true  },
  { id: "london", name: "London", flag: "🇬🇧", sub: "Coming soon",           live: false },
  { id: "dubai",  name: "Dubai",  flag: "🇦🇪", sub: "Coming soon",           live: false },
];

export function InitialPreferences() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);

  // Step 1 — plan type
  const [planTypes, setPlanTypes] = useState<string[]>([]);

  // Step 2 — vibes + budget
  const [vibes, setVibes]   = useState<string[]>([]);
  const [budget, setBudget] = useState(150);

  // Step 3 — city
  const [city, setCity] = useState("lagos");

  const TOTAL_STEPS = 4;

  const togglePlanType = (id: string) => {
    setPlanTypes(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const toggleVibe = (label: string) => {
    setVibes(prev =>
      prev.includes(label) ? prev.filter(v => v !== label) : [...prev, label]
    );
  };

  const canAdvance = () => {
    if (step === 1) return planTypes.length > 0;
    if (step === 2) return vibes.length > 0;
    return true;
  };

  const advance = () => {
    if (step < TOTAL_STEPS) setStep(s => s + 1);
    else setLocation('/home');
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-background overflow-hidden">

      {/* ── STICKY HEADER ── */}
      {step < TOTAL_STEPS && (
        <div className="px-6 pt-14 pb-5 bg-background border-b border-border z-20 flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <button
              onClick={() => step > 1 ? setStep(s => s - 1) : setLocation('/signup')}
              className="w-10 h-10 bg-card rounded-full border border-border flex items-center justify-center text-foreground active:scale-95 transition-transform"
            >
              <ChevronLeft size={22} />
            </button>

            {/* Progress segments */}
            <div className="flex gap-1.5 flex-1">
              {Array.from({ length: TOTAL_STEPS - 1 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors duration-300",
                    i + 1 <= step ? "bg-primary" : "bg-border"
                  )}
                />
              ))}
            </div>

            <span className="text-[12px] font-semibold text-muted-foreground">
              {step}/{TOTAL_STEPS - 1}
            </span>
          </div>
        </div>
      )}

      {/* ── STEP CONTENT ── */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">

        {/* ── STEP 1: Plan types ── */}
        {step === 1 && (
          <div className="px-6 pt-8 pb-32 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <h1 className="text-[28px] font-bold text-foreground leading-tight mb-2">
              What kind of plans<br />are you making?
            </h1>
            <p className="text-muted-foreground text-[15px] mb-8">
              Pick all that apply — you can always plan differently later.
            </p>

            <div className="flex flex-col gap-3">
              {PLAN_TYPES.map(pt => {
                const selected = planTypes.includes(pt.id);
                return (
                  <button
                    key={pt.id}
                    onClick={() => togglePlanType(pt.id)}
                    className={cn(
                      "w-full flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all active:scale-[0.98]",
                      selected
                        ? "border-primary bg-[#FFF0F1] shadow-[0_4px_16px_-4px_rgba(255,90,95,0.25)]"
                        : "border-border bg-card hover:border-gray-300"
                    )}
                  >
                    <span className="text-3xl shrink-0">{pt.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className={cn("font-bold text-[16px] leading-tight", selected ? "text-primary" : "text-foreground")}>
                        {pt.label}
                      </p>
                      <p className="text-[13px] text-muted-foreground mt-0.5 leading-snug">{pt.sub}</p>
                    </div>
                    <div className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                      selected ? "bg-primary border-primary" : "border-border"
                    )}>
                      {selected && <Check size={13} strokeWidth={3} className="text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── STEP 2: Vibes + Budget ── */}
        {step === 2 && (
          <div className="px-6 pt-8 pb-32 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <h1 className="text-[28px] font-bold text-foreground leading-tight mb-2">
              What's your vibe?
            </h1>
            <p className="text-muted-foreground text-[15px] mb-8">
              Pick at least one — this shapes what we surface for you.
            </p>

            <div className="flex flex-wrap gap-2.5 mb-10">
              {VIBE_CHIPS.map(chip => {
                const selected = vibes.includes(chip.label);
                return (
                  <button
                    key={chip.label}
                    onClick={() => toggleVibe(chip.label)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold text-[14px] transition-all active:scale-95 border",
                      selected
                        ? "bg-primary text-white border-primary shadow-[0_4px_12px_-4px_rgba(255,90,95,0.5)]"
                        : "bg-card text-foreground border-border hover:border-gray-300"
                    )}
                  >
                    <span>{chip.emoji}</span>
                    {chip.label}
                  </button>
                );
              })}
            </div>

            {/* Budget */}
            <div className="bg-card rounded-3xl p-6 border border-border shadow-sm">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h3 className="font-bold text-foreground text-[17px]">Typical Budget</h3>
                  <p className="text-sm text-muted-foreground">Per night out, per person</p>
                </div>
                <div className="bg-[#FFF0F1] px-3 py-1.5 rounded-xl">
                  <span className="text-xl font-black text-primary">${budget}</span>
                </div>
              </div>

              <input
                type="range"
                min="25"
                max="500"
                step="25"
                value={budget}
                onChange={e => setBudget(Number(e.target.value))}
                className="w-full accent-primary h-2 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted-foreground font-medium mt-2">
                <span>$25</span>
                <span>$250</span>
                <span>$500+</span>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: City ── */}
        {step === 3 && (
          <div className="px-6 pt-8 pb-32 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <h1 className="text-[28px] font-bold text-foreground leading-tight mb-2">
              Where are you based?
            </h1>
            <p className="text-muted-foreground text-[15px] mb-8">
              We'll show you venues and experiences close to you.
            </p>

            <div className="flex flex-col gap-3 mb-8">
              {CITIES.map(c => {
                const selected = city === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => c.live && setCity(c.id)}
                    disabled={!c.live}
                    className={cn(
                      "w-full flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all active:scale-[0.98]",
                      !c.live && "opacity-50 cursor-not-allowed",
                      selected
                        ? "border-primary bg-[#FFF0F1] shadow-[0_4px_16px_-4px_rgba(255,90,95,0.2)]"
                        : "border-border bg-card hover:border-gray-300"
                    )}
                  >
                    <span className="text-3xl shrink-0">{c.flag}</span>
                    <div className="flex-1 min-w-0">
                      <p className={cn("font-bold text-[16px]", selected ? "text-primary" : "text-foreground")}>
                        {c.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {c.live && <MapPin size={11} className="text-[#00C851]" />}
                        <span className={cn(
                          "text-[12px] font-semibold",
                          c.live ? "text-[#00C851]" : "text-muted-foreground"
                        )}>
                          {c.sub}
                        </span>
                      </div>
                    </div>
                    {selected && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <Check size={13} strokeWidth={3} className="text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="bg-background border border-border rounded-2xl p-4 flex items-start gap-3">
              <span className="text-xl shrink-0 mt-0.5">🗺️</span>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                We're building D8Advisr city by city, so every venue listed has been personally verified. More cities are on the way.
              </p>
            </div>
          </div>
        )}

        {/* ── STEP 4: Promise screen ── */}
        {step === 4 && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 animate-in fade-in zoom-in-95 duration-500">

            {/* Logo */}
            <div className="mb-10 flex flex-col items-center">
              <div className="w-20 h-20 bg-primary rounded-[22px] flex items-center justify-center shadow-[0_16px_40px_-8px_rgba(255,90,95,0.5)] mb-5">
                <span className="text-white font-black text-3xl tracking-tight">D8</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-black text-4xl text-primary tracking-tight">D8</span>
                <span className="font-black text-4xl text-foreground tracking-tight">Advisr</span>
              </div>
            </div>

            {/* Message */}
            <div className="text-center mb-10 px-2">
              <h2 className="text-[26px] font-bold text-foreground leading-tight mb-4">
                You're all set.
              </h2>
              <p className="text-[16px] text-muted-foreground leading-relaxed">
                We plan the date. You just show up.
              </p>
            </div>

            {/* Promise pills */}
            <div className="flex flex-col gap-3 w-full mb-12">
              {[
                { emoji: "🆓", text: "Always free for you, forever" },
                { emoji: "✅", text: "Every venue personally verified" },
                { emoji: "🔒", text: "No surprise costs on the night" },
                { emoji: "❤️", text: "Built for real moments, real people" },
              ].map(p => (
                <div
                  key={p.text}
                  className="flex items-center gap-4 bg-card border border-border rounded-2xl px-5 py-4"
                >
                  <span className="text-xl shrink-0">{p.emoji}</span>
                  <p className="font-semibold text-foreground text-[14px]">{p.text}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={() => setLocation('/home')}
              className="w-full bg-primary text-white py-5 rounded-2xl font-bold text-[18px] shadow-[0_12px_28px_-6px_rgba(255,90,95,0.5)] active:scale-[0.98] transition-transform"
            >
              Start Exploring →
            </button>

            <p className="text-[12px] text-muted-foreground mt-5 text-center">
              D8Advisr · v1.0 · No political allegiances. No exceptions.
            </p>
          </div>
        )}
      </div>

      {/* ── FIXED BOTTOM BUTTON (steps 1–3) ── */}
      {step < TOTAL_STEPS && (
        <div className="px-6 pb-10 pt-4 bg-background border-t border-border shadow-[0_-10px_20px_rgba(0,0,0,0.04)] z-20">
          <button
            onClick={advance}
            disabled={!canAdvance()}
            className={cn(
              "w-full py-4 rounded-2xl font-bold text-[17px] transition-all active:scale-[0.98]",
              canAdvance()
                ? "bg-primary text-white shadow-[0_8px_20px_-6px_rgba(255,90,95,0.5)] hover:bg-primary/90"
                : "bg-border text-muted-foreground cursor-not-allowed"
            )}
          >
            {step === 3 ? "Almost there →" : "Continue →"}
          </button>
        </div>
      )}
    </div>
  );
}
