export interface MatchingConfig {
  algorithm: "icp" | "feature" | "hybrid"
  tolerance: number
  maxIterations: number
  enableRefinement: boolean
  matchThreshold: number
  useNormals: boolean
  scaleTolerance: number
  rotationTolerance: number
}

export interface MatchResult {
  id: string
  sourcePoint: { id: string; position: [number, number, number] }
  targetGeometry: {
    vertices: Float32Array
    faces: Uint32Array
    transform: number[]
  }
  confidence: number
  matchType: "exact" | "approximate" | "scaled"
  transformMatrix: number[]
  boundingBox: {
    min: [number, number, number]
    max: [number, number, number]
  }
}

export interface ExportConfig {
  includeOriginal: boolean
  includeMatches: boolean
  includePoints: boolean
  mergeGeometry: boolean
  format: "stl" | "obj" | "ply"
  quality: "low" | "medium" | "high"
}

// Shape library - predefined dental components
const DENTAL_SHAPES = {
  "hs-cap-small": {
    vertices: new Float32Array([
      // Simplified crown geometry for HS Cap Small
      -0.4,
      0,
      -0.4,
      0.4,
      0,
      -0.4,
      0.4,
      0,
      0.4,
      -0.4,
      0,
      0.4, // base
      -0.3,
      1.2,
      -0.3,
      0.3,
      1.2,
      -0.3,
      0.3,
      1.2,
      0.3,
      -0.3,
      1.2,
      0.3, // top
      -0.2,
      1.8,
      -0.2,
      0.2,
      1.8,
      -0.2,
      0.2,
      1.8,
      0.2,
      -0.2,
      1.8,
      0.2, // crown
    ]),
    faces: new Uint32Array([
      // Base faces
      0, 1, 2, 0, 2, 3,
      // Side faces
      0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0,
      // Top transition
      4, 8, 9, 4, 9, 5, 5, 9, 10, 5, 10, 6, 6, 10, 11, 6, 11, 7, 7, 11, 8, 7, 8, 4,
      // Crown top
      8, 9, 10, 8, 10, 11,
    ]),
    boundingBox: {
      min: [-0.4, 0, -0.4],
      max: [0.4, 1.8, 0.4],
    },
  },
  "hs-cap": {
    vertices: new Float32Array([
      // Simplified crown geometry for HS Cap (larger)
      -0.5,
      0,
      -0.5,
      0.5,
      0,
      -0.5,
      0.5,
      0,
      0.5,
      -0.5,
      0,
      0.5, // base
      -0.4,
      1.5,
      -0.4,
      0.4,
      1.5,
      -0.4,
      0.4,
      1.5,
      0.4,
      -0.4,
      1.5,
      0.4, // top
      -0.25,
      2.2,
      -0.25,
      0.25,
      2.2,
      -0.25,
      0.25,
      2.2,
      0.25,
      -0.25,
      2.2,
      0.25, // crown
    ]),
    faces: new Uint32Array([
      // Base faces
      0, 1, 2, 0, 2, 3,
      // Side faces
      0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0,
      // Top transition
      4, 8, 9, 4, 9, 5, 5, 9, 10, 5, 10, 6, 6, 10, 11, 6, 11, 7, 7, 11, 8, 7, 8, 4,
      // Crown top
      8, 9, 10, 8, 10, 11,
    ]),
    boundingBox: {
      min: [-0.5, 0, -0.5],
      max: [0.5, 2.2, 0.5],
    },
  },
}

