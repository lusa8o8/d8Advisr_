import { useState } from 'react';
import { useLocation } from "wouter";
import { ArrowLeft, Check, Save } from 'lucide-react';
import { cn, consumerDesktopClass } from "@/components/SharedUI";
import { useRegion } from "@/hooks/useRegion";
import {
  CONSUMER_BUDGET_RANGE,
  CONSUMER_PLAN_TYPES,
  CONSUMER_VIBES,
  type ConsumerPlanTypeId,
  type ConsumerVibe,
} from "@/lib/consumerPreferences";

const INITIAL_PLAN_TYPES: ConsumerPlanTypeId[] = ['romantic', 'group'];
const INITIAL_VIBES: ConsumerVibe[] = ['Foodie', 'Romantic', 'Live Music'];

export function PreferenceEdit() {
  const [, setLocation] = useLocation();
  const { formatPrice } = useRegion();
  const [planTypes, setPlanTypes] = useState<ConsumerPlanTypeId[]>(INITIAL_PLAN_TYPES);
  const [vibes, setVibes] = useState<ConsumerVibe[]>(INITIAL_VIBES);
  const [budget, setBudget] = useState<number>(CONSUMER_BUDGET_RANGE.defaultValue);

  const togglePlanType = (id: ConsumerPlanTypeId) => {
    setPlanTypes(current => current.includes(id)
      ? current.filter(item => item !== id)
      : [...current, id]);
  };

  const toggleVibe = (vibe: ConsumerVibe) => {
    setVibes(current => current.includes(vibe)
      ? current.filter(item => item !== vibe)
      : [...current, vibe]);
  };

  const canFinish = planTypes.length > 0 && vibes.length > 0;

  return (
    <div className="flex-1 min-h-0 bg-background flex flex-col relative overflow-y-auto no-scrollbar pb-28">
      <div className="bg-card pt-10 lg:pt-14 pb-3 lg:pb-4 sticky top-0 z-20 shadow-sm border-b border-border">
        <div className={cn(consumerDesktopClass('reading'), "px-6 flex justify-between items-center")}>
          <button
            onClick={() => setLocation('/profile')}
            aria-label="Back to profile"
            className="w-10 h-10 bg-background rounded-full flex items-center justify-center text-foreground hover:bg-muted"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold text-foreground text-lg">My Preferences</h1>
          <div className="w-10" aria-hidden="true" />
        </div>
      </div>

      <div className={cn(consumerDesktopClass('reading'), "px-6 py-8 flex flex-col gap-10 w-full")}>
        <p className="text-muted-foreground text-[15px] font-medium leading-relaxed">
          Fine-tune the kinds of plans and experiences you want to explore.
        </p>

        <section>
          <h2 className="font-bold text-foreground text-[17px] mb-1">Plans you enjoy</h2>
          <p className="text-sm text-muted-foreground mb-4">Choose all that feel relevant.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CONSUMER_PLAN_TYPES.map(planType => {
              const selected = planTypes.includes(planType.id);
              return (
                <button
                  key={planType.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => togglePlanType(planType.id)}
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.98]",
                    selected
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border bg-card hover:border-muted-foreground/40",
                  )}
                >
                  <span className="text-2xl shrink-0" aria-hidden="true">{planType.emoji}</span>
                  <span className="flex-1 min-w-0">
                    <span className={cn("block font-bold text-[14px] leading-tight", selected ? "text-primary" : "text-foreground")}>
                      {planType.label}
                    </span>
                    <span className="block text-[12px] text-muted-foreground mt-1 leading-snug">
                      {planType.description}
                    </span>
                  </span>
                  <span className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                    selected ? "bg-primary border-primary" : "border-border",
                  )}>
                    {selected ? <Check size={11} strokeWidth={3} className="text-white" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="font-bold text-foreground text-[17px] mb-1">Your vibes</h2>
          <p className="text-sm text-muted-foreground mb-4">Pick at least one.</p>
          <div className="flex flex-wrap gap-2.5">
            {CONSUMER_VIBES.map(vibe => {
              const selected = vibes.includes(vibe.label);
              return (
                <button
                  key={vibe.label}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleVibe(vibe.label)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold text-sm border transition-all active:scale-95",
                    selected
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "bg-card text-foreground border-border hover:border-muted-foreground/40",
                  )}
                >
                  <span aria-hidden="true">{vibe.emoji}</span>
                  {vibe.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="bg-card rounded-3xl p-6 border border-border shadow-sm">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="font-bold text-foreground text-[17px]">Typical budget</h2>
              <p className="text-sm text-muted-foreground">Per night out, per person</p>
            </div>
            <span className="text-xl font-black text-primary whitespace-nowrap">{formatPrice(budget)}</span>
          </div>

          <input
            type="range"
            aria-label="Typical budget per person"
            min={CONSUMER_BUDGET_RANGE.min}
            max={CONSUMER_BUDGET_RANGE.max}
            step={CONSUMER_BUDGET_RANGE.step}
            value={budget}
            onChange={event => setBudget(Number(event.target.value))}
            className="w-full accent-primary h-2 bg-muted rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-muted-foreground font-medium mt-3">
            <span>{formatPrice(CONSUMER_BUDGET_RANGE.min)}</span>
            <span>{formatPrice(250)}</span>
            <span>{formatPrice(CONSUMER_BUDGET_RANGE.max)}+</span>
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-6 shadow-[0_-10px_20px_rgba(0,0,0,0.03)] z-30">
        <div className={consumerDesktopClass('reading')}>
          <button
            type="button"
            disabled={!canFinish}
            onClick={() => setLocation('/profile')}
            className="w-full bg-primary text-white py-4 rounded-xl font-bold text-[17px] shadow-[0_8px_20px_-6px_rgba(255,90,95,0.5)] active:scale-[0.98] transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={20} /> Done
          </button>
        </div>
      </div>
    </div>
  );
}
