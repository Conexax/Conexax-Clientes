import React, { useState, useEffect } from 'react';

interface DateRangeFilterProps {
    onFilterChange: (start: Date, end: Date, period: string) => void;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ onFilterChange }) => {
    const [filter, setFilter] = useState(localStorage.getItem('conexx_date_filter') || 'today');
    const [customStart, setCustomStart] = useState(localStorage.getItem('conexx_custom_start') || '');
    const [customEnd, setCustomEnd] = useState(localStorage.getItem('conexx_custom_end') || '');

    useEffect(() => {
        localStorage.setItem('conexx_date_filter', filter);
        localStorage.setItem('conexx_custom_start', customStart);
        localStorage.setItem('conexx_custom_end', customEnd);
        applyFilter();
    }, [filter, customStart, customEnd]);

    const applyFilter = () => {
        const now = new Date();
        let start = new Date(0); // Epoch default
        let end = new Date();

        if (filter === 'today') {
            start = new Date(now);
            start.setHours(0, 0, 0, 0);
            end = new Date(now);
            end.setHours(23, 59, 59, 999);
        } else if (filter === 'week') {
            // "Últimos 7 dias"
            const d = new Date(now);
            d.setDate(d.getDate() - 7);
            d.setHours(0, 0, 0, 0);
            start = d;
            end = new Date(now);
            end.setHours(23, 59, 59, 999);
        } else if (filter === 'this_week') {
            // "Esta Semana" (Monday start)
            const d = new Date(now);
            const day = d.getDay(); // 0 (Sun) - 6 (Sat)
            // If Sunday (0), go back 6 days. If Monday (1), go back 0.
            const diff = d.getDate() - day + (day === 0 ? -6 : 1);
            d.setDate(diff);
            d.setHours(0, 0, 0, 0);
            start = d;
            end = new Date(now);
            end.setHours(23, 59, 59, 999);
        } else if (filter === 'month') {
            const d = new Date(now);
            d.setDate(1); // First day of current month
            d.setHours(0, 0, 0, 0);
            start = d;
            end = new Date(now);
            end.setHours(23, 59, 59, 999);
        } else if (filter === 'custom') {
            if (customStart && customEnd) {
                // Create date objects and force time to start/end of day
                // Note: input type="date" returns YYYY-MM-DD. 
                // new Date('YYYY-MM-DD') creates UTC midnight. We want local midnight.
                // Best to append 'T00:00:00' for start and 'T23:59:59' for end if simplified.
                // Actually, new Date(string) behaviour varies. Let's precise it.
                const [yS, mS, dS] = customStart.split('-').map(Number);
                const [yE, mE, dE] = customEnd.split('-').map(Number);

                start = new Date(yS, mS - 1, dS, 0, 0, 0, 0);
                end = new Date(yE, mE - 1, dE, 23, 59, 59, 999);
            } else {
                // Invalid custom range, don't update or set wide? 
                // Let's default to today if incomplete to avoid 0s
                return;
            }
        } else if (filter === 'total') {
            start = new Date(0);
            end = new Date(); // now
        }

        onFilterChange(start, end, filter);
    };

    return (
        <div className="flex flex-wrap gap-2 items-center bg-black/20 p-1.5 rounded-2xl border border-white/5 backdrop-blur-sm self-start xl:self-auto">
            <div className="relative group">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary material-symbols-outlined text-[18px]">calendar_today</span>
                <select
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    className="appearance-none pl-10 pr-10 py-2.5 bg-white/5 text-white text-xs font-bold outline-none cursor-pointer hover:bg-white/10 rounded-xl transition-all border border-transparent hover:border-white/5 w-48 uppercase tracking-wide"
                >
                    <option value="today" className="bg-neutral-900 text-slate-300">Hoje</option>
                    <option value="week" className="bg-neutral-900 text-slate-300">Últimos 7 dias</option>
                    <option value="this_week" className="bg-neutral-900 text-slate-300">Esta Semana</option>
                    <option value="month" className="bg-neutral-900 text-slate-300">Este Mês</option>
                    <option value="total" className="bg-neutral-900 text-slate-300">Total (Geral)</option>
                    <option value="custom" className="bg-neutral-900 text-slate-300">Personalizado</option>
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 material-symbols-outlined text-[18px] pointer-events-none group-hover:text-white transition-colors">expand_more</span>
            </div>

            {filter === 'custom' && (
                <div className="flex gap-2 items-center animate-fade-in pl-2 border-l border-white/5">
                    <div className="relative">
                        <input
                            type="date"
                            value={customStart}
                            onChange={e => setCustomStart(e.target.value)}
                            className="bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary/50 transition-colors uppercase tracking-wider font-mono appearance-none"
                        />
                    </div>
                    <span className="text-slate-600 font-bold">-</span>
                    <div className="relative">
                        <input
                            type="date"
                            value={customEnd}
                            onChange={e => setCustomEnd(e.target.value)}
                            className="bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary/50 transition-colors uppercase tracking-wider font-mono appearance-none"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default DateRangeFilter;
