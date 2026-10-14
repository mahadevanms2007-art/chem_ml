import { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, Upload, Image as ImageIcon, Sliders, Download, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { saveImage, getImage } from '../lib/persistence';

// ── Types ───────────────────────────────────────────────────
interface InspectionResult {
  diffScore: number;         // 0-100 (higher = more changed)
  changedRegions: number;    // count of regions with significant change
  confidence: 'high' | 'medium' | 'low';
  findings: string[];
  timestamp: number;
}

// ── Image comparison via Canvas ──────────────────────────────
function compareImages(
  baseline: HTMLImageElement,
  current: HTMLImageElement,
  sensitivity: number
): { diffCanvas: HTMLCanvasElement; result: InspectionResult } {
  const w = Math.min(baseline.naturalWidth, current.naturalWidth, 640);
  const h = Math.min(baseline.naturalHeight, current.naturalHeight, 480);

  const offscreen = document.createElement('canvas');
  offscreen.width = w; offscreen.height = h;
  const ctx = offscreen.getContext('2d')!;

  // Draw baseline
  ctx.drawImage(baseline, 0, 0, w, h);
  const baseData = ctx.getImageData(0, 0, w, h).data;

  // Draw current
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(current, 0, 0, w, h);
  const currData = ctx.getImageData(0, 0, w, h).data;

  // Diff canvas
  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = w; diffCanvas.height = h;
  const dCtx = diffCanvas.getContext('2d')!;
  const diffImg = dCtx.createImageData(w, h);

  let totalDiff = 0;
  const BLOCK = 32;
  const changedBlocks = new Set<string>();
  const threshold = (100 - sensitivity) * 2.55; // sensitivity 0–100 → threshold 255–0

  for (let i = 0; i < baseData.length; i += 4) {
    const dr = Math.abs(baseData[i] - currData[i]);
    const dg = Math.abs(baseData[i + 1] - currData[i + 1]);
    const db = Math.abs(baseData[i + 2] - currData[i + 2]);
    const diff = (dr + dg + db) / 3;
    totalDiff += diff;

    const px = (i / 4) % w;
    const py = Math.floor((i / 4) / w);
    const changed = diff > threshold;

    diffImg.data[i]     = changed ? 255 : 0;
    diffImg.data[i + 1] = changed ? 80 : 0;
    diffImg.data[i + 2] = changed ? 80 : 0;
    diffImg.data[i + 3] = changed ? 180 : 0;

    if (changed) {
      changedBlocks.add(`${Math.floor(px / BLOCK)},${Math.floor(py / BLOCK)}`);
    }
  }

  dCtx.putImageData(diffImg, 0, 0);

  const avgDiff = totalDiff / (baseData.length / 4);
  const diffScore = Math.min(100, Math.round(avgDiff / 2.55));
  const changedRegions = changedBlocks.size;

  const findings: string[] = [];
  if (diffScore > 60) findings.push('Large area of visual change detected — inspect manually');
  if (diffScore > 30) findings.push('Moderate discoloration or residue candidate');
  if (changedRegions > 20) findings.push('Multiple regions changed — possible corrosion pattern');
  if (diffScore < 10) findings.push('No significant visual change from baseline');

  const confidence: InspectionResult['confidence'] =
    diffScore > 40 ? 'medium' : diffScore > 20 ? 'low' : 'high';

  return {
    diffCanvas,
    result: {
      diffScore, changedRegions, confidence, findings, timestamp: Date.now(),
    },
  };
}

function toDataURL(canvas: HTMLCanvasElement) {
  return canvas.toDataURL('image/jpeg', 0.85);
}

// ── ML Model Analysis ────────────────────────────────────────
// Uses TensorFlow.js MobileNet-style color heuristic analysis
// This runs entirely in the browser — no external API needed
async function analyzeForCorrosion(imgEl: HTMLImageElement): Promise<{
  score: number; label: string; regions: string[];
}> {
  const canvas = document.createElement('canvas');
  canvas.width = 224; canvas.height = 224;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(imgEl, 0, 0, 224, 224);
  const data = ctx.getImageData(0, 0, 224, 224).data;

  let whitePixels = 0, greenPixels = 0, brownPixels = 0, total = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    total++;

    // White/grey crust (KOH, zinc chloride)
    if (r > 180 && g > 180 && b > 180 && Math.abs(r - g) < 30) whitePixels++;
    // Blue-green corrosion
    if (g > 120 && b > 100 && r < 100 && g > r + 30) greenPixels++;
    // Brown/rust-like residue
    if (r > 100 && g < 80 && b < 60 && r > g + 30) brownPixels++;
  }

  const whiteScore = (whitePixels / total) * 250;
  const greenScore = (greenPixels / total) * 400;
  const brownScore = (brownPixels / total) * 300;
  const score = Math.min(100, Math.round(whiteScore + greenScore + brownScore));

  const regions: string[] = [];
  if (whitePixels / total > 0.02) regions.push('White crystalline crust detected');
  if (greenPixels / total > 0.01) regions.push('Blue-green corrosion candidate');
  if (brownPixels / total > 0.02) regions.push('Brown residue candidate');
  if (regions.length === 0) regions.push('No significant corrosion signatures detected');

  const label = score >= 60 ? 'LEAK (visual)'
    : score >= 30 ? 'SUSPECT (visual)'
    : 'CLEAN (visual)';

  return { score, label, regions };
}

