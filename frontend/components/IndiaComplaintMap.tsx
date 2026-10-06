"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";


type RoadComplaint = {
  id: number;
  title: string;
  category: string;
  latitude: number;
  longitude: number;
  address: string;
  road: string | null;
  road_type?: string | null;
  road_distance_m?: number | null;
  city: string | null;
  state: string | null;
  priority: string;
  status: string;
  ai_detected: boolean;
  ai_detection_type: string | null;
  ai_detection_count: number;
  ai_confidence: number | null;
};

type IndiaComplaintMapProps = {
  complaints: RoadComplaint[];
};

const INDIA_CENTER: [number, number] = [22.9734, 78.6569];
const INDIA_DEFAULT_ZOOM = 5;

function isActiveComplaint(status: string) {
  return [
    "pending",
    "verified",
    "assigned",
    "in_progress",
  ].includes(status?.toLowerCase());
}

function getPriorityColor(priority: string) {
  switch (priority?.toLowerCase()) {
    case "critical":
      return "#dc2626";
    case "high":
      return "#f97316";
    default:
      return "#16a34a";
  }
}

function formatStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDetectionType(type: string | null) {
  if (!type) return "No AI detection";

  return type
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function MapViewportController({ complaints }: { complaints: RoadComplaint[] }) {
  const map = useMap();
  const lastViewKey = useRef("");

  useEffect(() => {
    const viewKey = complaints
      .map(
        (complaint) =>
          `${complaint.id}:${complaint.latitude}:${complaint.longitude}`
      )
      .sort()
      .join("|");

    // Same complaints/location hain to map ko dobara zoom mat karo.
    if (lastViewKey.current === viewKey) {
      return;
    }

    lastViewKey.current = viewKey;

    if (complaints.length === 0) {
      map.setView(INDIA_CENTER, INDIA_DEFAULT_ZOOM);
      return;
    }

    if (complaints.length === 1) {
      map.setView(
        [complaints[0].latitude, complaints[0].longitude],
        10,
        { animate: false }
      );
      return;
    }

    const bounds: LatLngBoundsExpression = complaints.map((complaint) => [
      complaint.latitude,
      complaint.longitude,
    ]);

    map.fitBounds(bounds, {
      padding: [40, 40],
      maxZoom: 8,
      animate: false,
    });
  }, [complaints, map]);

  return null;
}

export default function IndiaComplaintMap({
  complaints,
}: IndiaComplaintMapProps) {
  const activeComplaints = useMemo(
    () =>
      complaints.filter(
        (complaint) =>
          complaint.category === "Road Damage" &&
          isActiveComplaint(complaint.status) &&
          Number.isFinite(complaint.latitude) &&
          Number.isFinite(complaint.longitude)
      ),
    [complaints]
  );

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      <div className="relative h-[520px] w-full">
        <MapContainer
          key="india-civic-complaint-map"
          center={INDIA_CENTER}
          zoom={INDIA_DEFAULT_ZOOM}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {activeComplaints.map((complaint) => {
            const markerColor = getPriorityColor(complaint.priority);

            return (
              <CircleMarker
                key={complaint.id}
                center={[
                  complaint.latitude,
                  complaint.longitude,
                ]}
                radius={9}
                pathOptions={{
                  color: "#ffffff",
                  weight: 3,
                  fillColor: markerColor,
                  fillOpacity: 0.9,
                }}
              >
                <Popup minWidth={280} maxWidth={340}>
                  <div className="space-y-3 p-1">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Complaint #{complaint.id}
                      </p>

                      <h4 className="mt-1 text-sm font-bold text-slate-900">
                        {complaint.title}
                      </h4>
                    </div>

                    <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
                      <span
                        className="rounded-full px-2.5 py-1 text-white"
                        style={{
                          backgroundColor: markerColor,
                        }}
                      >
                        {complaint.priority.toUpperCase()}
                      </span>

                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                        {formatStatus(complaint.status)}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600">
                      <p>
                        <span className="font-semibold text-slate-800">
                          Reported Location:
                        </span>{" "}
                        {complaint.road ||
                          "Location not available"}
                      </p>

                      <p>
                        <span className="font-semibold text-slate-800">
                          Location:
                        </span>{" "}
                        {complaint.city ||
                          complaint.address ||
                          "Location not available"}
                        {complaint.state
                          ? `, ${complaint.state}`
                          : ""}
                      </p>

                      <p>
                        <span className="font-semibold text-slate-800">
                          Road Type:
                        </span>{" "}
                        {complaint.road_type || "Unavailable"}
                      </p>

                      <p>
                        <span className="font-semibold text-slate-800">
                          Road Distance:
                        </span>{" "}
                        {complaint.road_distance_m != null
                          ? `${complaint.road_distance_m} m`
                          : "Unavailable"}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2.5 text-[11px]">
                      <div>
                        <p className="text-slate-400">
                          AI Detection
                        </p>

                        <p className="mt-0.5 font-semibold text-slate-800">
                          {complaint.ai_detected
                            ? formatDetectionType(
                              complaint.ai_detection_type
                            )
                            : "No detection"}
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-400">
                          Count
                        </p>

                        <p className="mt-0.5 font-semibold text-slate-800">
                          {complaint.ai_detected
                            ? complaint.ai_detection_count
                            : 0}
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-400">
                          Confidence
                        </p>

                        <p className="mt-0.5 font-semibold text-slate-800">
                          {complaint.ai_confidence !== null &&
                            complaint.ai_confidence !== undefined
                            ? `${(
                              complaint.ai_confidence * 100
                            ).toFixed(1)}%`
                            : "N/A"}
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-400">
                          Coordinates
                        </p>

                        <p className="mt-0.5 font-semibold text-slate-800">
                          {complaint.latitude.toFixed(4)},{" "}
                          {complaint.longitude.toFixed(4)}
                        </p>
                      </div>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>

        <div className="pointer-events-none absolute left-3 top-3 z-[1000] rounded-xl border border-white/70 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Active Road Complaints
          </p>

          <p className="mt-0.5 text-xl font-bold text-slate-900">
            {activeComplaints.length}
          </p>

          <p className="text-[11px] text-slate-500">
            GPS-mapped complaints across India
          </p>
        </div>

        <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] rounded-xl border border-white/70 bg-white/95 px-3 py-2.5 shadow-lg backdrop-blur-sm">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Priority
          </p>

          <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] font-medium text-slate-700">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
              Critical
            </span>

            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
              High
            </span>

            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-green-600" />
              Normal
            </span>
          </div>
        </div>

        {activeComplaints.length === 0 && (
          <div className="pointer-events-none absolute inset-0 z-[900] flex items-center justify-center px-5">
            <div className="max-w-md rounded-2xl border border-white/80 bg-white/95 px-6 py-5 text-center shadow-xl backdrop-blur-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-xl">
                🗺️
              </div>

              <h4 className="mt-3 text-sm font-bold text-slate-900">
                No active road complaints
              </h4>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                New road-damage complaints with GPS coordinates
                will appear on the map automatically.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}