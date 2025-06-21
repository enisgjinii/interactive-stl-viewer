import * as THREE from 'three'

export interface DetectedGeometry {
  id: string
  type: 'sphere' | 'cylinder' | 'cube' | 'cone' | 'flat' | 'complex'
  center: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  confidence: number
  boundingBox: THREE.Box3
  vertices: THREE.Vector3[]
  algorithm: 'icp' | 'feature_extraction' | 'curvature_analysis'
  timestamp: number
}

export interface ICPResult {
  transformation: THREE.Matrix4
  error: number
  iterations: number
  converged: boolean
}

export class GeometryDetector {
  private knownGeometries: Map<string, THREE.BufferGeometry>
  private icpTolerance: number = 0.001
  private maxICPIterations: number = 50

  constructor() {
    this.knownGeometries = new Map()
    this.initializeKnownGeometries()
  }

  private initializeKnownGeometries() {
    // Create reference geometries for matching
    const geometries = [
      { name: 'sphere', geometry: new THREE.SphereGeometry(1, 32, 16) },
      { name: 'cylinder', geometry: new THREE.CylinderGeometry(1, 1, 2, 32) },
      { name: 'cube', geometry: new THREE.BoxGeometry(2, 2, 2) },
      { name: 'cone', geometry: new THREE.ConeGeometry(1, 2, 32) },
    ]

    geometries.forEach(({ name, geometry }) => {
      geometry.computeBoundingBox()
      geometry.computeVertexNormals()
      this.knownGeometries.set(name, geometry)
    })
  }

  /**
   * Detect geometries in a given STL mesh using multiple algorithms
   */
  async detectGeometries(
    mesh: THREE.Mesh,
    options: {
      useICP?: boolean
      useCurvatureAnalysis?: boolean
      useFeatureExtraction?: boolean
      minConfidence?: number
    } = {}
  ): Promise<DetectedGeometry[]> {
    const {
      useICP = true,
      useCurvatureAnalysis = true,
      useFeatureExtraction = true,
      minConfidence = 0.6
    } = options

    const detectedGeometries: DetectedGeometry[] = []

    if (!mesh.geometry) return detectedGeometries

    const vertices = this.extractVertices(mesh.geometry)
    const clusters = await this.clusterVertices(vertices)

    for (const cluster of clusters) {
      // Feature-based detection
      if (useFeatureExtraction) {
        const featureGeometries = this.detectByFeatures(cluster)
        detectedGeometries.push(...featureGeometries)
      }

      // Curvature-based detection
      if (useCurvatureAnalysis) {
        const curvatureGeometries = await this.detectByCurvature(cluster)
        detectedGeometries.push(...curvatureGeometries)
      }

      // ICP-based detection
      if (useICP) {
        const icpGeometries = await this.detectByICP(cluster)
        detectedGeometries.push(...icpGeometries)
      }
    }

    // Filter by confidence and remove duplicates
    return this.filterAndMergeDetections(detectedGeometries, minConfidence)
  }

  /**
   * Extract vertices from BufferGeometry
   */
  private extractVertices(geometry: THREE.BufferGeometry): THREE.Vector3[] {
    const vertices: THREE.Vector3[] = []
    const positionAttribute = geometry.getAttribute('position')
    
    if (positionAttribute) {
      for (let i = 0; i < positionAttribute.count; i++) {
        vertices.push(new THREE.Vector3(
          positionAttribute.getX(i),
          positionAttribute.getY(i),
          positionAttribute.getZ(i)
        ))
      }
    }
    
    return vertices
  }

  /**
   * Cluster vertices into potential geometric regions
   */
  private async clusterVertices(vertices: THREE.Vector3[]): Promise<THREE.Vector3[][]> {
    // Sub-sample very large vertex sets to keep the clustering pass under control
    if (vertices.length > 15000) {
      const step = Math.ceil(vertices.length / 15000)
      vertices = vertices.filter((_, idx) => idx % step === 0)
    }

    // Simple spatial clustering – still O(N²) but with the reduced set it's fast
    const clusters: THREE.Vector3[][] = []
    const clusterRadius = 5.0
    const visited = new Set<number>()

    for (let i = 0; i < vertices.length; i++) {
      if (visited.has(i)) continue

      const cluster: THREE.Vector3[] = []
      const stack = [i]
      
      while (stack.length > 0) {
        const currentIndex = stack.pop()!
        if (visited.has(currentIndex)) continue
        
        visited.add(currentIndex)
        cluster.push(vertices[currentIndex])

        // Find nearby vertices
        for (let j = 0; j < vertices.length; j++) {
          if (!visited.has(j) && vertices[i].distanceTo(vertices[j]) < clusterRadius) {
            stack.push(j)
          }
        }
      }

      if (cluster.length > 100) { // Minimum cluster size
        clusters.push(cluster)
      }
    }

    return clusters
  }

