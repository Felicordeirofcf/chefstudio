import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default icon issue with webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface InteractiveMapProps {
  radiusKm: number;
  center?: [number, number]; // Optional center coordinates
}

// Component to update map view when center or radius changes
const MapUpdater: React.FC<{ center: [number, number]; radiusKm: number }> = ({ center, radiusKm }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
    // Adjust zoom based on radius if needed, simple example:
    // const zoomLevel = 13 - Math.log2(radiusKm);
    // map.setView(center, Math.max(5, Math.min(18, Math.round(zoomLevel))));
  }, [center, radiusKm, map]);
  return null;
};

const InteractiveMap: React.FC<InteractiveMapProps> = ({ radiusKm, center = [-23.5505, -46.6333] }) => { // Default to São Paulo
  const radiusMeters = radiusKm * 1000;

  return (
    <MapContainer center={center} zoom={13} scrollWheelZoom={false} style={{ height: '300px', width: '100%', borderRadius: '8px', marginBottom: '1rem' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={center}></Marker>
      <Circle
        center={center}
        radius={radiusMeters}
        pathOptions={{ color: 'purple', fillColor: 'purple', fillOpacity: 0.2 }}
      />
      <MapUpdater center={center} radiusKm={radiusKm} />
    </MapContainer>
  );
};

export default InteractiveMap;

