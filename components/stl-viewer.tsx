"use client"

import React, { Suspense, useRef, useState, useEffect, useCallback } from "react"
import { Canvas, useThree, useFrame } from "@react-three/fiber"
import { OrbitControls, Environment, Html, Text, Grid, GizmoHelper, GizmoViewport } from "@react-three/drei"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import * as THREE from "three"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, EyeOff, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { geometryDetector, DetectedGeometry } from "@/lib/geometry-detection"

interface Point {
  id: string
  position: [number, number, number]
  type: string
  timestamp: number
  rotation?: [number, number, number]
  modelType?: string
  groupId?: string
}

interface STLViewerProps {
  file: File | null
  onPointSelect: (point: Point) => void
  selectedPoints: Point[]
  exportType: "hs-cap-small" | "hs-cap"
  isMobile: boolean
  onMobileMenuOpen: () => void
  settings: {
    renderQuality?: string
    showGrid?: boolean
    showAxes?: boolean
    autoSave?: boolean
    units?: string
  }
  onScanSelect?: (scanId: string) => void
  onCameraReset?: () => void
  onZoomIn?: () => void
  onZoomOut?: () => void
  onToggleFullscreen?: () => void
  onGeometriesDetected?: (geometries: DetectedGeometry[]) => void
  showDetectedGeometries?: boolean
  detectedGeometries?: DetectedGeometry[]
  onSceneReady?: (scene: THREE.Scene) => void
  selectedParts?: Array<{
    id: string
    type: string
    position: [number, number, number]
    rotation: [number, number, number]
    scale: [number, number, number]
    timestamp: number
  }>
}

// Global in-memory cache so the same STL file isn't parsed more than once per session
const geometryCache: Record<string, THREE.BufferGeometry> = {}

