import { useState } from 'react';
import { useLocation } from "wouter";
import { ArrowLeft, Clock, Share2, Edit3, Wallet, X, Check, Map } from 'lucide-react';
import { useRegion } from "@/hooks/useRegion";
import { cn, consumerDesktopClass, consumerSheetWidthClass } from "@/components/SharedUI";

const WEEKLY_PRESETS = [10, 20, 30, 50];
const PLAN_TIP_ESTIMATE = 16;
const PLAN_ESTIMATE = 116;

function wholeAmountInput(value: string) {
  return value.replace(/\D/g, '');
}

export function PlanDetail() {
  const [, setLocation] = useLocation();
  const { formatPrice, activeRegion } = useRegion();
  const [showStash, setShowStash] = useState(false);
  const [stashGoal, setStashGoal] = useState(String(PLAN_ESTIMATE));
  const [autoSave, setAutoSave] = useState<number | 'custom'>(20);
  const [customAutoSave, setCustomAutoSave] = useState('');
  const [stashDone, setStashDone] = useState(false);

  const stashGoalAmount = Number(stashGoal);
  const weeklyAmount = autoSave === 'custom' ? Number(customAutoSave) : autoSave;
  const canStartSaving = Number.isFinite(stashGoalAmount)
    && stashGoalAmount > 0
    && Number.isFinite(weeklyAmount)
    && weeklyAmount > 0;
  const estimatedWeeks = canStartSaving ? Math.ceil(stashGoalAmount / weeklyAmount) : null;

  return (
    <div className="flex-1 min-h-0 bg-background flex flex-col relative overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="bg-card pt-10 lg:pt-14 pb-5 lg:pb-6 shadow-sm z-20 sticky top-0 border-b border-border">
        <div className={cn(consumerDesktopClass('standard'), "px-6")}>
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => setLocation('/plans')}
            aria-label="Back to My Plans"
            className="w-10 h-10 bg-background rounded-full flex items-center justify-center text-foreground hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="bg-[#FFF3E8] text-[#FF9500] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 border border-[#FF9500]/20">
            <div className="w-1.5 h-1.5 rounded-full bg-[#FF9500]"></div> Upcoming
          </div>
          <button className="w-10 h-10 bg-background rounded-full flex items-center justify-center text-foreground hover:bg-gray-200 transition-colors">
            <Share2 size={18} />
          </button>
        </div>
        
        <h1 className="text-[28px] font-bold text-foreground leading-tight mb-2">Date Night Downtown</h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium">
          <span className="flex items-center gap-1.5"><Clock size={16} /> Tonight, 7:00 PM</span>
        </div>
        </div>
      </div>

      <div className={cn(consumerDesktopClass('standard'), "px-6 py-6 pb-12")}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-foreground">Itinerary</h2>
          <button onClick={() => setLocation('/plan/1/edit')} className="text-primary font-semibold text-sm flex items-center gap-1 hover:opacity-80">
            <Edit3 size={14} /> Edit Plan
          </button>
        </div>

        {/* Timeline */}
        <div className="bg-card rounded-3xl p-5 shadow-sm border border-border mb-8">
          <div className="flex flex-col gap-6 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-background">
            
            <div className="flex gap-4 relative z-10">
              <div className="w-10 h-10 rounded-full bg-foreground text-card border-2 border-card flex items-center justify-center font-bold text-sm shadow-sm shrink-0">1</div>
              <div className="flex-1 pt-0.5">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-foreground text-[16px]">Lumina Restaurant</h3>
                  <span className="font-bold text-[#00C851]">{formatPrice(85)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <span className="bg-background px-2 py-0.5 rounded text-xs font-semibold text-foreground">7:00 PM</span>
                  <span>•</span>
                  <span>Dinner</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4 relative z-10">
              <div className="w-10 h-10 rounded-full bg-foreground text-card border-2 border-card flex items-center justify-center font-bold text-sm shadow-sm shrink-0">2</div>
              <div className="flex-1 pt-0.5">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-foreground text-[16px]">Riverfront Walk</h3>
                  <span className="font-bold text-[#00C851]">Free</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <span className="bg-background px-2 py-0.5 rounded text-xs font-semibold text-foreground">8:30 PM</span>
                  <span>•</span>
                  <span>Activity</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4 relative z-10">
              <div className="w-10 h-10 rounded-full bg-foreground text-card border-2 border-card flex items-center justify-center font-bold text-sm shadow-sm shrink-0">3</div>
              <div className="flex-1 pt-0.5">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-foreground text-[16px]">Sweeties Gelato</h3>
                  <span className="font-bold text-[#00C851]">{formatPrice(15)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <span className="bg-background px-2 py-0.5 rounded text-xs font-semibold text-foreground">9:15 PM</span>
                  <span>•</span>
                  <span>Dessert</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cost Review */}
        <h2 className="text-xl font-bold text-foreground mb-4">Cost Review</h2>
        <div className="bg-card rounded-3xl p-6 shadow-sm border border-border mb-6">
          <div className="flex justify-between text-[15px] mb-3">
            <span className="text-muted-foreground font-medium">Dinner</span>
            <span className="font-semibold text-foreground">{formatPrice(85)}</span>
          </div>
          <div className="flex justify-between text-[15px] mb-3">
            <span className="text-muted-foreground font-medium">Activity</span>
            <span className="font-bold text-[#00C851]">Free</span>
          </div>
          <div className="flex justify-between text-[15px] mb-4">
            <span className="text-muted-foreground font-medium">Dessert</span>
            <span className="font-semibold text-foreground">{formatPrice(15)}</span>
          </div>
          <div className="flex justify-between text-[15px] mb-5 text-gray-400 font-medium">
            <span>Est. Tip (18%)</span>
            <span>{formatPrice(PLAN_TIP_ESTIMATE)}</span>
          </div>
          
          <div className="border-t border-border pt-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="font-bold text-foreground text-[17px]">Total Estimate</span>
              <span className="font-bold text-2xl text-foreground">{formatPrice(PLAN_ESTIMATE)}</span>
            </div>
          </div>

          {/* Budget Bar */}
          <div className="bg-background p-4 rounded-xl border border-border/50 mb-4">
            <div className="flex justify-between text-xs font-bold mb-2">
              <span className="text-[#00C851] flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#00C851]"></div> Under Budget</span>
              <span className="text-muted-foreground">Target: {formatPrice(150)}</span>
            </div>
            <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="w-[76%] h-full bg-[#00C851] rounded-full"></div>
            </div>
          </div>

          {/* Fund in Stash CTA */}
          {stashDone ? (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#E8FFF0] border border-[#00C851]/30">
              <div className="w-9 h-9 rounded-full bg-[#00C851] flex items-center justify-center shrink-0">
                <Check size={16} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <p className="font-bold text-[#00C851] text-[14px] leading-tight">Stash fund created!</p>
                <p className="text-[12px] text-[#00C851]/70 font-medium mt-0.5">Saving {formatPrice(weeklyAmount)}/wk for Date Night Downtown</p>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowStash(true)}
              className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed border-border bg-background hover:border-primary hover:bg-primary/5 transition-all active:scale-[0.98] text-left"
            >
              <div className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground shrink-0">
                <Wallet size={18} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-foreground text-[14px]">Fund this in your Stash</p>
                <p className="text-[12px] text-muted-foreground mt-0.5">Save a little each week to cover this</p>
              </div>
              <span className="text-primary font-bold text-[13px] shrink-0">Set up</span>
            </button>
          )}
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setLocation('/map')}
            className="w-full max-w-xs flex items-center justify-center gap-2.5 rounded-2xl border-2 border-border bg-card px-5 py-3.5 text-[14px] font-bold text-foreground shadow-sm transition-all hover:border-primary/40 hover:text-primary active:scale-[0.98]"
          >
            <Map size={19} />
            View plan on map
          </button>
        </div>
      </div>

      {/* Fund in Stash Sheet */}
      {showStash && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowStash(false)} />
          <div className={cn(consumerSheetWidthClass, "relative bg-card rounded-t-3xl lg:rounded-3xl px-6 pt-5 pb-12 shadow-2xl animate-in slide-in-from-bottom-full duration-300 max-h-[90vh] overflow-y-auto no-scrollbar")}>

            {/* Header */}
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-[18px] font-bold text-foreground">Fund in your Stash</h3>
              <button onClick={() => setShowStash(false)} className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground">
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-5">Set a weekly auto-save to cover this plan's cost.</p>

            {/* Plan summary chip */}
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-background border border-border mb-6">
              <span className="text-2xl">🍷</span>
              <div className="flex-1">
                <p className="font-bold text-foreground text-[14px] leading-tight">Date Night Downtown</p>
                <p className="text-[12px] text-muted-foreground font-medium mt-0.5">3 stops · Tonight, 7:00 PM</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-foreground text-[17px]">{formatPrice(PLAN_ESTIMATE)}</p>
                <p className="text-[11px] text-muted-foreground font-medium">total</p>
              </div>
            </div>

            {/* Savings goal */}
            <div className="mb-5">
              <label htmlFor="stash-goal" className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Goal ({activeRegion.currency_symbol})
              </label>
              <input
                id="stash-goal"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={stashGoal}
                onChange={(event) => setStashGoal(wholeAmountInput(event.target.value))}
                className="w-full bg-background border border-border rounded-xl px-4 py-3.5 text-foreground font-medium focus:outline-none focus:border-primary"
              />
              <p className="text-[11px] text-muted-foreground mt-1.5">Prefilled from this plan's current estimate.</p>
            </div>

            {/* Weekly save amount picker */}
            <div className="mb-5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 block">Auto-save weekly</label>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {WEEKLY_PRESETS.map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAutoSave(amt)}
                    aria-pressed={autoSave === amt}
                    className={cn(
                      'py-3 rounded-xl font-bold text-[15px] border-2 transition-all active:scale-95',
                      autoSave === amt
                        ? 'bg-primary text-white border-primary shadow-[0_4px_12px_-4px_rgba(255,90,95,0.5)]'
                        : 'bg-background text-foreground border-border hover:border-primary/50'
                    )}
                  >
                    {formatPrice(amt)}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setAutoSave('custom')}
                aria-pressed={autoSave === 'custom'}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition-all active:scale-[0.99] mb-3',
                  autoSave === 'custom'
                    ? 'bg-primary/10 text-primary border-primary'
                    : 'bg-background text-foreground border-border hover:border-primary/50'
                )}
              >
                <span className="font-bold text-[14px]">Custom weekly commitment</span>
                <span className="text-[12px] font-semibold">
                  {autoSave === 'custom' && Number(customAutoSave) > 0
                    ? formatPrice(Number(customAutoSave))
                    : 'Enter amount'}
                </span>
              </button>
              {autoSave === 'custom' && (
                <div className="mb-4">
                  <label htmlFor="custom-auto-save" className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                    Auto-save /wk ({activeRegion.currency_symbol})
                  </label>
                  <input
                    id="custom-auto-save"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={customAutoSave}
                    onChange={(event) => setCustomAutoSave(wholeAmountInput(event.target.value))}
                    placeholder="Enter your weekly amount"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3.5 text-foreground font-medium focus:outline-none focus:border-primary"
                  />
                </div>
              )}
              {/* ETA indicator */}
              <div className="flex items-center justify-between px-1">
                <span className="text-[12px] text-muted-foreground font-medium">Estimated time to save</span>
                <span className="text-[13px] font-bold text-foreground">
                  {estimatedWeeks === null
                    ? 'Enter valid amounts'
                    : `~${estimatedWeeks} ${estimatedWeeks === 1 ? 'week' : 'weeks'}`}
                </span>
              </div>
            </div>

            {/* Fund name (pre-filled) */}
            <div className="mb-5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Stash fund name</label>
              <input
                type="text"
                defaultValue="Date Night Downtown"
                className="w-full bg-background border border-border rounded-xl px-4 py-3.5 text-foreground font-medium focus:outline-none focus:border-primary"
              />
            </div>

            <button
              type="button"
              disabled={!canStartSaving}
              onClick={() => { setShowStash(false); setStashDone(true); }}
              className="w-full bg-primary text-white py-4 rounded-xl font-bold text-[16px] shadow-[0_8px_20px_-6px_rgba(255,90,95,0.5)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {canStartSaving ? `Start Saving ${formatPrice(weeklyAmount)}/wk` : 'Enter valid amounts'} ✨
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
