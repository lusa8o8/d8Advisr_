import type { EventScheduleParts } from '@workspace/d8-core/event-policy';

const inputClass = 'w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-[12px] text-gray-900 outline-none focus:border-[#FF5A5F] focus:ring-1 focus:ring-[#FF5A5F]';

export function AdminImportedEventSchedule({
  value,
  onChange,
}: {
  value: EventScheduleParts;
  onChange: (next: EventScheduleParts) => void;
}) {
  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
      <div className="mb-3">
        <p className="text-[12px] font-black text-amber-950">Researched event schedule</p>
        <p className="mt-0.5 text-[10px] leading-relaxed text-amber-800">
          Enter the schedule shown by the evidence source. End date and time are optional, but both are required when the event has an end.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-amber-800">Start date</span>
          <input required type="date" className={inputClass} value={value.startDate} onChange={event => onChange({ ...value, startDate: event.target.value })} />
        </label>
        <label>
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-amber-800">Start time</span>
          <input required type="time" className={inputClass} value={value.startTime} onChange={event => onChange({ ...value, startTime: event.target.value })} />
        </label>
        <label>
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-amber-800">End date (optional)</span>
          <input type="date" min={value.startDate || undefined} className={inputClass} value={value.endDate} onChange={event => onChange({ ...value, endDate: event.target.value })} />
        </label>
        <label>
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-amber-800">End time (optional)</span>
          <input type="time" className={inputClass} value={value.endTime} onChange={event => onChange({ ...value, endTime: event.target.value })} />
        </label>
      </div>
      <p className="mt-2 text-[10px] text-amber-700">Multi-day events may use a later end date. Unknown end schedules can stay blank.</p>
    </section>
  );
}
