
interface GeocodingResult {
    lat: number;
    lng: number;
    score: number;
    label: string;
    city: string;
    postcode: string;
}

export class GeocodingService {
    private static API_URL = 'https://api-adresse.data.gouv.fr/search/';

    /**
     * Geocode an address string to coordinates.
     * Uses the free API Address Gouv (France).
     */
    static async geocode(address: string): Promise<GeocodingResult | null> {
        if (!address || address.length < 3) return null;

        try {
            const params = new URLSearchParams({
                q: address,
                limit: '1'
            });

            const response = await fetch(`${this.API_URL}?${params.toString()}`);

            if (!response.ok) {
                console.error('[GeocodingService] API Error:', response.statusText);
                return null;
            }

            const data = await response.json();

            if (data.features && data.features.length > 0) {
                const feature = data.features[0];
                const [lng, lat] = feature.geometry.coordinates;

                return {
                    lat,
                    lng,
                    score: feature.properties.score,
                    label: feature.properties.label,
                    city: feature.properties.city,
                    postcode: feature.properties.postcode
                };
            }

            return null;
        } catch (error) {
            console.error('[GeocodingService] Exception:', error);
            return null;
        }
    }
}
