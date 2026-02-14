import React from 'react';

interface PaymentSuccessProps {
    checkoutUrl: string;
    onClose: () => void;
}

export const PaymentSuccess: React.FC<PaymentSuccessProps> = ({ checkoutUrl, onClose }) => {
    return (
        <div className="fixed inset-0 z-[150] flex flex-col items-center justify-end lg:justify-center animate-in fade-in duration-300">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            {/* Card / Sheet Content */}
            <div className="relative z-10 w-full lg:max-w-md p-8 text-center space-y-6 bg-[#0A0A0A] lg:bg-zinc-900 rounded-t-3xl lg:rounded-2xl border-t lg:border border-zinc-800 shadow-2xl transition-all">

                {/* Mobile Drag Handle */}
                <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto -mt-2 mb-6 lg:hidden shrink-0" />

                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner shadow-emerald-500/20">
                    <span className="material-symbols-outlined text-4xl text-emerald-500">mark_email_read</span>
                </div>

                <div className="space-y-2">
                    <h2 className="text-2xl font-black text-white">Cobrança Gerada!</h2>
                    <p className="text-slate-400 max-w-sm mx-auto text-sm leading-relaxed">
                        Sua fatura foi enviada com sucesso para o seu e-mail cadastrado.
                    </p>
                </div>

                <div className="w-full h-px bg-zinc-800 my-2" />

                <p className="text-slate-300 font-medium">
                    Você também pode realizar o pagamento agora:
                </p>

                <a
                    href={checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 transform hover:-translate-y-1"
                >
                    <span className="material-symbols-outlined">payments</span>
                    Pagar Fatura Agora
                </a>

                <button
                    onClick={onClose}
                    className="mt-4 text-slate-500 hover:text-white text-xs font-medium uppercase tracking-widest transition-colors w-full py-2"
                >
                    Fechar
                </button>
            </div>
        </div>
    );
};