export async function performShapeMatching(
  selectedPoints: Array<{ id: string; position: [number, number, number]; type: string; timestamp: number }>,
  originalGeometry: ArrayBuffer | null,
  config: MatchingConfig,
): Promise<MatchResult[]> {
  const results: MatchResult[] = []

  for (const point of selectedPoints) {
    const shapeTemplate = DENTAL_SHAPES[point.type as keyof typeof DENTAL_SHAPES]
    if (!shapeTemplate) continue

    // Simulate shape matching algorithm
    const confidence = Math.random() * 0.4 + 0.6 // 0.6 to 1.0
    const matchType = confidence > 0.9 ? "exact" : confidence > 0.75 ? "approximate" : "scaled"

    // Generate transform matrix (translation to point position)
    const transformMatrix = [
      1,
      0,
      0,
      point.position[0],
      0,
      1,
      0,
      point.position[1],
      0,
      0,
      1,
      point.position[2],
      0,
      0,
      0,
      1,
    ]

    // Apply transform to vertices
    const transformedVertices = new Float32Array(shapeTemplate.vertices.length)
    for (let i = 0; i < shapeTemplate.vertices.length; i += 3) {
      transformedVertices[i] = shapeTemplate.vertices[i] + point.position[0]
      transformedVertices[i + 1] = shapeTemplate.vertices[i + 1] + point.position[1]
      transformedVertices[i + 2] = shapeTemplate.vertices[i + 2] + point.position[2]
    }

    // Calculate transformed bounding box
    const transformedBoundingBox = {
      min: [
        shapeTemplate.boundingBox.min[0] + point.position[0],
        shapeTemplate.boundingBox.min[1] + point.position[1],
        shapeTemplate.boundingBox.min[2] + point.position[2],
      ] as [number, number, number],
      max: [
        shapeTemplate.boundingBox.max[0] + point.position[0],
        shapeTemplate.boundingBox.max[1] + point.position[1],
        shapeTemplate.boundingBox.max[2] + point.position[2],
      ] as [number, number, number],
    }

    results.push({
      id: `match_${point.id}_${Date.now()}`,
      sourcePoint: point,
      targetGeometry: {
        vertices: transformedVertices,
        faces: shapeTemplate.faces,
        transform: transformMatrix,
      },
      confidence,
      matchType,
      transformMatrix,
      boundingBox: transformedBoundingBox,
    })
  }

  return results
}