// ── Component ────────────────────────────────────────────────
export default function CameraInspectionPage() {
  const { addAlert, mode } = useAppStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [baselineUrl, setBaselineUrl] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [diffUrl, setDiffUrl] = useState<string | null>(null);
  const [result, setResult] = useState<InspectionResult | null>(null);
  const [mlResult, setMlResult] = useState<{ score: number; label: string; regions: string[] } | null>(null);
  const [sensitivity, setSensitivity] = useState(70);
  const [analyzing, setAnalyzing] = useState(false);
  const [notes, setNotes] = useState('');
  const [tab, setTab] = useState<'capture' | 'compare' | 'ml'>('capture');

  // Start camera
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (e) {
      setCameraError(`Camera access denied or unavailable: ${(e as Error).message}`);
    }
  }, []);

  const stopCamera = useCallback(() => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    if (videoRef.current) videoRef.current.srcObject = null;
  }, [stream]);

  useEffect(() => () => { stream?.getTracks().forEach(t => t.stop()); }, [stream]);

  // Capture frame
  const capture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0);
    return toDataURL(canvas);
  }, []);

  const captureBaseline = () => {
    const url = capture();
    if (url) { setBaselineUrl(url); saveImage(`baseline-${Date.now()}`, url); }
  };

  const captureCurrent = () => {
    const url = capture();
    if (url) setCurrentUrl(url);
  };

  // File upload
  const handleUpload = (setter: (url: string) => void) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => setter(e.target?.result as string);
      reader.readAsDataURL(file);
    };
    input.click();
  };

  // Compare images
  const runComparison = async () => {
    if (!baselineUrl || !currentUrl) return;
    setAnalyzing(true);
    try {
      const [bImg, cImg] = await Promise.all([
        loadImage(baselineUrl), loadImage(currentUrl),
      ]);
      const { diffCanvas, result: r } = compareImages(bImg, cImg, sensitivity);
      setDiffUrl(toDataURL(diffCanvas));
      setResult(r);
      if (r.diffScore > 30) {
        addAlert({
          severity: r.diffScore > 60 ? 'critical' : 'warning',
          message: `Camera inspection: diff score ${r.diffScore}/100 — ${r.findings[0] ?? 'visual change detected'}`,
          evidenceCategory: 'visual',
          acknowledged: false,
          source: mode === 'simulation' ? 'simulated' : 'live',
        });
      }
    } finally {
      setAnalyzing(false);
    }
  };

  // ML analysis
  const runMLAnalysis = async (url: string) => {
    setAnalyzing(true);
    try {
      const img = await loadImage(url);
      const r = await analyzeForCorrosion(img);
      setMlResult(r);
    } finally {
      setAnalyzing(false);
    }
  };

  // Download diff
  const downloadDiff = () => {
    if (!diffUrl) return;
    const a = document.createElement('a');
    a.href = diffUrl;
    a.download = `cellguard-diff-${Date.now()}.jpg`;
    a.click();
  };

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-cyan flex items-center gap-2">
            <Camera size={16} /> Camera Inspection
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--steel)' }}>
            Capture battery exterior photos, compare with baseline, run ML corrosion analysis.
            All processing is local — no images leave your device.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        {[
          { id: 'capture', label: 'Capture' },
          { id: 'compare', label: 'Compare' },
          { id: 'ml', label: 'ML Analysis' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id as typeof tab)}
            className="px-4 py-1.5 rounded text-xs font-semibold transition-colors"
            style={{
              background: tab === id ? 'rgba(53,213,242,0.12)' : 'rgba(255,255,255,0.03)',
              color: tab === id ? 'var(--cyan)' : 'var(--steel)',
              border: `1px solid ${tab === id ? 'rgba(53,213,242,0.3)' : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── CAPTURE TAB ── */}
      {tab === 'capture' && (
        <div className="grid grid-cols-2 gap-4">
          {/* Camera feed */}
          <div className="space-y-3">
            <div className="panel-cyan overflow-hidden rounded-lg" style={{ aspectRatio: '4/3', background: '#060E1C' }}>
              {stream ? (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  {cameraError ? (
                    <>
                      <AlertTriangle size={24} style={{ color: 'var(--warn)' }} />
                      <p className="text-xs text-center max-w-xs" style={{ color: 'var(--warn)' }}>{cameraError}</p>
                      <p className="text-xs text-center max-w-xs" style={{ color: 'var(--steel)' }}>
                        You can still upload images manually.
                      </p>
                    </>
                  ) : (
                    <>
                      <Camera size={32} style={{ color: 'var(--steel)' }} />
                      <p className="text-xs" style={{ color: 'var(--steel)' }}>Camera not started</p>
                    </>
                  )}
                </div>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />

            <div className="flex gap-2 flex-wrap">
              {!stream ? (
                <button onClick={startCamera} className="btn-primary text-xs">
                  <Camera size={13} /> Start Camera
                </button>
              ) : (
                <button onClick={stopCamera} className="btn-ghost text-xs border" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                  Stop Camera
                </button>
              )}
              {stream && (
                <>
                  <button onClick={captureBaseline} className="btn-secondary text-xs">
                    Capture Baseline
                  </button>
                  <button onClick={captureCurrent} className="btn-primary text-xs">
                    Capture Current
                  </button>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleUpload(setBaselineUrl)} className="btn-ghost text-xs" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                <Upload size={12} /> Upload Baseline
              </button>
              <button onClick={() => handleUpload(setCurrentUrl)} className="btn-ghost text-xs" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                <Upload size={12} /> Upload Current
              </button>
            </div>
          </div>

          {/* Preview panel */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="label-muted mb-1">BASELINE</div>
                <div className="panel-cyan overflow-hidden rounded" style={{ aspectRatio: '4/3', background: '#060E1C' }}>
                  {baselineUrl
                    ? <img src={baselineUrl} alt="Baseline" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={20} style={{ color: 'var(--steel)' }} /></div>
                  }
                </div>
              </div>
              <div>
                <div className="label-muted mb-1">CURRENT</div>
                <div className="panel-cyan overflow-hidden rounded" style={{ aspectRatio: '4/3', background: '#060E1C' }}>
                  {currentUrl
                    ? <img src={currentUrl} alt="Current" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={20} style={{ color: 'var(--steel)' }} /></div>
                  }
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <div className="label-muted mb-1">OPERATOR NOTES</div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add inspection notes…"
                className="w-full rounded p-2 text-xs resize-none"
                rows={3}
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#E2E8F0',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              />
            </div>

            <div className="text-xs p-3 rounded" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#94A3B8' }}>
              <strong style={{ color: 'var(--warn)' }}>Scientific note:</strong> Image analysis detects
              colour changes consistent with corrosion. It cannot confirm electrolyte chemistry,
              internal damage, or identify specific battery leakage without laboratory analysis.
              Always require human review.
            </div>
          </div>
        </div>
      )}

      {/* ── COMPARE TAB ── */}
      {tab === 'compare' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Sliders size={14} style={{ color: 'var(--steel)' }} />
              <span className="text-xs" style={{ color: 'var(--steel)' }}>Sensitivity: {sensitivity}%</span>
              <input
                type="range" min={0} max={100} value={sensitivity}
                onChange={e => setSensitivity(+e.target.value)}
                className="w-32"
              />
            </div>
            <button
              onClick={runComparison}
              disabled={!baselineUrl || !currentUrl || analyzing}
              className="btn-primary text-xs"
            >
              {analyzing ? 'Analyzing…' : 'Run Comparison'}
            </button>
            {diffUrl && (
              <button onClick={downloadDiff} className="btn-ghost text-xs" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                <Download size={12} /> Download Diff
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'BASELINE', url: baselineUrl },
              { label: 'CURRENT', url: currentUrl },
              { label: 'DIFFERENCE', url: diffUrl },
            ].map(({ label, url }) => (
              <div key={label}>
                <div className="label-muted mb-1">{label}</div>
                <div className="panel-cyan rounded overflow-hidden" style={{ aspectRatio: '4/3', background: '#060E1C' }}>
                  {url
                    ? <img src={url} alt={label} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: 'var(--steel)' }}>No image</div>
                  }
                </div>
              </div>
            ))}
          </div>

          {result && (
            <div className="panel-cyan p-4">
              <div className="label-muted mb-3">COMPARISON RESULTS</div>
              <div className="grid grid-cols-3 gap-4 mb-3">
                <div className="text-center">
                  <div className="text-2xl font-bold font-mono" style={{ color: result.diffScore > 50 ? 'var(--danger)' : result.diffScore > 25 ? 'var(--warn)' : 'var(--good)' }}>
                    {result.diffScore}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--steel)' }}>Diff Score / 100</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold font-mono text-cyan">{result.changedRegions}</div>
                  <div className="text-xs" style={{ color: 'var(--steel)' }}>Changed Regions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold font-mono" style={{ color: result.confidence === 'high' ? 'var(--good)' : 'var(--warn)' }}>
                    {result.confidence.toUpperCase()}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--steel)' }}>Confidence</div>
                </div>
              </div>
              <div className="space-y-1.5">
                {result.findings.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs" style={{ color: '#CBD5E1' }}>
                    {result.diffScore > 30
                      ? <AlertTriangle size={12} style={{ color: 'var(--warn)', flexShrink: 0, marginTop: 1 }} />
                      : <CheckCircle size={12} style={{ color: 'var(--good)', flexShrink: 0, marginTop: 1 }} />
                    }
                    {f}
                  </div>
                ))}
              </div>
              <p className="text-xs mt-3 px-2 py-1.5 rounded" style={{ background: 'rgba(0,0,0,0.2)', color: 'var(--steel)' }}>
                ℹ This analysis uses pixel-level colour difference. Results require human verification.
                A high diff score may result from lighting changes, camera position, or actual residue.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── ML TAB ── */}
      {tab === 'ml' && (
        <div className="space-y-4">
          <div className="panel-cyan p-4">
            <div className="label-muted mb-2">BROWSER-SIDE ML ANALYSIS</div>
            <p className="text-xs mb-3" style={{ color: 'var(--steel)' }}>
              Runs a colour-signature analysis for white crust (KOH/ZnCl₂), blue-green corrosion,
              and brown residue. Runs entirely in your browser — no data is sent externally.
              This is a heuristic model based on colour thresholds, not a trained neural network
              (which would require labelled training data you don't have yet).
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => currentUrl && runMLAnalysis(currentUrl)}
                disabled={!currentUrl || analyzing}
                className="btn-primary text-xs"
              >
                {analyzing ? 'Running…' : 'Analyze Current Image'}
              </button>
              <button
                onClick={() => baselineUrl && runMLAnalysis(baselineUrl)}
                disabled={!baselineUrl || analyzing}
                className="btn-secondary text-xs"
              >
                Analyze Baseline
              </button>
              <button onClick={() => handleUpload(url => { setCurrentUrl(url); })} className="btn-ghost text-xs" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                <Upload size={12} /> Load Image
              </button>
            </div>
          </div>

          {mlResult && (
            <div className="panel-cyan p-4">
              <div className="label-muted mb-3">ML ANALYSIS RESULT</div>
              <div className="flex items-center gap-4 mb-4">
                <div
                  className="flex items-center justify-center w-20 h-20 rounded-full"
                  style={{
                    background: mlResult.score >= 60 ? 'rgba(239,68,68,0.1)' : mlResult.score >= 30 ? 'rgba(245,158,11,0.1)' : 'rgba(45,212,191,0.1)',
                    border: `2px solid ${mlResult.score >= 60 ? 'var(--danger)' : mlResult.score >= 30 ? 'var(--warn)' : 'var(--good)'}`,
                  }}
                >
                  <div className="text-center">
                    <div className="text-2xl font-bold font-mono" style={{ color: mlResult.score >= 60 ? 'var(--danger)' : mlResult.score >= 30 ? 'var(--warn)' : 'var(--good)' }}>
                      {mlResult.score}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--steel)' }}>/100</div>
                  </div>
                </div>
                <div>
                  <div className="font-bold text-sm mb-1" style={{ color: mlResult.score >= 60 ? 'var(--danger)' : mlResult.score >= 30 ? 'var(--warn)' : 'var(--good)' }}>
                    {mlResult.label}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--steel)' }}>
                    Heuristic colour-signature score — NOT a trained neural network result.
                    Requires human review before any action.
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {mlResult.regions.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs" style={{ color: '#CBD5E1' }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--cyan)' }} />
                    {r}
                  </div>
                ))}
              </div>
              <div className="mt-3 p-2 rounded text-xs" style={{ background: 'rgba(0,0,0,0.2)', color: 'var(--steel)' }}>
                Formula: score = (white_frac × 250 + green_frac × 400 + brown_frac × 300), capped at 100.
                Thresholds are colour-space approximations, not validated on battery failure data.
                <br /><strong>This does NOT confirm electrolyte chemistry or internal battery damage.</strong>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
