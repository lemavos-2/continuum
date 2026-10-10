import { Component, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef, type ReactNode } from 'react';
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import { Environment, Html, Lightformer, OrbitControls } from '@react-three/drei';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { createBrainScaffold, layoutBrainNodes, type BrainLink, type BrainNode, type Point3 } from '@/lib/brain-layout';

export interface BrainGraphHandle { zoom: (direction: number) => void; reset: () => void; enter: () => void }
interface Props {
  nodes: BrainNode[];
  links: BrainLink[];
  selectedId: string | null;
  highlightedIds: Set<string> | null;
  showEdges: boolean;
  showLabels: boolean;
  inside: boolean;
  theme: string;
  unavailableText: string;
  onSelect: (node: BrainNode) => void;
  onOpen: (node: BrainNode) => void;
  onClear: () => void;
}
interface Palette { node: string; muted: string; background: string }

function segments(points: Point3[], links: [number, number][]) {
  return new Float32Array(links.flatMap(([a, b]) => [...points[a], ...points[b]]));
}

function Scaffold({ palette, inside }: { palette: Palette; inside: boolean }) {
  const scaffold = useMemo(() => createBrainScaffold(), []);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const positions = useMemo(() => segments(scaffold.points, scaffold.links), [scaffold]);
  useEffect(() => {
    if (!mesh.current) return;
    const dummy = new THREE.Object3D();
    scaffold.points.forEach((point, index) => {
      dummy.position.set(...point);
      dummy.scale.setScalar(index % 11 === 0 ? 0.045 : 0.022);
      dummy.updateMatrix();
      mesh.current?.setMatrixAt(index, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [scaffold]);
  return <group>
    <instancedMesh ref={mesh} args={[undefined, undefined, scaffold.points.length]} raycast={() => null}>
      <sphereGeometry args={[1, 8, 6]} />
      <meshBasicMaterial color={palette.node} transparent opacity={inside ? 0.12 : 0.4} depthWrite={false} />
    </instancedMesh>
    <lineSegments raycast={() => null}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
      <lineBasicMaterial color={palette.node} transparent opacity={inside ? 0.055 : 0.16} depthWrite={false} />
    </lineSegments>
  </group>;
}

function Network({ positions, palette, ...props }: Props & { positions: Map<string, Point3>; palette: Palette }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const active = props.nodes.find(n => n.id === (hovered ?? props.selectedId));
  const colors = useMemo(() => [new THREE.Color(palette.node), new THREE.Color(palette.muted)], [palette]);
  useEffect(() => {
    const instances = mesh.current;
    if (!instances) return;
    const dummy = new THREE.Object3D();
    const degree = new Map<string, number>();
    props.links.forEach(l => {
      degree.set(l.source, (degree.get(l.source) ?? 0) + 1);
      degree.set(l.target, (degree.get(l.target) ?? 0) + 1);
    });
    props.nodes.forEach((node, index) => {
      const point = positions.get(node.id);
      if (!point) return;
      const highlighted = !props.highlightedIds || props.highlightedIds.has(node.id);
      const selected = node.id === props.selectedId || node.id === hovered;
      dummy.position.set(...point);
      const size = 0.065 + Math.min(0.06, (degree.get(node.id) ?? 0) * 0.009);
      dummy.scale.setScalar(size * (selected ? 1.4 : highlighted ? 1 : 0.65));
      dummy.updateMatrix();
      instances.setMatrixAt(index, dummy.matrix);
      instances.setColorAt(index, colors[highlighted ? 0 : 1]);
    });
    instances.instanceMatrix.needsUpdate = true;
    if (instances.instanceColor) instances.instanceColor.needsUpdate = true;
    instances.computeBoundingSphere();
  }, [props.nodes, props.links, props.selectedId, props.highlightedIds, positions, hovered, colors]);
  const edgePositions = useMemo(() => {
    const normal: number[] = [], focused: number[] = [];
    for (const link of props.links) {
      const a = positions.get(link.source), b = positions.get(link.target);
      if (!a || !b) continue;
      const target = props.selectedId && (link.source === props.selectedId || link.target === props.selectedId) ? focused : normal;
      target.push(...a, ...b);
    }
    return [new Float32Array(normal), new Float32Array(focused)];
  }, [props.links, props.selectedId, positions]);
  const nodeAt = (e: ThreeEvent<PointerEvent | MouseEvent>) => e.instanceId === undefined ? undefined : props.nodes[e.instanceId];
  return <>
    {props.showEdges && edgePositions.map((array, index) => <lineSegments key={index} raycast={() => null}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[array, 3]} /></bufferGeometry>
      <lineBasicMaterial color={palette.node} transparent opacity={index === 1 ? 0.95 : props.selectedId ? 0.12 : 0.42} depthWrite={false} />
    </lineSegments>)}
    <instancedMesh ref={mesh} args={[undefined, undefined, props.nodes.length]}
      onClick={e => { if (e.delta > 5) return; const node = nodeAt(e); if (node) { e.stopPropagation(); props.onSelect(node); } }}
      onDoubleClick={e => { const node = nodeAt(e); if (node) { e.stopPropagation(); props.onOpen(node); } }}
      onPointerOver={e => { e.stopPropagation(); setHovered(nodeAt(e)?.id ?? null); }}
      onPointerMove={e => { e.stopPropagation(); setHovered(nodeAt(e)?.id ?? null); }}
      onPointerOut={() => setHovered(null)}>
      <sphereGeometry args={[1, 16, 12]} />
      <meshStandardMaterial roughness={0.3} metalness={0.18} />
    </instancedMesh>
    {active && props.showLabels && <Html position={positions.get(active.id)} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <div className="pointer-events-none -translate-y-8 max-w-48 truncate rounded-md border border-border/10 bg-popover/95 px-3 py-2 text-xs text-popover-foreground shadow-md">{active.label}</div>
    </Html>}
  </>;
}

const CameraRig = forwardRef<BrainGraphHandle, { inside: boolean }>(function CameraRig({ inside }, ref) {
  const { camera, invalidate, size } = useThree();
  const controls = useRef<OrbitControlsImpl>(null);
  const reset = () => {
    camera.position.set(8, 2.8, size.width < 600 ? 14 : 10);
    controls.current?.target.set(0, -0.25, 0);
    controls.current?.update(); invalidate();
  };
  const enter = () => {
    camera.position.set(0.12, 0.45, 0.95);
    controls.current?.target.set(0, 0.4, -0.4);
    controls.current?.update(); invalidate();
  };
  useEffect(() => { if (inside) enter(); else reset(); }, [inside, size.width]);
  useImperativeHandle(ref, () => ({
    reset, enter,
    zoom(direction) {
      const control = controls.current;
      if (!control) return;
      const offset = camera.position.clone().sub(control.target);
      const distance = THREE.MathUtils.clamp(offset.length() * (direction > 0 ? 0.72 : 1.38), 0.12, 30);
      camera.position.copy(control.target).add(offset.normalize().multiplyScalar(distance));
      control.update(); invalidate();
    },
  }));
  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={0.08} minDistance={0.12} maxDistance={30} zoomSpeed={0.85} rotateSpeed={0.65} enablePan />;
});

class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export const BrainGraph3D = forwardRef<BrainGraphHandle, Props>(function BrainGraph3D(props, ref) {
  const [palette, setPalette] = useState<Palette | null>(null);
  const positions = useMemo(() => layoutBrainNodes(props.nodes), [props.nodes]);
  useEffect(() => {
    const css = getComputedStyle(document.documentElement);
    setPalette({ node: css.getPropertyValue('--graph-node').trim(), muted: css.getPropertyValue('--graph-muted').trim(), background: css.getPropertyValue('--bg-base').trim() });
  }, [props.theme]);
  const fallback = <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-sm text-muted-foreground">{props.unavailableText}</div>;
  if (!palette) return null;
  return <SceneBoundary fallback={fallback}>
    <Canvas className="touch-none" frameloop="demand" dpr={[1, 1.5]} camera={{ position: [8, 2.8, 10], fov: 45, near: 0.015, far: 100 }} gl={{ antialias: true, alpha: false }} fallback={fallback} onPointerMissed={props.onClear}>
      <color attach="background" args={[palette.background]} />
      <ambientLight intensity={1.3} />
      <directionalLight position={[5, 8, 6]} intensity={2} />
      <Environment resolution={64}>
        <Lightformer position={[0, 5, 0]} scale={[10, 10, 1]} intensity={2} />
        <Lightformer position={[-5, 0, 2]} rotation-y={Math.PI / 2} scale={[8, 6, 1]} intensity={1} />
      </Environment>
      <Scaffold palette={palette} inside={props.inside} />
      {props.nodes.length > 0 && <Network {...props} positions={positions} palette={palette} />}
      <CameraRig ref={ref} inside={props.inside} />
    </Canvas>
  </SceneBoundary>;
});