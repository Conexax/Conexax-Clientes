
import React, { useState, useRef, useEffect } from 'react';
import { useNotification } from '../context/NotificationContext';
import { askForNotificationPermission } from '../utils/push';

const NotificationCenter: React.FC = () => {
    const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotification();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [permission, setPermission] = useState(Notification.permission);

    const handleEnablePush = async () => {
        const perm = await askForNotificationPermission();
        setPermission(perm);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatDate = (date: any) => {
        const d = new Date(date);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
                <span className="material-symbols-outlined">notifications</span>
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-neutral-950 animate-pulse" />
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 md:w-96 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in-down origin-top-right">
                    <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5">
                        <h3 className="text-sm font-black text-white uppercase tracking-wider">Notificações</h3>
                        <div className="flex gap-2">
                            {unreadCount > 0 && (
                                <button onClick={markAllAsRead} className="text-[10px] font-bold text-primary hover:underline">
                                    Ler todas
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button onClick={clearAll} className="text-[10px] font-bold text-slate-500 hover:text-rose-500 hover:underline">
                                    Limpar
                                </button>
                            )}
                        </div>
                    </div>
                    {permission === 'default' && (
                        <div className="p-2 border-b border-white/5 bg-primary/5">
                            <button
                                onClick={handleEnablePush}
                                className="w-full py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">notifications_active</span>
                                Ativar Push
                            </button>
                        </div>
                    )}

                    <div className="max-h-[400px] overflow-y-auto divide-y divide-white/5">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                <span className="material-symbols-outlined text-4xl mb-2 opacity-20">notifications_off</span>
                                <p className="text-xs font-bold">Nenhuma notificação</p>
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    className={`p-4 hover:bg-white/5 transition-colors relative group ${n.read ? 'opacity-60' : 'bg-white/[0.02]'}`}
                                    onClick={() => markAsRead(n.id)}
                                >
                                    <div className="flex gap-3">
                                        <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${n.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' :
                                            n.type === 'error' ? 'bg-rose-500/10 text-rose-500' :
                                                n.type === 'warning' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                                            }`}>
                                            <span className="material-symbols-outlined text-sm font-bold">
                                                {n.type === 'success' ? 'check' : n.type === 'error' ? 'error' : n.type === 'warning' ? 'warning' : 'info'}
                                            </span>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className={`text-xs font-bold ${n.read ? 'text-slate-400' : 'text-white'}`}>{n.title}</h4>
                                                <span className="text-[9px] text-slate-600 whitespace-nowrap ml-2">{formatDate(n.timestamp)}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 leading-relaxed font-medium">{n.message}</p>
                                            {n.action && (
                                                <a href={n.action.link} className="mt-2 inline-block text-[10px] font-bold uppercase text-primary hover:underline">
                                                    {n.action.label}
                                                </a>
                                            )}
                                        </div>
                                        {!n.read && (
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full" />
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationCenter;
