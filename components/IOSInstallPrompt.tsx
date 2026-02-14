import React, { useState, useEffect } from 'react';

const IOSInstallPrompt: React.FC = () => {
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        // Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIos = /iphone|ipad|ipod/.test(userAgent);

        // Detect Standalone Mode
        const isStandalone = ('standalone' in window.navigator) && (window.navigator as any).standalone;

        // Show only on iOS browser (not standalone)
        if (isIos && !isStandalone) {
            // Delay to not be intrusive immediately
            const timer = setTimeout(() => setShowPrompt(true), 3000);
            return () => clearTimeout(timer);
        }
    }, []);

    if (!showPrompt) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-[200] bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-bottom duration-500">
            <button
                onClick={() => setShowPrompt(false)}
                className="absolute top-2 right-2 text-slate-500 hover:text-white p-1"
            >
                <span className="material-symbols-outlined text-sm">close</span>
            </button>

            <div className="flex gap-4 items-start">
                <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center shrink-0">
                    <img src="/pwa-icons/icon-192.png" alt="App Icon" className="w-8 h-8 rounded-lg" />
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-bold text-white mb-1">Instalar Aplicativo</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        Instale o <span className="text-emerald-500 font-bold">Conexx</span> na sua tela inicial para uma experiência completa.
                    </p>

                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-300 bg-black/40 p-2 rounded-lg border border-white/5">
                        <span>Toque em</span>
                        <span className="material-symbols-outlined text-blue-500 text-base">ios_share</span>
                        <span>e depois em</span>
                        <span className="font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">add_box</span>
                            Adicionar à Início
                        </span>
                    </div>
                </div>
            </div>

            {/* Triangle pointer specific to bottom-center share button on Safari (approximate) */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-zinc-900 border-r border-b border-zinc-800 rotate-45 transform lg:hidden"></div>
        </div>
    );
};

export default IOSInstallPrompt;
