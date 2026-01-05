import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch"; // Assuming we have a Switch component, if not I'll use a checkbox or simple button toggle
import { LearnerFolder } from "@/domain/entities/learner";
import { Settings2, AlertCircle, ShieldAlert, TrendingDown } from "lucide-react";
import { useState } from "react";

interface StatusManagerProps {
    folder: LearnerFolder;
    onUpdate: (updates: Partial<LearnerFolder>) => void;
}

export function StatusManager({ folder, onUpdate }: StatusManagerProps) {
    const [open, setOpen] = useState(false);

    // Local state for immediate feedback
    const [isBlocked, setIsBlocked] = useState(folder.isBlocked || false);
    const [isLowLevel, setIsLowLevel] = useState(folder.isLowLevel || false);
    const [isDropoutRisk, setIsDropoutRisk] = useState(folder.isDropoutRisk || false);

    const handleToggle = (key: keyof LearnerFolder, value: boolean, setter: (v: boolean) => void) => {
        setter(value);
        onUpdate({ [key]: value });
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Settings2 size={16} />
                    Gérer le statut
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="end">
                <div className="space-y-4">
                    <h4 className="font-semibold text-sm text-slate-900 border-b pb-2 mb-2">Exceptions & Alertes</h4>

                    {/* Blocker */}
                    <div className="flex items-center justify-between space-x-2">
                        <div className="flex items-center gap-2">
                            <ShieldAlert size={16} className="text-red-500" />
                            <Label htmlFor="blocked" className="flex flex-col">
                                <span>Bloquer le dossier</span>
                                <span className="font-normal text-xs text-slate-500">Arrête toute action auto.</span>
                            </Label>
                        </div>
                        <Switch
                            id="blocked"
                            checked={isBlocked}
                            onCheckedChange={(checked) => handleToggle('isBlocked', checked, setIsBlocked)}
                        />
                    </div>

                    {/* Low Level */}
                    <div className="flex items-center justify-between space-x-2">
                        <div className="flex items-center gap-2">
                            <AlertCircle size={16} className="text-amber-500" />
                            <Label htmlFor="low-level" className="flex flex-col">
                                <span>Niveau Insuffisant</span>
                                <span className="font-normal text-xs text-slate-500">Nécessite remédiation.</span>
                            </Label>
                        </div>
                        <Switch
                            id="low-level"
                            checked={isLowLevel}
                            onCheckedChange={(checked) => handleToggle('isLowLevel', checked, setIsLowLevel)}
                        />
                    </div>

                    {/* Dropout Risk */}
                    <div className="flex items-center justify-between space-x-2">
                        <div className="flex items-center gap-2">
                            <TrendingDown size={16} className="text-orange-500" />
                            <Label htmlFor="dropout" className="flex flex-col">
                                <span>Risque d'abandon</span>
                                <span className="font-normal text-xs text-slate-500">Absence prolongée.</span>
                            </Label>
                        </div>
                        <Switch
                            id="dropout"
                            checked={isDropoutRisk}
                            onCheckedChange={(checked) => handleToggle('isDropoutRisk', checked, setIsDropoutRisk)}
                        />
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
