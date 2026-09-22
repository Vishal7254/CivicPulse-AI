"use client";

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

type Complaint = {
  id: number;
  title: string;
  latitude: number;
  longitude: number;
  address: string;
  road: string | null;
  city: string | null;
  state: string | null;
  status: string;
  priority: string;
  ai_detected: boolean;
  ai_detection_type: string | null;
  ai_detection_count: number;
  ai_confidence: number | null;
};

type BiharRoadMapProps = {
  complaints: Complaint[];
};

export default function BiharRoadMap({
  complaints,
}: BiharRoadMapProps) {
  const biharComplaints = complaints.filter(
    (complaint) =>
      complaint.latitude &&
      complaint.longitude &&
      complaint.state?.toLowerCase() === "bihar"
  );

  const getMarkerColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "critical":
        return "#dc2626";
      case "high":
        return "#f97316";
      default:
        return "#16a34a";
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h3 className="text-lg font-semibold text-slate-900">
          Bihar Road Damage Map
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Road damage complaints reported across Bihar
        </p>
      </div>

      <div className="h-[500px] w-full">
        <MapContainer
          center={[25.9644, 85.2722]}
          zoom={7}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {biharComplaints.map((complaint) => (
            <CircleMarker
              key={complaint.id}
              center={[
                complaint.latitude,
                complaint.longitude,
              ]}
              radius={9}
              pathOptions={{
                color: getMarkerColor(complaint.priority),
                fillColor: getMarkerColor(complaint.priority),
                fillOpacity: 0.8,
              }}
            >
              <Popup>
                <div className="min-w-[240px]">
                  <h4 className="text-sm font-semibold text-slate-900">
                    Complaint #{complaint.id}
                  </h4>

                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {complaint.title}
                  </p>

                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    <p>
                      <strong>Status:</strong>{" "}
                      {complaint.status}
                    </p>

                    <p>
                      <strong>Priority:</strong>{" "}
                      {complaint.priority}
                    </p>

                    {complaint.road && (
                      <p>
                        <strong>Road:</strong>{" "}
                        {complaint.road}
                      </p>
                    )}

                    {complaint.city && (
                      <p>
                        <strong>City:</strong>{" "}
                        {complaint.city}
                      </p>
                    )}

                    <p>
                      <strong>Location:</strong>{" "}
                      {complaint.address}
                    </p>

                    {complaint.ai_detected && (
                      <>
                        <p>
                          <strong>AI Detection:</strong>{" "}
                          {complaint.ai_detection_type}
                        </p>

                        <p>
                          <strong>Detection Count:</strong>{" "}
                          {complaint.ai_detection_count}
                        </p>

                        {complaint.ai_confidence !== null && (
                          <p>
                            <strong>Confidence:</strong>{" "}
                            {(complaint.ai_confidence * 100).toFixed(1)}%
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      <div className="flex flex-wrap gap-4 border-t border-slate-200 px-6 py-3 text-xs text-slate-600">
        <span>🔴 Critical</span>
        <span>🟠 High</span>
        <span>🟢 Normal</span>
        <span className="ml-auto">
          {biharComplaints.length} Bihar complaint
          {biharComplaints.length !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}