
import { PrismaClient } from '@prisma/client';
import { LeadStatus } from '../src/domain/entities/lead'; // Direct import might fail if strict on fs, but let's try relative or alias
// Actually, let's just use the strings to avoid import issues with tsx in scripts folder
// import { prisma } from '@/lib/prisma'; // This might work with tsx

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding Provider Intelligence Data...');

    // 0. Ensure Organization
    let org = await prisma.organisation.findFirst();
    if (!org) {
        org = await prisma.organisation.create({
            data: { name: 'Demo Org Seeded', country: 'France' }
        });
    }
    const orgId = org.id;

    // 1. Seed Configuration
    await prisma.integrationConfig.upsert({
        where: { organisationId: orgId },
        update: {
            averageCartValue: 1800.0, // Updated value to test dynamic config
            roiThresholdHigh: 6.0,
            roiThresholdLow: 1.5
        },
        create: {
            organisationId: orgId,
            averageCartValue: 1800.0,
            roiThresholdHigh: 6.0,
            roiThresholdLow: 1.5
        }
    });

    // 2. Seed Branch Mappings
    const mappings = [
        { external: '75001', internal: 'paris-center' },
        { external: '13000', internal: 'marseille-sud' },
        { external: '69000', internal: 'lyon-est' }
    ];

    for (const m of mappings) {
        await prisma.agencyMapping.upsert({
            where: {
                organisationId_externalAgencyId: {
                    organisationId: orgId,
                    externalAgencyId: m.external
                }
            },
            update: { internalAgencyId: m.internal },
            create: {
                organisationId: orgId,
                externalAgencyId: m.external,
                internalAgencyId: m.internal
            }
        });
    }

    // Scenario 1: "Cash Machine" (High ROI)
    // Low Volume, High Price (Qualitative), Low CPL
    const provider1 = await prisma.apiProvider.upsert({
        where: { apiKey: 'key-premium-source' },
        update: {},
        create: {
            name: 'Premium Prospects Ltd.',
            apiKey: 'key-premium-source',
            providerType: 'AFFILIATE',
            pricingModel: 'CPL',
            costPerLead: 25.0,
            complianceStatus: 'VERIFIED',
            isActive: true
        }
    });

    // Scenario 2: "Volume King" (Average ROI)
    // High Volume, Average Quality, Cheap CPL
    const provider2 = await prisma.apiProvider.upsert({
        where: { apiKey: 'key-social-ads' },
        update: {},
        create: {
            name: 'Social Media Ads',
            apiKey: 'key-social-ads',
            providerType: 'LEAD_GENERATOR',
            pricingModel: 'CPL',
            costPerLead: 8.0,
            complianceStatus: 'VERIFIED',
            isActive: true
        }
    });

    // Scenario 3: "Money Pit" (Bad ROI)
    // Medium Volume, Very Low Quality, Average CPL
    const provider3 = await prisma.apiProvider.upsert({
        where: { apiKey: 'key-bad-leads' },
        update: {},
        create: {
            name: 'Cheap Datas Broker',
            apiKey: 'key-bad-leads',
            providerType: 'LEAD_GENERATOR',
            pricingModel: 'CPL',
            costPerLead: 15.0,
            complianceStatus: 'VERIFIED',
            isActive: true
        }
    });

    // Generate Leads
    await generateLeads(orgId, provider1.id, 15, 0.6); // 15 leads, 60% qualified
    await generateLeads(orgId, provider2.id, 80, 0.15); // 80 leads, 15% qualified
    await generateLeads(orgId, provider3.id, 40, 0.05); // 40 leads, 5% qualified

    console.log('✅ Seeding completed.');
}

async function generateLeads(orgId: string, providerId: string, count: number, qualityRate: number) {

    const now = new Date();

    for (let i = 0; i < count; i++) {
        const isQualified = Math.random() < qualityRate;
        const status = isQualified ? 'QUALIFIED' : (Math.random() < 0.5 ? 'DISQUALIFIED' : 'PROSPECT');

        await prisma.lead.create({
            data: {
                organisationId: orgId,
                providerId: providerId,
                firstName: `Lead ${i}`,
                lastName: `Test ${providerId.substring(0, 4)}`,
                email: `lead-${i}-${providerId.substring(0, 4)}@example.com`,
                phone: '0612345678',
                status: status,
                source: 'API_IMPORT',
                score: isQualified ? 85 : 30,
                createdAt: new Date(now.getTime() - Math.random() * 1000 * 60 * 60 * 24 * 7), // Last 7 days
                updatedAt: now
            }
        });
    }
    console.log(`Generated ${count} leads for provider ${providerId} with ~${qualityRate * 100}% quality.`);
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
