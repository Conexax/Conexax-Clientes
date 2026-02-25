import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const MobileNavigation: React.FC<{ onOpenMenu: () => void }> = ({ onOpenMenu }) => {
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
                    onClick={() => navigate('/plans')}
                    className={`flex flex-col items-center justify-center p-2 w-full transition-colors ${isActive('/plans') ? 'text-emerald-500' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <span className={`material-symbols-outlined transition-all ${isActive('/plans') ? 'text-2xl font-filled' : 'text-2xl'}`}>
                        credit_card
                    </span>
                    <span className="text-[10px] uppercase font-black tracking-widest mt-1">
                        Planos
                    </span>
                </button>

                <button
                    onClick={onOpenMenu}
                    className="flex flex-col items-center justify-center p-2 w-full transition-colors text-slate-500 hover:text-emerald-500"
                >
                    <span className="material-symbols-outlined transition-all text-2xl">
                        menu
                    </span>
                    <span className="text-[10px] uppercase font-black tracking-widest mt-1">
                        Menu
                    </span>
                </button>
            </div>
        </div>
    );
};

export default MobileNavigation;
