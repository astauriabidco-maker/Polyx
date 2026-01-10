
export interface Coordinates {
    lat: number;
    lng: number;
}

export class AILogisticsService {
    /**
     * Calculates the Haversine distance between two points in kilometers.
     */
    static calculateDistance(coords1: Coordinates, coords2: Coordinates): number {
        const R = 6371; // Earth's radius in km
        const dLat = this.deg2rad(coords2.lat - coords1.lat);
        const dLon = this.deg2rad(coords2.lng - coords1.lng);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(coords1.lat)) * Math.cos(this.deg2rad(coords2.lat)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private static deg2rad(deg: number): number {
        return deg * (Math.PI / 180);
    }

    /**
     * Estimates travel time in minutes based on distance.
     * Assumption: 30 km/h average in urban areas.
     */
    static estimateTravelTime(distanceKm: number): number {
        const averageSpeed = 30; // km/h
        return Math.round((distanceKm / averageSpeed) * 60);
    }

    /**
     * Predicts conversion probability for a lead (0 to 1).
     * Based on score, status and intensity.
     */
    static predictConversionProbability(lead: any): number {
        if (!lead) return 0.5;

        let probability = (lead.score || 50) / 100;

        // Boost based on status
        if (lead.status === 'HOT') probability += 0.2;
        if (lead.status === 'PROSPECT') probability += 0.1;

        // Cap at 0.95
        return Math.min(0.95, probability);
    }

    /**
     * Scores a time slot based on logistics and priority.
     */
    static scoreSlot(params: {
        distanceToPrev: number;
        conversionProb: number;
        isPrimeTime: boolean;
    }): number {
        let score = 0;

        // Logistics (Weight: 40%)
        // High distance = Lower score. Max 20km penalty.
        const distanceScore = Math.max(0, 1 - (params.distanceToPrev / 20));
        score += distanceScore * 0.4;

        // Conversion (Weight: 40%)
        score += params.conversionProb * 0.4;

        // Timing (Weight: 20%)
        // 10:00 - 16:00 is prime time for meetings
        if (params.isPrimeTime) score += 0.2;

        return score;
    }
}
