import { BufferAttribute, BufferGeometry } from "three";

export function createBrilliantCut({
  segments = 8,
  tableRadius = 0.54,
  tableHeight = 0.3,
  girdleRadius = 1,
  girdleScallop = 0.05,
  pavilionDepth = 1.02,
} = {}): BufferGeometry {
  const positions: number[] = [];

  const push = (x: number, y: number, z: number) => {
    positions.push(x, y, z);
  };

  const table: [number, number, number][] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    table.push([
      Math.cos(angle) * tableRadius,
      tableHeight,
      Math.sin(angle) * tableRadius,
    ]);
  }

  const girdleCount = segments * 2;
  const girdle: [number, number, number][] = [];
  for (let j = 0; j < girdleCount; j++) {
    const angle = (j / girdleCount) * Math.PI * 2;
    girdle.push([
      Math.cos(angle) * girdleRadius,
      j % 2 === 0 ? girdleScallop : -girdleScallop,
      Math.sin(angle) * girdleRadius,
    ]);
  }

  const culet: [number, number, number] = [0, -pavilionDepth, 0];
  const tableCentre: [number, number, number] = [0, tableHeight, 0];

  const tri = (
    a: [number, number, number],
    b: [number, number, number],
    c: [number, number, number]
  ) => {
    push(...a);
    push(...b);
    push(...c);
  };

  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;

    tri(tableCentre, table[next], table[i]);

    const g0 = girdle[(i * 2) % girdleCount];
    const g1 = girdle[(i * 2 + 1) % girdleCount];
    const g2 = girdle[(i * 2 + 2) % girdleCount];

    tri(table[i], g0, g1);
    tri(table[i], g1, table[next]);
    tri(table[next], g1, g2);
  }

  for (let j = 0; j < girdleCount; j++) {
    const next = (j + 1) % girdleCount;
    tri(girdle[j], culet, girdle[next]);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), 3)
  );
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  return geometry;
}
