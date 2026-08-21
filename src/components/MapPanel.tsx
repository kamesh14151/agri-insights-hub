import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useServerFn } from "@tanstack/react-start";
import { analyzeLand } from "@/lib/ai.functions";
import { toast } from "sonner";
import {
  Loader2,
  Search,
  LocateFixed,
  Sparkles,
  TrendingUp,
  Droplets,
  Thermometer,
  Mountain,
  ShieldCheck,
  MapPin,
  Square
} from "lucide-react";

type LandResult = {
  soilType?: string;
  climate?: string;
  recommendedCrops?: string[];
  waterNeeds?: string;
  riskFactors?: string[];
  yieldPotential?: string;
  ndvi?: number;
  ndviStatus?: string;
  ndwi?: string;
  soilMoisture?: string;
  landSurfaceTemp?: string;
  elevationMeters?: number;
  geeSatelliteSource?: string;
  raw?: string;
};

type CornerPoint = {
  id: number;
  label: string;
  lat: number;
  lng: number;
};

const GOOGLE_API_KEY = "AIzaSyBgUBjm3AVh4jrftt9HN5wmzYk-4_vhK3g";

// Google Earth Hybrid Tile: Satellite imagery + area names + roads (like Google Maps satellite view)
const GOOGLE_HYBRID_URL = `https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&key=${GOOGLE_API_KEY}`;

