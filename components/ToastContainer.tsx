
import React, { useEffect, useState } from 'react';
import { useNotification } from '../context/NotificationContext';
import { Notification } from '../types/Notification';

const ToastContainer: React.FC = () => {
    const { notifications, markAsRead } = useNotification();
    const [toasts, setToasts] = useState<Notification[]>([]);

    // Watch for new notifications to show as toasts
    // We only show unread ones that were added recently (last 5 seconds) to avoid showing history on reload
    // But purely relying on 'unread' might show old ones if persisted.
    // Strategy: The Context adds them. Here we just maintain a local list of "active toasts" derived from updates.
    // Actually, a simpler way: The `notify` function could trigger an event, but sticking to React state:
    // We can track the last known ID?
    // Let's simpler approach: Use a separate "activeToasts" state in this component, and `useEffect` on notifications list length?

    // Better approach for Toasts in this architecture:
    // The Context *is* the source of truth.
    // But for "Toasting", we usually only want to see *new* things.
    // Let's implement a listener or simple check.

    const [lastCount, setLastCount] = useState(notifications.length);

    useEffect(() => {
        if (notifications.length > lastCount) {
            // New notification(s) added
            const newItems = notifications.slice(0, notifications.length - lastCount);
            // Add them to toasts list
            setToasts(prev => [...newItems, ...prev]);

            // Auto-remove toast after 5 seconds
            newItems.forEach(item => {
                setTimeout(() => {
                    setToasts(current => current.filter(t => t.id !== item.id));
                }, 5000);
            });
        }
        setLastCount(notifications.length);
    }, [notifications, lastCount]);

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
        // Optionally mark as read when closed? User choice.
        markAsRead(id);
    };

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className="pointer-events-auto min-w-[300px] max-w-sm w-full bg-[#1a1a1a]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-slide-in-right"
                >
                    <div className={`h-1 w-full ${toast.type === 'success' ? 'bg-emerald-500' :
                            toast.type === 'error' ? 'bg-rose-500' :
                                toast.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                        }`} />

                    <div className="p-4 flex gap-3">
                        <div className={`mt-0.5 shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-500' :
                                toast.type === 'error' ? 'bg-rose-500/20 text-rose-500' :
                                    toast.type === 'warning' ? 'bg-amber-500/20 text-amber-500' : 'bg-blue-500/20 text-blue-500'
                            }`}>
                            <span className="material-symbols-outlined text-sm font-bold">
                                {toast.type === 'success' ? 'check' :
                                    toast.type === 'error' ? 'error' :
                                        toast.type === 'warning' ? 'warning' : 'info'}
                            </span>
                        </div>

                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-white leading-tight mb-1">{toast.title}</h4>
                            <p className="text-xs text-slate-400 font-medium leading-relaxed">{toast.message}</p>
                            {toast.action && (
                                <a href={toast.action.link} className="mt-2 inline-block text-[10px] font-bold uppercase text-primary hover:underline">
                                    {toast.action.label}
                                </a>
                            )}
                        </div>

                        <button onClick={() => removeToast(toast.id)} className="shrink-0 text-slate-500 hover:text-white transition-colors self-start">
                            <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ToastContainer;
