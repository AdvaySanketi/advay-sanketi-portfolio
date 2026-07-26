/**
 * Removes any mesh above a vertex budget from a GLB.
 *
 * Written for the saturn model, whose "particle ring" is ~300k disconnected
 * pebbles (3.2M vertices) that no simplifier can collapse — the model keeps
 * a separate, sane ring mesh, so the heavy one can simply go.
 *
 * Usage: node tools/strip-heavy.mjs <in.glb> <out.glb> [vertexLimit=500000]
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { prune } from "@gltf-transform/functions";

const [input, output, limitArg] = process.argv.slice(2);
if (!input || !output) {
  console.error("usage: node tools/strip-heavy.mjs <in.glb> <out.glb> [limit]");
  process.exit(1);
}
const limit = Number(limitArg ?? 500000);

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(input);

for (const mesh of doc.getRoot().listMeshes()) {
  const count = mesh
    .listPrimitives()
    .reduce(
      (sum, prim) => sum + (prim.getAttribute("POSITION")?.getCount() ?? 0),
      0
    );
  if (count > limit) {
    console.log(`stripping mesh "${mesh.getName()}" (${count} vertices)`);
    mesh.dispose();
  }
}

await doc.transform(prune());
await io.write(output, doc);
console.log(`wrote ${output}`);
