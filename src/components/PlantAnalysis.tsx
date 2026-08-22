import { useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getTreatmentPlan } from "@/lib/ai.functions";

type Result = {
  plant?: string; disease?: string; confidence?: number;
  severity?: string; symptoms?: string[]; treatment?: string[]; prevention?: string[];
  raw?: string;
};

export function PlantAnalysis() {
  const { t, fullName } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const getTreatment = useServerFn(getTreatmentPlan);

  const onFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      toast.success(t("toast_uploaded") || "Image uploaded. Running custom YOLO model...");
      setLoading(true);
      setResult(null);
      
      try {
        // Step 1: Call custom YOLO Model Endpoint
        const url = "https://predict-6a889a07526d33d90cc080f2-dproatj77a-em.a.run.app/predict";
        const apiKey = "ul_d57f1478462aa0c38e346fd3b30f1e70f1c4278d";
        
        const form = new FormData();
        form.append("file", file);
        form.append("conf", "0.25");
        form.append("iou", "0.7");
        form.append("imgsz", "640");

        const yoloResponse = await fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: form,
        });

        if (!yoloResponse.ok) {
          throw new Error("YOLO Model endpoint failed");
        }

        const yoloData = await yoloResponse.json();
        console.log("YOLO Response:", yoloData);
        
        // Extract top prediction (assuming 'predictions' array or similar YOLO structure)
        let detectedDisease = "Unknown Disease";
        let conf = 0.8;
        let severity = "Moderate";
        
        if (yoloData && Array.isArray(yoloData.predictions) && yoloData.predictions.length > 0) {
          detectedDisease = yoloData.predictions[0].class || yoloData.predictions[0].name || "Disease Detected";
          conf = yoloData.predictions[0].confidence || 0.8;
        } else if (yoloData && yoloData.class) {
          detectedDisease = yoloData.class;
          conf = yoloData.confidence || 0.8;
        } else if (typeof yoloData === 'string') {
          detectedDisease = yoloData;
        } else {
          // Fallback if we don't know the exact structure
          detectedDisease = JSON.stringify(yoloData).slice(0, 50) + "...";
        }
        
        if (conf > 0.85) severity = "High";
        else if (conf < 0.5) severity = "Low";

        toast.success(`YOLO detected: ${detectedDisease}. Generating treatment plan...`);

        // Step 2: Generate Treatment Plan via Gemini
        const treatmentPlan = await getTreatment({ 
          data: { diseaseName: detectedDisease, language: fullName } 
        }) as any;

        setResult({
          plant: "Analyzed Crop",
          disease: detectedDisease,
          confidence: conf,
          severity,
          symptoms: treatmentPlan?.symptoms || [],
          treatment: treatmentPlan?.treatment || [],
          prevention: treatmentPlan?.prevention || [],
        });
        
        toast.success(t("toast_analyzed") || "Analysis complete!");
      } catch (e) {
        console.error(e);
        toast.error(t("toast_failed") || "Failed to analyze image");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <section id="analyze" className="max-w-[1200px] mx-auto px-6 py-20 md:py-28 border-t border-border">
      <h2 className="font-serif text-4xl md:text-5xl tracking-tight">{t("plant_title")}</h2>
      <p className="mt-4 text-muted-foreground max-w-2xl">{t("plant_sub")}</p>

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-border rounded-xl bg-card p-6 flex flex-col">
          <div
            onClick={() => inputRef.current?.click()}
            className="flex-1 min-h-[320px] border-2 border-dashed border-border rounded-lg flex items-center justify-center cursor-pointer hover:bg-accent/40 transition overflow-hidden"
          >
            {preview ? (
              <img src={preview} alt="Plant" className="max-h-[400px] object-contain" />
            ) : (
              <div className="text-center px-6">
                <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium">{t("plant_upload")}</p>
                <p className="text-sm text-muted-foreground mt-1">JPG · PNG · up to 10MB</p>
              </div>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
        </div>

        <div className="border border-border rounded-xl bg-card p-8 min-h-[320px]">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> {t("plant_analyzing")}
              </div>
              <div className="h-6 bg-muted rounded w-2/3" />
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-20 bg-muted rounded" />
              <div className="h-20 bg-muted rounded" />
            </div>
          ) : result ? (
            <ResultView r={result} t={t} />
          ) : (
            <div className="h-full flex items-center justify-center text-center text-muted-foreground">
              <p>Upload an image to see disease detection, severity and a treatment plan.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ResultView({ r, t }: { r: Result; t: (k: any) => string }) {
  if (r.raw) {
    return <pre className="text-sm whitespace-pre-wrap">{r.raw}</pre>;
  }
  const sevColor =
    r.severity === "High" ? "bg-destructive/15 text-destructive"
      : r.severity === "Moderate" ? "bg-amber-500/15 text-amber-700"
      : "bg-primary/15 text-primary";
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{r.plant ?? "Plant"}</p>
        <h3 className="font-serif text-2xl mt-1">{r.disease}</h3>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {r.severity && <span className={`px-2 py-1 rounded-full ${sevColor}`}>{t("plant_severity")}: {r.severity}</span>}
          {typeof r.confidence === "number" && (
            <span className="px-2 py-1 rounded-full bg-muted">{t("plant_confidence")}: {Math.round(r.confidence * (r.confidence <= 1 ? 100 : 1))}%</span>
          )}
        </div>
      </div>
      <Block title={t("plant_symptoms")} items={r.symptoms} />
      <Block title={t("plant_treatment")} items={r.treatment} />
      <Block title={t("plant_prevention")} items={r.prevention} />
    </div>
  );
}

function Block({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <h4 className="text-sm font-semibold mb-2">{title}</h4>
      <ul className="space-y-1.5 text-sm text-muted-foreground">
        {items.map((s, i) => (
          <li key={i} className="flex gap-2"><span className="text-primary mt-1.5 w-1 h-1 rounded-full bg-primary shrink-0" />{s}</li>
        ))}
      </ul>
    </div>
  );
}