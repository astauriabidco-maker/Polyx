import { User } from '@/domain/entities/user';
import { Organization } from '@/domain/entities/organization';
import { Role, SYSTEM_ROLES } from '@/domain/entities/permission';
import { Lead, LeadStatus, LeadSource, CallOutcome, RefusalReason } from '@/domain/entities/lead';

export interface AuditLog {
    timestamp: Date;
    event: string;
    description: string;
}

export interface ApiProvider {
    id: string;
    name: string;
    legalName: string;
    siret: string;
    providerType: string;
    apiKey: string;
    isActive: boolean;
    allowedBranches: string[];
    createdAt: Date;
    contact: {
        name: string;
        email: string;
        phone: string;
        role: string;
    };
    contract: {
        startDate: Date;
        status: string;
    };
    // Compliance (GDPR)
    complianceStatus: 'VERIFIED' | 'PENDING' | 'NONE';
    dpaSignedAt?: Date;
    dpaVersion?: string;

    // Onboarding
    onboardingToken?: string;
    onboardingExpiresAt?: Date;
    signatureUrl?: string; // base64 or url

    // Security
    allowedIPs?: string[]; // IP Whitelisting (optional)

    // Tracking
    auditLogs: AuditLog[];
}

export interface LegalDocument {
    id: string;
    type: 'DPA' | 'CGU';
    version: string;
    title: string;
    sections: { title: string; content: string }[];
    isActive: boolean;
    createdAt: Date;
    publishedAt?: Date;
}

export interface Exam {
    id: number;
    name: string;
    code: string;
}

export interface Agency {
    id: string; // Updated to string for CUID consistency
    name: string;
    city: string;
}

// Singleton storage for development
export class MockDB {
    private static instance: MockDB;

    public users: User[] = [];
    public organizations: Organization[] = [];
    public leads: Lead[] = [];
    public apiProviders: ApiProvider[] = [];
    public legalDocuments: LegalDocument[] = [];
    public exams: Exam[] = [];
    public agencies: Agency[] = [];

    private constructor() {
        this.seed();
    }

    public static getInstance(): MockDB {
        if (process.env.NODE_ENV !== 'production') {
            if (!(global as any).mockDbInstance) {
                (global as any).mockDbInstance = new MockDB();
            }
            return (global as any).mockDbInstance;
        }

        if (!MockDB.instance) {
            MockDB.instance = new MockDB();
        }
        return MockDB.instance;
    }

    private seed() {
        // --- Demo Data ---
        const demoOrgId = 'demo-org-id';

        const demoOrg: Organization = {
            id: demoOrgId,
            name: 'Polyx Academy Demo',
            siret: '888 888 888 00018',
            nda: '11 75 61234 56',
            qualiopi: true,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),

            address: {
                street: '10 Avenue des Champs-Élysées',
                zipCode: '75008',
                city: 'Paris',
                country: 'France'
            },
            contact: {
                phone: '+33 1 23 45 67 89',
                email: 'contact@polyx-academy.com',
                website: 'https://polyx-academy.com'
            },
            branding: {
                logoUrl: 'https://placehold.co/200x80/indigo/white?text=POLYX',
                stampUrl: 'https://placehold.co/150x150/transparent/indigo?text=CACHET',
                signatureUrl: 'https://placehold.co/200x80/transparent/black?text=Signature'
            },

            settings: {
                modules: { crm: true, quality: true, billing: true, elearning: true },
                security: { passwordPolicy: 'standard', sessionTimeoutMinutes: 60 }
            },
            agencies: [
                {
                    id: 'agency-paris',
                    organizationId: demoOrgId,
                    name: 'Agence Paris (Siège)',
                    code: 'PAR-001',
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    address: { street: '1 Rue de la Paix', city: 'Paris', zipCode: '75001', country: 'France' },
                    contacts: { phone: '01 02 03 04 05', email: 'paris@polyx.io' }
                }
            ],
            // Seed system roles (and later custom roles can be pushed here)
            roles: [...SYSTEM_ROLES]
        };

        // --- Secondary Organization (for Shared View) ---
        const secOrgId = 'sec-org-id';
        const secOrg: Organization = {
            id: secOrgId,
            name: 'Polyx Franchise Lyon',
            siret: '999 999 999 00029',
            nda: '12 69 98765 43',
            qualiopi: true,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            address: { street: '5 Place Bellecour', zipCode: '69002', city: 'Lyon', country: 'France' },
            contact: { phone: '04 78 00 00 00', email: 'lyon@polyx-academy.com' },
            branding: { logoUrl: '', stampUrl: '', signatureUrl: '' },
            settings: { modules: { crm: true, quality: false, billing: false, elearning: false }, security: { passwordPolicy: 'standard', sessionTimeoutMinutes: 60 } },
            agencies: [],
            roles: [...SYSTEM_ROLES]
        };

        const demoUser: User = {
            id: 'demo-user',
            email: 'demo@polyx.io',
            firstName: 'Demo',
            lastName: 'Admin',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            memberships: [
                { organizationId: demoOrgId, role: Role.ADMIN_OF, isActive: true, joinedAt: new Date() },
                { organizationId: secOrgId, role: Role.ADMIN_OF, isActive: true, joinedAt: new Date() } // Dual membership
            ]
        };

