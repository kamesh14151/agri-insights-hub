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
  Square,
  Crosshair,
  Leaf,
  CloudSun,
  BarChart3,
  AlertTriangle,
  Layers
} from "lucide-react";
import { generateHeatmapGrid, getNdviColor, getNdwiColor } from "@/lib/heatmap";

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
  alt?: number;
};

const GOOGLE_API_KEY = "AIzaSyBgUBjm3AVh4jrftt9HN5wmzYk-4_vhK3g";

export function MapPanel() {
  const { t, fullName } = useI18n();
  const map3dRef = useRef<any>(null);

  const [loading, setLoading] = useState(false);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [result, setResult] = useState<LandResult | null>(null);
  const [areaHa, setAreaHa] = useState<number | null>(null);
  const [corners, setCorners] = useState<CornerPoint[]>([]);
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [draftCorners, setDraftCorners] = useState<CornerPoint[]>([]);

  // Search location state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);

  // Layer state
  const [activeLayer, setActiveLayer] = useState<"satellite" | "ndvi" | "ndwi">("satellite");

  const analyze = useServerFn(analyzeLand);

  // 1. Load Google Maps 3D API
  useEffect(() => {
    if (window.google?.maps?.importLibrary) {
      setApiLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&v=alpha&libraries=maps3d,marker`;
    script.async = true;
    script.onload = () => setApiLoaded(true);
    document.head.appendChild(script);
  }, []);

  // 2. Handle map clicks for drawing
  useEffect(() => {
    const map = map3dRef.current;
    if (!map || !apiLoaded) return;

    const handleClick = (e: any) => {
      if (!isDrawing) return;
      if (!e.position) return;
      
      const newPt: CornerPoint = {
        id: draftCorners.length + 1,
        label: ["NW", "NE", "SE", "SW"][draftCorners.length] || `P${draftCorners.length + 1}`,
        lat: e.position.lat,
        lng: e.position.lng,
        alt: e.position.altitude || 0,
      };

      const newCorners = [...draftCorners, newPt];
      setDraftCorners(newCorners);

      if (newCorners.length === 4) {
        setIsDrawing(false);
        const sortedCorners = sortPointsClockwise(newCorners);
        setCorners(sortedCorners);
        setDraftCorners([]);
        processFieldAnalysis(sortedCorners);
      }
    };

    map.addEventListener("gmp-click", handleClick);
    return () => map.removeEventListener("gmp-click", handleClick);
  }, [isDrawing, draftCorners, apiLoaded]);

  const processFieldAnalysis = async (pts: CornerPoint[]) => {
    if (pts.length < 4) return;
    
    // Compute center and area
    const centerLat = pts.reduce((sum, p) => sum + p.lat, 0) / 4;
    const centerLng = pts.reduce((sum, p) => sum + p.lng, 0) / 4;
    const areaM2 = planarArea(pts);
    const ha = areaM2 / 10000;
    setAreaHa(ha);

    toast.success(`4-Corner Field Boundary set (${ha.toFixed(2)} Ha)`);
    setLoading(true);
    setResult(null);

    try {
      const r = await analyze({
        data: { centerLat, centerLng, areaHectares: ha, language: fullName },
      });
      setResult(r as LandResult);
      toast.success("Google Earth Satellite Analysis Ready!");
    } catch (err) {
      console.error(err);
      toast.error("Analysis request failed.");
    } finally {
      setLoading(false);
    }
  };

  // Search location and jump map
  const handleLocationSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !map3dRef.current) return;
    setSearchLoading(true);
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=1&language=en&format=json`
      );
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const place = data.results[0];
        flyToTarget(place.latitude, place.longitude, 2000, 60);
        toast.success(`Centered on ${place.name}, ${place.country || ""}`);
      } else {
        toast.error("Location not found.");
      }
    } catch (error) {
      toast.error("Search failed.");
    } finally {
      setSearchLoading(false);
    }
  };

  const flyToMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        flyToTarget(pos.coords.latitude, pos.coords.longitude, 800, 65);
        toast.success("Flew to your location");
      },
      () => toast.error("Unable to retrieve your location")
    );
  };

  const flyToTarget = (lat: number, lng: number, range = 1500, tilt = 60) => {
    if (map3dRef.current?.flyCameraTo) {
      map3dRef.current.flyCameraTo({
        endCamera: { center: { lat, lng, altitude: 0 }, tilt, range, heading: 0 },
        durationMillis: 2000,
      });
    }
  };

  return (
    <section id="map" className="max-w-[1280px] mx-auto px-6 py-6 md:py-10 border-t border-border">
      <div className="flex flex-col md:flex-row md:items-end justify-end gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              setIsDrawing(true);
              setDraftCorners([]);
              setCorners([]);
              setResult(null);
              setAreaHa(null);
              toast.info("Click 4 points on the map to plot your field.");
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
              isDrawing 
                ? "bg-amber-500 hover:bg-amber-600 text-slate-950 animate-pulse" 
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            {isDrawing ? <Crosshair className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
            {isDrawing ? `Select Corner ${draftCorners.length + 1}...` : "Plot 4-Corner Field"}
          </button>
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-3 py-2 rounded-xl text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>3D Earth Active</span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 relative [isolation:isolate] border border-border rounded-3xl overflow-hidden bg-slate-950 shadow-md h-[380px] sm:h-[420px] lg:h-[460px]">
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

          <div className="absolute top-16 left-3 z-[400] pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-emerald-500/30 rounded-xl shadow-lg p-1.5 flex flex-col gap-1.5 w-auto">
            {(["satellite", "ndvi", "ndwi"] as const).map((layer) => (
              <button
                key={layer}
                onClick={() => setActiveLayer(layer)}
                className={`flex items-center gap-2 text-left px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition whitespace-nowrap ${
                  activeLayer === layer 
                    ? "bg-emerald-500 text-slate-950 shadow-md" 
                    : "text-slate-300 hover:bg-white/10"
                }`}
              >
                <Layers className={`w-3.5 h-3.5 ${activeLayer === layer ? "text-slate-950" : "text-emerald-400"}`} />
                {layer === "satellite" ? "Satellite Map" : layer === "ndvi" ? "NDVI Heatmap" : "Moisture Map"}
              </button>
            ))}
          </div>

          {apiLoaded ? (
            // @ts-ignore
            <gmp-map-3d
              ref={map3dRef}
              center={{ lat: 11.6643, lng: 78.1460, altitude: 0 }}
              range={4000}
              tilt={65}
              heading={0}
              default-labels-disabled="false"
              style={{ width: "100%", height: "100%" }}
            >
              {isDrawing && draftCorners.length > 0 && (
                // @ts-ignore
                <gmp-polyline-3d
                  altitude-mode="clamp-to-ground"
                  stroke-color="rgba(16, 185, 129, 1)"
                  stroke-width="4"
                  draws-occluded-segments="true"
                >
                  {draftCorners.map((pt, i) => (
                    <div key={i} slot="coordinates">{pt.lat},{pt.lng},{pt.alt}</div>
                  ))}
                </gmp-polyline-3d>
              )}

              {(isDrawing ? draftCorners : corners).map((pt, i) => (
                // @ts-ignore
                <gmp-marker-3d
                  key={`custom-marker-${i}`}
                  position={{ lat: pt.lat, lng: pt.lng, altitude: pt.alt }}
                >
                  <div className="w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-sm flex items-center justify-center font-bold text-[9px] text-white">
                    {i + 1}
                  </div>
                </gmp-marker-3d>
              ))}

              {!isDrawing && corners.length === 4 && activeLayer === "satellite" && (
                // @ts-ignore
                <gmp-polygon-3d
                  altitude-mode="clamp-to-ground"
                  fill-color="rgba(16, 185, 129, 0.35)"
                  stroke-color="rgba(16, 185, 129, 1)"
                  stroke-width="4"
                  draws-occluded-segments="true"
                >
                  {corners.map((pt, i) => (
                    <div key={i} slot="coordinates">{pt.lat},{pt.lng},{pt.alt}</div>
                  ))}
                  <div slot="coordinates">{corners[0].lat},{corners[0].lng},{corners[0].alt}</div>
                </gmp-polygon-3d>
              )}

              {!isDrawing && corners.length === 4 && activeLayer !== "satellite" && generateHeatmapGrid(corners, 8, result?.ndvi ?? 0.7).map(cell => (
                // @ts-ignore
                <gmp-polygon-3d
                  key={cell.id}
                  altitude-mode="clamp-to-ground"
                  fill-color={activeLayer === "ndvi" ? getNdviColor(cell.value) : getNdwiColor(cell.value)}
                  stroke-color="rgba(255, 255, 255, 0.05)"
                  stroke-width="1"
                  draws-occluded-segments="true"
                >
                  {cell.points.map((pt, i) => (
                    <div key={i} slot="coordinates">{pt.lat},{pt.lng},{pt.alt}</div>
                  ))}
                  <div slot="coordinates">{cell.points[0].lat},{cell.points[0].lng},{cell.points[0].alt}</div>
                </gmp-polygon-3d>
              ))}
            </gmp-map-3d>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-emerald-500">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p className="text-sm font-medium">Loading Google 3D Earth...</p>
            </div>
          )}
        </div>

        <aside className="border border-border rounded-3xl bg-card p-4 h-[380px] sm:h-[420px] lg:h-[460px] flex flex-col shadow-sm overflow-y-auto">
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
                    Click <strong>Plot 4-Corner Field</strong> and select 4 points on the 3D map to run AI satellite analysis.
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

  const ndviColor = ndviScore >= 0.6 ? "emerald" : ndviScore >= 0.35 ? "amber" : "red";
  const ndviLabel = ndviScore >= 0.6 ? "Healthy Canopy" : ndviScore >= 0.35 ? "Moderate Vegetation" : "Sparse / Bare";
  const ndviPct = Math.round(Math.min(ndviScore / 0.9, 1) * 100);

  return (
    <div className="space-y-4">
      {isWater && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2.5 shadow-sm">
          <span className="shrink-0 text-lg">⚠️</span>
          <span className="leading-relaxed font-medium">Open Water / Marine Body detected. The selected coordinates do not appear to contain cultivable agricultural land.</span>
        </div>
      )}

      {/* Main NDVI Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-muted/50 to-muted/10 p-4 shadow-sm">
        <div className="absolute -right-6 -top-6 text-emerald-500/5 rotate-12 pointer-events-none">
          <Leaf className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex items-start justify-between mb-3">
          <div>
            <h4 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              Vegetation Health (NDVI)
            </h4>
            <p className="text-sm font-medium mt-1 text-foreground">{r.ndviStatus || ndviLabel}</p>
          </div>
          <div className={`flex items-baseline gap-0.5 font-serif text-3xl font-bold tracking-tight ${
            ndviColor === "emerald" ? "text-emerald-500 drop-shadow-[0_0_12px_rgba(16,185,129,0.2)]"
            : ndviColor === "amber" ? "text-amber-500 drop-shadow-[0_0_12px_rgba(245,158,11,0.2)]"
            : "text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.2)]"
          }`}>
            {ndviScore.toFixed(2)}
          </div>
        </div>
        <div className="relative h-2 w-full rounded-full bg-border/50 overflow-hidden isolate">
          <div
            className={`absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ease-out ${
              ndviColor === "emerald" ? "bg-gradient-to-r from-emerald-600 to-emerald-400"
              : ndviColor === "amber" ? "bg-gradient-to-r from-amber-600 to-amber-400"
              : "bg-gradient-to-r from-red-600 to-red-400"
            }`}
            style={{ width: `${ndviPct}%` }}
          />
        </div>
      </div>

      {/* Mini Metrics Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3 flex flex-col items-center justify-center text-center shadow-sm">
          <Droplets className="w-4 h-4 text-blue-500 mb-1.5 opacity-80" />
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">Moisture</p>
          <p className="text-sm font-bold text-foreground">{(r.ndwi || "64%").toString().split(" ")[0]}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3 flex flex-col items-center justify-center text-center shadow-sm">
          <Thermometer className="w-4 h-4 text-amber-500 mb-1.5 opacity-80" />
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">Surface Temp</p>
          <p className="text-sm font-bold text-foreground">{r.landSurfaceTemp || "29.4°C"}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3 flex flex-col items-center justify-center text-center shadow-sm">
          <Mountain className="w-4 h-4 text-purple-500 mb-1.5 opacity-80" />
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">Elevation</p>
          <p className="text-sm font-bold text-foreground">{r.elevationMeters ?? 312}m</p>
        </div>
      </div>

      {!isWater && (
        <div className="grid grid-cols-2 gap-3">
          {r.soilType && (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1.5 mb-1">
                <Square className="w-3 h-3 text-stone-400" /> Soil Profile
              </p>
              <p className="text-xs text-foreground font-medium leading-relaxed">{r.soilType}</p>
            </div>
          )}
          {r.climate && (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1.5 mb-1">
                <CloudSun className="w-3 h-3 text-sky-400" /> Climate Zone
              </p>
              <p className="text-xs text-foreground font-medium leading-relaxed">{r.climate}</p>
            </div>
          )}
          {r.yieldPotential && (
            <div className="col-span-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
              <p className="text-[10px] uppercase tracking-widest text-emerald-600 dark:text-emerald-500 font-bold flex items-center gap-1.5 mb-1">
                <BarChart3 className="w-3 h-3" /> Yield Potential
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium leading-relaxed">{r.yieldPotential}</p>
            </div>
          )}
        </div>
      )}

      {!isWater && r.recommendedCrops?.length ? (
        <div className="pt-1">
          <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2 flex items-center gap-1.5">
            <Leaf className="w-3.5 h-3.5 text-primary" /> Recommended Crops
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {r.recommendedCrops.map((c) => (
              <span key={c} className="px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 text-xs font-semibold shadow-sm transition-colors hover:bg-primary/20">
                {c}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {r.riskFactors?.length ? (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3.5">
          <h4 className="text-[10px] uppercase tracking-widest text-rose-600 dark:text-rose-400 font-bold mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Risk Factors
          </h4>
          <ul className="space-y-1.5">
            {r.riskFactors.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="text-rose-500 shrink-0 mt-px text-[10px]">■</span>
                <span className="leading-snug text-foreground/80">{c}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {corners.length > 0 && (
        <div className="pt-2">
           <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2 flex items-center gap-1.5">
             <MapPin className="w-3 h-3 text-blue-500" /> GPS Boundaries
           </h4>
          <div className="grid grid-cols-2 gap-2">
            {corners.map((c) => (
              <div key={c.id} className="flex items-center gap-2 bg-muted/30 rounded-lg p-2 border border-border/50">
                <span className="w-5 h-5 rounded bg-foreground text-background flex items-center justify-center text-[10px] font-bold shrink-0">
                  {c.id}
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-foreground">{c.label}</p>
                  <p className="text-[9px] text-muted-foreground font-mono truncate">{c.lat.toFixed(4)}°, {c.lng.toFixed(4)}°</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function planarArea(corners: CornerPoint[]) {
  if (corners.length < 3) return 0;
  let area = 0;
  const R = 6378137;
  for (let i = 0; i < corners.length; i++) {
    const p1 = corners[i];
    const p2 = corners[(i + 1) % corners.length];
    area += (p2.lng - p1.lng) * (2 + Math.sin(p1.lat * Math.PI / 180) + Math.sin(p2.lat * Math.PI / 180));
  }
  return Math.abs(area * R * R / 2) * (Math.PI / 180);
}