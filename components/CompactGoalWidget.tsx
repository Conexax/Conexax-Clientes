
import React from 'react';
import { Goal } from '../types';

interface CompactGoalWidgetProps {
    currentRevenue: number;
    goals: Goal[];
    isLoading?: boolean;
}

const CompactGoalWidget: React.FC<CompactGoalWidgetProps> = ({ currentRevenue, goals, isLoading }) => {
    if (isLoading) {
        return (
            <div className="h-10 w-48 bg-white/5 rounded-xl animate-pulse flex items-center px-4">
                <div className="h-2 w-full bg-white/10 rounded-full"></div>
            </div>
        );
    }

    // Find the next unachieved goal or the last one if all achieved
    const sortedGoals = [...goals].sort((a, b) => a.targetValue - b.targetValue);
    const nextGoal = sortedGoals.find(g => currentRevenue < g.targetValue) || sortedGoals[sortedGoals.length - 1];

    if (!nextGoal) return null;

    const progress = Math.min((currentRevenue / nextGoal.targetValue) * 100, 100);
    const achieved = currentRevenue >= nextGoal.targetValue;

    // Format: "R$ 0k / R$ 10K"
    // Using compact notation for K/M
    const formatCompact = (val: number) => {
        if (val >= 1000000) return `R$ ${(val / 1000000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}M`;
        if (val >= 1000) return `R$ ${(val / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}k`;
        return `R$ ${val}`;
    };

    return (
        <div className="flex flex-col items-end gap-1 min-w-[200px]">
            <div className="flex items-center gap-2 text-xs font-black text-white/90">
                <span className="material-symbols-outlined text-emerald-400 text-sm">diamond</span>
                <span>{formatCompact(currentRevenue)} <span className="text-slate-500 mx-1">/</span> {formatCompact(nextGoal.targetValue)}</span>
            </div>

            <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden border border-white/5 relative">
                <div
                    className={`h-full transition-all duration-1000 ease-out ${achieved ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-primary'}`}
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
        </div>
    );
};

export default CompactGoalWidget;
