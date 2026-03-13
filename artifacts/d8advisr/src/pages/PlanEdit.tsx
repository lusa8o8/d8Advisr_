import { useLocation } from "wouter";
import { ArrowLeft, GripVertical, Plus, Trash2 } from 'lucide-react';

export function PlanEdit() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex-1 min-h-0 bg-background flex flex-col relative overflow-y-auto no-scrollbar pb-24">
      {/* Header */}
      <div className="bg-card px-6 pt-14 pb-4 flex justify-between items-center sticky top-0 z-20 shadow-sm border-b border-border">
        <div className="flex items-center gap-4">
          <button onClick={() => setLocation('/plan/1')} className="text-foreground hover:opacity-70">
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-bold text-foreground text-xl">Edit Plan</h1>
        </div>
      </div>

      <div className="px-6 py-6 pb-28 flex flex-col gap-8">
        
        <div>
           <h3 className="font-bold text-foreground mb-4 text-sm uppercase tracking-wider text-muted-foreground">Itinerary Steps</h3>
           
           <div className="flex flex-col gap-3">
              {/* Step 1 */}
              <div className="bg-card border border-border rounded-2xl p-4 flex gap-3 shadow-sm">
                <div className="flex items-center text-gray-300">
                  <GripVertical size={20} />
                </div>
                <div className="flex-1">
                   <input type="text" defaultValue="Lumina Restaurant" className="font-bold text-foreground w-full bg-transparent focus:outline-none mb-1 text-[16px]" />
                   <div className="flex gap-2">
                     <input type="time" defaultValue="19:00" className="bg-background text-sm font-medium text-foreground px-2 py-1 rounded-md border border-border focus:outline-none" />
                   </div>
                </div>
                <button className="text-red-400 hover:text-red-600 p-2">
                  <Trash2 size={18} />
                </button>
              </div>

              {/* Step 2 */}
              <div className="bg-card border border-border rounded-2xl p-4 flex gap-3 shadow-sm">
                <div className="flex items-center text-gray-300">
                  <GripVertical size={20} />
                </div>
                <div className="flex-1">
                   <input type="text" defaultValue="Riverfront Walk" className="font-bold text-foreground w-full bg-transparent focus:outline-none mb-1 text-[16px]" />
                   <div className="flex gap-2">
                     <input type="time" defaultValue="20:30" className="bg-background text-sm font-medium text-foreground px-2 py-1 rounded-md border border-border focus:outline-none" />
                   </div>
                </div>
                <button className="text-red-400 hover:text-red-600 p-2">
                  <Trash2 size={18} />
                </button>
              </div>
              
              {/* Add Step */}
              <button className="w-full py-4 border-2 border-dashed border-border rounded-2xl text-muted-foreground font-semibold flex items-center justify-center gap-2 hover:bg-card hover:text-foreground transition-colors mt-2">
                 <Plus size={20} /> Add Another Stop
              </button>
           </div>
        </div>

        <div>
           <h3 className="font-bold text-foreground mb-4 text-sm uppercase tracking-wider text-muted-foreground">Adjust Budget Target</h3>
           <div className="bg-card p-5 border border-border rounded-2xl shadow-sm">
              <div className="flex justify-between items-center mb-4">
                 <span className="font-medium text-foreground">Target Amount</span>
                 <span className="font-bold text-primary text-xl">$150</span>
              </div>
              <input type="range" min="50" max="300" defaultValue="150" className="w-full accent-primary h-2 bg-background rounded-lg appearance-none" />
           </div>
        </div>

        <div>
           <h3 className="font-bold text-foreground mb-4 text-sm uppercase tracking-wider text-muted-foreground">Notes</h3>
           <textarea 
             placeholder="Add notes for this plan..." 
             className="w-full bg-card border border-border rounded-2xl p-4 min-h-[120px] text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
           />
        </div>

      </div>

      <div className="fixed bottom-0 w-full max-w-[430px] bg-card border-t border-border p-6 flex items-center gap-4 z-20">
        <button onClick={() => setLocation('/plan/1')} className="font-bold text-muted-foreground hover:text-foreground px-4">Cancel</button>
        <button 
          onClick={() => setLocation('/plan/1')}
          className="flex-1 bg-primary text-primary-foreground py-4 rounded-xl font-bold text-[17px] shadow-md active:scale-95 transition-all"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
