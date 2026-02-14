
import React from 'react';
import { Link } from 'react-router-dom';

const UpgradeError: React.FC = () => {
    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
            <div className="w-24 h-24 bg-red-500/10 border-2 border-red-500 rounded-full flex items-center justify-center mb-8">
                <span className="material-symbols-outlined text-5xl text-red-500">error</span>
            </div>

            <h2 className="text-4xl font-black text-white mb-4 italic">Ops! Algo deu <span className="text-red-500 italic">errado.</span></h2>
            <p className="text-slate-400 max-w-md mx-auto mb-10 font-medium">
                Não conseguimos processar o seu pagamento ou houve um cancelamento.
                Se você acredita que isso é um erro, por favor, entre em contato com nosso suporte.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
                <Link
                    to="/plans"
                    className="px-8 py-4 bg-primary text-neutral-950 rounded-2xl font-black uppercase tracking-widest hover:bg-primary-dark transition-all shadow-xl shadow-primary/20"
                >
                    Tentar Novamente
                </Link>
                <a
                    href="mailto:suporte@conexx.com"
                    className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                    Falar com Suporte
                </a>
            </div>
        </div>
    );
};

export default UpgradeError;
