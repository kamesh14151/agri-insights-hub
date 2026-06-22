import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useServerFn } from "@tanstack/react-start";
import { analyzeLand } from "@/lib/ai.functions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type LandResult = {
  soilType?: string; climate?: string; recommendedCrops?: string[];
  waterNeeds?: string; riskFactors?: string[]; yieldPotential?: string;
  raw?: string;
};

export function MapPanel() {
  const { t, fullName } = useI18n();
  const mapEl = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LandResult | null>(null);
  const [areaHa, setAreaHa] = useState<number | null>(null);
  const analyze = useServerFn(analyzeLand);

  useEffect(() => {
    if (!mapEl.current) return;
    let map: any;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet-draw");
      if (cancelled || !mapEl.current) return;

      map = L.map(mapEl.current, { zoomControl: true }).setView([20.5937, 78.9629], 5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      const drawn = new L.FeatureGroup();
      map.addLayer(drawn);

      const drawControl = new (L as any).Control.Draw({
        edit: { featureGroup: drawn, remove: true },
        draw: {
          polygon: { allowIntersection: false, showArea: true, shapeOptions: { color: "#2D6A2D" } },
          rectangle: { shapeOptions: { color: "#2D6A2D" } },
          polyline: false, circle: false, marker: false, circlemarker: false,
        },
      });
      map.addControl(drawControl);

      map.on((L as any).Draw.Event.CREATED, async (e: any) => {
        drawn.clearLayers();
        const layer = e.layer;
        drawn.addLayer(layer);
        const latlngs: any[] = layer.getLatLngs()[0] ?? layer.getLatLngs();
        // Compute centroid + planar area (m²) via spherical formula
        const center = layer.getBounds().getCenter();
        const areaM2 = planarArea(latlngs);
        const ha = areaM2 / 10000;
        setAreaHa(ha);
        toast.success(t("toast_drawn"));
        setLoading(true);
        setResult(null);
        try {
          const r = await analyze({
            data: { centerLat: center.lat, centerLng: center.lng, areaHectares: ha, language: fullName },
          });
          setResult(r as LandResult);
          toast.success(t("toast_analyzed"));
        } catch (err) {
          console.error(err);
          toast.error(t("toast_failed"));
        } finally {
          setLoading(false);
        }
      });
    })();
    return () => {
      cancelled = true;
      try { map?.remove(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section id="map" className="max-w-[1200px] mx-auto px-6 py-20 md:py-28 border-t border-border">
      <h2 className="font-serif text-4xl md:text-5xl tracking-tight">{t("map_title")}</h2>
      <p className="mt-4 text-muted-foreground max-w-2xl">{t("map_sub")}</p>
      <p className="mt-2 text-sm text-muted-foreground">{t("map_hint")}</p>

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 border border-border rounded-xl overflow-hidden bg-card">
          <div ref={mapEl} className="w-full h-[520px]" />
        </div>
        <aside className="border border-border rounded-xl bg-card p-6 min-h-[520px]">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> {t("map_analyzing")}
              </div>
              <div className="h-5 bg-muted rounded w-1/2" />
              <div className="h-20 bg-muted rounded" />
              <div className="h-20 bg-muted rounded" />
            </div>
          ) : result ? (
            <LandView r={result} areaHa={areaHa} t={t} />
          ) : (
            <div className="h-full flex items-center justify-center text-center text-muted-foreground text-sm">
              <p>Draw a polygon over your land to see soil, climate, recommended crops and risk factors.</p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function LandView({ r, areaHa, t }: { r: LandResult; areaHa: number | null; t: (k: any) => string }) {
  if (r.raw) return <pre className="text-sm whitespace-pre-wrap">{r.raw}</pre>;
  return (
    <div className="space-y-5 text-sm">
      {areaHa != null && (
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("land_area")}</p>
          <p className="font-serif text-2xl mt-1">{areaHa.toFixed(2)} ha</p>
        </div>
      )}
      <Row label={t("land_soil")} value={r.soilType} />
      <Row label={t("land_climate")} value={r.climate} />
      <Row label={t("land_water")} value={r.waterNeeds} />
      <Row label={t("land_yield")} value={r.yieldPotential} />
      {r.recommendedCrops?.length ? (
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{t("land_crops")}</p>
          <div className="flex flex-wrap gap-2">
            {r.recommendedCrops.map((c) => (
              <span key={c} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs">{c}</span>
            ))}
          </div>
        </div>
      ) : null}
      {r.riskFactors?.length ? (
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{t("land_risk")}</p>
          <ul className="space-y-1.5 text-muted-foreground">
            {r.riskFactors.map((c, i) => <li key={i}>· {c}</li>)}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
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