  /**
   * Detect geometries using feature analysis
   */
  private detectByFeatures(vertices: THREE.Vector3[]): DetectedGeometry[] {
    const detections: DetectedGeometry[] = []
    
    // Calculate bounding box
    const boundingBox = new THREE.Box3().setFromPoints(vertices)
    const center = boundingBox.getCenter(new THREE.Vector3())
    const size = boundingBox.getSize(new THREE.Vector3())

    // Sphere detection - check if points are roughly equidistant from center
    const sphereConfidence = this.analyzeSphere(vertices, center)
    if (sphereConfidence > 0.6) {
      detections.push({
        id: `sphere-${Date.now()}-${Math.random()}`,
        type: 'sphere',
        center: [center.x, center.y, center.z],
        rotation: [0, 0, 0],
        scale: [size.x / 2, size.y / 2, size.z / 2],
        confidence: sphereConfidence,
        boundingBox,
        vertices,
        algorithm: 'feature_extraction',
        timestamp: Date.now()
      })
    }

    // Cylinder detection - check for cylindrical patterns
    const cylinderConfidence = this.analyzeCylinder(vertices, boundingBox)
    if (cylinderConfidence > 0.6) {
      detections.push({
        id: `cylinder-${Date.now()}-${Math.random()}`,
        type: 'cylinder',
        center: [center.x, center.y, center.z],
        rotation: [0, 0, 0],
        scale: [size.x / 2, size.y, size.z / 2],
        confidence: cylinderConfidence,
        boundingBox,
        vertices,
        algorithm: 'feature_extraction',
        timestamp: Date.now()
      })
    }

    // Cube detection - check for box-like patterns
    const cubeConfidence = this.analyzeCube(vertices, boundingBox)
    if (cubeConfidence > 0.6) {
      detections.push({
        id: `cube-${Date.now()}-${Math.random()}`,
        type: 'cube',
        center: [center.x, center.y, center.z],
        rotation: [0, 0, 0],
        scale: [size.x / 2, size.y / 2, size.z / 2],
        confidence: cubeConfidence,
        boundingBox,
        vertices,
        algorithm: 'feature_extraction',
        timestamp: Date.now()
      })
    }

    return detections
  }

  /**
   * Analyze if vertices form a sphere
   */
  private analyzeSphere(vertices: THREE.Vector3[], center: THREE.Vector3): number {
    if (vertices.length < 10) return 0

    const distances = vertices.map(v => v.distanceTo(center))
    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length
    const variance = distances.reduce((sum, dist) => sum + Math.pow(dist - avgDistance, 2), 0) / distances.length
    const stdDev = Math.sqrt(variance)
    
    // Lower variance indicates more sphere-like
    const confidence = Math.max(0, 1 - (stdDev / avgDistance) * 2)
    return confidence
  }

  /**
   * Analyze if vertices form a cylinder
   */
  private analyzeCylinder(vertices: THREE.Vector3[], boundingBox: THREE.Box3): number {
    const center = boundingBox.getCenter(new THREE.Vector3())
    const size = boundingBox.getSize(new THREE.Vector3())
    
    // Check aspect ratio (cylinders are typically longer in one dimension)
    const aspectRatios = [size.x / size.y, size.y / size.z, size.z / size.x]
    const maxAspectRatio = Math.max(...aspectRatios)
    const minAspectRatio = Math.min(...aspectRatios)
    
    // Good cylinder should have one dominant axis
    const cylindricalness = maxAspectRatio > 1.5 && minAspectRatio < 1.2 ? 0.8 : 0.3
    
    return cylindricalness
  }

  /**
   * Analyze if vertices form a cube
   */
  private analyzeCube(vertices: THREE.Vector3[], boundingBox: THREE.Box3): number {
    const size = boundingBox.getSize(new THREE.Vector3())
    
    // Check if dimensions are roughly equal (cube-like)
    const ratioXY = Math.min(size.x, size.y) / Math.max(size.x, size.y)
    const ratioYZ = Math.min(size.y, size.z) / Math.max(size.y, size.z)
    const ratioZX = Math.min(size.z, size.x) / Math.max(size.z, size.x)
    
    const avgRatio = (ratioXY + ratioYZ + ratioZX) / 3
    return avgRatio // Higher ratio means more cube-like
  }

