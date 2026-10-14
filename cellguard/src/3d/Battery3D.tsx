import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  OrbitControls, PerspectiveCamera, Environment,
  Html, Text, useHelper,
} from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../stores/appStore';
import type { Assessment } from '../types';

// ─── Colors ────────────────────────────────────────────────
const C = {
  body:      new THREE.Color('#1E3A5F'),
  bodySheen: new THREE.Color('#2A4F7F'),
  terminal:  new THREE.Color('#C0C0C0'),
  termPos:   new THREE.Color('#E8C040'),
  termNeg:   new THREE.Color('#888888'),
  tray:      new THREE.Color('#0A1A2E'),
  sensor:    new THREE.Color('#35D5F2'),
  highlight: new THREE.Color('#35D5F2'),
  warn:      new THREE.Color('#F59E0B'),
  danger:    new THREE.Color('#EF4444'),
  good:      new THREE.Color('#2DD4BF'),
  normal:    new THREE.Color('#1E3A5F'),
  inactive:  new THREE.Color('#0D1B2A'),
};

// ─── State-driven highlight color ──────────────────────────
function stateColor(assessment: Assessment | null) {
  if (!assessment) return C.normal;
  switch (assessment.severity) {
    case 'critical': return C.danger;
    case 'warning':  return C.warn;
    case 'normal':   return C.good;
    default:         return C.inactive;
  }
}

