
import React from 'react';

interface GoalProgressBarProps {
    currentRevenue: number;
}

const GoalProgressBar: React.FC<GoalProgressBarProps> = ({ currentRevenue }) => {
    // Determine Goal Tier
    let goal = 10000;
    let nextGoalLabel = '10K';

    if (currentRevenue >= 1000000) {
        goal = 10000000; // Next big step after 1M
        nextGoalLabel = '10M';
    } else if (currentRevenue >= 100000) {
        goal = 1000000;
        nextGoalLabel = '1M';
    } else if (currentRevenue >= 10000) {
        goal = 100000;
        nextGoalLabel = '100K';
    }

    const progress = Math.min((currentRevenue / goal) * 100, 100);

    // Format current revenue for display (e.g., 5.2k)
    const formatCompact = (val: number) => {
        if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
        if (val >= 1000) return (val / 1000).toFixed(0) + 'k'; // user asked for "0k" style
        return val.toString();
    };

    return (
        <div className="flex items-center gap-3 bg-emerald-900/40 border border-emerald-500/20 px-4 py-2 rounded-full min-w-[300px]">
            {/* Icon (Gem/Trophy) */}
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-emerald-400 text-lg">diamond</span>
            </div>

            <div className="flex-1 flex flex-col gap-1">
                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider">
                    <span className="text-emerald-400">Meta</span>
                    <span className="text-white">
                        R$ {formatCompact(currentRevenue)} <span className="text-emerald-500">/</span> R$ {nextGoalLabel}
                    </span>
                </div>
                {/* Progress Bar Container */}
                <div className="h-2 w-full bg-neutral-950 rounded-full overflow-hidden border border-white/5 relative">
                    {/* Progress Fill */}
                    <div
                        className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-1000 ease-out relative"
                        style={{ width: `${progress}%` }}
                    >
                        {/* Glow effect at tip */}
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_10px_2px_rgba(255,255,255,0.8)]"></div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default GoalProgressBar;
