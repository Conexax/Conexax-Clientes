
export async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered with scope:', registration.scope);
            return registration;
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }
    return null;
}

export async function askForNotificationPermission() {
    if (typeof Notification === 'undefined') {
        return 'denied';
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
        await subscribeUserToPush();
    }
    return permission;
}

async function subscribeUserToPush() {
    try {
        const registration = await navigator.serviceWorker.ready;

        // Get VAPID key from environment
        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
            console.error('VAPID Public Key missing in environment');
            return;
        }

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });

        // Send to server
        const userId = localStorage.getItem('conexx_user_id'); // Assuming it's there or we get from context
        if (!userId) return;

        await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, subscription })
        });

        console.log('Successfully subscribed to Push Notifications');
    } catch (error) {
        console.error('Failed to subscribe to Push:', error);
    }
}

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
