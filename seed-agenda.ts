
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Extension des données Agenda...');

    // 1. Get Organization and User
    // We try to pick a realistic user (first one found)
    const user = await prisma.user.findFirst({
        include: { accessGrants: true }
    });

    if (!user) {
        console.error('❌ Aucun utilisateur trouvé. Veuillez créer un utilisateur d\'abord.');
        return;
    }

    const orgId = user.accessGrants[0]?.organisationId;
    if (!orgId) {
        console.error('❌ Utilisateur sans organisation.');
        return;
    }

    console.log(`👤 Seed pour User: ${user.firstName} ${user.lastName} (${user.id})`);

    // 2. Create Leads with Addresses
    const leadsData = [
        { firstName: 'Sophie', lastName: 'Martin', email: 'sophie.martin@example.com', phone: '0601020304', street: '10 Rue de la Paix', city: 'Paris', zipCode: '75002' },
        { firstName: 'Thomas', lastName: 'Dubois', email: 'thomas.dubois@example.com', phone: '0601020305', street: '15 Avenue des Champs-Élysées', city: 'Paris', zipCode: '75008' },
        { firstName: 'Julie', lastName: 'Leroy', email: 'julie.leroy@example.com', phone: '0601020306', street: '5 Place de la République', city: 'Paris', zipCode: '75003' },
        { firstName: 'Lucas', lastName: 'Petit', email: 'lucas.petit@example.com', phone: '0601020307', street: '1 Rue de Rivoli', city: 'Paris', zipCode: '75004' },
        { firstName: 'Emma', lastName: 'Moreau', email: 'emma.moreau@example.com', phone: '0601020308', street: '50 Boulevard Haussmann', city: 'Paris', zipCode: '75009' }
    ];

    const leads = [];
    for (const data of leadsData) {
        const lead = await prisma.lead.create({
            data: {
                ...data,
                organisationId: orgId,
                status: 'PROSPECT',
                source: 'SEED'
            }
        });
        leads.push(lead);
    }
    console.log(`✅ ${leads.length} Leads créés.`);

    // 3. Create Past Appointments (Completed)
    const outcomes = ['POSITIVE', 'POSITIVE', 'NEGATIVE', 'RESCHEDULE', 'POSITIVE'];

    for (let i = 0; i < 5; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (i + 1)); // Past days
        date.setHours(10, 0, 0, 0);

        const outcome = outcomes[i];

        await prisma.calendarEvent.create({
            data: {
                organisationId: orgId,
                userId: user.id,
                leadId: leads[i].id,
                title: `RDV Découverte - ${leads[i].lastName}`,
                description: 'Premier contact commercial.',
                start: date,
                end: new Date(date.getTime() + 60 * 60 * 1000), // 1h duration
                type: i % 2 === 0 ? 'VISIO' : 'PHYSIQUE',
                status: 'COMPLETED',
                metadata: {
                    debrief: {
                        outcome: outcome,
                        summary: 'Seed generated debrief.',
                        completedAt: new Date()
                    },
                    // Fake coords for map
                    lat: 48.8566 + (Math.random() - 0.5) * 0.1,
                    lng: 2.3522 + (Math.random() - 0.5) * 0.1,
                }
            }
        });

        // Add history
        await prisma.leadActivity.create({
            data: {
                leadId: leads[i].id,
                userId: user.id,
                type: 'MEETING_DEBRIEF',
                content: `[SEED] Issue: ${outcome}`,
                createdAt: date
            }
        });
    }
    console.log('✅ 5 RDV passés (traités) créés.');

    // 4. Create Future Appointments
    for (let i = 0; i < 5; i++) {
        const date = new Date();
        date.setDate(date.getDate() + (i + 1)); // Future days
        date.setHours(14, 0, 0, 0);

        await prisma.calendarEvent.create({
            data: {
                organisationId: orgId,
                userId: user.id,
                leadId: leads[i % leads.length].id,
                title: `Relance - ${leads[i % leads.length].lastName}`,
                description: 'Call de suivi.',
                start: date,
                end: new Date(date.getTime() + 45 * 60 * 1000), // 45min
                type: i % 3 === 0 ? 'PHYSIQUE' : 'VISIO',
                status: 'SCHEDULED',
                metadata: {
                    // Fake coords for map
                    lat: 48.8566 + (Math.random() - 0.5) * 0.1,
                    lng: 2.3522 + (Math.random() - 0.5) * 0.1,
                }
            }
        });
    }
    console.log('✅ 5 RDV futurs créés.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
