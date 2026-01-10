/**
 * Normalise un numéro de téléphone au format E.164 (ex: +33612345678)
 */
export function normalizePhone(phone: string): string {
    if (!phone) return "";

    // Supprimer tout ce qui n'est pas chiffre ou le signe + au début
    let cleaned = phone.replace(/[^\d+]/g, "");

    // Si ça commence par 0 et a 10 chiffres (format FR classique)
    if (cleaned.startsWith("0") && cleaned.length === 10) {
        return "+33" + cleaned.substring(1);
    }

    // Si ça commence déjà par +
    if (cleaned.startsWith("+")) {
        return cleaned;
    }

    // Fallback : on retourne tel quel si on ne sait pas identifier
    return cleaned;
}

/**
 * Nettoie une adresse email
 */
export function normalizeEmail(email: string): string {
    if (!email) return "";
    return email.trim().toLowerCase();
}

/**
 * Formate un nom ou prénom (Première lettre en majuscule)
 */
export function capitalize(str: string): string {
    if (!str) return "";
    const cleaned = str.trim();
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
}
