import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LeadService } from '@/application/services/lead.service';
import { LeadStatus } from '@/domain/entities/lead';

export async function POST(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const secret = searchParams.get('secret');
        const orgId = searchParams.get('orgId');

        if (!secret || !orgId) {
            return NextResponse.json({ error: 'Missing secret or orgId' }, { status: 400 });
        }

        // Validate Secret
        const config = await prisma.integrationConfig.findFirst({
            where: { organisationId: orgId }
        });

        if (!config || config.webhookSecret !== secret) {
            return NextResponse.json({ error: 'Invalid secret or organization' }, { status: 401 });
        }

        // Parse Payload
        const body = await req.json();

        // Basic validation
        if (!body.email && !body.phone) {
            return NextResponse.json({ error: 'Data must contain at least email or phone' }, { status: 400 });
        }

        // Create Lead
        // Map common fields from popular platforms (Zapier, Facebook, Google)
        const leadData = {
            firstName: body.firstName || body.first_name || body.prenom || 'Inconnu',
            lastName: body.lastName || body.last_name || body.nom || 'Inconnu',
            email: body.email || body.email_work || body.courriel || null,
            phone: body.phone || body.phone_number || body.telephone || null,
            source: body.source || body.platform || 'WEBHOOK',
            customFields: {
                ...body,
                webhook_source: body.source || 'unknown',
                webhook_received_at: new Date().toISOString()
            }
        };

        // Use LeadService to handle logic (deduplication check is inside createLead potentially, strictly speaking LeadService.createLead is not exposed directly so we use prisma or action logic?)
        // Let's use Prisma directly to be safe as actions are for client side.
        // Or if LeadService has a method. Checked LeadService earlier, it has smart queue logic.
        // Let's create a simple lead creation here.

        // Check if lead exists (by email)
        let lead = null;
        if (leadData.email) {
            lead = await prisma.lead.findFirst({
                where: {
                    organisationId: orgId,
                    email: leadData.email
                }
            });
        }

        if (lead) {
            console.log(`[Webhook] Lead already exists: ${lead.id}`);
            // Optionally update or just log interaction?
            // For now, let's just return success saying it exists
            return NextResponse.json({ success: true, leadId: lead.id, message: 'Lead already exists, ignored' });
        }

        const newLead = await prisma.lead.create({
            data: {
                organisationId: orgId,
                firstName: leadData.firstName,
                lastName: leadData.lastName,
                email: leadData.email,
                phone: leadData.phone,
                source: leadData.source,
                status: LeadStatus.PROSPECT, // Default status
                metadata: leadData.customFields
            }
        });

        console.log(`[Webhook] Created new lead: ${newLead.id}`);

        return NextResponse.json({ success: true, leadId: newLead.id });

    } catch (error: any) {
        console.error('[Webhook] Error processing request:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