function STLModel({
  url,
  onPointSelect,
  onPointUpdate,
  settings,
  isMobile,
  onScanSelect,
  meshRef,
  onGeometriesDetected,
  showDetectedGeometries = true,
  detectedGeometries = [],
}: {
  url: string
  onPointSelect: (point: Point) => void
  onPointUpdate?: (point: Point) => void
  settings: {
    renderQuality?: string
    showGrid?: boolean
    showAxes?: boolean
    autoSave?: boolean
    units?: string
    backgroundColor?: string
    lightingIntensity?: number
    materialRoughness?: number
    materialMetalness?: number
    opacity?: number
  }
  isMobile: boolean
  onScanSelect?: (scanId: string) => void
  meshRef?: React.RefObject<THREE.Mesh>
  onGeometriesDetected?: (geometries: DetectedGeometry[]) => void
  showDetectedGeometries?: boolean
  detectedGeometries?: DetectedGeometry[]
}) {
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null)
  const [hovered, setHovered] = useState(false)
  const [draggingPoint, setDraggingPoint] = useState<string | null>(null)
  const [boundingBox, setBoundingBox] = useState<THREE.Box3 | null>(null)
  const [vertexCount, setVertexCount] = useState(0)
  const [faceCount, setFaceCount] = useState(0)
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectionProgress, setDetectionProgress] = useState(0)
  const internalMeshRef = useRef<THREE.Mesh>(null)
  const actualMeshRef = meshRef || internalMeshRef
  const { camera, scene } = useThree()
  const { toast } = useToast()

  // Ensure we schedule detection only once per geometry instance
  useEffect(() => {
    if (!onGeometriesDetected) return
    if (!geometry || !actualMeshRef.current) return

    let scheduled = false
    const scheduleDetection = () => {
      if (scheduled) return
      scheduled = true
      if (typeof (window as any).requestIdleCallback === 'function') {
        (window as any).requestIdleCallback(() => runGeometryDetection(), { timeout: 3000 })
      } else {
        setTimeout(() => runGeometryDetection(), 500)
      }
    }

    scheduleDetection()
  }, [geometry, onGeometriesDetected])

  const runGeometryDetection = async () => {
    if (!actualMeshRef.current || !geometry) return

    setIsDetecting(true)
    setDetectionProgress(0)

    try {
      toast({
        title: "Geometry Detection Started",
        description: "Analyzing STL for known geometric patterns...",
      })

      // Simulate detection progress
      const progressInterval = setInterval(() => {
        setDetectionProgress(prev => {
          const newProgress = prev + Math.random() * 15
          return newProgress >= 90 ? 90 : newProgress
        })
      }, 200)

      const detectedGeometries = await geometryDetector.detectGeometries(
        actualMeshRef.current,
        {
          useICP: true,
          useCurvatureAnalysis: true,
          useFeatureExtraction: true,
          minConfidence: 0.5, // Lower threshold for more detections
        }
      )

      clearInterval(progressInterval)
      setDetectionProgress(100)

      if (onGeometriesDetected) {
        onGeometriesDetected(detectedGeometries)
      }

      toast({
        title: "Geometry Detection Complete",
        description: `Found ${detectedGeometries.length} potential geometric matches`,
      })

    } catch (error) {
      console.error('Geometry detection error:', error)
      toast({
        title: "Detection Error",
        description: "Failed to detect geometries. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDetecting(false)
      setDetectionProgress(0)
    }
  }

  const loadSTL = async () => {
    const loader = new STLLoader()
    let isMounted = true

    // Fast-path: do we already have this geometry cached?
    if (geometryCache[url]) {
      const cached = geometryCache[url]
      // Clone so transformations applied later don't mutate the shared instance
      const cloned = cached.clone()

      // Basic stats (cached alongside geometry after first load)
      if (cached.userData.stats) {
        const { bbox, vertexCount, faceCount } = cached.userData.stats
        setGeometry(cloned)
        setBoundingBox(bbox)
        setVertexCount(vertexCount)
        setFaceCount(faceCount)
        setLoadingProgress(100)

        // Fit camera similarly to first-load logic
        if (bbox && camera) {
          const center = bbox.getCenter(new THREE.Vector3())
          const size = bbox.getSize(new THREE.Vector3())
          const maxDim = Math.max(size.x, size.y, size.z)
          const fov = camera instanceof THREE.PerspectiveCamera ? camera.fov : 45
          const cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2 * Math.PI / 180))
          camera.position.set(center.x, center.y, center.z + cameraZ * 1.5)
          camera.lookAt(center)
          camera.updateProjectionMatrix()
        }
        setLoadingProgress(100)
        return
      }
    }

    try {
      console.log('Loading STL from URL:', url) // Debug log
      const geometry = await new Promise<THREE.BufferGeometry>((resolve, reject) => {
        loader.load(
          url,
          (geometry) => {
            if (isMounted) {
              console.log('STL loaded successfully') // Debug log
              setLoadingProgress(100)
              resolve(geometry)
            }
          },
          (progress) => {
            if (isMounted && progress.total > 0) {
              const percent = Math.round((progress.loaded / progress.total) * 100)
              console.log('Loading progress:', percent) // Debug log
              setLoadingProgress(percent)
            }
          },
          (error) => {
            console.error("STL loading error:", error)
            reject(error)
          }
        )
      })

      if (isMounted) {
        // Heavy calculations first time only, then cache
        geometry.computeBoundingBox()
        geometry.computeBoundingSphere()
        if (!geometry.getAttribute('normal')) {
          geometry.computeVertexNormals()
        }
        
        // Calculate statistics
        const positionAttribute = geometry.getAttribute('position')
        const bbox = new THREE.Box3()
        if (positionAttribute) {
          bbox.setFromBufferAttribute(positionAttribute as THREE.BufferAttribute)
        }
        const vertexCount = positionAttribute?.count || 0
        const faceCount = geometry.index ? geometry.index.count / 3 : vertexCount / 3
        
        setGeometry(geometry)
        setBoundingBox(bbox)
        setVertexCount(vertexCount)
        setFaceCount(faceCount)
        
        // Store in cache for instant subsequent use
        geometry.userData.stats = { bbox, vertexCount, faceCount }
        geometryCache[url] = geometry
        
        toast({
          title: "Model Loaded",
          description: `STL file loaded successfully`,
        })
        
        // Auto-fit camera to model
        if (bbox && camera) {
          const center = bbox.getCenter(new THREE.Vector3())
          const size = bbox.getSize(new THREE.Vector3())
          const maxDim = Math.max(size.x, size.y, size.z)
          const fov = camera instanceof THREE.PerspectiveCamera ? camera.fov : 45
          const cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2 * Math.PI / 180))
          
          camera.position.set(center.x, center.y, center.z + cameraZ * 1.5)
          camera.lookAt(center)
          camera.updateProjectionMatrix()
        }
      }
    } catch (err) {
      console.error('STL loading error:', err) // Debug log
      if (isMounted) {
        setError(err instanceof Error ? err.message : "Failed to load STL file")
        toast({
          title: "Error",
          description: "Failed to load STL file",
          variant: "destructive",
        })
      }
    }

    return () => {
      isMounted = false
    }
  }

  useEffect(() => {
    if (url) {
      console.log('URL changed, reloading STL') // Debug log
      loadSTL()
    }
  }, [url])

  // Enhanced click handler for better feature detection
  const handleClick = useCallback(
    (event: any) => {
      if (!actualMeshRef.current || !event.point) return

      const point = event.point
      const normal = event.face?.normal
      const id = `point-${Date.now()}`
      const position: [number, number, number] = [point.x, point.y, point.z]

      // Determine point type based on surface normal and local geometry
      const pointType = determinePointType(point, normal, event.face)

      onPointSelect({
        id,
        position,
        type: pointType,
        modelType: pointType,
        timestamp: Date.now(),
      })

      // Highlight the clicked area temporarily
      highlightClickedArea(point)
    },
    [onPointSelect, actualMeshRef]
  )

  const determinePointType = (point: THREE.Vector3, normal?: THREE.Vector3, face?: any): string => {
    if (!normal) return "mid-sphere"

    // Analyze the local surface curvature
    const curvature = Math.abs(normal.length() - 1) // Simplified curvature estimation
    
    if (curvature > 0.1) {
      return "mid-sphere" // High curvature suggests spherical
    } else if (curvature < 0.05) {
      return "end-flat" // Low curvature suggests flat
    } else {
      return "mid-cylinder" // Medium curvature suggests cylindrical
    }
  }

  const highlightClickedArea = (point: THREE.Vector3) => {
    // Create a temporary highlight effect
    const highlightGeometry = new THREE.SphereGeometry(0.1, 8, 8)
    const highlightMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff6b35, 
      transparent: true, 
      opacity: 0.8 
    })
    const highlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial)
    highlightMesh.position.copy(point)
    scene.add(highlightMesh)

    // Remove highlight after animation
    setTimeout(() => {
      scene.remove(highlightMesh)
      highlightGeometry.dispose()
      highlightMaterial.dispose()
    }, 1000)
  }

  const handlePointDragStart = useCallback((pointId: string) => {
    setDraggingPoint(pointId)
  }, [])

  const handlePointDragEnd = useCallback(() => {
    setDraggingPoint(null)
  }, [])

  const handlePointDrag = useCallback((event: any, pointId: string) => {
    if (!draggingPoint || !event.point) return

    const point = event.point
    const position: [number, number, number] = [point.x, point.y, point.z]

    onPointSelect({
      id: pointId,
      position,
      type: "selection",
      timestamp: Date.now(),
    })
  }, [draggingPoint, onPointSelect])

  if (error) {
    return (
      <Html center>
        <div
          className={`bg-red-50 border border-red-200 rounded-xl text-red-700 ${isMobile ? "p-4 max-w-xs" : "p-6 max-w-md"}`}
        >
          <div className="text-center">
            <div className="text-2xl mb-2">⚠️</div>
            <p className="font-semibold">Error loading STL file</p>
            <p className="text-sm mt-1">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      </Html>
    )
  }

  if (!geometry) {
    return (
      <Html center>
        <div
          className={`bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200 ${isMobile ? "p-4" : "p-6"}`}
        >
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div
                className={`animate-spin rounded-full border-4 border-orange-200 border-t-orange-500 ${isMobile ? "h-8 w-8" : "h-10 w-10"}`}
              ></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-orange-600">{loadingProgress}%</span>
              </div>
            </div>
            <div className="text-center">
              <span className={`text-gray-700 font-medium ${isMobile ? "text-sm" : ""}`}>Loading 3D Model...</span>
              <div className="text-xs text-gray-500 mt-1">Processing STL geometry</div>
            </div>
          </div>
        </div>
      </Html>
    )
  }

  return (
    <group>
      <mesh
        ref={actualMeshRef}
        geometry={geometry}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={hovered ? "#f0d0a0" : "#e8c4a0"}
          roughness={settings.materialRoughness || 0.2}
          metalness={settings.materialMetalness || 0.1}
          transparent={settings.opacity !== undefined && settings.opacity < 1}
          opacity={settings.opacity || 1.0}
          envMapIntensity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Detected Geometries Visualization */}
      {showDetectedGeometries && detectedGeometries.map((detectedGeom) => {
        const position = new THREE.Vector3(...detectedGeom.center)
        const rotation = new THREE.Euler(...detectedGeom.rotation)
        const scale = new THREE.Vector3(...detectedGeom.scale)
        
        return (
          <group key={detectedGeom.id} position={position} rotation={rotation} scale={scale}>
            {/* Wireframe overlay to show detected geometry */}
            <mesh>
              {detectedGeom.type === 'sphere' && <sphereGeometry args={[1, 16, 16]} />}
              {detectedGeom.type === 'cylinder' && <cylinderGeometry args={[1, 1, 2, 16]} />}
              {detectedGeom.type === 'cube' && <boxGeometry args={[2, 2, 2]} />}
              {detectedGeom.type === 'cone' && <coneGeometry args={[1, 2, 16]} />}
              <meshBasicMaterial 
                color={detectedGeom.algorithm === 'icp' ? "#00ff00" : detectedGeom.algorithm === 'feature_extraction' ? "#ff0000" : "#0000ff"}
                wireframe 
                transparent 
                opacity={0.4}
              />
            </mesh>
            
            {/* Confidence indicator */}
            <Html distanceFactor={isMobile ? 25 : 20} position={[0, 0, 0]}>
              <div className="bg-black/80 text-white px-2 py-1 rounded text-xs">
                <div className="font-medium">{detectedGeom.type}</div>
                <div className="text-xs opacity-75">
                  {Math.round(detectedGeom.confidence * 100)}% • {detectedGeom.algorithm}
                </div>
              </div>
            </Html>
          </group>
        )
      })}
      
      {/* Geometry Detection Progress */}
      {isDetecting && (
        <Html center>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="text-center">
              <div className="text-blue-600 font-medium mb-2">Detecting Geometries</div>
              <div className="w-32 h-2 bg-blue-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${detectionProgress}%` }}
                />
              </div>
              <div className="text-xs text-blue-600 mt-1">{Math.round(detectionProgress)}%</div>
            </div>
          </div>
        </Html>
      )}
      
      {/* Bounding box visualization - using wireframe box instead */}
      {boundingBox && settings.showAxes && (
        <mesh>
          <boxGeometry args={[boundingBox.max.x - boundingBox.min.x, boundingBox.max.y - boundingBox.min.y, boundingBox.max.z - boundingBox.min.z]} />
          <meshBasicMaterial color="#ff0000" wireframe transparent opacity={0.3} />
        </mesh>
      )}
      
      {/* Vertex count indicator */}
      {!isMobile && (
        <Html position={[0, 0, 0]} distanceFactor={50}>
          <div className="bg-black/70 text-white px-2 py-1 rounded text-xs">
            {vertexCount.toLocaleString()} vertices
          </div>
        </Html>
      )}
    </group>
  )
}