  /**
   * Detect geometries using curvature analysis
   */
  private async detectByCurvature(vertices: THREE.Vector3[]): Promise<DetectedGeometry[]> {
    // Simplified curvature analysis
    const detections: DetectedGeometry[] = []
    
    if (vertices.length < 20) return detections

    const curvatures = this.calculateCurvatures(vertices)
    const avgCurvature = curvatures.reduce((a, b) => a + b, 0) / curvatures.length
    
    const boundingBox = new THREE.Box3().setFromPoints(vertices)
    const center = boundingBox.getCenter(new THREE.Vector3())
    
    // High uniform curvature suggests sphere
    if (avgCurvature > 0.1 && this.calculateCurvatureVariance(curvatures) < 0.05) {
      detections.push({
        id: `sphere-curvature-${Date.now()}`,
        type: 'sphere',
        center: [center.x, center.y, center.z],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        confidence: 0.7,
        boundingBox,
        vertices,
        algorithm: 'curvature_analysis',
        timestamp: Date.now()
      })
    }

    return detections
  }

  /**
   * Calculate curvatures for vertices (simplified)
   */
  private calculateCurvatures(vertices: THREE.Vector3[]): number[] {
    const curvatures: number[] = []
    
    for (let i = 1; i < vertices.length - 1; i++) {
      const prev = vertices[i - 1]
      const curr = vertices[i]
      const next = vertices[i + 1]
      
      const v1 = new THREE.Vector3().subVectors(curr, prev).normalize()
      const v2 = new THREE.Vector3().subVectors(next, curr).normalize()
      
      const curvature = Math.abs(1 - v1.dot(v2))
      curvatures.push(curvature)
    }
    
    return curvatures
  }

  /**
   * Calculate variance in curvatures
   */
  private calculateCurvatureVariance(curvatures: number[]): number {
    const mean = curvatures.reduce((a, b) => a + b, 0) / curvatures.length
    const variance = curvatures.reduce((sum, cur) => sum + Math.pow(cur - mean, 2), 0) / curvatures.length
    return variance
  }

  /**
   * Detect geometries using ICP algorithm
   */
  private async detectByICP(vertices: THREE.Vector3[]): Promise<DetectedGeometry[]> {
    const detections: DetectedGeometry[] = []
    
    if (vertices.length < 50) return detections

    for (const [geometryName, referenceGeometry] of this.knownGeometries) {
      const icpResult = await this.runICP(vertices, referenceGeometry)
      
      if (icpResult.converged && icpResult.error < 1.0) {
        const boundingBox = new THREE.Box3().setFromPoints(vertices)
        const center = boundingBox.getCenter(new THREE.Vector3())
        
        // Extract transformation parameters
        const position = new THREE.Vector3()
        const rotation = new THREE.Euler()
        const scale = new THREE.Vector3()
        icpResult.transformation.decompose(position, new THREE.Quaternion().setFromEuler(rotation), scale)
        
        detections.push({
          id: `${geometryName}-icp-${Date.now()}`,
          type: geometryName as any,
          center: [position.x, position.y, position.z],
          rotation: [rotation.x, rotation.y, rotation.z],
          scale: [scale.x, scale.y, scale.z],
          confidence: Math.max(0, 1 - icpResult.error / 10),
          boundingBox,
          vertices,
          algorithm: 'icp',
          timestamp: Date.now()
        })
      }
    }

    return detections
  }

  /**
   * Run ICP algorithm to match vertices with reference geometry
   */
  private async runICP(
    targetVertices: THREE.Vector3[],
    referenceGeometry: THREE.BufferGeometry
  ): Promise<ICPResult> {
    const referenceVertices = this.extractVertices(referenceGeometry)
    let transformation = new THREE.Matrix4().identity()
    let previousError = Infinity
    let iterations = 0

    // Subsample for performance
    const maxPoints = 500
    const sampledTarget = this.subsampleVertices(targetVertices, maxPoints)
    const sampledReference = this.subsampleVertices(referenceVertices, maxPoints)

    while (iterations < this.maxICPIterations) {
      iterations++

      // Find closest point correspondences
      const correspondences = this.findClosestPoints(sampledTarget, sampledReference)
      
      // Calculate transformation
      const newTransformation = this.calculateOptimalTransformation(correspondences)
      
      // Apply transformation
      transformation.multiplyMatrices(newTransformation, transformation)
      
      // Apply transformation to target vertices
      const transformedTarget = sampledTarget.map(v => v.clone().applyMatrix4(newTransformation))
      
      // Calculate error
      const error = this.calculateAlignmentError(transformedTarget, sampledReference)
      
      // Check convergence
      if (Math.abs(previousError - error) < this.icpTolerance) {
        return {
          transformation,
          error,
          iterations,
          converged: true
        }
      }
      
      previousError = error
      sampledTarget.forEach((v, i) => v.copy(transformedTarget[i]))
    }

    return {
      transformation,
      error: previousError,
      iterations,
      converged: false
    }
  }

