"""Export a web-ready .glb from a pipeline output mesh.

Run this in the FYP environment (needs open3d + trimesh, both already
used by the dissertation pipeline):

    python tools/export_web_mesh.py vessel_surface_pipelineA.ply models/vessel.glb

Decimates to ~60k triangles (visually identical at portfolio-card size)
and exports a binary glTF the site's mesh viewer loads directly.
"""
import sys

import numpy as np
import open3d as o3d
import trimesh

TARGET_TRIANGLES = 60_000

def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    src, dst = sys.argv[1], sys.argv[2]

    mesh = o3d.io.read_triangle_mesh(src)
    mesh.remove_degenerate_triangles()
    mesh.remove_duplicated_triangles()
    mesh.remove_unreferenced_vertices()

    tris = np.asarray(mesh.triangles).shape[0]
    if tris > TARGET_TRIANGLES:
        mesh = mesh.simplify_quadric_decimation(
            target_number_of_triangles=TARGET_TRIANGLES)
    mesh.compute_vertex_normals()

    tm = trimesh.Trimesh(
        vertices=np.asarray(mesh.vertices),
        faces=np.asarray(mesh.triangles),
        vertex_normals=np.asarray(mesh.vertex_normals),
        process=False,
    )
    tm.export(dst)
    print(f"{src}: {tris} tris -> {dst}: {len(tm.faces)} tris")

if __name__ == "__main__":
    main()