function ModelMockups({
  selectedPoints,
  exportType,
  isMobile,
  settings,
  onPointSelect,
  meshRef,
}: {
  selectedPoints: Array<Point>
  exportType: "hs-cap-small" | "hs-cap"
  isMobile: boolean
  settings: any
  onPointSelect: (point: Point) => void
  meshRef?: React.RefObject<THREE.Mesh>
}) {
  const [modelGeometries, setModelGeometries] = useState<{ [key: string]: THREE.BufferGeometry }>({})
  const [draggingPoint, setDraggingPoint] = useState<string | null>(null)
  const [rotatingPoint, setRotatingPoint] = useState<string | null>(null)
  const [showModelSelector, setShowModelSelector] = useState<string | null>(null)
  const [groupFlips, setGroupFlips] = useState<{ [groupId: string]: { flipX: boolean; flipY: boolean } }>({})
  const { camera, raycaster, pointer } = useThree()
  const loader = new STLLoader()

  const availableModels = [
    { id: 'end-cube', name: 'End Cube' },
    { id: 'end-flat', name: 'End Flat' },
    { id: 'end-sphere', name: 'End Sphere' },
    { id: 'long-cone', name: 'Long Cone' },
    { id: 'long-iso', name: 'Long ISO' },
    { id: 'mid-cube', name: 'Mid Cube' },
    { id: 'mid-cylinder', name: 'Mid Cylinder' },
    { id: 'mid-sphere', name: 'Mid Sphere' }
  ]

  // Handle dragging with proper surface constraint
  useFrame(() => {
    if (draggingPoint && meshRef?.current) {
      raycaster.setFromCamera(pointer, camera)
      const intersects = raycaster.intersectObject(meshRef.current)
      
      if (intersects.length > 0) {
        const intersection = intersects[0]
        const newPosition = intersection.point
        const normal = intersection.face?.normal
        
        if (normal) {
          // Transform local normal to world space
          const worldNormal = normal.clone().transformDirection(meshRef.current.matrixWorld)
          
          // Get camera direction
          const cameraDirection = new THREE.Vector3()
          camera.getWorldDirection(cameraDirection)
          
          // Check if the intersection point is on a front-facing surface
          const dotProduct = worldNormal.dot(cameraDirection.negate())
          
          if (dotProduct > 0) {
            // Offset the point slightly above the surface to prevent z-fighting
            const offsetPosition = newPosition.clone().add(worldNormal.multiplyScalar(0.02))
            
            // Update the point
            const point = selectedPoints.find(p => p.id === draggingPoint)
            if (point) {
              onPointSelect({
                ...point,
                position: [offsetPosition.x, offsetPosition.y, offsetPosition.z],
                timestamp: Date.now()
              })
            }
          }
        }
      }
    }
  })

  useEffect(() => {
    availableModels.forEach(async (model) => {
      try {
        const geometry = await loader.loadAsync(`/models/${model.id}.stl`)
        geometry.center()
        const scale = 0.15 // Increased scale for better visibility (was 0.08)
        geometry.scale(scale, scale, scale)
        setModelGeometries(prev => ({
          ...prev,
          [model.id]: geometry
        }))
      } catch (error) {
        console.error(`Failed to load model: ${model.id}`, error)
      }
    })
  }, [])

  const handleModelChange = (pointId: string, modelType: string) => {
    const point = selectedPoints.find(p => p.id === pointId)
    if (point) {
      onPointSelect({
        ...point,
        modelType,
        timestamp: Date.now()
      })
    }
    setShowModelSelector(null)
  }

  const handleRotation = (pointId: string, axis: 'x' | 'y' | 'z', delta: number) => {
    const point = selectedPoints.find(p => p.id === pointId)
    if (point) {
      const currentRotation = point.rotation || [0, 0, 0]
      const newRotation = [...currentRotation] as [number, number, number]
      const axisIndex = { x: 0, y: 1, z: 2 }[axis]
      newRotation[axisIndex] = (newRotation[axisIndex] + delta) % (2 * Math.PI)
      
      onPointSelect({
        ...point,
        rotation: newRotation,
        timestamp: Date.now()
      })
    }
  }

  const toggleFlip = (groupId: string, axis: 'x' | 'y') => {
    setGroupFlips(prev => {
      const current = prev[groupId] || { flipX: false, flipY: false }
      return {
        ...prev,
        [groupId]: {
          ...current,
          flipX: axis === 'x' ? !current.flipX : current.flipX,
          flipY: axis === 'y' ? !current.flipY : current.flipY,
        },
      }
    })
  }

  return (
    <>
      {/* Group points by groupId to render connecting parts */}
      {(() => {
        const groups: Record<string, Point[]> = {}
        selectedPoints.forEach(p => {
          if (p.groupId) {
            groups[p.groupId] = groups[p.groupId] ? [...groups[p.groupId], p] : [p]
          }
        })

        return Object.entries(groups).map(([groupId, points]) => {
          if (points.length < 2) return null // Need 2 points to place the part

          const [p1, p2] = points
          const modelType = p1.modelType || p1.type
          const geometry = modelGeometries[modelType]
          if (!geometry) return null

          // Ensure geometry has bounding box to measure length along Y
          if (!geometry.boundingBox) {
            geometry.computeBoundingBox()
          }
          const bbox = geometry.boundingBox as THREE.Box3
          const baseLength = bbox.max.y - bbox.min.y || 1

          // Calculate transform between the two points
          const start = new THREE.Vector3(...p1.position)
          const end = new THREE.Vector3(...p2.position)
          const dir = new THREE.Vector3().subVectors(end, start)
          const distance = dir.length()
          const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
          let quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())

          const flips = groupFlips[groupId]
          if (flips) {
            if (flips.flipX) {
              quaternion = quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI))
            }
            if (flips.flipY) {
              quaternion = quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI))
            }
          }

          const scaleY = distance / baseLength

          return (
            <group key={groupId} position={mid} quaternion={quaternion} scale={[1, scaleY, 1]}>
              <mesh geometry={geometry} castShadow receiveShadow>
                <meshStandardMaterial color="#e8c4a0" roughness={0.3} metalness={0.1} />
              </mesh>
              {/* Flip controls overlay */}
              {!isMobile && (
                <Html distanceFactor={20} position={[0, 0, 0]} center>
                  <div className="flex space-x-1 bg-white/90 backdrop-blur-sm p-1 rounded shadow-lg text-xs">
                    <button onClick={() => toggleFlip(groupId,'x')} className="px-1 hover:bg-orange-100 rounded">Flip X</button>
                    <button onClick={() => toggleFlip(groupId,'y')} className="px-1 hover:bg-orange-100 rounded">Flip Y</button>
                  </div>
                </Html>
              )}
            </group>
          )
        })
      })()}
    </>
  )
}

