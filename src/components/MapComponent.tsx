import { useEffect, useRef } from "react";
import L from "leaflet";

interface MapComponentProps {
  latitude: number | null;
  longitude: number | null;
  childName: string;
  childPhotoUrl?: string;
  history?: Array<{ latitude: number; longitude: number; timestamp: string }>;
}

export default function MapComponent({
  latitude,
  longitude,
  childName,
  childPhotoUrl,
  history = []
}: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const pathRef = useRef<L.Polyline | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Default coordinates: Tashkent (Uzbekistan) or provided coords
    const initialLat = latitude || 41.311081;
    const initialLng = longitude || 69.240562;

    // Create map instance
    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 15,
      zoomControl: true,
      attributionControl: false
    });

    // Add high-contrast, beautiful CartoDB Voyager map tiles
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19
    }).addTo(map);

    mapRef.current = map;

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Handle Updates to Latitude / Longitude
  useEffect(() => {
    if (!mapRef.current || latitude === null || longitude === null) return;

    const map = mapRef.current;
    const position: L.LatLngExpression = [latitude, longitude];

    // Create custom styled marker for the child using Tailwind CSS
    const customIcon = L.divIcon({
      html: `
        <div class="relative flex items-center justify-center w-12 h-12">
          <!-- Ping outer ring -->
          <div class="absolute inset-0 w-12 h-12 rounded-full bg-indigo-600/30 animate-ping"></div>
          <!-- Pulse center -->
          <div class="relative w-9 h-9 rounded-full bg-indigo-600 border-2 border-white shadow-xl flex items-center justify-center text-white overflow-hidden">
            ${
              childPhotoUrl
                ? `<img src="${childPhotoUrl}" alt="${childName}" class="w-full h-full object-cover" referrerpolicy="no-referrer" />`
                : `<span class="text-xs font-bold font-display uppercase">${childName.substring(0, 2)}</span>`
            }
          </div>
          <!-- Small arrow underneath -->
          <div class="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-3 h-3 rotate-45 bg-indigo-600 border-r border-b border-white"></div>
        </div>
      `,
      className: "custom-leaflet-marker",
      iconSize: [48, 48],
      iconAnchor: [24, 42]
    });

    if (markerRef.current) {
      // Update existing marker position
      markerRef.current.setLatLng(position);
      markerRef.current.setIcon(customIcon);
    } else {
      // Create new marker
      markerRef.current = L.marker(position, { icon: customIcon }).addTo(map);
    }

    // Smoothly pan to the new position
    map.setView(position, map.getZoom());

    // Bind elegant popup to the marker
    markerRef.current.bindPopup(`
      <div class="p-1 font-sans">
        <h4 class="font-semibold text-slate-800 text-sm">${childName}</h4>
        <p class="text-xs text-slate-500 mt-1">Real vaqtdagi joylashuv</p>
        <p class="text-[10px] text-slate-400 mt-0.5">${new Date().toLocaleTimeString()}</p>
      </div>
    `).openPopup();

  }, [latitude, longitude, childName, childPhotoUrl]);

  // Handle updates to History Path
  useEffect(() => {
    if (!mapRef.current || history.length === 0) return;

    const map = mapRef.current;
    const latLngs: L.LatLngExpression[] = history.map((h) => [h.latitude, h.longitude]);

    if (pathRef.current) {
      // Update existing polyline path
      pathRef.current.setLatLngs(latLngs);
    } else {
      // Create new polyline path with nice indigo style
      pathRef.current = L.polyline(latLngs, {
        color: "#4f46e5", // indigo-600
        weight: 4,
        opacity: 0.6,
        dashArray: "8, 8",
        lineJoin: "round"
      }).addTo(map);
    }
  }, [history]);

  // Handle ResizeObserver to keep leaflet map sized properly
  useEffect(() => {
    if (!mapRef.current || !mapContainerRef.current) return;

    const map = mapRef.current;
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });

    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-slate-200 shadow-md">
      {/* Map Element */}
      <div id="leaflet-map" ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-lg border border-slate-200 flex flex-col gap-1.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-indigo-600 relative flex items-center justify-center">
            <span className="absolute w-2 h-2 rounded-full bg-indigo-600 animate-ping"></span>
          </span>
          <span className="font-bold text-slate-800">{childName} (Faol)</span>
        </div>
        {history.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-0 border-t-2 border-dashed border-indigo-600"></div>
            <span className="text-slate-500 font-medium">Harakatlanish yo'nalishi</span>
          </div>
        )}
      </div>
    </div>
  );
}
