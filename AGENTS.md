# Architecture rules
- Render the knowledge graph through a dedicated React Three Fiber viewer; keep graph fetching, filters and the existing inspector in the page to preserve the API contract.
- Use a deterministic procedural brain-shaped network scaffold, separate from real knowledge nodes and links, so sparse graphs retain a recognizable silhouette without inventing user data.
- Batch graph spheres and connections using instanced meshes and buffer geometry to keep draw calls independent of graph size.