function DefaultScene({ isMobile, settings, onPointSelect }: { isMobile: boolean; settings: any; onPointSelect: (point: Point) => void }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  
  const handleMeshClick = useCallback((event: any, label: string) => {
    event.stopPropagation()
    
    const point = event.point
    const id = `point-${Date.now()}`
    const position: [number, number, number] = [point.x, point.y, point.z]
    
    onPointSelect({
      id,
      position,
      type: "mid-sphere",
      timestamp: Date.now(),
    })
  }, [onPointSelect])

  return (
    <group>
      {/* Enhanced mock dental scan bodies - larger sizes */}
      {[
        { pos: [0, 0, 0], color: "#e8c4a0", label: "Upper Left", size: 0.8 },
        { pos: [1.5, 0, 0.5], color: "#e8c4a0", label: "Upper Right", size: 0.75 },
        { pos: [-1.5, 0, 0.5], color: "#e8c4a0", label: "Lower Left", size: 0.7 },
        { pos: [0, 0, 1.5], color: "#e8c4a0", label: "Lower Right", size: 0.85 },
        { pos: [0.8, 0, -0.8], color: "#e8c4a0", label: "Molar", size: 0.65 },
      ].map((item, index) => (
        <group key={index} position={item.pos as [number, number, number]}>
          <mesh 
            castShadow 
            receiveShadow
            onClick={(e) => handleMeshClick(e, item.label)}
            onPointerOver={() => setHoveredIndex(index)}
            onPointerOut={() => setHoveredIndex(null)}
          >
            <cylinderGeometry args={[item.size, item.size, 0.3, 16]} />
            <meshStandardMaterial 
              color={hoveredIndex === index ? "#f0d0a0" : item.color} 
              roughness={0.3} 
              metalness={0.1}
              emissive={hoveredIndex === index ? "#ff6b35" : "#000000"}
              emissiveIntensity={hoveredIndex === index ? 0.2 : 0}
            />
          </mesh>
          <mesh position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[item.size * 0.6, item.size * 0.6, 0.2, 16]} />
            <meshStandardMaterial color="#d4b896" roughness={0.2} metalness={0.2} />
          </mesh>
          {!isMobile && (
            <Text position={[0, 0.6, 0]} fontSize={0.15} color="#666" anchorX="center" anchorY="middle">
              {item.label}
            </Text>
          )}
        </group>
      ))}
    </group>
  )
}

