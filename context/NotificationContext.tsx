
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Notification, NotificationType } from '../types/Notification';

interface NotificationContextProps {
    notifications: Notification[];
    unreadCount: number;
    notify: (type: NotificationType, title: string, message: string, action?: { label: string; link: string }) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>(() => {
        // Load unread notifications from storage on mount
        try {
            const stored = localStorage.getItem('conexx_notifications');
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });

    const unreadCount = notifications.filter(n => !n.read).length;

    useEffect(() => {
        // Persist to local storage
        localStorage.setItem('conexx_notifications', JSON.stringify(notifications));
    }, [notifications]);

    const notify = (type: NotificationType, title: string, message: string, action?: { label: string; link: string }) => {
        const newNotification: Notification = {
            id: crypto.randomUUID(),
            type,
            title,
            message,
            timestamp: new Date(),
            read: false,
            action
        };
        setNotifications(prev => [newNotification, ...prev]);

        // Play sound for success/error? (Optional)
    };

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const clearAll = () => {
        setNotifications([]);
    };

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, notify, markAsRead, markAllAsRead, clearAll }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};
