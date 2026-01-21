import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface HelpTooltipProps {
    content: React.ReactNode;
    side?: 'top' | 'right' | 'bottom' | 'left';
    className?: string;
}

export function HelpTooltip({ content, side = 'top', className }: HelpTooltipProps) {
    return (
        <TooltipProvider>
            <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                    <Info size={16} className={`text-slate-500 hover:text-indigo-400 cursor-help transition-colors ${className}`} />
                </TooltipTrigger>
                <TooltipContent side={side} className="max-w-xs text-center">
                    {content}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
