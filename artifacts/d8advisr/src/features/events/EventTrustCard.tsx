import { ExternalLink, Info, ShieldCheck } from 'lucide-react';
import { presentEventTrust, type PublicEventAction, type PublicEventSource } from './eventTrust';

function checkedLabel(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function EventTrustCard(props: {
  eventStatus: 'live' | 'cancelled';
  isImported: boolean;
  sources: PublicEventSource[];
  actions: PublicEventAction[];
}) {
  const presentation = presentEventTrust(props);
  if (!presentation.citation && presentation.action.kind === 'hidden') return null;

  const citation = presentation.citation;
  const checked = checkedLabel(citation?.last_checked_at ?? null);

  return (
    <section aria-labelledby="event-details-actions" className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <ShieldCheck size={18} aria-hidden="true" />
        </div>
        <h2 id="event-details-actions" className="font-bold text-gray-900 text-[15px]">Official details</h2>
      </div>
      <div className="mt-3 min-w-0">

          {presentation.action.kind === 'active' && (
            <>
              <a
                href={presentation.action.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-12 px-4 py-3 rounded-xl bg-primary text-white font-bold text-[14px] flex items-center justify-center gap-2 text-center hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {presentation.action.label}
                <ExternalLink size={15} aria-hidden="true" />
              </a>
              <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
                You’ll continue to {presentation.action.providerName}. D8Advisr does not process this transaction.
              </p>
            </>
          )}

          {presentation.action.kind === 'sold_out' && (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-[13px] font-semibold text-amber-800">
              Sold out on {presentation.action.providerName}
            </p>
          )}
          {presentation.action.kind === 'closed' && (
            <p className="mt-3 rounded-xl bg-gray-100 px-3 py-2.5 text-[13px] font-semibold text-gray-700">
              Registration is closed on {presentation.action.providerName}
            </p>
          )}
          {presentation.action.kind === 'cancelled' && (
            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-[13px] font-semibold text-red-700">
              External booking actions are unavailable because this event is cancelled.
            </p>
          )}
          {presentation.action.kind === 'unavailable' && (
            <p className="mt-3 rounded-xl bg-gray-100 px-3 py-2.5 text-[13px] font-semibold text-gray-700">
              External ticket or registration details are not available right now.
            </p>
          )}

          {citation && (
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-start gap-2 text-[11px] leading-relaxed text-gray-500">
              <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
              <p className="min-w-0">
                Information from{' '}
                <a
                  href={citation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-gray-700 underline decoration-gray-300 underline-offset-2 break-words focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {citation.publisher_name}
                </a>
                {checked ? ` · checked ${checked}` : ''}
                {citation.source_title ? <span className="block text-gray-400 break-words">{citation.source_title}</span> : null}
              </p>
            </div>
          )}
      </div>
    </section>
  );
}
