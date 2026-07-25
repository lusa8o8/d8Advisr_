import { ArrowLeft, Bell, CheckCircle, Loader2, XCircle } from 'lucide-react';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { usePartnerNotifications, type PartnerNotification } from '@/hooks/usePartnerNotifications';

function formatTime(value: string) {
  const formatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return formatter.format(new Date(value));
}

function iconFor(notification: PartnerNotification) {
  if (notification.type === 'approval') {
    return <CheckCircle size={18} className="text-[#00C851]" />;
  }
  if (notification.type === 'review') {
    return <XCircle size={18} className="text-amber-500" />;
  }
  return <Bell size={18} className="text-primary" />;
}

export function PartnerNotifications() {
  const [, setLocation] = useLocation();
  const { notifications, loading, error, markRead, markAllRead, unreadCount } = usePartnerNotifications();

  return (
    <div className="flex-1 min-h-0 bg-[#F7F7F7] flex flex-col overflow-y-auto no-scrollbar pb-10">
      <div className="bg-[#111] px-5 pt-12 pb-5 shrink-0">
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => setLocation('/dashboard')}
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-95 transition-transform"
          >
            <ArrowLeft size={18} />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={() => void markAllRead()}
              className="text-[12px] font-bold text-white/70 hover:text-white"
            >
              Mark all read
            </button>
          )}
        </div>

        <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest mb-0.5">D8 Partner</p>
        <h1 className="text-white font-black text-[24px] leading-tight">Notifications</h1>
      </div>

      <div className="px-4 pt-5 flex flex-col gap-3">
        {loading && (
          <div className="py-12 flex justify-center">
            <Loader2 size={22} className="text-primary animate-spin" />
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-[13px] text-red-700 font-semibold">{error}</p>
          </div>
        )}

        {!loading && !error && notifications.length === 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center">
            <Bell size={22} className="mx-auto text-gray-300 mb-3" />
            <p className="text-[14px] text-gray-500 font-semibold">No partner notifications yet</p>
            <p className="text-[12px] text-gray-400 mt-1">
              Approval updates and partner alerts will appear here.
            </p>
          </div>
        )}

        {!loading && !error && notifications.map(notification => (
          <button
            key={notification.id}
            onClick={() => !notification.read_at && void markRead(notification.id)}
            className={cn(
              'w-full text-left rounded-2xl border p-4 flex items-start gap-3 transition-colors',
              notification.read_at
                ? 'bg-white border-gray-100'
                : 'bg-[#E8FFF0] border-green-200'
            )}
          >
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 border border-gray-100">
              {iconFor(notification)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[14px] font-black text-gray-900 leading-tight">{notification.title}</p>
                {!notification.read_at && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />}
              </div>
              <p className="text-[13px] text-gray-600 leading-relaxed mt-1">{notification.body}</p>
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mt-3">
                {formatTime(notification.created_at)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
