"use client"

import React, { Suspense, useRef, useState, useEffect, useCallback } from "react"
import { Canvas, useThree } from "@react-three/fiber"
import { OrbitControls, Environment, Html, Text } from "@react-three/drei"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import * as THREE from "three"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RotateCcw, ZoomIn, ZoomOut, Move3D, Maximize2, Menu, Grid3X3, Eye, EyeOff, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import type { MatchResult } from "@/lib/shape-matching"

interface Point {
  id: string
  position: [number, number, number]
  type: string
  timestamp: number
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
  onCameraReset?: () => void
  onZoomIn?: () => void
  onZoomOut?: () => void
  onToggleFullscreen?: () => void
  onToggleGrid?: () => void
  onToggleAxes?: () => void
  matchedShapes?: MatchResult[]
  showMatches?: boolean
  onToggleMatches?: () => void
  onScanSelect?: (scanId: string) => void
}

function STLModel({
  url,
  onPointSelect,
  settings,
  isMobile,
  onScanSelect,
}: {
  url: string
  onPointSelect: (point: Point) => void
  settings: {
    renderQuality?: string
    showGrid?: boolean
    showAxes?: boolean
    autoSave?: boolean
    units?: string
  }
  isMobile: boolean
  onScanSelect?: (scanId: string) => void
}) {
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null)
  const [hovered, setHovered] = useState(false)
  const meshRef = useRef<THREE.Mesh>(null)
  const { camera } = useThree()
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
        setGeometry(geometry)
        toast({
          title: "Model Loaded",
          description: "STL file has been successfully loaded",
        })
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
      if (!meshRef.current || !event.point) return

      const point = event.point
      const id = `point-${Date.now()}`
      const position: [number, number, number] = [point.x, point.y, point.z]

      onPointSelect({
        id,
        position,
        type: "selection",
        timestamp: Date.now(),
      })

      // Automatically trigger scan selection
      if (onScanSelect) {
        onScanSelect(id)
      }
    },
    [onPointSelect, onScanSelect]
  )

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
    <mesh
      ref={meshRef}
      geometry={geometry}
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        color={hovered ? "#f0d0a0" : "#e8c4a0"}
        roughness={0.2}
        metalness={0.1}
        envMapIntensity={0.5}
      />
    </mesh>
  )
}

function MatchedShapes({
  matches,
  showMatches,
  isMobile,
}: {
  matches: MatchResult[]
  showMatches: boolean
  isMobile: boolean
}) {
  if (!showMatches || !matches.length) return null

  return (
    <>
      {matches.map((match, index) => {
        const vertices = match.targetGeometry.vertices
        const faces = match.targetGeometry.faces

        // Create geometry from match data
        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3))
        geometry.setIndex(new THREE.BufferAttribute(faces, 1))
        geometry.computeVertexNormals()

        const opacity = match.confidence * 0.8 + 0.2
        const color =
          match.matchType === "exact" ? "#10b981" : match.matchType === "approximate" ? "#f59e0b" : "#3b82f6"

        return (
          <group key={match.id}>
            <mesh geometry={geometry} castShadow receiveShadow>
              <meshStandardMaterial color={color} transparent opacity={opacity} roughness={0.3} metalness={0.7} />
            </mesh>
            <Html position={match.sourcePoint.position} distanceFactor={isMobile ? 25 : 20}>
              <div className="bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 text-xs font-medium shadow-lg border">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></div>
                  <span>Match {index + 1}</span>
                </div>
                <div className="text-xs text-gray-600">{(match.confidence * 100).toFixed(0)}% confidence</div>
              </div>
            </Html>
          </group>
        )
      })}
    </>
  )
}