function LoadingFallback({ isMobile }: { isMobile: boolean }) {
  return (
    <Html center>
      <div
        className={`bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200 ${
          isMobile ? "p-4" : "p-6"
        }`}
      >
        <div className="flex items-center space-x-3">
          <div
            className={`animate-spin rounded-full border-b-2 border-orange-500 ${isMobile ? "h-5 w-5" : "h-6 w-6"}`}
          ></div>
          <span className={`text-gray-700 font-medium ${isMobile ? "text-sm" : ""}`}>Loading 3D Model...</span>
        </div>
      </div>
    </Html>
  )
}

// Grid and Axes component
function GridAndAxes({ settings }: { settings: any }) {
  const { scene } = useThree()
  
  useEffect(() => {
    // Clean up previous helpers
    const existingGrid = scene.getObjectByName('gridHelper')
    const existingAxes = scene.getObjectByName('axesHelper')
    
    if (existingGrid) scene.remove(existingGrid)
    if (existingAxes) scene.remove(existingAxes)
    
    if (settings?.showGrid) {
      const gridHelper = new THREE.GridHelper(20, 20, 0x888888, 0xcccccc)
      gridHelper.name = 'gridHelper'
      scene.add(gridHelper)
    }
    
    if (settings?.showAxes) {
      const axesHelper = new THREE.AxesHelper(5)
      axesHelper.name = 'axesHelper'
      scene.add(axesHelper)
    }
    
    return () => {
      const grid = scene.getObjectByName('gridHelper')
      const axes = scene.getObjectByName('axesHelper')
      if (grid) scene.remove(grid)
      if (axes) scene.remove(axes)
    }
  }, [scene, settings?.showGrid, settings?.showAxes])
  
  return null
}

