import { useEffect, useRef, useState } from "react";
import { apiClient } from "@/src/lib/api";

export default function NearbyStoreMap({ stores, userLocation }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [mapsApiKey, setMapsApiKey] = useState("");
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const key =
      typeof process !== "undefined" && process.env?.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (key) {
      setMapsApiKey(key);
      return;
    }
    apiClient("/stores/config")
      .then((data) => setMapsApiKey(data.mapsApiKey || ""))
      .catch(() => setMapsApiKey(""));
  }, []);

  useEffect(() => {
    if (!mapsApiKey || typeof window === "undefined") return;
    if (window.google?.maps) {
      setScriptLoaded(true);
      return;
    }
    const existing = document.querySelector(
      `script[src*="maps.googleapis.com/maps/api/js"]`
    );
    if (existing) {
      existing.addEventListener("load", () => setScriptLoaded(true));
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsApiKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => setError("Failed to load Google Maps");
    document.head.appendChild(script);
  }, [mapsApiKey]);

  useEffect(() => {
    if (!stores || stores.length === 0 || !scriptLoaded || !window.google?.maps)
      return;
    if (!mapRef.current) return;

    const center = userLocation?.lat && userLocation?.lng
      ? { lat: userLocation.lat, lng: userLocation.lng }
      : {
          lat: stores[0]?.location?.lat ?? 13.0827,
          lng: stores[0]?.location?.lng ?? 80.2707,
        };

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center,
        zoom: 14,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      });
    } else {
      mapInstanceRef.current.setCenter(center);
    }

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const map = mapInstanceRef.current;
    const infoWindow = new window.google.maps.InfoWindow();
    const bounds = new window.google.maps.LatLngBounds();

    if (userLocation?.lat && userLocation?.lng) {
      bounds.extend({ lat: userLocation.lat, lng: userLocation.lng });
      const userMarker = new window.google.maps.Marker({
        position: { lat: userLocation.lat, lng: userLocation.lng },
        map,
        title: "Your location",
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#3b82f6",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
      });
      userMarker.addListener("click", () => {
        infoWindow.setContent("<div class='text-sm font-medium'>Your location</div>");
        infoWindow.open(map, userMarker);
      });
      markersRef.current.push(userMarker);
    }

    stores.forEach((store) => {
      const pos = store.location;
      if (pos?.lat == null || pos?.lng == null) return;

      bounds.extend({ lat: pos.lat, lng: pos.lng });
      const marker = new window.google.maps.Marker({
        position: { lat: pos.lat, lng: pos.lng },
        map,
        title: store.name,
      });

      const content = `
        <div class="text-xs p-2 min-w-[160px]">
          <p class="font-semibold text-slate-800 mb-1">${(store.name || "Store").replace(/</g, "&lt;")}</p>
          ${store.address ? `<p class="text-slate-600 mb-1">${String(store.address).replace(/</g, "&lt;")}</p>` : ""}
          ${store.rating != null ? `<p>★ Rating: ${store.rating.toFixed(1)}</p>` : ""}
          ${store.distance != null ? `<p>${store.distance.toFixed(1)} km away</p>` : ""}
        </div>
      `;
      marker.addListener("click", () => {
        infoWindow.setContent(content);
        infoWindow.open(map, marker);
      });
      markersRef.current.push(marker);
    });

    if (bounds.getNorthEast().lat() !== bounds.getSouthWest().lat() ||
        bounds.getNorthEast().lng() !== bounds.getSouthWest().lng()) {
      map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
    }
  }, [stores, userLocation, scriptLoaded]);

  if (!stores || stores.length === 0) return null;

  return (
    <div className="border rounded-xl bg-white overflow-hidden">
      {error ? (
        <div className="h-[320px] flex items-center justify-center text-sm text-red-500 bg-red-50">
          {error}
        </div>
      ) : !mapsApiKey ? (
        <div className="h-[320px] flex items-center justify-center text-sm text-slate-500 bg-slate-50">
          Loading map...
        </div>
      ) : (
        <div
          ref={mapRef}
          className="w-full h-[320px]"
          style={{ minHeight: "320px" }}
        />
      )}
    </div>
  );
}
