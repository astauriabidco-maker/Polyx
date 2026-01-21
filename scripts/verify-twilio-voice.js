const { prisma } = require('../src/lib/prisma');
const { encrypt } = require('../src/lib/crypto');

async function verify() {
    const org = await prisma.organisation.findFirst();
    if (!org) return console.log('Aucune organisation trouvée');

    console.log('Test sur organisation:', org.name, '(', org.id, ')');

    // Mocker la configuration Twilio Voice
    await prisma.integrationConfig.upsert({
        where: { organisationId: org.id },
        update: {
            twilioAccountSid: 'AC_MOCK_ACCOUNT_SID',
            twilioApiKey: encrypt('SK_MOCK_API_KEY'),
            twilioApiSecret: encrypt('MOCK_API_SECRET'),
            twilioTwimlAppSid: encrypt('AP_MOCK_TWIML_APP_SID'),
            voiceEnabled: true,
            voiceProvider: 'TWILIO'
        },
        create: {
            organisationId: org.id,
            twilioAccountSid: 'AC_MOCK_ACCOUNT_SID',
            twilioApiKey: encrypt('SK_MOCK_API_KEY'),
            twilioApiSecret: encrypt('MOCK_API_SECRET'),
            twilioTwimlAppSid: encrypt('AP_MOCK_TWIML_APP_SID'),
            voiceEnabled: true,
            voiceProvider: 'TWILIO'
        }
    });

    console.log('✅ Configuration Twilio Voice injectée.');

    // Simuler un appel à l'API (on ne peut pas facilement tester le route.ts car il utilise cookies() et 'use server')
    // Mais on peut vérifier que le Prisma Client voit bien les nouveaux champs
    const config = await prisma.integrationConfig.findUnique({
        where: { organisationId: org.id }
    });

    if (config.twilioApiKey && config.twilioApiSecret && config.twilioTwimlAppSid) {
        console.log('✅ Champs Twilio Voice présents et persistés.');
    } else {
        console.error('❌ Erreur : Champs manquants !');
    }
}

verify().catch(console.error);
