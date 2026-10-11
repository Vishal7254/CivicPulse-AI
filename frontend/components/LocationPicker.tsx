
"use client";

import { useEffect, useRef, useState } from "react";
import {
    MapContainer,
    TileLayer,
    Marker,
    useMap,
    useMapEvents,
    ZoomControl,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const INDIA_BOUNDS = L.latLngBounds(
    L.latLng(6.5, 68.0),   // South-West
    L.latLng(35.7, 97.5)   // North-East
);


type LocationPickerProps = {
    latitude: number | null;
    longitude: number | null;
    onSelect: (lat: number, lng: number) => void;
};

type Place = {
    id: string;
    name: string;
    lat: number;
    lon: number;
};

// Custom red pin: Leaflet image asset ki dependency nahi hai.

const pinIcon = L.divIcon({
    className: "",
    html: "📍",
    iconSize: [32, 36],
    iconAnchor: [16, 36],
});


function MapController({ place }: { place: Place | null }) {
    const map = useMap();

    useEffect(() => {
        if (!place) return;

        map.flyTo([place.lat, place.lon], 16, {
            animate: true,
            duration: 0.7,
        });
    }, [place, map]);

    return null;
}

function MapClickHandler({
    onSelect,
}: {
    onSelect: (lat: number, lng: number) => void;
}) {
    useMapEvents({
        click(event) {
            const lat = event.latlng.lat;
            const lng = event.latlng.lng;

            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                return;
            }

            onSelect(lat, lng);
        },
    });

    return null;
}

export default function LocationPicker({
    latitude,
    longitude,
    onSelect,
}: LocationPickerProps) {
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<Place[]>([]);
    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const requestId = useRef(0);

    const validPin =
        latitude !== null &&
        longitude !== null &&
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180;

    useEffect(() => {
        const searchText = query.trim();

        if (searchText.length < 3) {
            setSuggestions([]);
            setLoading(false);
            setError("");
            return;
        }

        const currentRequest = ++requestId.current;
        const controller = new AbortController();

        const timer = setTimeout(async () => {
            setLoading(true);
            setError("");

            try {
                const url = new URL("https://photon.komoot.io/api/");

                url.searchParams.set("q", searchText);
                url.searchParams.set("limit", "7");
                url.searchParams.set("lang", "en");

                // Search ko India ke aas-paas prioritize karta hai.
                url.searchParams.set("lat", "26.8");
                url.searchParams.set("lon", "84.5");
                url.searchParams.set("bbox", "68,6.5,97.5,35.7");

                const response = await fetch(url.toString(), {
                    signal: controller.signal,
                });

                if (!response.ok) {
                    throw new Error("Location search failed.");
                }

                const data = await response.json();

                if (currentRequest !== requestId.current) return;

                const places: Place[] = (data.features || [])
                    .filter((feature: any) => {
                        const coordinates = feature.geometry?.coordinates;

                        if (!Array.isArray(coordinates)) return false;

                        const lon = Number(coordinates[0]);
                        const lat = Number(coordinates[1]);

                        return (
                            Number.isFinite(lat) &&
                            Number.isFinite(lon) &&
                            lat >= -90 &&
                            lat <= 90 &&
                            lon >= -180 &&
                            lon <= 180
                        );
                    })
                    .map((feature: any, index: number) => {
                        const p = feature.properties || {};

                        const parts = [
                            p.name,
                            p.district,
                            p.city,
                            p.state,
                            p.country,
                        ].filter(
                            (value, i, arr) =>
                                Boolean(value) && arr.indexOf(value) === i
                        );

                        return {
                            id: `${currentRequest}-${index}`,
                            name: parts.join(", "),
                            lon: Number(feature.geometry.coordinates[0]),
                            lat: Number(feature.geometry.coordinates[1]),
                        };
                    });

                setSuggestions(places);

                if (places.length === 0) {
                    setError("No matching places found. Try another search.");
                }
            } catch (err) {
                if (err instanceof Error && err.name === "AbortError") {
                    return;
                }

                setError("Search failed. Please try again.");
            } finally {
                if (currentRequest === requestId.current) {
                    setLoading(false);
                }
            }
        }, 450);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [query]);

    const choosePlace = (place: Place) => {
        setSelectedPlace(place);
        setQuery(place.name);
        setSuggestions([]);
        setError("");

        // Search result ki coordinates parent form mein bhi update karo.
        onSelect(place.lat, place.lon);
    };

    const initialPosition: [number, number] = validPin
        ? [latitude as number, longitude as number]
        : [26.8, 84.5];

    return (
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
                <p className="font-semibold text-slate-900">
                    🗺️ Pinpoint the pothole
                </p>

                <p className="mt-1 text-sm leading-5 text-slate-600">
                    Search a city or road, select a result, then click the exact
                    pothole location on the map.
                </p>
            </div>

            {/* Search bar */}
            <div className="relative z-20 border-b border-slate-200 bg-white p-3">
                <input
                    value={query}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setSelectedPlace(null);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === "Escape") {
                            setSuggestions([]);
                        }
                    }}
                    placeholder="Search Bettiah, Railway Station, Motihari..."
                    className="w-full rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-800 outline-none focus:border-blue-500"
                />

                {loading && (
                    <p className="mt-2 text-xs text-blue-600">
                        Searching locations...
                    </p>
                )}

                {suggestions.length > 0 && (
                    <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                        {suggestions.map((place) => (
                            <button
                                key={place.id}
                                type="button"
                                onClick={() => choosePlace(place)}
                                className="block w-full border-b border-slate-100 px-3 py-3 text-left text-sm text-slate-700 last:border-b-0 hover:bg-blue-50"
                            >
                                📍 {place.name}
                            </button>
                        ))}
                    </div>
                )}

                {error && (
                    <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-600">
                        {error}
                    </p>
                )}

                {selectedPlace && (
                    <p className="mt-2 text-xs text-slate-500">
                        Area found. Click the exact pothole position on the map.
                    </p>
                )}
            </div>

            {/* Interactive map */}
            <div className="relative z-0">

                <MapContainer
                    center={initialPosition}
                    zoom={validPin ? 16 : 8}
                    minZoom={6}
                    maxZoom={17}
                    scrollWheelZoom={true}
                    zoomSnap={1}
                    zoomDelta={1}
                    dragging={true}
                    zoomControl={false}
                    className="h-[380px] w-full"
                >


                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        maxZoom={19}
                    />



                    <ZoomControl position="topright" />


                    <MapController place={selectedPlace} />

                    <MapClickHandler onSelect={onSelect} />

                    {validPin && (
                        <Marker
                            position={[latitude as number, longitude as number]}
                            icon={pinIcon}
                            zIndexOffset={1000}
                        />
                    )}
                </MapContainer>
            </div>

            {/* Selected coordinates */}
            <div className="p-4">
                {validPin ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                        <p className="text-sm font-semibold text-emerald-800">
                            ✓ Location selected
                        </p>

                        <p className="mt-1 break-all text-xs text-emerald-700">
                            Latitude: {latitude!.toFixed(6)}
                            <br />
                            Longitude: {longitude!.toFixed(6)}
                        </p>
                    </div>
                ) : (
                    <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                        Search a place or click the exact pothole location on the map.
                    </p>
                )}
            </div>
        </div>
    );
}
