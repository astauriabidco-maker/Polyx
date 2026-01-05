import { Lead } from '@/domain/entities/lead';

export class ScriptService {
    static getCallScript(lead: Lead): string {
        const firstName = lead.firstName || 'Candidat';
        const source = lead.source || 'votre demande';
        const formation = lead.examId === 1 ? 'TOEIC' : (lead.examId === 3 ? 'TOEFL' : 'formation linguistique');

        let script = `### 📞 Script de Call Contextuel\n\n`;

        // 1. Hook initial
        script += `**Introduction :**\n"Bonjour ${firstName}, c'est {{user.name}} de Polyx Academy. Je vous appelle suite à votre intérêt pour la formation **${formation}** via ${source}. Vous aviez deux minutes ?"\n\n`;

        // 2. Contextual Bridge
        if (lead.score >= 80) {
            script += `**Accroche Prioritaire :**\n"J'ai vu que vous aviez un profil très pertinent pour ce programme. Vous avez un projet professionnel urgent derrière cette certification ?"\n\n`;
        } else {
            script += `**Accroche Information :**\n"L'idée était simplement de faire un point sur vos objectifs et voir comment nos parcours CPF peuvent vous aider. Qu'est-ce qui vous a motivé à postuler ?"\n\n`;
        }

        // 3. Closing / Next Step
        script += `**Objectif :** Valider l'éligibilité CPF et planifier un test de niveau.\n`;

        return script;
    }
}
