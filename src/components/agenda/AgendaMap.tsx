'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default markers in Next.js/Leaflet
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface AgendaMapProps {
    events: any[];
}

// Helper to center map
function ChangeView({ center }: { center: [number, number] }) {
    const map = useMap();
    map.setView(center, 12);
    return null;
}

export default function AgendaMap({ events }: AgendaMapProps) {
    // Generate mock coordinates if missing (Deterministic based on ID chars)
    // In prod, use real lat/lng from metadata or address geocoding
    const eventsWithLoc = events.map(e => {
        let lat = 48.8566; // Paris default
        let lng = 2.3522;

        // Mocking variations for demo based on event ID hash
        const hash = e.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
        const offsetLat = (hash % 100) / 1000;
        const offsetLng = (hash % 50) / 1000;

        // Use metadata if available (assuming we store it there eventually)
        if (e.metadata?.lat) lat = e.metadata.lat;
        else lat += offsetLat;

        if (e.metadata?.lng) lng = e.metadata.lng;
        else lng += offsetLng;

        return { ...e, lat, lng };
    }).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    const center: [number, number] = eventsWithLoc.length > 0
        ? [eventsWithLoc[0].lat, eventsWithLoc[0].lng]
        : [48.8566, 2.3522];

    const polylinePositions = eventsWithLoc.map(e => [e.lat, e.lng] as [number, number]);

    return (
        <div className="h-[400px] w-full rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
            <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
                <ChangeView center={center} />
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                {eventsWithLoc.map((event, idx) => (
                    <Marker key={event.id} position={[event.lat, event.lng]}>
                        <Popup>
                            <div className="p-1">
                                <h3 className="font-bold text-sm">{event.title}</h3>
                                <p className="text-xs text-slate-500">
                                    {new Date(event.start).toLocaleTimeString().slice(0, 5)}
                                </p>
                                {idx > 0 && (
                                    <p className="text-xs font-bold text-indigo-600 mt-1">
                                        🚗 ~15 min trajet
                                    </p>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                ))}

                <Polyline positions={polylinePositions} color="#6366f1" weight={4} opacity={0.6} dashArray="10, 10" />
            </MapContainer>
        </div>
    );
}
