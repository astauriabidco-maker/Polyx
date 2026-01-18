const axios = require('axios');

async function testWebhooks() {
    console.log('--- Ads Connectors Webhook Verification ---');

    const baseUrl = 'http://localhost:5555'; // Assuming the server is running

    // 1. Meta Webhook Verification (GET)
    console.log('Testing Meta Webhook Verification...');
    try {
        const metaVerify = await axios.get(`${baseUrl}/api/webhooks/ads/meta?hub.mode=subscribe&hub.verify_token=polyx_verify&hub.challenge=12345`);
        console.log('Meta Verify Response:', metaVerify.data);
    } catch (e) {
        console.log('Meta Verify Failed (Expected if server not running or token mismatch):', e.message);
    }

    // 2. Google Webhook Ingestion (POST)
    console.log('Testing Google Webhook Ingestion...');
    try {
        const googleIngest = await axios.post(`${baseUrl}/api/webhooks/ads/google`, {
            google_key: 'test_google_secret',
            lead_id: 'goog_123',
            campaign_id: 'camp_789',
            user_column_data: [
                { column_name: 'First Name', string_value: 'Jean' },
                { column_name: 'Last Name', string_value: 'Dupont' },
                { column_name: 'User Email', string_value: 'jean.dupont@example.com' },
                { column_name: 'User Phone', string_value: '+33612345678' }
            ]
        });
        console.log('Google Ingest Response:', googleIngest.data);
    } catch (e) {
        console.log('Google Ingest Failed:', e.message);
    }

    console.log('✅ Verification scripts ready. Execute them against a running server.');
}

testWebhooks();
