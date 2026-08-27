import React, { useState, useEffect, useRef } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  useMap,
} from "@vis.gl/react-google-maps";
import {
  MapPin,
  Navigation,
  Search,
  X,
  Trash2,
  ExternalLink,
  Loader2,
  Compass,
  Plus,
  Minus,
  Layers,
  Info,
} from "lucide-react";
import type { EntryLocation } from "../types";

// Check if a real, valid Google Maps Platform API key is provided
const isValidGoogleMapsKey = (key: unknown): boolean => {
  if (typeof key !== "string") return false;
  const trimmed = key.trim();
  return (
    trimmed.startsWith("AIzaSy") &&
    trimmed.length >= 35 &&
    !trimmed.toLowerCase().includes("placeholder") &&
    !trimmed.toLowerCase().includes("demo") &&
    !trimmed.toLowerCase().includes("your_")
  );
};

const rawEnvKey =
  typeof import.meta !== "undefined" && import.meta.env
    ? import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    : "";

const HAS_VALID_MAPS_KEY = isValidGoogleMapsKey(rawEnvKey);
const MAPS_API_KEY = HAS_VALID_MAPS_KEY ? String(rawEnvKey).trim() : "";

interface LocationPickerProps {
  location: EntryLocation | null | undefined;
  onSaveLocation: (location: EntryLocation | null) => void;
  isOpen: boolean;
  onClose: () => void;
}

// Sub-component to center Google Map when coordinates change
function GoogleMapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (map && lat && lng) {
      map.panTo({ lat, lng });
    }
  }, [map, lat, lng]);
  return null;
}

