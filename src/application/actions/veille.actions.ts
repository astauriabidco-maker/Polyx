'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { GeminiService } from "../services/gemini.service";

// ============================================
// WATCH ARTICLES (Veille)
// ============================================

export async function createWatchArticleAction(data: {
    organisationId: string;
    title: string;
    url?: string;
    source?: string;
    category: string;
    indicator?: string;
    notes?: string;
}) {
    try {
        const article = await (prisma as any).watchArticle.create({
            data: {
                organisationId: data.organisationId,
                title: data.title,
                url: data.url,
                source: data.source,
                category: data.category,
                indicator: data.indicator,
                notes: data.notes,
                status: 'UNREAD'
            }
        });

        revalidatePath('/app/veille');
        return { success: true, article };
    } catch (error) {
        console.error("Create Watch Article Error:", error);
        return { success: false, error: "Erreur lors de la création de l'article." };
    }
}

export async function getWatchArticlesAction(organisationId: string, category?: string) {
    try {
        const articles = await (prisma as any).watchArticle.findMany({
            where: {
                organisationId,
                ...(category ? { category } : {})
            },
            include: {
                actions: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return { success: true, articles };
    } catch (error) {
        console.error("Get Watch Articles Error:", error);
        return { success: false, error: "Erreur lors de la récupération des articles." };
    }
}

export async function markArticleAsReadAction(articleId: string, userId: string) {
    try {
        const article = await (prisma as any).watchArticle.update({
            where: { id: articleId },
            data: {
                readAt: new Date(),
                readBy: userId,
                status: 'READ'
            }
        });

        revalidatePath('/app/veille');
        return { success: true, article };
    } catch (error) {
        console.error("Mark As Read Error:", error);
        return { success: false, error: "Erreur lors du marquage." };
    }
}

export async function analyzeArticleWithAIAction(articleId: string) {
    try {
        const article = await (prisma as any).watchArticle.findUnique({
            where: { id: articleId }
        });

        if (!article) {
            return { success: false, error: "Article non trouvé." };
        }

        // Use GeminiService to analyze the article
        const analysisPrompt = `Analysez cet article de veille pour un organisme de formation certifié Qualiopi:
        
Titre: ${article.title}
Source: ${article.source || 'Non spécifiée'}
Catégorie: ${article.category}
Notes: ${article.notes || 'Aucune'}

Fournissez:
1. Un RÉSUMÉ concis (2-3 phrases)
2. L'IMPACT potentiel sur un organisme de formation
3. Les ACTIONS RECOMMANDÉES (liste de 2-3 actions concrètes)`;

        // Simulated AI analysis (in production, call real Gemini API)
        const aiResult = await simulateGeminiAnalysis(article);

        const updated = await (prisma as any).watchArticle.update({
            where: { id: articleId },
            data: {
                aiSummary: aiResult.summary,
                aiImpact: aiResult.impact,
                aiRecommendations: aiResult.recommendations,
                status: 'ANALYZED'
            }
        });

        revalidatePath('/app/veille');
        return { success: true, article: updated, analysis: aiResult };
    } catch (error) {
        console.error("AI Analysis Error:", error);
        return { success: false, error: "Erreur lors de l'analyse IA." };
    }
}

async function simulateGeminiAnalysis(article: any) {
    // Simulate processing delay
    await new Promise(r => setTimeout(r, 1500));

    const categoryAnalysis: Record<string, any> = {
        'LEGAL': {
            summary: `Cet article traite d'une évolution réglementaire importante dans le secteur de la formation professionnelle. Il est essentiel de vérifier la conformité de vos pratiques.`,
            impact: `Impact ÉLEVÉ : Cette modification peut affecter vos conventions de formation, vos conditions générales de vente, ou vos processus de déclaration.`,
            recommendations: `1. Mettre à jour les documents contractuels concernés\n2. Informer l'équipe pédagogique et administrative\n3. Prévoir une session de formation interne si nécessaire`
        },
        'METIERS': {
            summary: `Cet article révèle une tendance importante dans l'évolution des compétences recherchées sur le marché du travail.`,
            impact: `Impact MOYEN : Vos programmes de formation pourraient nécessiter une mise à jour pour rester pertinents face aux besoins du marché.`,
            recommendations: `1. Analyser vos programmes existants à la lumière de ces tendances\n2. Consulter vos formateurs experts du domaine\n3. Envisager la création d'un nouveau module ou parcours`
        },
        'PEDAGOGIE': {
            summary: `Cet article présente une innovation pédagogique ou technologique qui pourrait enrichir vos pratiques de formation.`,
            impact: `Impact MOYEN : L'adoption de ces nouvelles méthodes pourrait améliorer l'engagement et les résultats de vos apprenants.`,
            recommendations: `1. Tester cette approche sur un groupe pilote\n2. Former vos équipes à ces nouvelles pratiques\n3. Mesurer l'impact sur la satisfaction et les résultats`
        },
        'HANDICAP': {
            summary: `Cet article concerne l'accessibilité et l'inclusion des personnes en situation de handicap dans la formation.`,
            impact: `Impact ÉLEVÉ pour la conformité Qualiopi : L'indicateur 26 exige une veille active sur l'accueil des publics spécifiques.`,
            recommendations: `1. Mettre à jour votre registre d'accessibilité\n2. Renforcer vos partenariats (AGEFIPH, CAP Emploi)\n3. Former vos équipes à l'accueil des publics concernés`
        }
    };

    return categoryAnalysis[article.category] || categoryAnalysis['LEGAL'];
}

// ============================================
// IMPACT ACTIONS
// ============================================

export async function createImpactActionAction(data: {
    articleId: string;
    title: string;
    description?: string;
    priority?: string;
    dueDate?: Date;
    assignedTo?: string;
}) {
    try {
        const action = await (prisma as any).impactAction.create({
            data: {
                articleId: data.articleId,
                title: data.title,
                description: data.description,
                priority: data.priority || 'MEDIUM',
                dueDate: data.dueDate,
                assignedTo: data.assignedTo,
                status: 'TODO'
            }
        });

        // Update article status
        await (prisma as any).watchArticle.update({
            where: { id: data.articleId },
            data: { status: 'ACTIONED' }
        });

        revalidatePath('/app/veille');
        return { success: true, action };
    } catch (error) {
        console.error("Create Impact Action Error:", error);
        return { success: false, error: "Erreur lors de la création de l'action." };
    }
}

export async function updateImpactActionStatusAction(actionId: string, status: string) {
    try {
        const action = await (prisma as any).impactAction.update({
            where: { id: actionId },
            data: {
                status,
                completedAt: status === 'DONE' ? new Date() : null
            }
        });

        revalidatePath('/app/veille');
        return { success: true, action };
    } catch (error) {
        console.error("Update Action Status Error:", error);
        return { success: false, error: "Erreur lors de la mise à jour." };
    }
}

// ============================================
// ECOSYSTEM PARTNERS
// ============================================

export async function createEcosystemPartnerAction(data: {
    organisationId: string;
    name: string;
    type: string;
    domain?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    website?: string;
    notes?: string;
}) {
    try {
        const partner = await (prisma as any).ecosystemPartner.create({
            data: {
                organisationId: data.organisationId,
                name: data.name,
                type: data.type,
                domain: data.domain,
                contactName: data.contactName,
                contactEmail: data.contactEmail,
                contactPhone: data.contactPhone,
                website: data.website,
                notes: data.notes,
                isActive: true
            }
        });

        revalidatePath('/app/veille');
        return { success: true, partner };
    } catch (error) {
        console.error("Create Partner Error:", error);
        return { success: false, error: "Erreur lors de la création du partenaire." };
    }
}

export async function getEcosystemPartnersAction(organisationId: string) {
    try {
        const partners = await (prisma as any).ecosystemPartner.findMany({
            where: { organisationId },
            orderBy: { name: 'asc' }
        });

        return { success: true, partners };
    } catch (error) {
        console.error("Get Partners Error:", error);
        return { success: false, error: "Erreur lors de la récupération des partenaires." };
    }
}

export async function getVeilleStatsAction(organisationId: string) {
    try {
        const articles = await (prisma as any).watchArticle.findMany({
            where: { organisationId },
            include: { actions: true }
        });

        const partners = await (prisma as any).ecosystemPartner.findMany({
            where: { organisationId, isActive: true }
        });

        const stats = {
            totalArticles: articles.length,
            unreadArticles: articles.filter((a: any) => a.status === 'UNREAD').length,
            analyzedArticles: articles.filter((a: any) => a.status === 'ANALYZED' || a.status === 'ACTIONED').length,
            totalActions: articles.reduce((sum: number, a: any) => sum + a.actions.length, 0),
            completedActions: articles.reduce((sum: number, a: any) => sum + a.actions.filter((ac: any) => ac.status === 'DONE').length, 0),
            totalPartners: partners.length,
            byCategory: {
                LEGAL: articles.filter((a: any) => a.category === 'LEGAL').length,
                METIERS: articles.filter((a: any) => a.category === 'METIERS').length,
                PEDAGOGIE: articles.filter((a: any) => a.category === 'PEDAGOGIE').length,
                HANDICAP: articles.filter((a: any) => a.category === 'HANDICAP').length
            }
        };

        return { success: true, stats };
    } catch (error) {
        console.error("Get Veille Stats Error:", error);
        return { success: false, error: "Erreur lors du calcul des statistiques." };
    }
}