export function generateMatchedSceneSTL(
  matches: MatchResult[],
  originalGeometry: ArrayBuffer | null,
  selectedPoints: Array<{ id: string; position: [number, number, number]; type: string; timestamp: number }>,
  config: ExportConfig,
): string {
  let content = "solid MatchedScene\n"

  // Add metadata
  content += `# Generated by Scan Ladder - Shape Matching Export\n`
  content += `# Export Date: ${new Date().toISOString()}\n`
  content += `# Matches: ${matches.length}\n`
  content += `# Original Points: ${selectedPoints.length}\n`
  content += `# Configuration: ${JSON.stringify(config)}\n`

  // Include original geometry placeholder
  if (config.includeOriginal && originalGeometry) {
    content += `# Original geometry would be included here\n`
    content += `# Original file size: ${originalGeometry.byteLength} bytes\n`
  }

  // Include matched shapes
  if (config.includeMatches) {
    matches.forEach((match, index) => {
      content += `# Match ${index + 1}: ${match.matchType} (confidence: ${(match.confidence * 100).toFixed(1)}%)\n`

      const vertices = match.targetGeometry.vertices
      const faces = match.targetGeometry.faces

      // Generate triangular faces from the geometry
      for (let i = 0; i < faces.length; i += 3) {
        const v1Index = faces[i] * 3
        const v2Index = faces[i + 1] * 3
        const v3Index = faces[i + 2] * 3

        const v1 = [vertices[v1Index], vertices[v1Index + 1], vertices[v1Index + 2]]
        const v2 = [vertices[v2Index], vertices[v2Index + 1], vertices[v2Index + 2]]
        const v3 = [vertices[v3Index], vertices[v3Index + 1], vertices[v3Index + 2]]

        // Calculate normal
        const edge1 = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]]
        const edge2 = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]]
        const normal = [
          edge1[1] * edge2[2] - edge1[2] * edge2[1],
          edge1[2] * edge2[0] - edge1[0] * edge2[2],
          edge1[0] * edge2[1] - edge1[1] * edge2[0],
        ]

        // Normalize
        const length = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2])
        if (length > 0) {
          normal[0] /= length
          normal[1] /= length
          normal[2] /= length
        }

        content += `  facet normal ${normal[0].toFixed(6)} ${normal[1].toFixed(6)} ${normal[2].toFixed(6)}\n`
        content += `    outer loop\n`
        content += `      vertex ${v1[0].toFixed(6)} ${v1[1].toFixed(6)} ${v1[2].toFixed(6)}\n`
        content += `      vertex ${v2[0].toFixed(6)} ${v2[1].toFixed(6)} ${v2[2].toFixed(6)}\n`
        content += `      vertex ${v3[0].toFixed(6)} ${v3[1].toFixed(6)} ${v3[2].toFixed(6)}\n`
        content += `    endloop\n`
        content += `  endfacet\n`
      }
    })
  }

  // Include selection points as cylinders
  if (config.includePoints) {
    selectedPoints.forEach((point, index) => {
      const [x, y, z] = point.position
      const radius = point.type === "hs-cap-small" ? 0.1 : 0.15
      const height = 0.3
      const segments = config.quality === "high" ? 12 : config.quality === "medium" ? 8 : 6

      content += `# Selection Point ${index + 1}\n`

      // Generate cylinder geometry for point markers
      for (let i = 0; i < segments; i++) {
        const angle1 = (i / segments) * Math.PI * 2
        const angle2 = ((i + 1) / segments) * Math.PI * 2

        const x1 = x + Math.cos(angle1) * radius
        const z1 = z + Math.sin(angle1) * radius
        const x2 = x + Math.cos(angle2) * radius
        const z2 = z + Math.sin(angle2) * radius

        // Bottom face
        content += `  facet normal 0.0 -1.0 0.0\n`
        content += `    outer loop\n`
        content += `      vertex ${x.toFixed(6)} ${y.toFixed(6)} ${z.toFixed(6)}\n`
        content += `      vertex ${x1.toFixed(6)} ${y.toFixed(6)} ${z1.toFixed(6)}\n`
        content += `      vertex ${x2.toFixed(6)} ${y.toFixed(6)} ${z2.toFixed(6)}\n`
        content += `    endloop\n`
        content += `  endfacet\n`

        // Top face
        content += `  facet normal 0.0 1.0 0.0\n`
        content += `    outer loop\n`
        content += `      vertex ${x.toFixed(6)} ${(y + height).toFixed(6)} ${z.toFixed(6)}\n`
        content += `      vertex ${x2.toFixed(6)} ${(y + height).toFixed(6)} ${z2.toFixed(6)}\n`
        content += `      vertex ${x1.toFixed(6)} ${(y + height).toFixed(6)} ${z1.toFixed(6)}\n`
        content += `    endloop\n`
        content += `  endfacet\n`

        // Side faces
        const nx = Math.cos((angle1 + angle2) / 2)
        const nz = Math.sin((angle1 + angle2) / 2)

        content += `  facet normal ${nx.toFixed(6)} 0.0 ${nz.toFixed(6)}\n`
        content += `    outer loop\n`
        content += `      vertex ${x1.toFixed(6)} ${y.toFixed(6)} ${z1.toFixed(6)}\n`
        content += `      vertex ${x1.toFixed(6)} ${(y + height).toFixed(6)} ${z1.toFixed(6)}\n`
        content += `      vertex ${x2.toFixed(6)} ${(y + height).toFixed(6)} ${z2.toFixed(6)}\n`
        content += `    endloop\n`
        content += `  endfacet\n`

        content += `  facet normal ${nx.toFixed(6)} 0.0 ${nz.toFixed(6)}\n`
        content += `    outer loop\n`
        content += `      vertex ${x1.toFixed(6)} ${y.toFixed(6)} ${z1.toFixed(6)}\n`
        content += `      vertex ${x2.toFixed(6)} ${(y + height).toFixed(6)} ${z2.toFixed(6)}\n`
        content += `      vertex ${x2.toFixed(6)} ${y.toFixed(6)} ${z2.toFixed(6)}\n`
        content += `    endloop\n`
        content += `  endfacet\n`
      }
    })
  }

  content += "endsolid MatchedScene\n"
  return content
}