function ModelMockups({
  selectedPoints,
  exportType,
  isMobile,
  settings,
}: {
  selectedPoints: Array<{ id: string; position: [number, number, number]; type: string; timestamp: number }>
  exportType: "hs-cap-small" | "hs-cap"
  isMobile: boolean
  settings: any
}) {
  const [modelGeometries, setModelGeometries] = useState<{ [key: string]: THREE.BufferGeometry }>({})
  const loader = new STLLoader()

  useEffect(() => {
    // Load all model geometries
    const modelTypes = [
      'end cube',
      'end flat',
      'end sphere',
      'long cone',
      'long iso',
      'mid cube',
      'mid cylinder',
      'mid sphere'
    ]

    modelTypes.forEach(async (type) => {
      try {
        const geometry = await loader.loadAsync(`/models/${type}.stl`)
        // Center the geometry
        geometry.center()
        // Scale down the geometry
        const scale = 0.15 // Adjust this value to make models smaller or larger
        geometry.scale(scale, scale, scale)
        setModelGeometries(prev => ({
          ...prev,
          [type]: geometry
        }))
      } catch (error) {
        console.error(`Failed to load model: ${type}`, error)
      }
    })
  }, [])

  return (
    <>
      {selectedPoints.map((point, index) => {
        const modelType = point.type
        const geometry = modelGeometries[modelType]
        const scale = 1.0
        const color = "#e8c4a0"

        if (!geometry) {
          return null
        }

        const position = new THREE.Vector3(point.position[0], point.position[1] - 0.075, point.position[2])

        return (
          <group key={point.id} position={position} scale={scale}>
            <mesh geometry={geometry} castShadow receiveShadow renderOrder={1}>
              <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
            </mesh>
            <Html distanceFactor={isMobile ? 20 : 15} position={[0, 0.2, 0]}>
              <div
                className={`bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full font-semibold shadow-lg transform transition-all hover:scale-105 ${
                  isMobile ? "px-2 py-1 text-xs" : "px-3 py-1 text-xs"
                }`}
              >
                <div className="flex items-center space-x-1">
                  <span>Point {index + 1}</span>
                  {!isMobile && (
                    <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30">
                      {point.type}
                    </Badge>
                  )}
                </div>
                {!isMobile && (
                  <div className="text-xs opacity-75 mt-0.5">{new Date(point.timestamp).toLocaleTimeString()}</div>
                )}
              </div>
            </Html>
          </group>
        )
      })}
    </>
  )
}

function DefaultScene({ isMobile, settings }: { isMobile: boolean; settings: any }) {
  return (
    <group>
      {/* Enhanced mock dental scan bodies */}
      {[
        { pos: [0, 0, 0], color: "#e8c4a0", label: "Upper Left", size: 1.0 },
        { pos: [2.5, 0, 1], color: "#e8c4a0", label: "Upper Right", size: 0.9 },
        { pos: [-2.5, 0, 1], color: "#e8c4a0", label: "Lower Left", size: 0.8 },
        { pos: [0, 0, 2.5], color: "#e8c4a0", label: "Lower Right", size: 1.1 },
        { pos: [1.5, 0, -1.5], color: "#e8c4a0", label: "Molar", size: 0.7 },
      ].map((item, index) => (
        <group key={index} position={item.pos as [number, number, number]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[item.size, item.size, 0.5, 8]} />
            <meshStandardMaterial color={item.color} roughness={0.3} metalness={0.1} />
          </mesh>
          <mesh position={[0, 0.3, 0]} castShadow>
            <cylinderGeometry args={[item.size * 0.6, item.size * 0.6, 0.4, 8]} />
            <meshStandardMaterial color="#d4b896" roughness={0.2} metalness={0.2} />
          </mesh>
          {!isMobile && (
            <Text position={[0, 1.2, 0]} fontSize={0.25} color="#666" anchorX="center" anchorY="middle">
              {item.label}
            </Text>
          )}
        </group>
      ))}
    </group>
  )
}