  /**
   * Subsample vertices for performance
   */
  private subsampleVertices(vertices: THREE.Vector3[], maxCount: number): THREE.Vector3[] {
    if (vertices.length <= maxCount) return vertices.map(v => v.clone())
    
    const step = Math.floor(vertices.length / maxCount)
    const sampled: THREE.Vector3[] = []
    
    for (let i = 0; i < vertices.length; i += step) {
      sampled.push(vertices[i].clone())
    }
    
    return sampled
  }

  /**
   * Find closest point correspondences
   */
  private findClosestPoints(
    target: THREE.Vector3[],
    reference: THREE.Vector3[]
  ): Array<{ target: THREE.Vector3; reference: THREE.Vector3 }> {
    const correspondences: Array<{ target: THREE.Vector3; reference: THREE.Vector3 }> = []
    
    for (const targetPoint of target) {
      let closestDistance = Infinity
      let closestPoint = reference[0]
      
      for (const refPoint of reference) {
        const distance = targetPoint.distanceTo(refPoint)
        if (distance < closestDistance) {
          closestDistance = distance
          closestPoint = refPoint
        }
      }
      
      correspondences.push({
        target: targetPoint,
        reference: closestPoint
      })
    }
    
    return correspondences
  }

  /**
   * Calculate optimal transformation from correspondences
   */
  private calculateOptimalTransformation(
    correspondences: Array<{ target: THREE.Vector3; reference: THREE.Vector3 }>
  ): THREE.Matrix4 {
    if (correspondences.length === 0) return new THREE.Matrix4().identity()

    // Calculate centroids
    const targetCentroid = new THREE.Vector3()
    const referenceCentroid = new THREE.Vector3()
    
    correspondences.forEach(({ target, reference }) => {
      targetCentroid.add(target)
      referenceCentroid.add(reference)
    })
    
    targetCentroid.divideScalar(correspondences.length)
    referenceCentroid.divideScalar(correspondences.length)

    // For simplicity, just calculate translation
    // In a full ICP implementation, you'd also calculate rotation using SVD
    const translation = new THREE.Vector3().subVectors(referenceCentroid, targetCentroid)
    
    return new THREE.Matrix4().makeTranslation(translation.x, translation.y, translation.z)
  }

  /**
   * Calculate alignment error
   */
  private calculateAlignmentError(
    target: THREE.Vector3[],
    reference: THREE.Vector3[]
  ): number {
    let totalError = 0
    
    for (const targetPoint of target) {
      let minDistance = Infinity
      for (const refPoint of reference) {
        const distance = targetPoint.distanceTo(refPoint)
        if (distance < minDistance) {
          minDistance = distance
        }
      }
      totalError += minDistance
    }
    
    return totalError / target.length
  }

  /**
   * Filter and merge similar detections
   */
  private filterAndMergeDetections(
    detections: DetectedGeometry[],
    minConfidence: number
  ): DetectedGeometry[] {
    // Filter by confidence
    const filtered = detections.filter(d => d.confidence >= minConfidence)
    
    // Sort by confidence
    filtered.sort((a, b) => b.confidence - a.confidence)
    
    // Remove overlapping detections (simplified)
    const merged: DetectedGeometry[] = []
    const used = new Set<string>()
    
    for (const detection of filtered) {
      if (used.has(detection.id)) continue
      
      // Check for overlaps
      let hasOverlap = false
      for (const existing of merged) {
        const distance = new THREE.Vector3(...detection.center)
          .distanceTo(new THREE.Vector3(...existing.center))
        
        if (distance < 2.0 && detection.type === existing.type) {
          hasOverlap = true
          break
        }
      }
      
      if (!hasOverlap) {
        merged.push(detection)
        used.add(detection.id)
      }
    }
    
    return merged
  }
}

export const geometryDetector = new GeometryDetector() 