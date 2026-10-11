"use client";

import { useEffect, useState } from "react";

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Polyline,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import { API_BASE_URL } from "@/lib/api";

type Props = {
  latitude: number;
  longitude: number;
  complaintId: number;

  road: string | null | undefined;
  landmark: string | null | undefined;
  road_type: string | null | undefined;
  road_distance_m: number | null | undefined;

  city: string | null | undefined;
  state: string | null | undefined;
  address: string | null | undefined;
};
type RoadData = {
  road_geometry: number[][] | null;
};

export default function ComplaintLocationMap({
  latitude,
  longitude,
  complaintId,
  road,
  landmark,
  road_type,
  road_distance_m,
  city,
  state,
  address,
}: Props) {
  const [roadData, setRoadData] = useState<RoadData | null>(null);

  const isValidCoordinates =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  // Fetch road geometry only for drawing the road on the map.
  useEffect(() => {
    if (!isValidCoordinates) return;
    let cancelled = false;

    async function fetchRoadGeometry() {
      try {
        const response = await fetch(
          `${API_BASE_URL}/reverse-geocode?latitude=${latitude}&longitude=${longitude}`
        );

        if (!response.ok) return;

        const data = await response.json();

        if (!cancelled) {
          setRoadData({
            road_geometry: data.road_geometry ?? null,
          });
        }
      } catch (error) {
        console.error("Road geometry fetch failed:", error);
      }
    }

    fetchRoadGeometry();

    return () => {
      cancelled = true;
    };
  }, [latitude, longitude]);

  const roadPositions =
    roadData?.road_geometry?.map(
      ([lng, lat]) => [lat, lng] as [number, number]
    ) ?? [];

  if (!isValidCoordinates) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
        📍 Valid GPS coordinates are not available for Complaint #{complaintId}.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Map */}
      <div className="h-80 w-full overflow-hidden rounded-lg border border-slate-200">
        <MapContainer
          key={`${complaintId}-${latitude}-${longitude}`}
          center={[latitude, longitude]}
          zoom={16}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {roadPositions.length > 1 && (
            <Polyline
              positions={roadPositions}
              pathOptions={{
                color: "#2563eb",
                weight: 6,
                opacity: 0.9,
              }}
            />
          )}

          <CircleMarker
            center={[latitude, longitude]}
            radius={9}
            pathOptions={{
              color: "#ffffff",
              weight: 3,
              fillColor: "#dc2626",
              fillOpacity: 1,
            }}
          >
            <Popup>
              <strong>Complaint #{complaintId}</strong>
              <br />
              <br />

              <strong>📍 Landmark:</strong>{" "}
              {landmark || "Not available"}

              <br />

              <strong>🛣️ Road:</strong>{" "}
              {road || "Not available"}

              <br />

              <strong>📍 GPS:</strong>{" "}
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </Popup>
          </CircleMarker>
        </MapContainer>
      </div>

      {/* Road & Location Details */}
      <div className="rounded-lg bg-slate-50 p-4 text-sm">
        <p className="mb-2 font-semibold text-slate-800">
          📍 Road & Location Details
        </p>

        <div className="space-y-1 text-slate-600">

          <p>
            <strong>Landmark:</strong>{" "}
            {landmark || "Not available"}
          </p>

          <p>
            <strong>Nearest Road:</strong>{" "}
            {road || "Road name unavailable"}
          </p>

          <p>
            <strong>Road Type:</strong>{" "}
            {road_type || "Unavailable"}
          </p>

          <p>
            <strong>Road Distance:</strong>{" "}
            {road_distance_m != null
              ? `${road_distance_m} m`
              : "Unavailable"}
          </p>

          <p>
            <strong>City:</strong>{" "}
            {city || "Unavailable"}
          </p>

          <p>
            <strong>State:</strong>{" "}
            {state || "Unavailable"}
          </p>

          <p>
            <strong>Address:</strong>{" "}
            {address || "Unavailable"}
          </p>

          <p>
            <strong>Exact GPS:</strong>{" "}
            {latitude}, {longitude}
          </p>

        </div>
      </div>
    </div>
  );
}