function CameraControls({
  isMobile,
  onMobileMenuOpen,
  settings,
  onCameraReset,
  onZoomIn,
  onZoomOut,
  onToggleFullscreen,
  onToggleGrid,
  onToggleAxes,
  onToggleMatches,
  showMatches,
  hasMatches,
}: {
  isMobile: boolean
  onMobileMenuOpen: () => void
  settings: any
  onCameraReset?: () => void
  onZoomIn?: () => void
  onZoomOut?: () => void
  onToggleFullscreen?: () => void
  onToggleGrid?: () => void
  onToggleAxes?: () => void
  onToggleMatches?: () => void
  showMatches?: boolean
  hasMatches?: boolean
}) {
  const { camera, gl } = useThree()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const { toast } = useToast()

  const resetCamera = useCallback(() => {
    camera.position.set(8, 8, 8)
    camera.lookAt(0, 0, 0)
    onCameraReset?.()
  }, [camera, onCameraReset])

  const zoomIn = useCallback(() => {
    const factor = 0.8
    const newPosition = camera.position.clone().multiplyScalar(factor)
    camera.position.copy(newPosition)
    onZoomIn?.()
  }, [camera, onZoomIn])

  const zoomOut = useCallback(() => {
    const factor = 1.2
    const newPosition = camera.position.clone().multiplyScalar(factor)
    camera.position.copy(newPosition)
    onZoomOut?.()
  }, [camera, onZoomOut])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      gl.domElement.parentElement?.requestFullscreen()
      setIsFullscreen(true)
      onToggleFullscreen?.()
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
      onToggleFullscreen?.()
    }
  }, [gl, onToggleFullscreen])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  return (
    <group>
      <Html
        position={[0, 0, 0]}
        style={{
          pointerEvents: "none",
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
      >
        <div className={`fixed z-10 ${isMobile ? "top-2 right-2" : "top-4 right-4"}`} style={{ pointerEvents: "auto" }}>
          <div className="flex flex-col space-y-2">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-1.5 transition-all duration-300 hover:shadow-xl">
              <div className="flex space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetCamera}
                  className="h-8 w-8 p-0 rounded-lg hover:bg-orange-50 hover:text-orange-600 transition-colors"
                  title="Reset Camera"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={zoomIn}
                  className="h-8 w-8 p-0 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={zoomOut}
                  className="h-8 w-8 p-0 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleFullscreen}
                  className="h-8 w-8 p-0 rounded-lg hover:bg-green-50 hover:text-green-600 transition-colors"
                  title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onToggleGrid}
                  className={`h-8 w-8 p-0 rounded-lg transition-colors ${
                    settings?.showGrid ? "bg-blue-50 text-blue-600 hover:bg-blue-100" : "hover:bg-gray-50"
                  }`}
                  title="Toggle Grid"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onToggleAxes}
                  className={`h-8 w-8 p-0 rounded-lg transition-colors ${
                    settings?.showAxes ? "bg-purple-50 text-purple-600 hover:bg-purple-100" : "hover:bg-gray-50"
                  }`}
                  title="Toggle Axes"
                >
                  <Move3D className="w-4 h-4" />
                </Button>
                {hasMatches && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onToggleMatches}
                    className={`h-8 w-8 p-0 rounded-lg transition-colors ${
                      showMatches ? "bg-green-50 text-green-600 hover:bg-green-100" : "hover:bg-gray-50"
                    }`}
                    title="Toggle Matches"
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                )}
                {isMobile && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onMobileMenuOpen}
                    className="h-8 w-8 p-0 rounded-lg hover:bg-gray-50"
                    title="Open Menu"
                  >
                    <Menu className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Html>
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

export function STLViewer({
  file,
  onPointSelect,
  selectedPoints,
  exportType,
  isMobile,
  onMobileMenuOpen,
  settings,
  onCameraReset,
  onZoomIn,
  onZoomOut,
  onToggleFullscreen,
  onToggleGrid,
  onToggleAxes,
  matchedShapes = [],
  showMatches = false,
  onToggleMatches,
  onScanSelect,
}: STLViewerProps) {
  const [url, setUrl] = useState<string | null>(null)
  const controlsRef = useRef<any>(null)

  useEffect(() => {
    if (file) {
      const objectUrl = URL.createObjectURL(file)
      setUrl(objectUrl)
      return () => URL.revokeObjectURL(objectUrl)
    }
  }, [file])

  return (
    <div className="relative w-full h-full">
      <div className="absolute inset-0">
        <Canvas
          shadows
          camera={{ position: [8, 8, 8], fov: 50 }}
          className="bg-gradient-to-br from-gray-50 to-gray-100"
        >
          <Suspense fallback={<LoadingFallback isMobile={isMobile} />}>
            <OrbitControls
              ref={controlsRef}
              enableDamping
              dampingFactor={0.1}
              rotateSpeed={0.7}
              minDistance={2}
              maxDistance={20}
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              screenSpacePanning={true}
              target={[0, 0, 0]}
              makeDefault
            />
            <ambientLight intensity={0.5} />
            <directionalLight
              position={[10, 10, 5]}
              intensity={1}
              castShadow
              shadow-mapSize={[2048, 2048]}
            />
            <Environment preset="city" />
            {url ? (
              <STLModel 
                url={url} 
                onPointSelect={onPointSelect} 
                settings={settings} 
                isMobile={isMobile}
                onScanSelect={onScanSelect}
              />
            ) : (
              <DefaultScene isMobile={isMobile} settings={settings} />
            )}
            {selectedPoints.length > 0 && (
              <ModelMockups
                selectedPoints={selectedPoints}
                exportType={exportType}
                isMobile={isMobile}
                settings={settings}
              />
            )}
            {matchedShapes.length > 0 && (
              <MatchedShapes matches={matchedShapes} showMatches={showMatches} isMobile={isMobile} />
            )}
            <CameraControls
              isMobile={isMobile}
              onMobileMenuOpen={onMobileMenuOpen}
              settings={settings}
              onCameraReset={onCameraReset}
              onZoomIn={onZoomIn}
              onZoomOut={onZoomOut}
              onToggleFullscreen={onToggleFullscreen}
              onToggleGrid={onToggleGrid}
              onToggleAxes={onToggleAxes}
              onToggleMatches={onToggleMatches}
              showMatches={showMatches}
              hasMatches={matchedShapes.length > 0}
            />
          </Suspense>
        </Canvas>
      </div>
    </div>
  )
}
