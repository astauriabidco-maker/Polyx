/**
 * Gemini AI Service for Polyx
 * Handles semantic analysis, sentiment detection and verbatim classification.
 */
export class GeminiService {
    /**
     * Analyzes feedback text using Gemini AI
     * Returns sentiment, tags and a summary
     */
    static async analyzeFeedback(text: string) {
        console.log(`[GEMINI] 🤖 Analyzing feedback: "${text.substring(0, 50)}..."`);

        // Simulation delay
        await new Promise(resolve => setTimeout(resolve, 800));

        // Basic heuristic-based mock for demonstration if API key is missing
        // In a real implementation, we would use:
        // const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const lowerText = text.toLowerCase();

        let sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' = 'NEUTRAL';
        if (lowerText.includes('super') || lowerText.includes('parfait') || lowerText.includes('merci') || lowerText.includes('top')) {
            sentiment = 'POSITIVE';
        } else if (lowerText.includes('difficile') || lowerText.includes('trop') || lowerText.includes('problème') || lowerText.includes('déçu')) {
            sentiment = 'NEGATIVE';
        }

        const tags = [];
        if (lowerText.includes('cours') || lowerText.includes('contenu') || lowerText.includes('pedago')) tags.push('Pédagogie');
        if (lowerText.includes('admin') || lowerText.includes('dossier') || lowerText.includes('cpf')) tags.push('Administration');
        if (lowerText.includes('outil') || lowerText.includes('plateforme') || lowerText.includes('zoom')) tags.push('Technique');

        return {
            sentiment,
            tags: tags.length > 0 ? tags.join(', ') : 'Général',
            summary: text.length > 40 ? text.substring(0, 37) + '...' : text
        };
    }

    /**
     * Detects weak signals (signaux faibles) that might lead to a complaint.
     */
    static async detectRisk(text: string) {
        const lowerText = text.toLowerCase();
        const riskKeywords = ['lent', 'attente', 'pas de réponse', 'incompréhension', 'perdu'];
        const isRisk = riskKeywords.some(kw => lowerText.includes(kw));

        return {
            isRisk,
            riskLevel: isRisk ? 'MEDIUM' : 'LOW',
            reason: isRisk ? 'Délai de réponse ou incompréhension détectée' : null
        };
    }

    /**
     * Generates a strategic executive summary based on organization data
     */
    static async generateStrategicSummary(metrics: any) {
        console.log(`[GEMINI] 🤖 Generating strategic summary...`);

        // Simulation delay
        await new Promise(resolve => setTimeout(resolve, 1200));

        const { projectedRevenue, currentPipeline, riskScore } = metrics;

        // Mocked narrative logic for demonstration
        let summary = `La trajectoire actuelle de croissance est ${projectedRevenue > currentPipeline ? 'haussière' : 'prudente'}. `;
        summary += `Avec un pipeline de ${currentPipeline.toLocaleString()}€, la projection à 3 mois atteint ${projectedRevenue.toLocaleString()}€. `;

        if (riskScore > 50) {
            summary += `Attention : un score de risque élevé (${riskScore}%) a été détecté, principalement lié à une instabilité de l'assiduité dans l'agence Nord. `;
        } else {
            summary += `Les indicateurs opérationnels sont stables, avec une conformité Qualiopi maintenue à 98%. `;
        }

        summary += `Recommandation : Accélérer la conversion sur le segment B2B pour sécuriser le Forecast du prochain trimestre.`;

        return {
            summary,
            recommendations: [
                "Renforcer le suivi pédagogique sur l'agence Nord",
                "Augmenter le budget d'acquisition sur les formations Langues",
                "Lancer l'audit blanc pour le renouvellement Qualiopi"
            ]
        };
    }

    /**
     * Analyzes the sales pipeline health and calculates a confidence score
     */
    static async analyzePipelineHealth(data: {
        totalValue: number,
        weightedValue: number,
        stageCounts: Record<string, number>,
        topRisks: string[]
    }) {
        console.log(`[GEMINI] 🤖 Analyzing pipeline health...`);

        // Simulation delay
        await new Promise(resolve => setTimeout(resolve, 800));

        const { totalValue, weightedValue, stageCounts, topRisks } = data;
        const ratio = totalValue > 0 ? weightedValue / totalValue : 0;

        let confidenceScore = 60; // Base
        if (ratio > 0.5) confidenceScore += 20;
        if (Object.keys(stageCounts).length > 3) confidenceScore += 10;
        if (topRisks.length > 2) confidenceScore -= 15;

        // Ensure within 0-100
        confidenceScore = Math.max(0, Math.min(100, confidenceScore));

        let summary = "";
        if (ratio > 0.6) {
            summary = "Votre pipeline est sain et mature, avec une forte concentration de dossiers en phase de closing.";
        } else if (ratio < 0.3) {
            summary = "Attention : le pipeline est très 'top of funnel'. Beaucoup de prospects froids, risque de gap sur le CA à M+1.";
        } else {
            summary = "Pipeline équilibré. Bonne alimentation des leads, mais le passage entre contact et RDV doit être optimisé.";
        }

        return {
            confidenceScore,
            summary,
            riskWarning: topRisks.length > 0 ? topRisks[0] : null
        };
    }

    /**
     * Compares center performance against sectorial averages
     */
    static async compareSectorialBenchmark(data: {
        successRate: number,
        satisfaction: number,
        pricing: number,
        sectorAverages: any
    }) {
        console.log(`[GEMINI] 🤖 Generating sectorial benchmark...`);

        // Simulation delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        const { successRate, satisfaction, pricing, sectorAverages } = data;

        const successGap = successRate - sectorAverages.successRate;
        const satisfactionGap = satisfaction - sectorAverages.satisfaction;
        const pricingGap = ((pricing - sectorAverages.avgPrice) / sectorAverages.avgPrice) * 100;

        let positioning = "Challenger";
        if (successGap > 5 && satisfactionGap > 0.5) positioning = "Leader Qualité";
        if (pricingGap < -10) positioning = "Leader Prix";
        if (successGap > 10 && satisfactionGap > 0.8 && pricingGap < 0) positioning = "Top Performance (Élite)";

        let analysis = `Votre organisme se positionne comme un **${positioning}** sur le marché. `;
        analysis += `Votre taux de réussite est ${successGap > 0 ? `supérieur de ${successGap.toFixed(1)}%` : `inférieur de ${Math.abs(successGap).toFixed(1)}%`} à la moyenne du secteur. `;
        analysis += `Côté satisfaction, vous surperformez de ${(satisfactionGap).toFixed(1)} points. `;

        if (pricingGap < 0) {
            analysis += `Votre stratégie tarifaire est agressive (${Math.abs(pricingGap).toFixed(0)}% sous le marché), ce qui favorise le volume au détriment potentiel de la marge brute.`;
        } else {
            analysis += `Vous vous positionnez sur un segment Premium (+${pricingGap.toFixed(0)}% vs marché), ce qui exige une excellence opérationnelle irréprochable.`;
        }

        return {
            positioning,
            percentile: positioning.includes("Élite") ? 98 : positioning.includes("Leader") ? 85 : 65,
            analysis,
            recommendation: successGap < 0 ? "Prioriser l'alignement pédagogique" : "Capitaliser sur votre avance pour augmenter vos parts de marché"
        };
    }
}
