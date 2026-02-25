
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
    if (!('Notification' in window)) {
        console.log('This browser does not support desktop notification');
        return 'denied';
    }

    const permission = await Notification.requestPermission();
    return permission;
}

export function sendMockPush(title: string, message: string) {
    if (Notification.permission === 'granted') {
        navigator.serviceWorker.ready.then(registration => {
            // Since we can't really push from server without VAPID keys in this mock,
            // we use showNotification directly from the registration.
            registration.showNotification(title, {
                body: message,
                icon: '/logo-conexx.png',
                // vibrate: [200, 100, 200] as any
            });
        });
    }
}