export function generateMatchedSceneOBJ(
  matches: MatchResult[],
  originalGeometry: ArrayBuffer | null,
  selectedPoints: Array<{ id: string; position: [number, number, number]; type: string; timestamp: number }>,
  config: ExportConfig,
): string {
  let content = "# OBJ file generated by Scan Ladder - Shape Matching Export\n"
  content += `# Export Date: ${new Date().toISOString()}\n`
  content += `# Matches: ${matches.length}\n`
  content += `# Original Points: ${selectedPoints.length}\n\n`

  let vertexIndex = 1

  // Include matched shapes
  if (config.includeMatches) {
    matches.forEach((match, matchIndex) => {
      content += `# Match ${matchIndex + 1}: ${match.matchType} (confidence: ${(match.confidence * 100).toFixed(1)}%)\n`
      content += `g match_${matchIndex + 1}\n`

      const vertices = match.targetGeometry.vertices
      const faces = match.targetGeometry.faces
      const startVertex = vertexIndex

      // Add vertices
      for (let i = 0; i < vertices.length; i += 3) {
        content += `v ${vertices[i].toFixed(6)} ${vertices[i + 1].toFixed(6)} ${vertices[i + 2].toFixed(6)}\n`
        vertexIndex++
      }

      // Add faces
      for (let i = 0; i < faces.length; i += 3) {
        const f1 = startVertex + faces[i]
        const f2 = startVertex + faces[i + 1]
        const f3 = startVertex + faces[i + 2]
        content += `f ${f1} ${f2} ${f3}\n`
      }

      content += "\n"
    })
  }

  // Include selection points as cylinders
  if (config.includePoints) {
    selectedPoints.forEach((point, pointIndex) => {
      content += `# Selection Point ${pointIndex + 1}\n`
      content += `g point_${pointIndex + 1}\n`

      const [x, y, z] = point.position
      const radius = point.type === "hs-cap-small" ? 0.1 : 0.15
      const height = 0.3
      const segments = config.quality === "high" ? 12 : config.quality === "medium" ? 8 : 6
      const startVertex = vertexIndex

      // Bottom center
      content += `v ${x.toFixed(6)} ${y.toFixed(6)} ${z.toFixed(6)}\n`
      vertexIndex++

      // Top center
      content += `v ${x.toFixed(6)} ${(y + height).toFixed(6)} ${z.toFixed(6)}\n`
      vertexIndex++

      // Bottom circle vertices
      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2
        const vx = x + Math.cos(angle) * radius
        const vz = z + Math.sin(angle) * radius
        content += `v ${vx.toFixed(6)} ${y.toFixed(6)} ${vz.toFixed(6)}\n`
        vertexIndex++
      }

      // Top circle vertices
      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2
        const vx = x + Math.cos(angle) * radius
        const vz = z + Math.sin(angle) * radius
        content += `v ${vx.toFixed(6)} ${(y + height).toFixed(6)} ${vz.toFixed(6)}\n`
        vertexIndex++
      }

      // Generate faces
      // Bottom faces
      for (let i = 0; i < segments; i++) {
        const next = (i + 1) % segments
        content += `f ${startVertex} ${startVertex + 2 + i} ${startVertex + 2 + next}\n`
      }

      // Top faces
      for (let i = 0; i < segments; i++) {
        const next = (i + 1) % segments
        content += `f ${startVertex + 1} ${startVertex + 2 + segments + next} ${startVertex + 2 + segments + i}\n`
      }

      // Side faces
      for (let i = 0; i < segments; i++) {
        const next = (i + 1) % segments
        const b1 = startVertex + 2 + i
        const b2 = startVertex + 2 + next
        const t1 = startVertex + 2 + segments + i
        const t2 = startVertex + 2 + segments + next

        content += `f ${b1} ${t1} ${t2}\n`
        content += `f ${b1} ${t2} ${b2}\n`
      }

      content += "\n"
    })
  }

  return content
}
