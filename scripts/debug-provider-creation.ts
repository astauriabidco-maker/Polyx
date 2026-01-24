
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const orgId = "cm66x7k3r000212f00g63l4y2"; // Using an arbitrary ID or I should fetch one.
    // Let's first fetch an existing organisation to use.
    const org = await prisma.organisation.findFirst();

    if (!org) {
        console.log("No organisation found.");
        return;
    }

    console.log(`Testing provider creation for Org: ${org.id} (${org.name})`);

    try {
        const provider = await prisma.apiProvider.create({
            data: {
                organisationId: org.id,
                name: "Debug Provider Test",
                baseUrl: "https://test.com",
                // apiKey: undefined, // Simulating omitted field
                webhookUrl: "https://webhook.site/test",
                isActive: false,
                status: 'DRAFT',
                legalName: "Debug Corp",
                siret: "99999999900000",
                address: "123 Debug Lane",
                contactName: "Mr Debug",
                contactEmail: "debug@test.com",
                // legalStatus: undefined
            }
        });
        console.log("Creation Successful:", provider);
    } catch (error) {
        console.error("Creation Failed:", error);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