        this.organizations.push(demoOrg, secOrg);
        this.users.push(demoUser);

        // --- Leads Seeding ---
        this.leads = [
            // Demo Org Leads
            {
                id: '1', organizationId: demoOrgId,
                firstName: 'Sophie', lastName: 'Martin', email: 'sophie.m@gmail.com', phone: '0612345678',
                source: LeadSource.FACEBOOK, status: LeadStatus.PROSPECT,
                providerId: 'prov-1',
                score: 85, callAttempts: 0, history: [], createdAt: new Date(), updatedAt: new Date()
            },
            {
                id: '2', organizationId: demoOrgId,
                firstName: 'Thomas', lastName: 'Dubois', email: 't.dubois@outlook.fr', phone: '0798765432',
                source: LeadSource.WEBSITE, status: LeadStatus.PROSPECTION,
                nextCallbackAt: new Date(Date.now() - 3600000), // 1h ago
                providerId: 'prov-1',
                score: 45, callAttempts: 1, lastCallDate: new Date(Date.now() - 86400000), history: [], createdAt: new Date(), updatedAt: new Date()
            },
            // Secondary Org Leads
            {
                id: '10', organizationId: secOrgId,
                firstName: 'Julie', lastName: 'Bernard', email: 'julie.b@yahoo.fr', phone: '0699887766',
                source: LeadSource.REFERRAL, status: LeadStatus.PROSPECT,
                providerId: 'prov-1',
                score: 92, callAttempts: 0, history: [], createdAt: new Date(), updatedAt: new Date()
            },
            {
                id: '11', organizationId: secOrgId,
                firstName: 'Marc', lastName: 'Petit', email: 'marc.p@gmail.com', phone: '0711223344',
                source: LeadSource.GOOGLE_ADS, status: LeadStatus.CONTACTED,
                score: 60, callAttempts: 1, history: [], createdAt: new Date(), updatedAt: new Date()
            }
        ];

        // --- Api Providers Seeding ---
        // --- Api Providers Seeding ---
        this.apiProviders = [
            {
                id: 'prov-1',
                name: 'Legacy Partner',
                legalName: 'Legacy Marketing Solutions SAS',
                siret: '123 456 789 00012',
                providerType: 'LEAD_GENERATOR',
                apiKey: 'polyx-secret-key-123',
                isActive: true,
                allowedBranches: ['demo-org', 'sec-org-id'],
                createdAt: new Date('2024-01-01'),
                contact: {
                    name: 'Jean Michel',
                    email: 'jean.michel@legacy-marketing.fr',
                    phone: '+33 6 12 34 56 78',
                    role: 'Account Manager'
                },
                contract: {
                    startDate: new Date('2024-01-01'),
                    status: 'ACTIVE'
                },
                complianceStatus: 'VERIFIED',
                dpaSignedAt: new Date('2024-01-10'),
                auditLogs: [
                    { timestamp: new Date('2024-01-01'), event: 'CREATED', description: 'Partenaire créé par l\'admin' },
                    { timestamp: new Date('2024-01-10'), event: 'ONBOARDING_COMPLETED', description: 'DPA signé et clé API activée' }
                ]
            },
            {
                id: 'prov-2',
                name: 'Facebook Ads Hiver',
                legalName: 'Meta Marketing Pro',
                siret: '555 666 777 00055',
                providerType: 'LEAD_GENERATOR',
                apiKey: 'facebook-winter-campaign-2024',
                isActive: true,
                allowedBranches: ['demo-org'],
                createdAt: new Date('2024-02-01'),
                contact: {
                    name: 'Sarah Connor',
                    email: 's.connor@meta-agency.com',
                    phone: '+33 7 99 88 77 66',
                    role: 'Traffic Manager'
                },
                contract: {
                    startDate: new Date('2024-02-01'),
                    status: 'ACTIVE'
                },
                complianceStatus: 'VERIFIED',
                dpaSignedAt: new Date('2024-02-05'),
                auditLogs: [
                    { timestamp: new Date('2024-02-01'), event: 'CREATED', description: 'Partenaire Facebook Ads créé' },
                    { timestamp: new Date('2024-02-05'), event: 'ONBOARDING_COMPLETED', description: 'Onboarding réussi' }
                ]
            }
        ];

        // --- Generate Random Leads for Dashboard ---
        const firstNames = ['Lucas', 'Emma', 'Léa', 'Gabriel', 'Raphaël', 'Jade', 'Louise', 'Arthur', 'Louis', 'Mila'];
        const lastNames = ['Martin', 'Bernard', 'Thomas', 'Petit', 'Robert', 'Richard', 'Durand', 'Dubois', 'Moreau', 'Laurent'];
        const statuses = [
            LeadStatus.PROSPECT, LeadStatus.PROSPECT, LeadStatus.PROSPECT,
            LeadStatus.CONTACTED, LeadStatus.CONTACTED,
            LeadStatus.PROSPECTION,
            LeadStatus.RDV_FIXE, LeadStatus.QUALIFIED,
            LeadStatus.NRP, LeadStatus.NRP,
            LeadStatus.DISQUALIFIED
        ];

