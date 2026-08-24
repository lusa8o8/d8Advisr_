import { useState } from 'react';
import { useLocation } from 'wouter';
import {
  Plus, ChevronRight, AlertCircle, CheckCircle,
  Clock, Pause, Edit3, Bell, Loader2, LogOut, Ban, MapPin, RotateCcw, ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PartnerEvent, PartnerEventVenueWorkflow } from '@workspace/d8-core/types';
import {
  LISTING_STATUS_PILL as STATUS_PILL,
  EVENT_STATUS_PILL,
  FREQ_LABEL,
} from '@workspace/d8-core/constants';
import { usePartner } from '@/hooks/usePartner';
import { usePartnerNotifications } from '@/hooks/usePartnerNotifications';
import { canManageEvents, canManageVenues } from '@workspace/d8-core/partner-capabilities';
import { useAuth } from '@workspace/d8-core/auth';

export function PartnerDashboard() {
  const [, setLocation] = useLocation();
  const { signOut } = useAuth();
  const {
    profile,
    events,
    venueListing,
    eventVenueWorkflows,
    demandSignals,
    reviewInsights,
    loading,
    error,
    pauseEvent,
    cancelEvent,
    decideVenuePlacement,
    resubmitVenuePlacement,
    reportVenueAttribution,
    respondToVenueDispute,
  } = usePartner();
  const { unreadCount } = usePartnerNotifications();
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancellingEvent, setCancellingEvent] = useState<PartnerEvent | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancellationAccepted, setCancellationAccepted] = useState(false);
  const [cancellationInterestedCount, setCancellationInterestedCount] = useState(0);
  const [cancellationLoading, setCancellationLoading] = useState(false);
  const [workflowAction, setWorkflowAction] = useState<{
    workflow: PartnerEventVenueWorkflow;
    action: 'approved' | 'declined' | 'revoked' | 'report' | 'resubmit' | 'respond';
  } | null>(null);
  const [workflowReason, setWorkflowReason] = useState('');
  const [workflowLoading, setWorkflowLoading] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setLocation('/');
  };

  const handleToggle = async (event: PartnerEvent) => {
    if (event.status !== 'live') {
      setLocation(`/event/${event.id}/edit`);
      return;
    }
    try {
      setActionError(null);
      await pauseEvent(event.id);
    } catch {
      setActionError('Failed to update event status. Please try again.');
    }
  };

  const handlePublish = async (id: string) => {
    setActionError(null);
    setLocation(`/event/${id}/edit`);
  };

  const requestCancellation = async (event: PartnerEvent) => {
    setActionError(null);
    setCancellationLoading(true);
    try {
      const preview = await cancelEvent(event, false);
      setCancellingEvent(event);
      setCancellationInterestedCount(preview.interested_count ?? 0);
      setCancellationReason('');
      setCancellationAccepted(false);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Could not prepare cancellation.');
    } finally {
      setCancellationLoading(false);
    }
  };

  const confirmCancellation = async () => {
    if (!cancellingEvent || !cancellationAccepted || cancellationLoading) return;
    setCancellationLoading(true);
    setActionError(null);
    try {
      await cancelEvent(cancellingEvent, true, cancellationReason);
      setCancellingEvent(null);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Could not cancel the event.');
    } finally {
      setCancellationLoading(false);
    }
  };

  const openWorkflowAction = (
    workflow: PartnerEventVenueWorkflow,
    action: 'approved' | 'declined' | 'revoked' | 'report' | 'resubmit' | 'respond',
  ) => {
    setWorkflowAction({ workflow, action });
    setWorkflowReason(action === 'respond' ? workflow.responseReason ?? '' : '');
    setActionError(null);
  };

  const submitWorkflowAction = async () => {
    if (!workflowAction || workflowLoading) return;
    const reason = workflowReason.trim();
    if ((workflowAction.action === 'report' || workflowAction.action === 'respond') && !reason) return;
    if (workflowAction.action === 'respond' && workflowAction.workflow.responseReason?.trim() === reason) return;
    setWorkflowLoading(true);
    try {
      setActionError(null);
      if (workflowAction.action === 'report') {
        await reportVenueAttribution(workflowAction.workflow, reason);
      } else if (workflowAction.action === 'respond') {
        await respondToVenueDispute(workflowAction.workflow, reason);
      } else if (workflowAction.action === 'resubmit') {
        await resubmitVenuePlacement(workflowAction.workflow, reason);
      } else {
        await decideVenuePlacement(workflowAction.workflow, workflowAction.action, reason);
      }
      setWorkflowAction(null);
      setWorkflowReason('');
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Failed to update the venue workflow. Please refresh and try again.');
    } finally {
      setWorkflowLoading(false);
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
  const venueManagedWorkflows = eventVenueWorkflows.filter(workflow =>
    workflow.canManageVenue
    && workflow.attributionStatus !== 'resolved_invalid'
    && workflow.placementStatus !== 'withdrawn'
  );
  const workflowByEvent = new Map(
    eventVenueWorkflows
      .filter(workflow => workflow.canManageEvent)
      .map(workflow => [workflow.eventId, workflow]),
  );
  const dashboardName = canEditVenue && venueListing?.name ? venueListing.name : profile.name;
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
    : venueListing.status === 'needs_update'
      ? {
          title: 'Listing needs updates',
          body: venueListing.reverificationReason
            ? `D8 review: ${venueListing.reverificationReason}`
            : 'D8 needs more information before this venue can appear publicly.',
          action: 'Update and resubmit',
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
            <h1 className="text-white font-black text-[20px] leading-tight">{dashboardName}</h1>
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
                    {venueListing.status === 'needs_update'
                      ? 'needs update'
                      : venueInReview ? 'in review' : venueListing.status.replace('_', ' ')}
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

        {/* Venue attribution and venue-page placement */}
        {canEditVenue && venueManagedWorkflows.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Events identifying your venue</p>
                <p className="mt-1 text-[11px] text-gray-400">Location attribution is separate from Upcoming here placement.</p>
              </div>
              <span className="text-[11px] font-black text-primary">{venueManagedWorkflows.length}</span>
            </div>
            <div className="flex flex-col divide-y divide-gray-50">
              {venueManagedWorkflows.map(workflow => (
                <div key={workflow.relationshipId} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 text-[14px] leading-tight">{workflow.eventName}</p>
                      <p className="text-[11px] text-gray-400 font-medium mt-1">
                        {workflow.eventCategory} by {workflow.organizerName}
                      </p>
                    </div>
                    <span className={cn(
                      'text-[10px] font-bold px-2 py-1 rounded-full border shrink-0',
                      workflow.attributionStatus === 'disputed'
                        ? 'bg-red-50 text-red-600 border-red-100'
                        : workflow.placementStatus === 'approved'
                          ? 'bg-green-50 text-[#00C851] border-green-100'
                          : workflow.placementStatus === 'requested'
                            ? 'bg-amber-50 text-amber-700 border-amber-100'
                            : 'bg-gray-50 text-gray-500 border-gray-100',
                    )}>
                      {workflow.attributionStatus === 'disputed' ? 'Reported' :
                       workflow.placementStatus === 'approved' ? 'On venue page' :
                       workflow.placementStatus === 'requested' ? 'Review placement' :
                       workflow.placementStatus}
                    </span>
                  </div>
                  {workflow.disputeReason && (
                    <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-[11px] leading-relaxed text-red-700">
                      Report: {workflow.disputeReason}
                      {workflow.responseReason && <span className="block mt-1 text-gray-600">Organizer response: {workflow.responseReason}</span>}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {workflow.attributionStatus !== 'disputed' && workflow.placementStatus === 'requested' && (
                      <>
                        <button
                          onClick={() => openWorkflowAction(workflow, 'approved')}
                          className="bg-[#00C851] text-white rounded-xl font-bold text-[12px] px-3 py-2.5 active:scale-95 transition-transform flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle size={13} /> Approve Upcoming here
                        </button>
                        <button
                          onClick={() => openWorkflowAction(workflow, 'declined')}
                          className="bg-gray-100 text-gray-600 rounded-xl font-bold text-[12px] px-3 py-2.5 active:scale-95 transition-transform hover:bg-red-50 hover:text-red-600"
                        >
                          Decline placement
                        </button>
                      </>
                    )}
                    {workflow.attributionStatus !== 'disputed' && workflow.placementStatus === 'approved' && (
                      <button
                        onClick={() => openWorkflowAction(workflow, 'revoked')}
                        className="bg-gray-100 text-gray-600 rounded-xl font-bold text-[12px] px-3 py-2.5 active:scale-95 transition-transform hover:bg-red-50 hover:text-red-600"
                      >
                        Remove from Upcoming here
                      </button>
                    )}
                    {workflow.attributionStatus !== 'disputed' && (
                      <button
                        onClick={() => openWorkflowAction(workflow, 'report')}
                        className="bg-red-50 text-red-600 rounded-xl font-bold text-[12px] px-3 py-2.5 active:scale-95 transition-transform flex items-center justify-center gap-1.5"
                      >
                        <ShieldAlert size={13} /> Report incorrect venue
                      </button>
                    )}
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
            {events.map(event => {
              const venueWorkflow = workflowByEvent.get(event.id);
              return (
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
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={cn('text-[10px] font-bold px-2 py-1 rounded-full', EVENT_STATUS_PILL[event.status].color)}>
                      {EVENT_STATUS_PILL[event.status].label}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                  <Clock size={12} className="text-gray-300 shrink-0" />
                  <span className="text-[12px] text-gray-500 font-medium">Next: {event.nextOccurrence}</span>
                  <span className="text-gray-300 mx-1">·</span>
                  {event.isFree ? (
                    <span className="text-[11px] font-bold text-[#00C851] bg-[#E8FFF0] px-2 py-0.5 rounded-full">Free entry</span>
                  ) : (
                    <span className="text-[12px] font-bold text-gray-700">{event.price}</span>
                  )}
                </div>

                {(event.status === 'live' || event.status === 'paused') && (
                  <div className="mb-3 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-[12px] font-bold text-gray-700">
                      {event.spotsTotal > 0 ? 'Up to ' + event.spotsTotal + ' attendees' : 'Open attendance'}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {event.spotsTotal > 0 ? 'Maximum attendance, not live availability' : 'No listed attendance limit'}
                    </p>
                  </div>
                )}

                {event.locationKind === 'd8_venue' && venueWorkflow && (
                  <div className={cn(
                    'mb-3 rounded-xl border px-3 py-2.5',
                    venueWorkflow.attributionStatus === 'disputed' ? 'border-red-100 bg-red-50' : 'border-gray-100 bg-gray-50',
                  )}>
                    <span className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold border',
                      venueWorkflow.attributionStatus === 'disputed' ? 'bg-red-50 text-red-600 border-red-100' :
                      venueWorkflow.placementStatus === 'approved' ? 'bg-green-50 text-[#00C851] border-green-100' :
                      venueWorkflow.placementStatus === 'requested' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                      'bg-gray-50 text-gray-500 border-gray-100'
                    )}>
                      <MapPin size={11} className="mr-1" />
                      {venueWorkflow.attributionStatus === 'disputed' ? 'Venue attribution disputed' :
                       venueWorkflow.placementStatus === 'approved' ? 'On venue page' :
                       venueWorkflow.placementStatus === 'requested' ? 'Venue-page review requested' :
                       venueWorkflow.placementStatus === 'declined' ? 'Venue-page placement declined' :
                       'Venue-page placement removed'}
                    </span>
                    <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
                      {venueWorkflow.attributionStatus === 'disputed'
                        ? `${venueWorkflow.venueName} reported that this event may not take place there.`
                        : `${venueWorkflow.venueName} remains the event location. Upcoming here placement is managed separately.`}
                    </p>
                    {venueWorkflow.disputeReason && (
                      <p className="mt-1 text-[11px] font-medium text-red-600">Report: {venueWorkflow.disputeReason}</p>
                    )}
                    {venueWorkflow.responseReason && (
                      <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Your response was sent</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-blue-800">{venueWorkflow.responseReason}</p>
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {venueWorkflow.attributionStatus === 'disputed' && (
                        <>
                          <button
                            type="button"
                            onClick={() => setLocation(`/event/${event.id}/edit`)}
                            className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-bold text-gray-700 border border-gray-200"
                          >
                            Correct venue
                          </button>
                          <button
                            type="button"
                            onClick={() => openWorkflowAction(venueWorkflow, 'respond')}
                            className="rounded-lg bg-red-600 px-2.5 py-1.5 text-[11px] font-bold text-white"
                          >
                            {venueWorkflow.responseReason ? 'Update response' : 'Add response'}
                          </button>
                        </>
                      )}
                      {venueWorkflow.attributionStatus !== 'disputed' && ['declined', 'revoked'].includes(venueWorkflow.placementStatus) && (
                        <button
                          type="button"
                          onClick={() => openWorkflowAction(venueWorkflow, 'resubmit')}
                          className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-bold text-primary border border-gray-200"
                        >
                          <RotateCcw size={11} /> Resubmit placement
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-gray-50 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    {event.status === 'draft' && (
                      <button
                        onClick={() => handlePublish(event.id)}
                        className="flex items-center gap-1.5 bg-primary text-white text-[12px] font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform"
                      >
                        <CheckCircle size={13} /> Review &amp; publish
                      </button>
                    )}
                    {event.status === 'live' && (
                      <>
                        <button
                          onClick={() => handleToggle(event)}
                          className="flex items-center gap-1.5 bg-gray-100 text-gray-600 text-[12px] font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform hover:bg-gray-200"
                        >
                          <Pause size={13} /> Pause
                        </button>
                        <button
                          onClick={() => void requestCancellation(event)}
                          disabled={cancellationLoading}
                          className="flex items-center gap-1.5 bg-red-50 text-red-600 text-[12px] font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform disabled:opacity-40"
                        >
                          <Ban size={13} /> Cancel event
                        </button>
                      </>
                    )}
                    {event.status === 'paused' && (
                      <button
                        onClick={() => handleToggle(event)}
                        className="flex items-center gap-1.5 bg-[#E8FFF0] text-[#00C851] text-[12px] font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform"
                      >
                        <CheckCircle size={13} /> Review &amp; resume
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {event.status !== 'cancelled' && (
                      <button
                        onClick={() => setLocation(`/event/${event.id}/edit`)}
                        className="flex items-center gap-1.5 bg-gray-100 text-gray-600 text-[12px] font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform hover:bg-gray-200"
                      >
                        <Edit3 size={13} /> Edit
                      </button>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </div>
        )}

        {workflowAction && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
            <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl">
              <div className="flex items-start gap-3">
                <div className={cn(
                  'grid h-10 w-10 shrink-0 place-items-center rounded-xl',
                  workflowAction.action === 'approved' ? 'bg-green-50 text-[#00C851]' :
                  workflowAction.action === 'report' || workflowAction.action === 'respond' ? 'bg-red-50 text-red-600' :
                  'bg-amber-50 text-amber-700',
                )}>
                  {workflowAction.action === 'approved' ? <CheckCircle size={20} /> :
                   workflowAction.action === 'resubmit' ? <RotateCcw size={20} /> :
                   <ShieldAlert size={20} />}
                </div>
                <div>
                  <h2 className="text-[18px] font-black text-gray-900">
                    {workflowAction.action === 'approved' ? 'Approve Upcoming here placement?' :
                     workflowAction.action === 'declined' ? 'Decline venue-page placement?' :
                     workflowAction.action === 'revoked' ? 'Remove from Upcoming here?' :
                     workflowAction.action === 'report' ? 'Report an incorrect venue?' :
                     workflowAction.action === 'resubmit' ? 'Resubmit venue-page placement?' :
                     workflowAction.workflow.responseReason ? 'Update your venue-report response' : 'Respond to the venue report'}
                  </h2>
                  <p className="mt-1 text-[12px] leading-relaxed text-gray-500">
                    {workflowAction.workflow.eventName} · {workflowAction.workflow.venueName}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-gray-50 p-4 text-[12px] leading-5 text-gray-600">
                {workflowAction.action === 'report'
                  ? 'Reporting disputes the public location attribution and removes venue-page placement while D8 reviews it. It does not give you control of the organizer’s event.'
                  : workflowAction.action === 'respond'
                    ? 'Your response is shared with the venue manager and retained in the relationship history. You can also correct or remove the venue in the event editor.'
                    : 'This decision controls only whether the event is promoted under Upcoming here. It does not edit, cancel, or hide the organizer’s event listing.'}
              </div>

              <label className="mt-4 block text-[11px] font-bold uppercase tracking-wider text-gray-500">
                {workflowAction.action === 'report' ? 'Why is this venue incorrect?' :
                 workflowAction.action === 'respond' ? 'Response' : 'Reason'}
                {!['report', 'respond'].includes(workflowAction.action) && <span className="normal-case text-gray-400"> (optional)</span>}
              </label>
              <textarea
                value={workflowReason}
                onChange={event => setWorkflowReason(event.target.value)}
                rows={3}
                placeholder={workflowAction.action === 'report'
                  ? 'This event is not scheduled at our venue…'
                  : workflowAction.action === 'respond'
                    ? 'Add context for D8 and the venue manager…'
                    : 'Add context for the other party…'}
                className="mt-1.5 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-[13px] outline-none focus:border-primary"
              />
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setWorkflowAction(null)}
                  disabled={workflowLoading}
                  className="flex-1 rounded-xl bg-gray-100 px-4 py-3 text-[13px] font-bold text-gray-600"
                >
                  Keep current state
                </button>
                <button
                  type="button"
                  onClick={() => void submitWorkflowAction()}
                  disabled={workflowLoading
                    || (['report', 'respond'].includes(workflowAction.action) && !workflowReason.trim())
                    || (workflowAction.action === 'respond'
                      && workflowAction.workflow.responseReason?.trim() === workflowReason.trim())}
                  className={cn(
                    'flex-1 rounded-xl px-4 py-3 text-[13px] font-bold text-white disabled:opacity-40',
                    workflowAction.action === 'approved' ? 'bg-[#00C851]' :
                    workflowAction.action === 'report' || workflowAction.action === 'respond' ? 'bg-red-600' : 'bg-primary',
                  )}
                >
                  {workflowLoading ? 'Saving…' :
                   workflowAction.action === 'approved' ? 'Approve placement' :
                   workflowAction.action === 'declined' ? 'Decline placement' :
                   workflowAction.action === 'revoked' ? 'Remove placement' :
                   workflowAction.action === 'report' ? 'Submit report' :
                   workflowAction.action === 'resubmit' ? 'Resubmit request' :
                   workflowAction.workflow.responseReason ? 'Update response' : 'Send response'}
                </button>
              </div>
            </div>
          </div>
        )}

        {cancellingEvent && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
            <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600"><Ban size={20} /></div>
                <div>
                  <h2 className="text-[18px] font-black text-gray-900">Cancel {cancellingEvent.name}?</h2>
                  <p className="mt-1 text-[12px] text-gray-500">This takes effect immediately and cannot be undone from the partner portal.</p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl bg-red-50 p-4 text-[12px] leading-5 text-red-700">
                The event will be marked as cancelled for about 24 hours, then removed from ordinary discovery. {cancellationInterestedCount > 0
                  ? `${cancellationInterestedCount} interested ${cancellationInterestedCount === 1 ? 'person' : 'people'} will be notified.`
                  : 'No interested people need to be notified right now.'}
              </div>
              <label className="mt-4 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Cancellation reason shown to consumers <span className="normal-case text-gray-400">(optional)</span></label>
              <textarea
                value={cancellationReason}
                onChange={event => setCancellationReason(event.target.value)}
                rows={3}
                placeholder="Weather, venue unavailable, organizer decision…"
                className="mt-1.5 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-[13px] outline-none focus:border-primary"
              />
              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-red-100 p-4">
                <input type="checkbox" checked={cancellationAccepted} onChange={event => setCancellationAccepted(event.target.checked)} className="mt-1" />
                <span className="text-[12px] font-medium leading-5 text-gray-700">I confirm this event is cancelled and understand that interested people will be informed.</span>
              </label>
              <div className="mt-5 flex gap-2">
                <button type="button" onClick={() => setCancellingEvent(null)} disabled={cancellationLoading} className="flex-1 rounded-xl bg-gray-100 px-4 py-3 text-[13px] font-bold text-gray-600">Keep event</button>
                <button type="button" onClick={() => void confirmCancellation()} disabled={!cancellationAccepted || cancellationLoading} className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-[13px] font-bold text-white disabled:opacity-40">{cancellationLoading ? 'Cancelling…' : 'Confirm cancellation'}</button>
              </div>
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
