
import { getAssessmentSessionAction } from '../src/application/actions/assessment.actions';

async function main() {
    const token = 'a07695e4-12e9-49ab-a1c5-3e4cb47e8698';
    console.log(`🔍 Debugging session loading for token: ${token}`);

    try {
        const res = await getAssessmentSessionAction(token);
        console.log('Result:', res);
    } catch (e) {
        console.error('🔥 UNCAUGHT EXCEPTION:', e);
    }
}

main();
