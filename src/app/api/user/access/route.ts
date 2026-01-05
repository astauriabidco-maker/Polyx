import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserOrgAccess } from '@/lib/permissions';
import { cookies } from 'next/headers';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;

        if (!token || !token.startsWith('mock_token_')) {
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
        }

        const userId = token.replace('mock_token_', '');
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const access = await getUserOrgAccess(user.id);
        return NextResponse.json(access);
    } catch (error) {
        console.error('API Hub Access Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
