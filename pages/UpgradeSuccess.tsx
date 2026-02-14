
import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';

const UpgradeSuccess: React.FC = () => {
    const navigate = useNavigate();
    const { actions } = useData();

    useEffect(() => {
        // Proactively sync data to show updated plan immediately
        const timer = setTimeout(() => {
            actions.syncAllTenants();
        }, 2000);
        return () => clearTimeout(timer);
    }, [actions]);

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
            <div className="w-24 h-24 bg-emerald-500/10 border-2 border-emerald-500 rounded-full flex items-center justify-center mb-8 animate-bounce">
                <span className="material-symbols-outlined text-5xl text-emerald-500">check_circle</span>
            </div>

            <h2 className="text-4xl font-black text-white mb-4 italic">Upgrade <span className="text-primary italic">Confirmado!</span></h2>
            <p className="text-slate-400 max-w-md mx-auto mb-10 font-medium">
                Seu pagamento foi identificado e sua conta está sendo atualizada.
                Em instantes você terá acesso a todas as funcionalidades do seu novo plano.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
                <Link
                    to="/"
                    className="px-8 py-4 bg-primary text-neutral-950 rounded-2xl font-black uppercase tracking-widest hover:bg-primary-dark transition-all shadow-xl shadow-primary/20"
                >
                    Voltar ao Dashboard
                </Link>
                <Link
                    to="/plans"
                    className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                    Ver Detalhes do Plano
                </Link>
            </div>

            <div className="mt-12 p-6 glass-panel border-white/5 rounded-2xl opacity-60">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Nota: Pode levar alguns minutos para que o Asaas processe completamente a ativação.
                </p>
            </div>
        </div>
    );
};

export default UpgradeSuccess;