        for (let i = 0; i < 60; i++) {
            const isProv1 = Math.random() > 0.4; // 60% Legacy, 40% Facebook
            const providerId = isProv1 ? 'prov-1' : 'prov-2';
            const daysAgo = Math.floor(Math.random() * 14);
            const date = new Date();
            date.setDate(date.getDate() - daysAgo);

            this.leads.push({
                id: `mock-${i}`,
                organizationId: demoOrgId,
                firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
                lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
                email: `lead.${i}@example.com`,
                phone: `06${Math.floor(Math.random() * 90000000 + 10000000)}`,

                // Rich Data Seeding
                street: `${Math.floor(Math.random() * 100)} Rue de la République`,
                zipCode: `${Math.floor(Math.random() * 90000) + 10000}`,
                city: ['Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Lille'][Math.floor(Math.random() * 5)],
                examId: `exam-${Math.floor(Math.random() * 10)}`,
                agencyId: `agency-${Math.floor(Math.random() * 5)}`,
                responseDate: new Date(Date.now() - Math.floor(Math.random() * 1000000000)),
                consentDate: new Date(Date.now() - Math.floor(Math.random() * 2000000000)),

                source: isProv1 ? LeadSource.REFERRAL : LeadSource.FACEBOOK,
                status: statuses[Math.floor(Math.random() * statuses.length)],
                providerId: providerId,
                score: Math.floor(Math.random() * 100),
                callAttempts: Math.floor(Math.random() * 5),
                history: [],
                createdAt: date,
                updatedAt: date
            });
        }

        // --- Exams Seeding ---
        this.exams = [
            { id: 1, name: 'TOEIC Listening & Reading', code: 'TOEIC-LR' },
            { id: 2, name: 'TOEIC Speaking & Writing', code: 'TOEIC-SW' },
            { id: 3, name: 'TOEFL iBT', code: 'TOEFL' },
            { id: 4, name: 'IELTS Academic', code: 'IELTS-A' },
            { id: 5, name: 'IELTS General', code: 'IELTS-G' },
            { id: 6, name: 'Cambridge B2 First', code: 'FCE' },
            { id: 7, name: 'Cambridge C1 Advanced', code: 'CAE' },
            { id: 8, name: 'Bright Language', code: 'BRIGHT' },
            { id: 9, name: 'Linguaskill', code: 'LING' },
            { id: 10, name: 'BULATS', code: 'BULATS' },
        ];

        // --- Agencies Seeding ---
        this.agencies = [
            { id: 'agency-1', name: 'Agence Paris Centre', city: 'Paris' },
            { id: 'agency-2', name: 'Agence Lyon Part-Dieu', city: 'Lyon' },
            { id: 'agency-3', name: 'Agence Marseille Vieux-Port', city: 'Marseille' },
            { id: 'agency-4', name: 'Agence Bordeaux Lac', city: 'Bordeaux' },
            { id: 'agency-5', name: 'Agence Toulouse Capitole', city: 'Toulouse' },
            { id: 'agency-6', name: 'Agence Nantes Atlantique', city: 'Nantes' },
            { id: 'agency-7', name: 'Agence Lille Europe', city: 'Lille' },
            { id: 'agency-8', name: 'Agence Strasbourg Centre', city: 'Strasbourg' },
        ];

        // --- Legal Documents Seeding ---
        this.legalDocuments = [
            {
                id: 'dpa-v1',
                type: 'DPA',
                version: 'v1',
                title: "Contrat de Sous-Traitance (DPA)",
                isActive: true, // Current active version
                createdAt: new Date('2023-01-01'),
                publishedAt: new Date('2023-01-01'),
                sections: [
                    {
                        title: "1. Objet du contrat",
                        content: "Le présent accord a pour objet de définir les conditions dans lesquelles le Sous-traitant s'engage à effectuer pour le compte du Responsable de traitement les opérations de traitement de données à caractère personnel définies ci-après."
                    },
                    {
                        title: "2. Description du traitement",
                        content: "Le Sous-traitant est autorisé à traiter pour le compte du Responsable de traitement les données personnelles nécessaires à la fourniture des services suivants : Génération et transmission de leads qualifiés via API."
                    },
                    {
                        title: "3. Obligations du Sous-traitant",
                        content: `Le Sous-traitant s'engage à :
- Traiter les données uniquement pour la ou les seule(s) finalité(s) qui fait/font l’objet de la sous-traitance
- Garantir la confidentialité des données à caractère personnel traitées
- Veiller à ce que les personnes autorisées à traiter les données s’engagent à respecter la confidentialité`
                    },
                    {
                        title: "4. Mesures de sécurité",
                        content: "Le Sous-traitant s'engage à mettre en œuvre les mesures techniques et organisationnelles appropriées pour garantir un niveau de sécurité adapté au risque."
                    }
                ]
            }
        ];

        console.log('[MockDB] Seeded demo data with Multi-Org Leads and Providers');
    }
}

export const db = MockDB.getInstance();