export const LocationPickerModal: React.FC<LocationPickerProps> = ({
  location,
  onSaveLocation,
  isOpen,
  onClose,
}) => {
  const [placeName, setPlaceName] = useState(location?.placeName || "");
  const [formattedAddress, setFormattedAddress] = useState(location?.formattedAddress || "");
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number }>({
    lat: location?.lat || 37.7749,
    lng: location?.lng || -122.4194,
  });
  const [zoomLevel, setZoomLevel] = useState(13);
  const [isLocating, setIsLocating] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Sync state when opened or location prop changes
  useEffect(() => {
    if (isOpen) {
      if (location) {
        setPlaceName(location.placeName);
        setFormattedAddress(location.formattedAddress || "");
        setSelectedCoords({ lat: location.lat, lng: location.lng });
      } else {
        setPlaceName("");
        setFormattedAddress("");
        setSelectedCoords({ lat: 37.7749, lng: -122.4194 });
      }
      setSearchError(null);
    }
  }, [isOpen, location]);

  if (!isOpen) return null;

  // Use browser geolocation to pin user's real sanctuary coordinates
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setSearchError("Geolocation is not supported in this browser.");
      return;
    }

    setIsLocating(true);
    setSearchError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setSelectedCoords({ lat, lng });
        if (!placeName) {
          setPlaceName("Current Sanctuary");
        }
        setFormattedAddress(`Lat: ${lat}, Lng: ${lng}`);
        setIsLocating(false);
      },
      (err) => {
        console.warn("[Geolocation] Error acquiring position:", err);
        setSearchError("Could not retrieve GPS coordinates. You can select a preset or type coordinates manually.");
        setIsLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Handle Google map click
  const handleGoogleMapClick = (e: any) => {
    if (e.detail && e.detail.latLng) {
      const lat = Number(e.detail.latLng.lat.toFixed(6));
      const lng = Number(e.detail.latLng.lng.toFixed(6));
      setSelectedCoords({ lat, lng });
      if (!placeName) {
        setPlaceName("Custom Sanctuary Pin");
      }
      setFormattedAddress(`Lat: ${lat}, Lng: ${lng}`);
    }
  };

  const handleSave = () => {
    const finalPlaceName = placeName.trim() || "Reflection Sanctuary";
    onSaveLocation({
      lat: selectedCoords.lat,
      lng: selectedCoords.lng,
      placeName: finalPlaceName,
      formattedAddress: formattedAddress.trim() || undefined,
    });
    onClose();
  };

  const handleRemove = () => {
    onSaveLocation(null);
    onClose();
  };

  // Quick preset sanctuaries
  const presetLocations = [
    { name: "Kyoto Zen Gardens", lat: 35.0116, lng: 135.7681, address: "Kyoto, Japan" },
    { name: "Central Park Sanctuary", lat: 40.785091, lng: -73.968285, address: "New York, USA" },
    { name: "Golden Gate Viewpoint", lat: 37.8199, lng: -122.4783, address: "San Francisco, CA" },
    { name: "Swiss Alpine Haven", lat: 46.5653, lng: 8.5603, address: "Andermatt, Switzerland" },
    { name: "Redwood Forest Retreat", lat: 37.0396, lng: -122.0722, address: "Santa Cruz Mountains, CA" },
  ];

  // OpenStreetMap embed URL calculated without external API keys
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${selectedCoords.lng - 0.03}%2C${selectedCoords.lat - 0.02}%2C${selectedCoords.lng + 0.03}%2C${selectedCoords.lat + 0.02}&layer=mapnik&marker=${selectedCoords.lat}%2C${selectedCoords.lng}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="location-picker-modal"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Pin Sanctuary Location
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ground your reflections with atmospheric place context
              </p>
            </div>
          </div>
          <button
            id="btn-close-location-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Controls row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Sanctuary / Place Name
              </label>
              <input
                id="input-place-name"
                type="text"
                value={placeName}
                onChange={(e) => setPlaceName(e.target.value)}
                placeholder="e.g. Quiet Forest Retreat, Home Study"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Location Coordinates / Address
              </label>
              <div className="flex gap-2">
                <input
                  id="input-location-details"
                  type="text"
                  value={formattedAddress || `${selectedCoords.lat.toFixed(4)}, ${selectedCoords.lng.toFixed(4)}`}
                  onChange={(e) => setFormattedAddress(e.target.value)}
                  placeholder="Address or coordinates"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <button
                  id="btn-detect-gps"
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={isLocating}
                  className="shrink-0 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer shadow-2xs"
                  title="Detect Current GPS Sanctuary"
                >
                  {isLocating ? (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  ) : (
                    <Navigation className="w-4 h-4 text-emerald-600" />
                  )}
                  <span>GPS</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick presets */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400 font-medium">Sanctuary Presets:</span>
              {presetLocations.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => {
                    setSelectedCoords({ lat: p.lat, lng: p.lng });
                    setPlaceName(p.name);
                    setFormattedAddress(p.address);
                  }}
                  className={`px-2.5 py-1 text-[11px] rounded-md transition-all cursor-pointer font-medium ${
                    placeName === p.name
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 dark:hover:text-emerald-400"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {searchError && (
            <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/50 p-2 rounded-lg border border-rose-200 dark:border-rose-900">
              {searchError}
            </p>
          )}

          {/* Interactive Map Visual Container */}
          <div className="relative w-full h-64 sm:h-72 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner bg-slate-100 dark:bg-slate-800">
            {HAS_VALID_MAPS_KEY ? (
              <APIProvider apiKey={MAPS_API_KEY}>
                <Map
                  mapId="DEMO_MAP_ID"
                  defaultCenter={selectedCoords}
                  defaultZoom={12}
                  gestureHandling="greedy"
                  disableDefaultUI={false}
                  onClick={handleGoogleMapClick}
                  internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
                  className="w-full h-full"
                >
                  <GoogleMapRecenter lat={selectedCoords.lat} lng={selectedCoords.lng} />
                  <AdvancedMarker position={selectedCoords}>
                    <Pin
                      background="#059669"
                      borderColor="#047857"
                      glyphColor="#ffffff"
                      scale={1.2}
                    />
                  </AdvancedMarker>
                </Map>
              </APIProvider>
            ) : (
              /* High-Reliability Interactive Map View with Zero-Crash Fallback */
              <div className="relative w-full h-full">
                <iframe
                  title="Sanctuary Map Preview"
                  src={osmEmbedUrl}
                  className="w-full h-full border-0 pointer-events-auto"
                  loading="lazy"
                />
                {/* Floating Coordinates Badge */}
                <div className="absolute top-2 left-2 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-[11px] font-mono text-slate-700 dark:text-slate-300 shadow-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Pinned: {selectedCoords.lat.toFixed(4)}, {selectedCoords.lng.toFixed(4)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>Location metadata is isolated in your Firestore journal and grounds Gemini responses.</span>
            </span>
            <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
              {HAS_VALID_MAPS_KEY ? "Google Maps Platform JS" : "OpenStreetMap Interactive"}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            {location && (
              <button
                id="btn-remove-location-pin"
                type="button"
                onClick={handleRemove}
                className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Pin</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              id="btn-cancel-location"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="btn-save-location-pin"
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Save Sanctuary Pin</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
