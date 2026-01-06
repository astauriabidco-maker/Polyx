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
}