// ─── Battery Body ───────────────────────────────────────────
function BatteryBody({ selected, onClick, assessment }: {
  selected: boolean;
  onClick: () => void;
  assessment: Assessment | null;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = selected ? C.highlight : C.body;

  useFrame((_, delta) => {
    if (meshRef.current && selected) {
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <group>
      {/* Main cylindrical body */}
      <mesh ref={meshRef} onClick={onClick} castShadow receiveShadow position={[0, 0, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 2.8, 32, 1]} />
        <meshStandardMaterial
          color={color}
          metalness={0.6}
          roughness={0.35}
          envMapIntensity={0.8}
        />
      </mesh>
      {/* Insulating ring top */}
      <mesh position={[0, 1.42, 0]}>
        <cylinderGeometry args={[0.56, 0.56, 0.04, 32]} />
        <meshStandardMaterial color="#1A1A1A" metalness={0.1} roughness={0.8} />
      </mesh>
      {/* Label area overlay */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.551, 0.551, 2.2, 32]} />
        <meshStandardMaterial
          color={new THREE.Color('#0E2A45')}
          metalness={0.1}
          roughness={0.7}
          transparent
          opacity={0.9}
        />
      </mesh>
    </group>
  );
}

// ─── Terminals ─────────────────────────────────────────────
function Terminals({ selected, onClick }: { selected: boolean; onClick: () => void }) {
  return (
    <group>
      {/* Positive terminal nub */}
      <mesh position={[0, 1.54, 0]} onClick={onClick} castShadow>
        <cylinderGeometry args={[0.15, 0.2, 0.14, 24]} />
        <meshStandardMaterial color={selected ? C.highlight : C.termPos} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Negative flat plate */}
      <mesh position={[0, -1.44, 0]} onClick={onClick}>
        <cylinderGeometry args={[0.54, 0.54, 0.02, 32]} />
        <meshStandardMaterial color={selected ? C.highlight : C.termNeg} metalness={0.9} roughness={0.15} />
      </mesh>
      {/* Terminal labels */}
      <Html position={[0.7, 1.54, 0]} center style={{ pointerEvents: 'none' }}>
        <div style={{ color: '#F59E0B', fontSize: '10px', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>＋</div>
      </Html>
      <Html position={[0.7, -1.44, 0]} center style={{ pointerEvents: 'none' }}>
        <div style={{ color: '#888', fontSize: '10px', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>－</div>
      </Html>
    </group>
  );
}

// ─── Collection Tray ────────────────────────────────────────
function CollectionTray({ selected, onClick, wet }: {
  selected: boolean;
  onClick: () => void;
  wet: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const trayWet = wet > 0.1;
  const color = selected ? C.highlight : trayWet ? C.warn : C.tray;

  useFrame((state) => {
    if (ref.current && trayWet) {
      const mat = ref.current.material as THREE.MeshStandardMaterial;
      if (mat && 'opacity' in mat) {
        mat.opacity = 0.5 + 0.15 * Math.sin(state.clock.elapsedTime * 2);
      }
    }
  });

  return (
    <group position={[0, -2.1, 0]}>
      {/* Tray walls */}
      <mesh onClick={onClick} receiveShadow>
        <boxGeometry args={[1.4, 0.2, 1.4]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.7} transparent opacity={0.85} />
      </mesh>
      {/* Liquid visualization (only when wet) */}
      {trayWet && (
        <mesh ref={ref} position={[0, 0.06, 0]}>
          <boxGeometry args={[1.25, 0.05, 1.25]} />
          <meshStandardMaterial
            color={C.warn}
            metalness={0}
            roughness={0.1}
            transparent
            opacity={0.5}
            emissive={C.warn}
            emissiveIntensity={0.3}
          />
        </mesh>
      )}
      {/* Label */}
      <Html position={[0, 0.3, 0.8]} center style={{ pointerEvents: 'none' }}>
        <div style={{ color: trayWet ? '#F59E0B' : '#4A6580', fontSize: '9px', fontWeight: 600, fontFamily: 'JetBrains Mono', whiteSpace: 'nowrap' }}>
          {trayWet ? '⚠ COLLECTION TRAY — MOISTURE DETECTED' : 'COLLECTION TRAY'}
        </div>
      </Html>
    </group>
  );
}

// ─── Sensor Marker ──────────────────────────────────────────
function SensorMarker({ position, label, value, color, selected, onClick }: {
  position: [number, number, number];
  label: string;
  value: string;
  color: THREE.Color;
  selected: boolean;
  onClick: () => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime;
      const s = 1 + 0.08 * Math.sin(state.clock.elapsedTime * 2.5);
      ref.current.scale.setScalar(selected ? s * 1.3 : s);
    }
  });

  return (
    <group position={position}>
      <mesh ref={ref} onClick={onClick}>
        <octahedronGeometry args={[0.1, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={selected ? 0.8 : 0.4}
          metalness={0.5}
          roughness={0.2}
        />
      </mesh>
      {/* Connector line to body */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[position[0] > 0 ? -0.15 : 0.15, 0, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.3, 8]} />
        <meshStandardMaterial color={color} transparent opacity={0.4} />
      </mesh>
      <Html position={[0.5, 0, 0]} center style={{ pointerEvents: 'none' }}>
        <div style={{
          background: 'rgba(7,17,31,0.9)',
          border: `1px solid ${color.getStyle()}`,
          borderRadius: '4px',
          padding: '2px 6px',
          whiteSpace: 'nowrap',
          fontSize: '9px',
          fontFamily: 'JetBrains Mono',
          color: color.getStyle(),
        }}>
          <div style={{ fontWeight: 700 }}>{label}</div>
          <div style={{ color: '#CBD5E1' }}>{value}</div>
        </div>
      </Html>
    </group>
  );
}

// ─── Ambient / point lights ─────────────────────────────────
function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.4} color="#1A3A5F" />
      <directionalLight position={[5, 8, 5]} intensity={1.2} color="#DDEEFF" castShadow
        shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-3, 2, 2]} intensity={0.6} color="#35D5F2" />
      <pointLight position={[3, -2, -2]} intensity={0.3} color="#3977F6" />
    </>
  );
}

// ─── Main Battery Scene ─────────────────────────────────────
function BatteryScene({
  onSelectComponent,
  selectedComponent,
}: {
  onSelectComponent: (c: string) => void;
  selectedComponent: string | null;
}) {
  const { latestReading, latestAssessment } = useAppStore();
  const wet = latestReading?.wetScore ?? 0;
  const busV = latestReading?.busVoltage_V;
  const temp = latestReading?.temperature_C;
  const hum = latestReading?.humidity_pct;

  const inaColor = latestAssessment?.evidenceItems.find(e => e.category === 'electrical' && e.triggered)
    ? C.warn : C.sensor;
  const yl83Color = wet > 0.1 ? C.warn : wet > 0.25 ? C.danger : C.good;
  const dhtColor = (hum !== null && hum !== undefined && hum > 75) ? C.warn : C.sensor;

  return (
    <group>
      <SceneLighting />

      <BatteryBody
        selected={selectedComponent === 'body'}
        onClick={() => onSelectComponent('body')}
        assessment={latestAssessment}
      />

      <Terminals
        selected={selectedComponent === 'terminals'}
        onClick={() => onSelectComponent('terminals')}
      />

      <CollectionTray
        selected={selectedComponent === 'tray'}
        onClick={() => onSelectComponent('tray')}
        wet={wet}
      />

      {/* INA219 sensor marker */}
      <SensorMarker
        position={[0.75, 0.6, 0]}
        label="INA219"
        value={busV !== null && busV !== undefined ? `${busV.toFixed(3)}V` : 'N/A'}
        color={inaColor}
        selected={selectedComponent === 'ina219'}
        onClick={() => onSelectComponent('ina219')}
      />

      {/* YL-83 sensor marker */}
      <SensorMarker
        position={[0.75, -0.4, 0]}
        label="YL-83"
        value={wet !== null ? `${(wet * 100).toFixed(1)}%` : 'N/A'}
        color={yl83Color}
        selected={selectedComponent === 'yl83'}
        onClick={() => onSelectComponent('yl83')}
      />

      {/* DHT22 sensor marker */}
      <SensorMarker
        position={[0.75, 1.2, 0]}
        label="DHT22"
        value={temp !== null && temp !== undefined ? `${temp.toFixed(1)}°C` : 'N/A'}
        color={dhtColor}
        selected={selectedComponent === 'dht22'}
        onClick={() => onSelectComponent('dht22')}
      />

      {/* Subtle floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, 0]} receiveShadow>
        <planeGeometry args={[6, 6]} />
        <meshStandardMaterial color="#060E1C" metalness={0.2} roughness={0.9} transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

// ─── Info Panel ─────────────────────────────────────────────
const COMPONENT_INFO: Record<string, { title: string; desc: string; specs: string[] }> = {
  body: {
    title: 'Battery Casing',
    desc: 'Outer polymer/metal casing enclosing the electrochemical cell. Inspect exterior for deformation, residue, or discoloration.',
    specs: ['Material: Steel/Polymer', 'Inspect: Exterior only', 'Scientific limit: Internal state cannot be measured by current sensors'],
  },
  terminals: {
    title: 'Battery Terminals',
    desc: 'Positive (+) nub and negative (−) plate. Corrosion, white powder, or green residue indicates electrolyte leakage.',
    specs: ['Positive: +V terminal', 'Negative: Ground plate', 'INA219 measures across these terminals'],
  },
  tray: {
    title: 'Moisture Collection Tray',
    desc: 'Catches any leaked electrolyte or external liquid. The YL-83 sensor probe sits in the tray.',
    specs: ['YL-83 ADC reading reflects tray wetness', 'Wet detection: YL-83 analog output drops when wet', 'Calibrate: Record dry vs. intentional wet reference'],
  },
  ina219: {
    title: 'INA219 Voltage Monitor',
    desc: 'Measures bus voltage and shunt voltage over I²C. Mounted at GPIO 21 (SDA) / 22 (SCL).',
    specs: ['I²C address: 0x40', 'SDA: GPIO 21, SCL: GPIO 22', 'Current: requires calibrated 0.1Ω shunt', 'Bus range: 0–26V, Shunt: ±320mV'],
  },
  yl83: {
    title: 'YL-83 Moisture Sensor',
    desc: 'Rain/liquid detection module. Analog output (GPIO 34) drops as conductivity between probes increases.',
    specs: ['ADC pin: GPIO 34 (ADC1)', 'VCC pin: GPIO 25 (pulsed)', 'Range: 0–4095 (dry = high)', 'Requires dry/wet calibration before use'],
  },
  dht22: {
    title: 'DHT22 Temperature & Humidity',
    desc: 'Measures ambient temperature and relative humidity. Used as environmental context, not proof of leakage.',
    specs: ['Data pin: GPIO 4', 'Range: -40°C to 80°C, 0–100% RH', 'High humidity may indicate condensation risk', 'NOT a leak sensor by itself'],
  },
};

function InfoPanel({ component, onClose }: { component: string; onClose: () => void }) {
  const info = COMPONENT_INFO[component];
  if (!info) return null;
  return (
    <div
      className="absolute bottom-4 left-4 right-4 rounded-lg p-3 animate-slide-in"
      style={{
        background: 'rgba(13,27,42,0.95)',
        border: '1px solid rgba(53,213,242,0.25)',
        backdropFilter: 'blur(12px)',
        maxWidth: '360px',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-cyan">{info.title}</span>
        <button onClick={onClose} className="text-xs btn-ghost px-1">✕</button>
      </div>
      <p className="text-xs mb-2" style={{ color: '#94A3B8' }}>{info.desc}</p>
      <ul className="space-y-1">
        {info.specs.map((s, i) => (
          <li key={i} className="flex items-start gap-1.5 text-xs" style={{ color: 'var(--steel)' }}>
            <span className="text-cyan shrink-0">›</span>{s}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Legend ─────────────────────────────────────────────────
function Legend() {
  return (
    <div
      className="absolute top-4 right-4 rounded p-2 text-xs space-y-1"
      style={{ background: 'rgba(13,27,42,0.85)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="label-muted mb-1" style={{ fontSize: '8px' }}>SENSOR STATE</div>
      {[
        { color: '#2DD4BF', label: 'Normal' },
        { color: '#F59E0B', label: 'Warning' },
        { color: '#EF4444', label: 'Critical' },
        { color: '#4A6580', label: 'Unavailable' },
      ].map(({ color, label }) => (
        <div key={label} className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: color }} />
          <span style={{ color: '#94A3B8' }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Battery3D (exported) ───────────────────────────────────
interface Battery3DProps {
  height?: number;
  showControls?: boolean;
}

export default function Battery3D({ height = 400, showControls = true }: Battery3DProps) {
  const { selectedComponent, setSelectedComponent } = useAppStore();
  const [wireframe, setWireframe] = useState(false);

  return (
    <div className="relative rounded-lg overflow-hidden" style={{ height, background: '#060E1C', border: '1px solid rgba(53,213,242,0.1)' }}>
      <Canvas shadows dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
        <PerspectiveCamera makeDefault position={[3, 1.5, 4]} fov={45} />
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={2}
          maxDistance={10}
          target={[0, 0, 0]}
        />
        <fog attach="fog" args={['#060E1C', 8, 18]} />
        <BatteryScene
          onSelectComponent={setSelectedComponent}
          selectedComponent={selectedComponent}
        />
      </Canvas>

      {/* Controls bar */}
      {showControls && (
        <div
          className="absolute top-3 left-3 flex gap-1"
          style={{ zIndex: 10 }}
        >
          <button
            onClick={() => setSelectedComponent(null)}
            className="btn-ghost text-xs px-2 py-1 rounded"
            style={{ background: 'rgba(13,27,42,0.85)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Reset View
          </button>
          <button
            onClick={() => setWireframe(w => !w)}
            className="btn-ghost text-xs px-2 py-1 rounded"
            style={{ background: 'rgba(13,27,42,0.85)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {wireframe ? 'Solid' : 'Wireframe'}
          </button>
        </div>
      )}

      <Legend />

      {selectedComponent && (
        <InfoPanel component={selectedComponent} onClose={() => setSelectedComponent(null)} />
      )}

      {/* Source note */}
      <div
        className="absolute bottom-3 right-3 text-xs"
        style={{ color: 'var(--steel)', fontSize: '9px' }}
      >
        ℹ Conceptual model — internal chemistry not measurable by current sensors
      </div>
    </div>
  );
}
