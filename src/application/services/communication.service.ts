/**
 * Mock Service for Polyx Communications
 * This service handles sending professional HTML emails via simulated SMTP/API.
 */
export class CommunicationService {
    static async sendCertificateEmail(data: {
        to: string;
        learnerName: string;
        trainingTitle: string;
        organisationName: string;
        certificateUrl?: string;
        surveyUrl?: string; // New field
    }) {
        console.log(`[EMAIL] 🚀 Sending Certificate to ${data.to}...`);

        // Structure of the professional HTML email
        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                <div style="background-color: #4f46e5; padding: 40px; text-align: center; color: white;">
                    <div style="background: white; width: 40px; height: 40px; border-radius: 8px; display: inline-block; line-height: 40px; color: #4f46e5; font-weight: 900; font-size: 24px; margin-bottom: 20px;">P</div>
                    <h1 style="margin: 0; font-size: 24px;">Félicitations, ${data.learnerName} !</h1>
                </div>
                <div style="padding: 40px; color: #1e293b; line-height: 1.6;">
                    <p style="font-size: 18px; font-weight: bold;">Votre formation est terminée.</p>
                    <p>Nous avons le plaisir de vous informer que vous avez complété avec succès votre parcours :</p>
                    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #4f46e5; margin: 25px 0;">
                        <span style="display: block; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold;">Formation</span>
                        <strong style="font-size: 16px;">${data.trainingTitle}</strong>
                    </div>
                    <p>Vous trouverez ci-joint (ou via le lien ci-dessous) votre <strong>Certificat de Réalisation</strong> officiel, conforme aux exigences CPF et Qualiopi.</p>
                    
                    <div style="text-align: center; margin-top: 30px; margin-bottom: 30px;">
                        <a href="${data.certificateUrl || '#'}" style="background-color: #4f46e5; color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Accéder à mon certificat</a>
                    </div>

                    <div style="background-color: #fff1f2; padding: 20px; border-radius: 8px; border: 1px dashed #fb7185; text-align: center;">
                        <p style="margin: 0; font-weight: bold; color: #e11d48;">Votre avis nous est précieux !</p>
                        <p style="margin: 5px 0 15px 0; font-size: 14px; color: #475569;">Prenez 30 secondes pour nous donner votre avis sur cette formation et nous aider à nous améliorer.</p>
                        <a href="${data.surveyUrl || '#'}" style="color: #e11d48; font-weight: bold; text-decoration: underline;">Répondre à l'enquête de satisfaction →</a>
                    </div>
                </div>
                <div style="background-color: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0;">
                    Ce message a été envoyé par <strong>${data.organisationName}</strong> via l'outil de gestion Polyx.<br>
                    © 2026 Polyx Academy. Tous droits réservés.
                </div>
            </div>
        `;

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        console.log(`[EMAIL] ✅ Email sent to ${data.to}`);
        return { success: true };
    }

    static async sendColdSurveyEmail(data: {
        to: string;
        learnerName: string;
        trainingTitle: string;
        organisationName: string;
        surveyUrl: string;
    }) {
        console.log(`[EMAIL] ❄️ Sending Cold Survey to ${data.to}...`);

        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                <div style="background-color: #0f172a; padding: 40px; text-align: center; color: white;">
                    <h1 style="margin: 0; font-size: 24px;">Que devenez-vous, ${data.learnerName} ?</h1>
                </div>
                <div style="padding: 40px; color: #1e293b; line-height: 1.6;">
                    <p>Il y a quelques mois, vous terminiez votre formation <strong>"${data.trainingTitle}"</strong>.</p>
                    <p>Dans le cadre de notre démarche qualité (Indicateur 30 Qualiopi), nous aimerions savoir si cette formation vous a été utile dans votre parcours professionnel avec un peu de recul.</p>
                    
                    <div style="text-align: center; margin-top: 30px; margin-bottom: 30px;">
                        <a href="${data.surveyUrl}" style="background-color: #4f46e5; color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Répondre au questionnaire (30s)</a>
                    </div>
                    
                    <p style="font-size: 14px; color: #64748b;">Votre retour nous aide à prouver l'efficacité de nos formations auprès des financeurs et à améliorer nos programmes.</p>
                </div>
                <div style="background-color: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 12px;">
                    © 2026 ${data.organisationName} • Piloté par Polyx Quality
                </div>
            </div>
        `;

        await new Promise(resolve => setTimeout(resolve, 1500));
        console.log(`[EMAIL] ✅ Cold Survey sent to ${data.to}`);
        return { success: true };
    }
}
