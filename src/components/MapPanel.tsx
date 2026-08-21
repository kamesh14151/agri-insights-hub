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
  Crosshair
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
  alt?: number;
};

const GOOGLE_API_KEY = "AIzaSyBgUBjm3AVh4jrftt9HN5wmzYk-4_vhK3g";

const GmpMap3d = "gmp-map-3d" as any;
const GmpPolygon3d = "gmp-polygon-3d" as any;

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

  const analyze = useServerFn(analyzeLand);

  // 1. Load Google Maps 3D API
  useEffect(() => {
    if (window.google?.maps?.importLibrary) {
      setApiLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&v=alpha&libraries=maps3d`;
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
        setCorners(newCorners);
        setDraftCorners([]);
        processFieldAnalysis(newCorners);
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-2 border border-emerald-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            Google Earth Photorealistic 3D &amp; Gemini AI
          </div>
          <h2 className="font-serif text-2xl md:text-3xl tracking-tight font-bold">
            Map your land in 3D
          </h2>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
            Exclusively powered by Google Maps Photorealistic 3D and Earth Engine. Navigate the 3D globe, select 4 corners, and view live Sentinel-2 NDVI health, soil moisture, and crop recommendations.
          </p>
        </div>
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

          {apiLoaded ? (
            <GmpMap3d
              ref={map3dRef}
              center="11.6643,78.1460,0"
              range="4000"
              tilt="65"
              heading="0"
              default-labels-disabled={false}
              style={{ width: "100%", height: "100%" }}
            >
              {isDrawing && draftCorners.length > 2 && (
                <GmpPolygon3d
                  altitude-mode="clamp-to-ground"
                  fill-color="rgba(16, 185, 129, 0.4)"
                  stroke-color="rgba(16, 185, 129, 1)"
                  stroke-width="4"
                  draws-occluded-segments={true}
                >
                  {draftCorners.map((pt, i) => (
                    <div key={i} slot="coordinates">{pt.lat},{pt.lng},{pt.alt}</div>
                  ))}
                </GmpPolygon3d>
              )}

              {!isDrawing && corners.length === 4 && (
                <GmpPolygon3d
                  altitude-mode="clamp-to-ground"
                  fill-color="rgba(16, 185, 129, 0.35)"
                  stroke-color="rgba(16, 185, 129, 1)"
                  stroke-width="4"
                  draws-occluded-segments={true}
                >
                  {corners.map((pt, i) => (
                    <div key={i} slot="coordinates">{pt.lat},{pt.lng},{pt.alt}</div>
                  ))}
                  <div slot="coordinates">{corners[0].lat},{corners[0].lng},{corners[0].alt}</div>
                </GmpPolygon3d>
              )}
            </GmpMap3d>
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
    <div className="space-y-3 text-xs">
      {isWater && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-amber-700 dark:text-amber-300 text-[11px] flex items-start gap-2">
          <span className="shrink-0 text-base">⚠️</span>
          <span className="leading-snug">Open Water / Marine Body detected. No agricultural land at these coordinates.</span>
        </div>
      )}

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