// Point Markers component to show visible spheres at selected points
function PointMarkers({ 
  selectedPoints, 
  isMobile 
}: { 
  selectedPoints: Point[]
  isMobile: boolean 
}) {
  return (
    <>
      {selectedPoints.map((point, index) => (
        <group key={point.id} position={point.position}>
          {/* Main sphere marker */}
          <mesh>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial 
              color="#ff6b35"
              emissive="#ff6b35"
              emissiveIntensity={0.5}
              roughness={0.2}
              metalness={0.8}
            />
          </mesh>
          
          {/* Outer glow effect */}
          <mesh>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshBasicMaterial 
              color="#ff6b35"
              transparent
              opacity={0.3}
            />
          </mesh>
          
          {/* Point label */}
          <Html 
            distanceFactor={isMobile ? 30 : 20} 
            position={[0, 0.3, 0]}
            center
          >
            <div className="bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg">
              P{index + 1}
            </div>
          </Html>
        </group>
      ))}
    </>
  )
}

// Camera Controls component that can access Three.js context
function CameraControls({
  onCameraReset,
  onZoomIn,
  onZoomOut,
  onToggleFullscreen,
}: {
  onCameraReset?: () => void
  onZoomIn?: () => void
  onZoomOut?: () => void
  onToggleFullscreen?: () => void
}) {
  const { camera, gl } = useThree()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const { toast } = useToast()

  const handleCameraReset = useCallback(() => {
    if (camera) {
      camera.position.set(5, 5, 5)
      camera.lookAt(0, 0, 0)
      onCameraReset?.()
      toast({
        title: "Camera Reset",
        description: "Camera position has been reset",
      })
    }
  }, [camera, onCameraReset, toast])

  const handleZoomIn = useCallback(() => {
    if (camera) {
      const factor = 0.8
      const newPosition = camera.position.clone().multiplyScalar(factor)
      camera.position.copy(newPosition)
      onZoomIn?.()
      toast({
        title: "Zoomed In",
        description: "Camera zoomed in",
      })
    }
  }, [camera, onZoomIn, toast])

  const handleZoomOut = useCallback(() => {
    if (camera) {
      const factor = 1.2
      const newPosition = camera.position.clone().multiplyScalar(factor)
      camera.position.copy(newPosition)
      onZoomOut?.()
      toast({
        title: "Zoomed Out",
        description: "Camera zoomed out",
      })
    }
  }, [camera, onZoomOut, toast])

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      gl?.domElement.parentElement?.requestFullscreen()
      setIsFullscreen(true)
      onToggleFullscreen?.()
      toast({
        title: "Fullscreen",
        description: "Entered fullscreen mode",
      })
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
      onToggleFullscreen?.()
      toast({
        title: "Fullscreen",
        description: "Exited fullscreen mode",
      })
    }
  }, [gl, onToggleFullscreen, toast])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  // Expose functions to parent component
  useEffect(() => {
    if (onCameraReset) {
      (window as any).handleCameraReset = handleCameraReset
    }
    if (onZoomIn) {
      (window as any).handleZoomIn = handleZoomIn
    }
    if (onZoomOut) {
      (window as any).handleZoomOut = handleZoomOut
    }
    if (onToggleFullscreen) {
      (window as any).handleToggleFullscreen = handleToggleFullscreen
    }

    return () => {
      delete (window as any).handleCameraReset
      delete (window as any).handleZoomIn
      delete (window as any).handleZoomOut
      delete (window as any).handleToggleFullscreen
    }
  }, [handleCameraReset, handleZoomIn, handleZoomOut, handleToggleFullscreen, onCameraReset, onZoomIn, onZoomOut, onToggleFullscreen])

  return null
}

