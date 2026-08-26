import { useLocation } from "wouter";
import { ArrowLeft, Calendar, AlertCircle, MapPin, Check, Ticket, Tag, CheckCheck, Loader2 } from 'lucide-react';
import { useConsumerNotifications } from "@/hooks/useConsumerNotifications";
import { cn, consumerDesktopClass } from "@/components/SharedUI";

function formatRelativeTime(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationsCenter() {
  const [, setLocation] = useLocation();
  const { notifications, unreadCount, loading, markRead, markAllRead } = useConsumerNotifications();

  return (
    <div className="flex-1 min-h-0 bg-background flex flex-col relative overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="bg-card pt-10 lg:pt-14 pb-3 lg:pb-4 sticky top-0 z-20 shadow-sm border-b border-border">
        <div className={cn(consumerDesktopClass('reading'), "px-6")}>
          <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.history.back()}
              className="w-10 h-10 bg-background rounded-full flex items-center justify-center text-foreground hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="font-bold text-foreground text-xl">Notifications</h1>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => void markAllRead()}
              className="text-primary font-bold text-sm hover:opacity-80 flex items-center gap-1.5"
            >
              <CheckCheck size={16} /> Mark all read
            </button>
          )}
          </div>
        </div>
      </div>

      <div className={cn(consumerDesktopClass('reading'), "flex flex-col pb-10")}>
        {loading ? (
          <div className="py-20 flex justify-center items-center">
            <Loader2 size={28} className="animate-spin text-primary" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-20 px-8 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
              <Calendar size={28} />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-1">You're all caught up!</h2>
            <p className="text-sm text-muted-foreground max-w-xs mb-6">
              When an event you follow updates its schedule, venue, or pricing, you'll receive instant updates here.
            </p>
            <button
              onClick={() => setLocation('/home')}
              className="bg-primary text-white font-bold text-sm px-5 py-3 rounded-xl shadow-sm active:scale-95 transition-transform"
            >
              Explore Events
            </button>
          </div>
        ) : (
          <div>
            <h2 className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider px-6 py-4">
              Recent Updates ({notifications.length})
            </h2>

            <div className="flex flex-col">
              {notifications.map(n => {
                const isUnread = !n.readAt;
                const isRescheduled = n.type === 'event_rescheduled';
                const isRelocated = n.type === 'event_relocated';
                const isPriceDrop = n.type === 'event_price_reduced' || n.type === 'event_price_changed';
                const isCancelled = n.type === 'event_cancelled';
                const cancellationReason = isCancelled && typeof n.metadata.reason === 'string'
                  ? n.metadata.reason.trim()
                  : '';

                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (isUnread) void markRead(n.id);
                    }}
                    className={cn(
                      "border-b border-border px-6 py-5 flex gap-4 items-start relative transition-colors cursor-pointer",
                      isUnread ? "bg-[#FFF0F1]/40 hover:bg-[#FFF0F1]/70" : "bg-card hover:bg-background"
                    )}
                  >
                    {isUnread && (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary absolute right-6 top-6 shadow-sm" />
                    )}

                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center shadow-sm shrink-0 border",
                      isRescheduled && "bg-blue-50 text-blue-600 border-blue-200",
                      isRelocated && "bg-purple-50 text-purple-600 border-purple-200",
                      isPriceDrop && "bg-green-50 text-[#00C851] border-green-200",
                      isCancelled && "bg-red-50 text-red-600 border-red-200",
                      (!isRescheduled && !isRelocated && !isPriceDrop && !isCancelled) && "bg-primary/10 text-primary border-primary/20"
                    )}>
                      {isRescheduled && <Calendar size={20} strokeWidth={2.5} />}
                      {isRelocated && <MapPin size={20} strokeWidth={2.5} />}
                      {isPriceDrop && <Tag size={20} strokeWidth={2.5} />}
                      {isCancelled && <AlertCircle size={20} strokeWidth={2.5} />}
                      {(!isRescheduled && !isRelocated && !isPriceDrop && !isCancelled) && <Ticket size={20} />}
                    </div>

                    <div className="pr-6 flex-1">
                      <p className="font-extrabold text-foreground text-[16px] leading-tight mb-1">
                        {n.title}
                      </p>
                      <p className="text-[14px] text-muted-foreground font-medium mb-3 leading-snug">
                        {n.body}
                      </p>
                      {cancellationReason && (
                        <p className="-mt-1 mb-3 rounded-xl bg-red-50 px-3 py-2 text-[13px] font-semibold leading-snug text-red-700">
                          Reason: {cancellationReason}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-1">
                        {n.eventId && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              if (isUnread) void markRead(n.id);
                              setLocation(`/event/${n.eventId}`);
                            }}
                            className="flex items-center gap-1.5 bg-primary text-white text-[12px] font-bold px-3.5 py-2 rounded-xl shadow-sm active:scale-95 transition-transform"
                          >
                            <Ticket size={12} /> View Event
                          </button>
                        )}
                        {isUnread && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              void markRead(n.id);
                            }}
                            className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground px-3 py-2 rounded-xl border border-border bg-white active:scale-95 transition-transform"
                          >
                            <Check size={12} /> Mark read
                          </button>
                        )}
                      </div>

                      <span className="text-xs text-muted-foreground font-medium mt-2.5 inline-block">
                        {formatRelativeTime(n.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
