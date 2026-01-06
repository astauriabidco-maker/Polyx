'use server';

import { ProviderConfigService, IntegrationConfigData } from '@/application/services/provider-config.service';

export async function getIntegrationConfigAction(organisationId: string = 'demo-org-id') {
    // In production, we would get organisationId from session
    return await ProviderConfigService.getConfig(organisationId);
}

export async function updateIntegrationConfigAction(organisationId: string = 'demo-org-id', data: Partial<IntegrationConfigData>) {
    return await ProviderConfigService.updateConfig(organisationId, data);
}

export async function getBranchMappingsAction(organisationId: string = 'demo-org-id') {
    return await ProviderConfigService.getAllMappings(organisationId);
}

export async function upsertBranchMappingAction(organisationId: string = 'demo-org-id', externalId: string, internalId: string) {
    return await ProviderConfigService.setAgencyMapping(organisationId, externalId, internalId);
}

export async function deleteBranchMappingAction(organisationId: string = 'demo-org-id', externalId: string) {
    return await ProviderConfigService.deleteMapping(organisationId, externalId);
}