function PartsOverlay({ 
  selectedParts, 
  onPartClick 
}: { 
  selectedParts: Array<{
    id: string
    type: string
    position: [number, number, number]
    rotation: [number, number, number]
    scale: [number, number, number]
    timestamp: number
  }>
  onPartClick?: (partId: string) => void
}) {
  const [partModels, setPartModels] = useState<{[key: string]: THREE.Group}>({})

  useEffect(() => {
    // Load part models
    selectedParts.forEach(part => {
      if (!partModels[part.type]) {
        const loader = new STLLoader()
        fetch(`/models/${part.type}.stl`)
          .then(response => response.arrayBuffer())
          .then(buffer => {
            const geometry = loader.parse(buffer)
            const material = new THREE.MeshStandardMaterial({ 
              color: 0x3b82f6, 
              transparent: true, 
              opacity: 0.8,
              metalness: 0.1,
              roughness: 0.8
            })
            const mesh = new THREE.Mesh(geometry, material)
            const group = new THREE.Group()
            group.add(mesh)
            setPartModels(prev => ({ ...prev, [part.type]: group }))
          })
          .catch(error => {
            console.error(`Error loading part model ${part.type}:`, error)
          })
      }
    })
  }, [selectedParts, partModels])

  return (
    <>
      {selectedParts.map(part => {
        const model = partModels[part.type]
        if (!model) return null

        return (
          <primitive
            key={part.id}
            object={model.clone()}
            position={part.position}
            rotation={part.rotation}
            scale={part.scale}
            onClick={(event) => {
              event.stopPropagation()
              onPartClick?.(part.id)
            }}
          />
        )
      })}
    </>
  )
}

