import { useState } from 'react';
import { useLocation } from 'wouter';
import {
  Plus, ChevronRight, AlertCircle, CheckCircle,
  Clock, Pause, Users, Edit3, Bell, Loader2, LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PartnerEvent } from '@workspace/d8-core/types';
import {
  LISTING_STATUS_PILL as STATUS_PILL,
  EVENT_STATUS_PILL,
  FREQ_LABEL,
} from '@workspace/d8-core/constants';
import { usePartner } from '@/hooks/usePartner';
import { usePartnerNotifications } from '@/hooks/usePartnerNotifications';
import { canManageEvents, canManageVenues } from '@workspace/d8-core/partner-capabilities';
import { useAuth } from '@workspace/d8-core/auth';

function SpotsBar({ filled, total }: { filled: number; total: number }) {
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
  const almostFull = pct >= 80;
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[11px] text-gray-400 font-medium">{filled}/{total} spots filled</span>
        <span className={cn('text-[11px] font-bold', almostFull ? 'text-primary' : 'text-[#00C851]')}>
          {total - filled} left
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', almostFull ? 'bg-primary' : 'bg-[#00C851]')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function PartnerDashboard() {
  const [, setLocation] = useLocation();
  const { signOut } = useAuth();
  const {
    profile,
    events,
    venueListing,
    venuePlacementRequests,
    demandSignals,
    reviewInsights,
    loading,
    error,
    toggleEventStatus,
    publishEvent,
    updateVenuePlacementStatus,
  } = usePartner();
  const { unreadCount } = usePartnerNotifications();
  const [actionError, setActionError] = useState<string | null>(null);

  const handleSignOut = async () => {
    await signOut();
    setLocation('/');
  };

  const handleToggle = async (event: PartnerEvent) => {
    try {
      setActionError(null);
      await toggleEventStatus(event.id, event.status);
    } catch {
      setActionError('Failed to update event status. Please try again.');
    }
  };

  const handlePublish = async (id: string) => {
    try {
      setActionError(null);
      await publishEvent(id);
    } catch {
      setActionError('Failed to publish event. Please try again.');
    }
  };

  const handleVenuePlacement = async (eventId: string, status: 'approved' | 'rejected') => {
    try {
      setActionError(null);
      await updateVenuePlacementStatus(eventId, status);
    } catch {
      setActionError('Failed to update venue page request. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center bg-[#F7F7F7]">
        <Loader2 size={24} className="text-primary animate-spin" />
      </div>
    );
  }

  if (!profile) {
    setLocation('/');
    return null;
  }

  const typeLabel =
    profile.partner_type === 'venue' ? 'Venue' :
    profile.partner_type === 'organizer' ? 'Organiser' :
    'Venue & Organiser';
  const canCreateEvents = canManageEvents(profile.partner_type);
  const canEditVenue = canManageVenues(profile.partner_type);
  const venueInReview = Boolean(
    venueListing
    && (venueListing.status !== 'live' || venueListing.verificationStatus === 'reverify_required' || venueListing.hasPendingRevision)
  );
  const venueListingCopy = !venueListing
    ? {
        title: 'Complete your venue listing',
        body: 'Your partner account is approved. Add venue details so D8 can review the listing before it appears publicly.',
        action: 'Complete listing',
      }
    : venueListing.status === 'live' && (venueListing.verificationStatus === 'reverify_required' || venueListing.hasPendingRevision)
      ? {
          title: 'Listing in review',
          body: 'Your venue is still visible while D8 reviews the latest updates.',
          action: 'Edit listing',
        }
      : venueListing.status === 'live'
        ? {
            title: 'Your venue listing is live',
            body: 'Your venue is visible in D8Advisr search and discovery.',
            action: 'Edit listing',
          }
        : {
            title: 'Listing in review',
            body: 'D8 is reviewing your venue listing before it appears publicly.',
            action: 'Edit listing',
          };

  return (
    <div className="flex-1 min-h-0 bg-[#F7F7F7] flex flex-col overflow-y-auto no-scrollbar pb-10">

      {/* Header */}
      <div className="bg-[#111] px-5 pt-12 pb-5 shrink-0">
        <div className="flex items-center justify-end mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLocation('/notifications')}
              className="relative w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-95 transition-transform"
              aria-label="Partner notifications"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 min-w-4 h-4 px-1 rounded-full bg-primary text-white text-[9px] font-black flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => void handleSignOut()}
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white active:scale-95 transition-all"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
            {canCreateEvents && (
              <button
                onClick={() => setLocation('/event/new')}
                className="flex items-center gap-1.5 bg-primary text-white text-[12px] font-bold px-3.5 py-2 rounded-full active:scale-95 transition-transform"
              >
                <Plus size={13} /> Add event
              </button>
            )}
          </div>
        </div>

        <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest mb-0.5">D8 Partner</p>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-white font-black text-[20px] leading-tight">{profile.name}</h1>
            <p className="text-white/50 text-[12px] font-medium mt-0.5">{typeLabel} · {profile.city}</p>
          </div>
          <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 mt-1', STATUS_PILL[profile.status].color)}>
            {STATUS_PILL[profile.status].label}
          </span>
        </div>
      </div>

      <div className="px-4 pt-5 flex flex-col gap-5">

        {/* Error notice */}
        {(error || actionError) && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-[12px] text-red-700 font-medium leading-relaxed">{error || actionError}</p>
          </div>
        )}

        {/* Pending review notice */}
        {profile.status === 'pending' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[12px] text-amber-700 font-medium leading-relaxed">
              Your application is under review. You'll be notified within 48 hours once it's approved.
            </p>
          </div>
        )}

        {/* Venue listing status */}
        {canEditVenue && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
            <div className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
              !venueInReview && venueListing?.status === 'live'
                ? 'bg-[#E8FFF0] text-[#00C851]'
                : 'bg-gray-50 text-gray-500'
            )}>
              {!venueInReview && venueListing?.status === 'live'
                ? <CheckCircle size={17} />
                : <Clock size={17} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-gray-900 text-[14px] leading-tight">{venueListingCopy.title}</p>
                  <p className="text-[12px] text-gray-500 font-medium mt-1 leading-relaxed">{venueListingCopy.body}</p>
                </div>
                {venueListing && (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-gray-50 text-gray-500 border border-gray-100 shrink-0">
                    {venueInReview ? 'in review' : venueListing.status.replace('_', ' ')}
                  </span>
                )}
              </div>
              <button
                onClick={() => setLocation('/venue/edit')}
                className="mt-3 text-[12px] font-bold text-primary"
              >
                {venueListingCopy.action}
              </button>
            </div>
          </div>
        )}

        {/* Venue page requests */}
        {canEditVenue && venuePlacementRequests.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Venue page requests</p>
              <span className="text-[11px] font-black text-primary">{venuePlacementRequests.length}</span>
            </div>
            <div className="flex flex-col divide-y divide-gray-50">
              {venuePlacementRequests.map(request => (
                <div key={request.eventId} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 text-[14px] leading-tight">{request.eventName}</p>
                      <p className="text-[11px] text-gray-400 font-medium mt-1">
                        {request.eventCategory} wants to appear on {request.venueName}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100 shrink-0">
                      Review
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <button
                      onClick={() => void handleVenuePlacement(request.eventId, 'approved')}
                      className="bg-[#00C851] text-white rounded-xl font-bold text-[12px] py-2.5 active:scale-95 transition-transform flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle size={13} /> Approve
                    </button>
                    <button
                      onClick={() => void handleVenuePlacement(request.eventId, 'rejected')}
                      className="bg-gray-100 text-gray-600 rounded-xl font-bold text-[12px] py-2.5 active:scale-95 transition-transform hover:bg-red-50 hover:text-red-600"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* Demand signals */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">This week</p>
          </div>
          {demandSignals.length === 0 ? (
            <div className="px-4 py-5">
              <p className="text-[13px] text-gray-500 font-semibold">No demand signals yet</p>
              <p className="text-[11px] text-gray-400 font-medium mt-1">
                Insights will appear after users interact with your listing or events.
              </p>
            </div>
          ) : (
            demandSignals.map((sig, i) => (
              <div
                key={`${sig.label}-${i}`}
                className={cn(
                  'flex items-center gap-4 px-4 py-3.5',
                  i < demandSignals.length - 1 ? 'border-b border-gray-50' : ''
                )}
              >
                <span className="text-[28px] font-black text-gray-900 w-10 text-center leading-none shrink-0">
                  {sig.count}
                </span>
                <div>
                  <p className="font-semibold text-gray-800 text-[13px] leading-tight">{sig.label}</p>
                  <p className="text-[11px] text-gray-400 font-medium mt-0.5">{sig.context}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Review insights */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Review insights</p>
          </div>
          {reviewInsights.length === 0 ? (
            <div className="px-4 py-5">
              <p className="text-[13px] text-gray-500 font-semibold">No review insights yet</p>
              <p className="text-[11px] text-gray-400 font-medium mt-1">
                Aggregates will appear after users review plans that include your venue.
              </p>
            </div>
          ) : (
            reviewInsights.map(insight => (
              <div key={insight.venueId} className="px-4 py-3.5 border-b border-gray-50 last:border-b-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-800 text-[13px] leading-tight">{insight.venueName}</p>
                    <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                      {insight.reviewCount} review{insight.reviewCount === 1 ? '' : 's'} in the last 30 days
                    </p>
                  </div>
                  <span className="text-[18px] font-black text-gray-900 leading-none">
                    {insight.avgRating?.toFixed(1) ?? '-'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="rounded-xl bg-gray-50 px-3 py-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Vibe</p>
                    <p className="text-[13px] font-bold text-gray-800">{insight.avgVibe?.toFixed(1) ?? '-'}/5</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 px-3 py-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Value</p>
                    <p className="text-[13px] font-bold text-gray-800">{insight.avgValue?.toFixed(1) ?? '-'}/5</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Events */}
        {canCreateEvents && (
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Your events</p>
            <button
              onClick={() => setLocation('/event/new')}
              className="text-[12px] font-bold text-primary flex items-center gap-1"
            >
              <Plus size={13} /> New event
            </button>
          </div>

          {events.length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
              <p className="text-gray-400 text-[14px] font-medium">No events yet</p>
              <p className="text-gray-300 text-[12px] mt-1">Add an event to start appearing in user plans</p>
              <button
                onClick={() => setLocation('/event/new')}
                className="mt-4 bg-primary text-white text-[13px] font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 mx-auto active:scale-95 transition-transform"
              >
                <Plus size={14} /> Add your first event
              </button>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {events.map(event => (
              <div key={event.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">

                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{event.emoji}</span>
                    <div>
                      <p className="font-bold text-gray-900 text-[14px] leading-tight">{event.name}</p>
                      <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                        {FREQ_LABEL[event.frequency]} · {event.category}
                      </p>
                    </div>
                  </div>
                  <span className={cn('text-[10px] font-bold px-2 py-1 rounded-full shrink-0', EVENT_STATUS_PILL[event.status].color)}>
                    {EVENT_STATUS_PILL[event.status].label}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                  <Clock size={12} className="text-gray-300 shrink-0" />
                  <span className="text-[12px] text-gray-500 font-medium">Next: {event.nextOccurrence}</span>
                  <span className="text-gray-300 mx-1">·</span>
                  {event.isFree ? (
                    <span className="text-[11px] font-bold text-[#00C851] bg-[#E8FFF0] px-2 py-0.5 rounded-full">Free</span>
                  ) : (
                    <span className="text-[12px] font-bold text-gray-700">{event.price}</span>
                  )}
                </div>

                {(event.status === 'live' || event.status === 'paused') && event.spotsTotal > 0 && (
                  <div className="mb-3">
                    <SpotsBar filled={event.spotsFilled} total={event.spotsTotal} />
                  </div>
                )}

                {(event.status === 'live' || event.status === 'paused') && event.spotsTotal === 0 && event.interestCount !== undefined && (
                  <div className="flex items-center gap-2 mb-3 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100">
                    <Users size={13} className="text-gray-400 shrink-0" />
                    <span className="text-[13px] font-bold text-gray-800">{event.interestCount}</span>
                    <span className="text-[12px] text-gray-400 font-medium">people planning to attend via D8</span>
                  </div>
                )}

                {event.locationKind === 'd8_venue' && event.venuePageStatus && (
                  <div className="mb-3">
                    <span className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold border',
                      event.venuePageStatus === 'approved' ? 'bg-green-50 text-[#00C851] border-green-100' :
                      event.venuePageStatus === 'requested' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                      event.venuePageStatus === 'rejected' ? 'bg-red-50 text-red-600 border-red-100' :
                      'bg-gray-50 text-gray-500 border-gray-100'
                    )}>
                      {event.venuePageStatus === 'approved' ? 'On venue page' :
                       event.venuePageStatus === 'requested' ? 'Venue page requested' :
                       event.venuePageStatus === 'rejected' ? 'Venue page rejected' :
                       'Venue page hidden'}
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t border-gray-50 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    {event.status === 'draft' && (
                      <button
                        onClick={() => handlePublish(event.id)}
                        className="flex items-center gap-1.5 bg-primary text-white text-[12px] font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform"
                      >
                        <CheckCircle size={13} /> Publish
                      </button>
                    )}
                    {event.status === 'live' && (
                      <button
                        onClick={() => handleToggle(event)}
                        className="flex items-center gap-1.5 bg-gray-100 text-gray-600 text-[12px] font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform hover:bg-gray-200"
                      >
                        <Pause size={13} /> Pause
                      </button>
                    )}
                    {event.status === 'paused' && (
                      <button
                        onClick={() => handleToggle(event)}
                        className="flex items-center gap-1.5 bg-[#E8FFF0] text-[#00C851] text-[12px] font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform"
                      >
                        <CheckCircle size={13} /> Resume
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setLocation(`/event/${event.id}/edit`)}
                      className="flex items-center gap-1.5 bg-gray-100 text-gray-600 text-[12px] font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform hover:bg-gray-200"
                    >
                      <Edit3 size={13} /> Edit
                    </button>
                    {event.spotsTotal > 0 && (
                      <button className="flex items-center gap-1.5 bg-gray-100 text-gray-600 text-[12px] font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform hover:bg-gray-200">
                        <Users size={13} /> Attendees
                      </button>
                    )}
                    {event.spotsTotal === 0 && event.interestCount !== undefined && (
                      <button className="flex items-center gap-1.5 bg-gray-100 text-gray-600 text-[12px] font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform hover:bg-gray-200">
                        <Users size={13} /> {event.interestCount} going
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Social channels */}
        <div className="relative bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Social channels</p>
            <span className="text-[11px] font-bold text-gray-400">Coming soon</span>
          </div>
          <div className="relative">
            <div className="pointer-events-none select-none blur-[2px] opacity-45 px-4 py-4">
              <p className="text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-2">Channels</p>
              <div className="flex flex-wrap gap-2">
                {['Instagram', 'Facebook Page', 'WhatsApp Business', 'TikTok'].map(name => (
                  <div key={name} className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                    <div className="w-6 h-6 rounded-md bg-gray-300" />
                    <span className="text-[12px] font-semibold text-gray-500">{name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center px-5 text-center">
              <div>
                <p className="font-black text-gray-900 text-[14px]">Coming soon</p>
                <p className="text-[12px] text-gray-500 font-medium mt-1 leading-relaxed">
                  For now, add and manage events inside D8Advisr.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Listing management */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Your listing</p>
          </div>
          {canEditVenue && (
            <button
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors active:bg-gray-100"
              onClick={() => setLocation('/venue/edit')}
            >
              <div>
                <p className="font-semibold text-gray-800 text-[13px]">Edit venue details</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Name, hours, address, photos, contact</p>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </button>
          )}
          {canCreateEvents && (
            <button
              className={cn(
                "w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors active:bg-gray-100",
                canEditVenue && "border-t border-gray-50"
              )}
              onClick={() => setLocation('/event/new')}
            >
              <div>
                <p className="font-semibold text-gray-800 text-[13px]">Add a recurring activity</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Jazz night, brunch, fitness class — propagates automatically</p>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
