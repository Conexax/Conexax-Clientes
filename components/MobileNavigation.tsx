import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const MobileNavigation: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    // Simple state to track active tab based on path
    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-[safe-area-inset-bottom] bg-[#0A0A0A] border-t border-white/5 z-50 pb-[env(safe-area-inset-bottom)]">
            <div className="flex justify-around items-center h-16">
                <button
                    onClick={() => navigate('/')}
                    className={`flex flex-col items-center justify-center p-2 w-full transition-colors ${isActive('/') ? 'text-emerald-500' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <span className={`material-symbols-outlined transition-all ${isActive('/') ? 'text-2xl font-filled' : 'text-2xl'}`}>
                        dashboard
                    </span>
                    <span className="text-[10px] uppercase font-black tracking-widest mt-1">
                        Início
                    </span>
                </button>

                <button
                    onClick={() => navigate('/billing')}
                    className={`flex flex-col items-center justify-center p-2 w-full transition-colors ${isActive('/billing') ? 'text-emerald-500' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <span className={`material-symbols-outlined transition-all ${isActive('/billing') ? 'text-2xl font-filled' : 'text-2xl'}`}>
                        payments
                    </span>
                    <span className="text-[10px] uppercase font-black tracking-widest mt-1">
                        Planos
                    </span>
                </button>

                <button
                    onClick={() => navigate('/settings')}
                    className={`flex flex-col items-center justify-center p-2 w-full transition-colors ${isActive('/settings') ? 'text-emerald-500' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <span className={`material-symbols-outlined transition-all ${isActive('/settings') ? 'text-2xl font-filled' : 'text-2xl'}`}>
                        settings
                    </span>
                    <span className="text-[10px] uppercase font-black tracking-widest mt-1">
                        Ajustes
                    </span>
                </button>
            </div>
        </div>
    );
};

export default MobileNavigation;
