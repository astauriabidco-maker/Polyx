import { CheckCircle, Circle, Clock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type PedagogicalStage = "ONBOARDING" | "FORMATION" | "EXAMEN" | "CERTIFICATION" | "FACTURATION" | "CLOTURE";

interface LearnerStatusHeaderProps {
    currentStage: PedagogicalStage;
    className?: string;
}

export function LearnerStatusHeader({ currentStage, className }: LearnerStatusHeaderProps) {
    const stages: { id: PedagogicalStage; label: string }[] = [
        { id: "ONBOARDING", label: "Onboarding" },
        { id: "FORMATION", label: "Formation" },
        { id: "EXAMEN", label: "Examen" },
        { id: "CERTIFICATION", label: "Certification" },
        { id: "FACTURATION", label: "Facturation" },
        { id: "CLOTURE", label: "Clôturé" },
    ];

    const getCurrentIndex = () => stages.findIndex((s) => s.id === currentStage);
    const currentIndex = getCurrentIndex();

    return (
        <div className={cn("w-full bg-white border-b border-slate-200 py-4 px-6 md:px-8", className)}>
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between relative">
                    {/* Connecting Line - Background */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-slate-100 -z-10" />

                    {/* Active Line - Dynamic Width */}
                    <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-indigo-600 -z-10 transition-all duration-500 ease-in-out"
                        style={{ width: `${(currentIndex / (stages.length - 1)) * 100}%` }}
                    />

                    {stages.map((stage, idx) => {
                        const isCompleted = idx < currentIndex;
                        const isCurrent = idx === currentIndex;
                        const isPending = idx > currentIndex;

                        return (
                            <div key={stage.id} className="flex flex-col items-center gap-2 relative bg-white px-2">
                                <div
                                    className={cn(
                                        "h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10",
                                        isCompleted
                                            ? "bg-indigo-600 border-indigo-600 text-white"
                                            : isCurrent
                                                ? "bg-white border-indigo-600 text-indigo-600 ring-4 ring-indigo-50"
                                                : "bg-white border-slate-200 text-slate-300"
                                    )}
                                >
                                    {isCompleted ? (
                                        <CheckCircle size={16} strokeWidth={3} />
                                    ) : (
                                        <span className="text-xs font-bold">{idx + 1}</span>
                                    )}
                                </div>
                                <span
                                    className={cn(
                                        "text-xs font-medium uppercase tracking-wider absolute -bottom-6 whitespace-nowrap",
                                        isCurrent ? "text-indigo-700 font-bold" : isCompleted ? "text-indigo-600/70" : "text-slate-400"
                                    )}
                                >
                                    {stage.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
