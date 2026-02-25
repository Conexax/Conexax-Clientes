import React, { useState } from 'react';
import { askForNotificationPermission } from '../utils/push';
import { toast } from 'react-hot-toast';

const NotificationCenter: React.FC = () => {
    const [permission, setPermission] = useState(Notification.permission);

    const handleEnablePush = async () => {
        if (permission === 'granted') {
            toast.success('Notificações Push já estão ativadas!');
            return;
        }

        const perm = await askForNotificationPermission();
        setPermission(perm);

        if (perm === 'granted') {
            toast.success('Notificações Push ativadas com sucesso!');
        } else if (perm === 'denied') {
            toast.error('Permissão para notificações foi negada no navegador.');
        }
    };

    return (
        <button
            onClick={handleEnablePush}
            title={permission === 'granted' ? 'Notificações Ativadas' : 'Ativar Notificações Push'}
            className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
            <span className="material-symbols-outlined">
                {permission === 'granted' ? 'notifications_active' : 'notifications'}
            </span>
            {permission !== 'granted' && permission !== 'denied' && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-neutral-950 animate-pulse" />
            )}
        </button>
    );
};

export default NotificationCenter;
