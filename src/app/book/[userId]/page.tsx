import { BookingWizard } from '@/components/booking/BookingWizard';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Prendre Rendez-vous | Polyx Agenda',
    description: 'Réservez un créneau avec votre conseiller.',
};

export default function BookingPage({ params }: { params: { userId: string } }) {
    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <BookingWizard userId={params.userId} />
        </div>
    );
}
