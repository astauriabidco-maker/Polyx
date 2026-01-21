import { BookOpen, Sparkles } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

interface GuideStep {
    title: string;
    description: string;
}

interface PageGuideProps {
    title?: string;
    steps: GuideStep[];
}

export function PageGuide({ title = "Guide du Module", steps }: PageGuideProps) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-indigo-300 gap-2">
                    <BookOpen size={16} />
                    <span className="hidden sm:inline">Aide</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0 border-indigo-500/20 bg-slate-900 shadow-xl overflow-hidden">
                <div className="bg-indigo-950/30 p-4 border-b border-indigo-500/10">
                    <h4 className="font-semibold text-indigo-100 flex items-center gap-2">
                        <Sparkles size={16} className="text-indigo-400" />
                        {title}
                    </h4>
                </div>
                <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                    {steps.map((step, idx) => (
                        <div key={idx} className="flex gap-3">
                            <div className="mt-0.5 min-w-[20px] text-center font-mono text-xs text-slate-500">
                                {idx + 1}.
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-200 mb-1">{step.title}</p>
                                <p className="text-xs text-slate-400 leading-relaxed">{step.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
