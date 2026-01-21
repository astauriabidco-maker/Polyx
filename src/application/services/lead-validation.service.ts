export class LeadValidationService {
    /**
     * Sanitizes and validates lead data.
     * Returns the sanitized lead or throws an error if validation fails.
     */
    static validateAndSanitize(raw: any) {
        // 1. Mandatory fields
        if (!raw.first_name) throw new Error('First name is required');
        if (!raw.email && !raw.phone) throw new Error('Either email or phone is required');
        if (!raw.date_reponse) throw new Error('Response date is required');

        // 2. Email sanitization
        let email = raw.email?.toLowerCase().trim();
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new Error(`Invalid email format: ${email}`);
        }

        // 3. Phone sanitization (Remove non-digits, ensuring it looks like a phone number)
        let phone = raw.phone?.replace(/\D/g, '');
        if (phone && phone.length < 10) {
            throw new Error(`Invalid phone format: ${raw.phone}`);
        }

        // 4. Source normalization
        const source = raw.source?.toUpperCase().trim() || 'API_IMPORT';

        // 5. Consent validation
        if (raw.date_consentement) {
            const consentDate = new Date(raw.date_consentement);
            if (isNaN(consentDate.getTime())) {
                throw new Error(`Invalid consent date: ${raw.date_consentement}`);
            }
        }

        return {
            ...raw,
            email,
            phone,
            source,
            first_name: raw.first_name.trim(),
            last_name: raw.last_name?.trim() || ''
        };
    }

    /**
     * Map external agency_id to internal organizationId if needed.
     * Looks up dynamic mapping in database, falls back to default.
     */
    static async mapOrganization(agencyId: string | number, defaultOrgId: string = 'demo-org-id'): Promise<string> {
        if (!agencyId) return defaultOrgId;

        try {
            // Lazy load the service to avoid circular deps
            const { ProviderConfigService } = await import('./provider-config.service');
            const mapped = await ProviderConfigService.getMappedAgencyId(defaultOrgId, agencyId.toString());
            return mapped || defaultOrgId;
        } catch (e) {
            console.error('Failed to map agency', e);
            return defaultOrgId;
        }
    }
}
