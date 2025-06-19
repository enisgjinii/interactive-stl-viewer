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

interface Point {
  id: string
  position: [number, number, number]
  type: string
  timestamp: number
  rotation?: [number, number, number]
  modelType?: string
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
}

function STLModel({
  url,
  onPointSelect,
  onPointUpdate,
  settings,
  isMobile,
  onScanSelect,
  meshRef,
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
}) {
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null)
  const [hovered, setHovered] = useState(false)
  const [draggingPoint, setDraggingPoint] = useState<string | null>(null)
  const [boundingBox, setBoundingBox] = useState<THREE.Box3 | null>(null)
  const [vertexCount, setVertexCount] = useState(0)
  const [faceCount, setFaceCount] = useState(0)
  const internalMeshRef = useRef<THREE.Mesh>(null)
  const actualMeshRef = meshRef || internalMeshRef
  const { camera, scene } = useThree()
  const { toast } = useToast()

  const loadSTL = async () => {
    const loader = new STLLoader()
    let isMounted = true

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
        // Optimize geometry for performance
        geometry.computeBoundingBox()
        geometry.computeBoundingSphere()
        geometry.computeVertexNormals()
        
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
        
        toast({
          title: "Model Loaded",
          description: `STL file loaded: ${vertexCount} vertices, ${Math.floor(faceCount)} faces`,
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

  const handleClick = useCallback(
    (event: any) => {
      if (!actualMeshRef.current || !event.point) return

      const point = event.point
      const id = `point-${Date.now()}`
      const position: [number, number, number] = [point.x, point.y, point.z]

      onPointSelect({
        id,
        position,
        type: "mid-sphere",
        modelType: "mid-sphere",
        timestamp: Date.now(),
      })
    },
    [onPointSelect, actualMeshRef]
  )

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
        const scale = 0.08 // Smaller scale for better visibility
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

  return (
    <>
      {selectedPoints.map((point, index) => {
        const modelType = point.modelType || point.type
        const geometry = modelGeometries[modelType]
        const scale = draggingPoint === point.id ? 1.2 : 1.0
        const color = draggingPoint === point.id ? "#ffb366" : "#e8c4a0"
        const rotation = point.rotation || [0, 0, 0]

        if (!geometry) {
          return null
        }

        const position = new THREE.Vector3(point.position[0], point.position[1] - 0.075, point.position[2])

        return (
          <group 
            key={point.id} 
            position={position}
            rotation={rotation}
            scale={scale}
            onPointerDown={(e) => {
              e.stopPropagation()
              if (e.button === 0) { // Left click for drag
                setDraggingPoint(point.id)
                document.body.style.cursor = 'grabbing'
              }
            }}
            onPointerUp={(e) => {
              e.stopPropagation()
              setDraggingPoint(null)
              setRotatingPoint(null)
              document.body.style.cursor = 'default'
            }}
            onPointerOver={(e) => {
              e.stopPropagation()
              if (!draggingPoint && !rotatingPoint) {
                document.body.style.cursor = 'grab'
              }
            }}
            onPointerOut={(e) => {
              e.stopPropagation()
              if (!draggingPoint && !rotatingPoint) {
                document.body.style.cursor = 'default'
              }
            }}
            onContextMenu={(e) => {
              e.stopPropagation()
            }}
          >
            <mesh geometry={geometry} castShadow receiveShadow renderOrder={1}>
              <meshStandardMaterial 
                color={color} 
                roughness={0.3} 
                metalness={0.1}
                emissive={draggingPoint === point.id ? "#ffb366" : "#000000"}
                emissiveIntensity={draggingPoint === point.id ? 0.2 : 0}
              />
            </mesh>
            <Html distanceFactor={isMobile ? 20 : 15} position={[0, 0.2, 0]}>
              <div className="flex flex-col items-center space-y-2">
                <div
                  className={`bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full font-semibold shadow-lg transform transition-all hover:scale-105 ${
                    isMobile ? "px-2 py-1 text-xs" : "px-3 py-1 text-xs"
                  } ${draggingPoint === point.id ? 'ring-2 ring-orange-300 ring-offset-2' : ''}`}
                >
                  <div className="flex items-center space-x-1">
                    <span>Point {index + 1}</span>
                    {!isMobile && (
                      <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30">
                        {modelType}
                      </Badge>
                    )}
                  </div>
                  {!isMobile && (
                    <div className="text-xs opacity-75 mt-0.5">{new Date(point.timestamp).toLocaleTimeString()}</div>
                  )}
                </div>
                
                {/* Rotation Controls */}
                {!isMobile && (
                  <div className="flex space-x-2 bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-lg">
                    <button
                      onClick={() => handleRotation(point.id, 'x', Math.PI / 4)}
                      className="p-1 hover:bg-orange-100 rounded"
                      title="Rotate X"
                    >
                      ↻X
                    </button>
                    <button
                      onClick={() => handleRotation(point.id, 'y', Math.PI / 4)}
                      className="p-1 hover:bg-orange-100 rounded"
                      title="Rotate Y"
                    >
                      ↻Y
                    </button>
                    <button
                      onClick={() => handleRotation(point.id, 'z', Math.PI / 4)}
                      className="p-1 hover:bg-orange-100 rounded"
                      title="Rotate Z"
                    >
                      ↻Z
                    </button>
                    <button
                      onClick={() => setShowModelSelector(point.id)}
                      className="p-1 hover:bg-orange-100 rounded"
                      title="Change Model"
                    >
                      🔄
                    </button>
                  </div>
                )}

                {/* Model Selector */}
                {showModelSelector === point.id && (
                  <div className="absolute top-full mt-2 bg-white rounded-lg shadow-xl p-2 z-50">
                    <div className="grid grid-cols-2 gap-2">
                      {availableModels.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => handleModelChange(point.id, model.id)}
                          className="p-2 text-xs hover:bg-orange-100 rounded text-left"
                        >
                          {model.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Html>
          </group>
        )
      })}
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
      {/* Enhanced mock dental scan bodies - smaller sizes */}
      {[
        { pos: [0, 0, 0], color: "#e8c4a0", label: "Upper Left", size: 0.5 },
        { pos: [1.5, 0, 0.5], color: "#e8c4a0", label: "Upper Right", size: 0.45 },
        { pos: [-1.5, 0, 0.5], color: "#e8c4a0", label: "Lower Left", size: 0.4 },
        { pos: [0, 0, 1.5], color: "#e8c4a0", label: "Lower Right", size: 0.55 },
        { pos: [0.8, 0, -0.8], color: "#e8c4a0", label: "Molar", size: 0.35 },
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
          <Suspense fallback={<LoadingFallback isMobile={isMobile} />}>
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
            {url ? (
              <STLModel 
                url={url} 
                onPointSelect={onPointSelect} 
                settings={settings} 
                isMobile={isMobile}
                onScanSelect={onScanSelect}
                meshRef={meshRef}
              />
            ) : (
              <DefaultScene isMobile={isMobile} settings={settings} onPointSelect={onPointSelect} />
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
