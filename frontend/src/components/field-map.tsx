"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const ESRI =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

type Coords = { lat: number; lon: number };

function Recenter({ lat, lon }: Coords) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lon], map.getZoom(), { animate: true });
  }, [lat, lon, map]);
  return null;
}

function ClickPicker({ onPick }: { onPick: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

export function FieldMap({
  center,
  pin,
  onPick,
}: {
  center: Coords;
  pin: Coords;
  onPick: (lat: number, lon: number) => void;
}) {
  const icon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: '<div style="width:20px;height:20px;border-radius:9999px;background:#34d399;border:3px solid #ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.6)"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      }),
    [],
  );

  return (
    <MapContainer
      center={[center.lat, center.lon]}
      zoom={16}
      scrollWheelZoom
      className="h-72 w-full"
      style={{ background: "#0a0a0a" }}
    >
      <TileLayer url={ESRI} maxZoom={19} attribution="Tiles &copy; Esri" />
      <Recenter lat={center.lat} lon={center.lon} />
      <ClickPicker onPick={onPick} />
      <Marker
        position={[pin.lat, pin.lon]}
        icon={icon}
        draggable
        eventHandlers={{
          dragend: (event) => {
            const next = event.target.getLatLng();
            onPick(next.lat, next.lng);
          },
        }}
      />
    </MapContainer>
  );
}