const SceneCapture = ({ onReady }: { onReady?: (scene: THREE.Scene) => void }) => {
  const { scene } = useThree()
  useEffect(() => {
    onReady?.(scene)
  }, [scene, onReady])
  return null
}

export function STLViewer({
  file,
  onPointSelect,
  selectedPoints,
  exportType,
  isMobile,
  onMobileMenuOpen,
  settings,
  onScanSelect,
  onCameraReset,
  onZoomIn,
  onZoomOut,
  onToggleFullscreen,
  onGeometriesDetected,
  showDetectedGeometries = true,
  detectedGeometries = [],
  onSceneReady,
  selectedParts = [],
}: STLViewerProps) {
  const [url, setUrl] = useState<string | null>(null)
  const controlsRef = useRef<any>(null)
  const meshRef = useRef<THREE.Mesh>(null as any)

  useEffect(() => {
    if (file) {
      // Check if file has a URL property (for scan files)
      if ('url' in file && typeof (file as any).url === 'string') {
        setUrl((file as any).url)
      } else {
        // Regular file upload
        const objectUrl = URL.createObjectURL(file)
        setUrl(objectUrl)
        return () => URL.revokeObjectURL(objectUrl)
      }
    }
  }, [file])

  return (
    <div className="relative w-full h-full">
      <div className="absolute inset-0">
        <Canvas
          shadows
          camera={{ position: [5, 5, 5], fov: 50 }}
          className="bg-gradient-to-br from-gray-50 to-gray-100"
        >
          <Suspense fallback={< LoadingFallback isMobile={isMobile} />}>
            <OrbitControls
              ref={controlsRef}
              enableDamping
              dampingFactor={0.1}
              rotateSpeed={0.7}
              minDistance={1}
              maxDistance={50}
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              screenSpacePanning={true}
              target={[0, 0, 0]}
              makeDefault
            />
            <ambientLight intensity={0.6} />
            <directionalLight
              position={[10, 10, 5]}
              intensity={1.2}
              castShadow
              shadow-mapSize={[2048, 2048]}
            />
            <directionalLight
              position={[-5, 5, -5]}
              intensity={0.4}
            />
            <Environment preset="city" />
            {onSceneReady && <SceneCapture onReady={onSceneReady} />}
            {url ? (
              <STLModel 
                url={url} 
                onPointSelect={onPointSelect} 
                settings={settings} 
                isMobile={isMobile}
                onScanSelect={onScanSelect}
                meshRef={meshRef}
                onGeometriesDetected={onGeometriesDetected}
                showDetectedGeometries={showDetectedGeometries}
                detectedGeometries={detectedGeometries}
              />
            ) : (
              <DefaultScene isMobile={isMobile} settings={settings} onPointSelect={onPointSelect} />
            )}
            
            {/* Render selected parts as overlays */}
            {selectedParts.length > 0 && (
              <PartsOverlay 
                selectedParts={selectedParts}
                onPartClick={(partId) => {
                  console.log('Part clicked:', partId)
                  // Handle part selection/editing here
                }}
              />
            )}
            
            {selectedPoints.length > 0 && (
              <ModelMockups
                selectedPoints={selectedPoints}
                exportType={exportType}
                isMobile={isMobile}
                settings={settings}
                onPointSelect={onPointSelect}
                meshRef={meshRef}
              />
            )}
            <GridAndAxes settings={settings} />
            <PointMarkers selectedPoints={selectedPoints} isMobile={isMobile} />
            <CameraControls
              onCameraReset={onCameraReset}
              onZoomIn={onZoomIn}
              onZoomOut={onZoomOut}
              onToggleFullscreen={onToggleFullscreen}
            />
          </Suspense>
        </Canvas>
      </div>
    </div>
  )
}