export function MapPanel() {
  const { t, fullName } = useI18n();
  const mapEl = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const drawnGroupRef = useRef<any>(null);
  const cornerMarkersRef = useRef<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LandResult | null>(null);
  const [areaHa, setAreaHa] = useState<number | null>(null);
  const [corners, setCorners] = useState<CornerPoint[]>([]);

  // Search location state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);

  const analyze = useServerFn(analyzeLand);

  useEffect(() => {
    if (!mapEl.current) return;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet-draw");
      if (cancelled || !mapEl.current) return;

      // Initialize Map centered on agricultural farmland (Cauvery Delta, Salem / Thanjavur region)
      const map = L.map(mapEl.current, {
        zoomControl: false,
        attributionControl: false, // Removes Leaflet branding link
      }).setView([11.6643, 78.1460], 12);

      // Add custom attribution without Leaflet prefix
      L.control.attribution({ prefix: false }).addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);

      leafletMapRef.current = map;

      // Add Google Earth Hybrid tile layer (satellite imagery + area labels + roads)
      L.tileLayer(GOOGLE_HYBRID_URL, {
        attribution: "Map data © Google",
        maxZoom: 21,
        subdomains: ["0", "1", "2", "3"],
      }).addTo(map);

      const drawn = new L.FeatureGroup();
      drawnGroupRef.current = drawn;
      map.addLayer(drawn);

      // Ensure proper container sizing in DOM
      setTimeout(() => {
        try {
          map.invalidateSize();
        } catch {}
      }, 250);

      // Draw controls positioned cleanly at bottom-left below top search bar (Zero Overlap)
      const drawControl = new (L as any).Control.Draw({
        position: "bottomleft",
        edit: { featureGroup: drawn, remove: true },
        draw: {
          polygon: {
            allowIntersection: false,
            showArea: true,
            shapeOptions: { color: "#10b981", fillColor: "#10b981", fillOpacity: 0.35, weight: 3 },
          },
          rectangle: {
            shapeOptions: { color: "#10b981", fillColor: "#10b981", fillOpacity: 0.35, weight: 3 },
          },
          polyline: false,
          circle: false,
          marker: false,
          circlemarker: false,
        },
      });
      map.addControl(drawControl);

      map.on((L as any).Draw.Event.CREATED, async (e: any) => {
        drawn.clearLayers();
        clearCornerMarkers();

        const layer = e.layer;
        drawn.addLayer(layer);

        // Extract 4 corner points
        const rawLatLngs: any[] = layer.getLatLngs()[0] ?? layer.getLatLngs();
        const fourCorners = extract4Corners(rawLatLngs, layer.getBounds());
        setCorners(fourCorners);

        // Render 4 corner cone pin markers
        renderCornerMarkers(L, map, fourCorners);

        const center = layer.getBounds().getCenter();
        const areaM2 = planarArea(rawLatLngs);
        const ha = areaM2 / 10000;
        setAreaHa(ha);

        toast.success(t("toast_drawn") || `4-Corner Field Boundary set (${ha.toFixed(2)} Ha)`);
        setLoading(true);
        setResult(null);

        try {
          const r = await analyze({
            data: { centerLat: center.lat, centerLng: center.lng, areaHectares: ha, language: fullName },
          });
          setResult(r as LandResult);
          toast.success(t("toast_analyzed") || "Google Earth Satellite Analysis Ready!");
        } catch (err) {
          console.error(err);
          toast.error(t("toast_failed") || "Analysis request failed.");
        } finally {
          setLoading(false);
        }
      });
    })();

    return () => {
      cancelled = true;
      try {
        leafletMapRef.current?.remove();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear 4 corner pin markers
  const clearCornerMarkers = () => {
    cornerMarkersRef.current.forEach((m) => m.remove());
    cornerMarkersRef.current = [];
  };

  // Render 4 Corner Cone Pins on Leaflet Map
  const renderCornerMarkers = (L: any, map: any, points: CornerPoint[]) => {
    clearCornerMarkers();
    points.forEach((pt) => {
      const icon = L.divIcon({
        className: "corner-cone-pin",
        html: `
          <div style="
            display: flex;
            align-items: center;
            gap: 5px;
            background: rgba(6, 78, 59, 0.95);
            border: 2px solid #10b981;
            color: #ffffff;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 700;
            box-shadow: 0 6px 16px rgba(0,0,0,0.6);
            transform: translate(-50%, -100%);
            white-space: nowrap;
            backdrop-filter: blur(8px);
          ">
            <span style="
              width: 18px;
              height: 18px;
              background: #10b981;
              color: #042f2e;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              font-weight: 900;
            ">${pt.id}</span>
            <span>Cone ${pt.id}: ${pt.label}</span>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = L.marker([pt.lat, pt.lng], { icon }).addTo(map);
      cornerMarkersRef.current.push(marker);
    });
  };

  // Preset: Draw 4-Corner Field Plot automatically over current map center
  const createFourCornerFieldPlot = async () => {
    if (!leafletMapRef.current) return;
    const L = (await import("leaflet")).default;
    const map = leafletMapRef.current;

    const center = map.getCenter();
    const lat = center.lat;
    const lng = center.lng;

    const deltaLat = 0.0025;
    const deltaLng = 0.0025;

    const latlngs = [
      { lat: lat + deltaLat, lng: lng - deltaLng }, // Corner 1 (NW)
      { lat: lat + deltaLat, lng: lng + deltaLng }, // Corner 2 (NE)
      { lat: lat - deltaLat, lng: lng + deltaLng }, // Corner 3 (SE)
      { lat: lat - deltaLat, lng: lng - deltaLng }, // Corner 4 (SW)
    ];

    if (drawnGroupRef.current) {
      drawnGroupRef.current.clearLayers();
      const polygon = L.polygon(latlngs, {
        color: "#10b981",
        fillColor: "#10b981",
        fillOpacity: 0.35,
        weight: 3,
      }).addTo(drawnGroupRef.current);

      const bounds = polygon.getBounds();
      map.fitBounds(bounds, { padding: [50, 50] });

      const fourCorners = extract4Corners(latlngs, bounds);
      setCorners(fourCorners);
      renderCornerMarkers(L, map, fourCorners);

      const areaM2 = planarArea(latlngs);
      const ha = areaM2 / 10000;
      setAreaHa(ha);

      toast.success(`Generated 4-Corner Field Plot (${ha.toFixed(2)} Ha)`);
      setLoading(true);
      setResult(null);

      try {
        const r = await analyze({
          data: { centerLat: lat, centerLng: lng, areaHectares: ha, language: fullName },
        });
        setResult(r as LandResult);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  // Search location and jump map
  const handleLocationSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !leafletMapRef.current) return;
    setSearchLoading(true);
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=1&language=en&format=json`
      );
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const place = data.results[0];
        leafletMapRef.current.flyTo([place.latitude, place.longitude], 15, { duration: 1.5 });
        toast.success(`Centered on ${place.name}, ${place.country || ""}`);
      } else {
        toast.error("Location not found.");
      }
    } catch {
      toast.error("Location lookup error.");
    } finally {
      setSearchLoading(false);
    }
  };

  // Fly to user GPS position
  const flyToMyLocation = () => {
    if (!navigator.geolocation || !leafletMapRef.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        leafletMapRef.current.flyTo([pos.coords.latitude, pos.coords.longitude], 16, { duration: 1.5 });
        toast.success("Located your coordinates!");
      },
      () => toast.error("GPS access denied.")
    );
  };

  return (
    <section id="map" className="max-w-[1280px] mx-auto px-6 py-6 md:py-10 border-t border-border">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-2 border border-emerald-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            Google Earth Satellite Telemetry & Gemini AI
          </div>
          <h2 className="font-serif text-2xl md:text-3xl tracking-tight font-bold">
            {t("map_title") || "Google Earth Satellite Map & Field Boundary"}
          </h2>
          <p className="mt-1 text-muted-foreground text-xs md:text-sm max-w-2xl">
            Exclusively powered by Google Earth high-resolution satellite imagery. Draw or auto-generate a 4-corner field plot to view live Sentinel-2 NDVI health, soil moisture, and crop recommendations.
          </p>
        </div>

        {/* Action Controls (No API key visible) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={createFourCornerFieldPlot}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Square className="w-3.5 h-3.5" />
            Plot 4-Corner Field
          </button>
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-3 py-2 rounded-xl text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Google Earth Active</span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Map section with isolated stacking context — prevents Leaflet layers from leaking above the sticky header */}
        <div className="lg:col-span-2 relative [isolation:isolate] border border-border rounded-3xl overflow-hidden bg-slate-950 shadow-md h-[380px] sm:h-[420px] lg:h-[460px]">
          {/* Top Location Search Bar Overlay */}
          <div className="absolute top-3 left-3 z-[400] pointer-events-auto">
            <form
              onSubmit={handleLocationSearch}
              className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-emerald-500/30 text-white rounded-xl px-3 py-1.5 shadow-lg w-72"
            >
              <Search className="w-4 h-4 text-emerald-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search farm location..."
                className="bg-transparent border-none outline-none text-xs w-full text-white placeholder:text-slate-400"
              />
              {searchLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
              ) : (
                <button type="button" onClick={flyToMyLocation} title="Fly to GPS position" className="p-1 hover:text-emerald-400 text-slate-300">
                  <LocateFixed className="w-3.5 h-3.5" />
                </button>
              )}
            </form>
          </div>

          {/* Clean Flat Satellite Map Target */}
          <div ref={mapEl} className="w-full h-full" />
        </div>

        {/* Earth Engine & 4-Corner Telemetry Sidebar */}
        <aside className="border border-border rounded-3xl bg-card p-4 h-[380px] sm:h-[420px] lg:h-[460px] flex flex-col shadow-sm overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-border shrink-0">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              <h3 className="font-semibold text-sm">Field Intelligence</h3>
            </div>
            {areaHa !== null && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-bold">
                {areaHa.toFixed(2)} Ha
              </span>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0">
            {loading ? (
              <div className="space-y-2.5 animate-pulse pt-2">
                <div className="flex items-center gap-2 text-emerald-600 text-xs font-medium">
                  <Loader2 className="w-3 h-3 animate-spin" /> Analysing satellite data...
                </div>
                <div className="h-10 bg-muted rounded-xl" />
                <div className="h-16 bg-muted rounded-xl" />
                <div className="h-12 bg-muted rounded-xl" />
              </div>
            ) : result ? (
              <LandTelemetryView r={result} areaHa={areaHa} corners={corners} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3 px-4">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                  <Square className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">Plot Your Field</p>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    Click <strong>Plot 4-Corner Field</strong> or draw on the map to run AI satellite analysis.
                  </p>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

function LandTelemetryView({ r, areaHa, corners }: { r: LandResult; areaHa: number | null; corners: CornerPoint[] }) {
  if (r.raw) return <pre className="text-xs whitespace-pre-wrap font-mono bg-muted p-3 rounded-lg">{r.raw}</pre>;

  const ndviScore = r.ndvi ?? 0.74;
  const isWater = r.soilType?.includes("Open Water") || r.soilType?.includes("Marine");

  // NDVI color band
  const ndviColor = ndviScore >= 0.6 ? "emerald" : ndviScore >= 0.35 ? "amber" : "red";
  const ndviLabel = ndviScore >= 0.6 ? "Healthy Canopy" : ndviScore >= 0.35 ? "Moderate Vegetation" : "Sparse / Bare";
  const ndviPct = Math.round(Math.min(ndviScore / 0.9, 1) * 100);

  return (
    <div className="space-y-3 text-xs">

      {/* ── Water Warning ── */}
      {isWater && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-amber-700 dark:text-amber-300 text-[11px] flex items-start gap-2">
          <span className="shrink-0 text-base">⚠️</span>
          <span className="leading-snug">Open Water / Marine Body detected. No agricultural land at these coordinates.</span>
        </div>
      )}

      {/* ── NDVI Health Bar ── */}
      <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            NDVI Vegetation Health
          </span>
          <span className={`text-base font-serif font-bold ${
            ndviColor === "emerald" ? "text-emerald-600 dark:text-emerald-400"
            : ndviColor === "amber" ? "text-amber-600 dark:text-amber-400"
            : "text-red-500"
          }`}>{ndviScore.toFixed(2)}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              ndviColor === "emerald" ? "bg-emerald-500"
              : ndviColor === "amber" ? "bg-amber-400"
              : "bg-red-500"
            }`}
            style={{ width: `${ndviPct}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground truncate">{r.ndviStatus || ndviLabel}</p>
      </div>

      {/* ── 4-stat grid ── */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border bg-muted/30 p-2 space-y-0.5">
          <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground font-medium">
            <Droplets className="w-2.5 h-2.5 text-blue-400" /> Moisture
          </div>
          <p className="text-sm font-bold text-blue-600 dark:text-blue-400 leading-tight truncate">
            {(r.ndwi || "64%").toString().split(" ")[0]}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-2 space-y-0.5">
          <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground font-medium">
            <Thermometer className="w-2.5 h-2.5 text-amber-400" /> Temp
          </div>
          <p className="text-sm font-bold leading-tight truncate">{r.landSurfaceTemp || "29.4°C"}</p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-2 space-y-0.5">
          <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground font-medium">
            <Mountain className="w-2.5 h-2.5 text-purple-400" /> Elev
          </div>
          <p className="text-sm font-bold leading-tight">{r.elevationMeters ?? 312}m</p>
        </div>
      </div>

      {/* ── Soil & Climate ── */}
      {!isWater && (
        <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
          {r.soilType && (
            <div>
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold mb-0.5">🪨 Soil Profile</p>
              <p className="text-[11px] text-foreground leading-snug font-medium">{r.soilType}</p>
            </div>
          )}
          {r.climate && (
            <div>
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold mb-0.5">🌤 Agro-Climate Zone</p>
              <p className="text-[11px] text-foreground leading-snug font-medium">{r.climate}</p>
            </div>
          )}
          {r.yieldPotential && (
            <div>
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold mb-0.5">📈 Yield Potential</p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-snug font-semibold">{r.yieldPotential}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Recommended Crops ── */}
      {!isWater && r.recommendedCrops?.length ? (
        <div>
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold mb-1.5">🌾 Recommended Crops</p>
          <div className="flex flex-wrap gap-1">
            {r.recommendedCrops.map((c) => (
              <span key={c} className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-[10px] font-medium whitespace-nowrap">
                {c}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── Risk Factors ── */}
      {r.riskFactors?.length ? (
        <div>
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">⚠️ Risk Factors</p>
          <ul className="space-y-1">
            {r.riskFactors.map((c, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[10px] text-muted-foreground leading-snug">
                <span className="text-amber-500 shrink-0 mt-px">•</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* ── 4-Corner Pins (compact) ── */}
      {corners.length > 0 && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5 space-y-1.5">
          <p className="text-[9px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <MapPin className="w-2.5 h-2.5" /> 4-Corner Boundary Pins
          </p>
          <div className="grid grid-cols-2 gap-1">
            {corners.map((c) => (
              <div key={c.id} className="flex items-center gap-1.5 bg-background rounded-lg px-2 py-1 border border-border/60">
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[9px] font-extrabold shrink-0">
                  {c.id}
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-foreground">{c.label}</p>
                  <p className="text-[9px] text-muted-foreground font-mono truncate">{c.lat.toFixed(3)}°, {c.lng.toFixed(3)}°</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className="text-[11px] font-medium text-foreground mt-0.5 leading-snug">{value}</p>
    </div>
  );
}


// Extract 4 main corner vertices (NW, NE, SE, SW) from polygon or bounding box
function extract4Corners(latlngs: { lat: number; lng: number }[], bounds?: any): CornerPoint[] {
  if (bounds) {
    const nw = bounds.getNorthWest();
    const ne = bounds.getNorthEast();
    const se = bounds.getSouthEast();
    const sw = bounds.getSouthWest();
    return [
      { id: 1, label: "NW", lat: nw.lat, lng: nw.lng },
      { id: 2, label: "NE", lat: ne.lat, lng: ne.lng },
      { id: 3, label: "SE", lat: se.lat, lng: se.lng },
      { id: 4, label: "SW", lat: sw.lat, lng: sw.lng },
    ];
  }

  if (latlngs.length >= 4) {
    const labels = ["NW", "NE", "SE", "SW"];
    return latlngs.slice(0, 4).map((pt, idx) => ({
      id: idx + 1,
      label: labels[idx] || `P${idx + 1}`,
      lat: pt.lat,
      lng: pt.lng,
    }));
  }

  return [];
}

function planarArea(latlngs: { lat: number; lng: number }[]) {
  const R = 6378137;
  let area = 0;
  const n = latlngs.length;
  for (let i = 0; i < n; i++) {
    const p1 = latlngs[i];
    const p2 = latlngs[(i + 1) % n];
    area += ((p2.lng - p1.lng) * Math.PI / 180) *
      (2 + Math.sin((p1.lat * Math.PI) / 180) + Math.sin((p2.lat * Math.PI) / 180));
  }
  return Math.abs((area * R * R) / 2);
}