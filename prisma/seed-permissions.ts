import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SYSTEM_PERMISSIONS = [
    // Leads & CRM
    { id: 'LEADS_VIEW', description: 'Voir les leads' },
    { id: 'LEADS_EDIT', description: 'Modifier les leads' },
    { id: 'LEADS_DELETE', description: 'Supprimer les leads' },
    { id: 'LEADS_ASSIGN', description: 'Assigner les leads à des commerciaux' },
    { id: 'LEADS_IMPORT', description: 'Importer des leads (CSV)' },

    // Learners & Pedagogy
    { id: 'LEARNERS_VIEW', description: 'Voir les apprenants' },
    { id: 'LEARNERS_EDIT', description: 'Modifier les dossiers apprenants' },
    { id: 'ATTENDANCE_MANAGE', description: 'Gérer l\'émargement' },
    { id: 'CERTIFICATES_GENERATE', description: 'Générer des certificats' },

    // Training Catalog
    { id: 'TRAINING_VIEW', description: 'Voir le catalogue de formations' },
    { id: 'TRAINING_EDIT', description: 'Modifier les formations' },
    { id: 'TRAINING_CREATE', description: 'Créer des formations' },
    { id: 'SESSIONS_MANAGE', description: 'Gérer les sessions de formation' },

    // Billing & Finance
    { id: 'BILLING_VIEW', description: 'Voir les factures et devis' },
    { id: 'BILLING_EDIT', description: 'Éditer les factures' },
    { id: 'FINANCE_DASHBOARD', description: 'Accéder au tableau de bord financier' },

    // Users & Security
    { id: 'USERS_VIEW', description: 'Voir les utilisateurs' },
    { id: 'USERS_EDIT', description: 'Modifier les utilisateurs' },
    { id: 'USERS_INVITE', description: 'Inviter de nouveaux utilisateurs' },
    { id: 'ROLES_MANAGE', description: 'Gérer les rôles et permissions' },

    // Settings & Integrations
    { id: 'SETTINGS_VIEW', description: 'Voir les paramètres' },
    { id: 'SETTINGS_EDIT', description: 'Modifier les paramètres' },
    { id: 'INTEGRATIONS_MANAGE', description: 'Gérer les intégrations (Twilio, SendGrid, etc.)' },

    // Reports & Analytics
    { id: 'REPORTS_VIEW', description: 'Voir les rapports et statistiques' },
    { id: 'REPORTS_EXPORT', description: 'Exporter les rapports' },

    // Agenda
    { id: 'AGENDA_VIEW', description: 'Voir l\'agenda' },
    { id: 'AGENDA_EDIT', description: 'Modifier les rendez-vous' },
    { id: 'AGENDA_ALL_USERS', description: 'Voir l\'agenda de tous les collaborateurs' },

    // Network (Franchises)
    { id: 'FRANCHISE_VIEW', description: 'Voir les franchises' },
    { id: 'FRANCHISE_MANAGE', description: 'Gérer les franchises' },
];

async function main() {
    console.log('🔐 Seeding System Permissions...');

    for (const perm of SYSTEM_PERMISSIONS) {
        await prisma.systemPermission.upsert({
            where: { id: perm.id },
            update: { description: perm.description },
            create: perm
        });
        console.log(`  ✅ ${perm.id}`);
    }

    console.log(`\n🎉 ${SYSTEM_PERMISSIONS.length} permissions seeded successfully!`);
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
