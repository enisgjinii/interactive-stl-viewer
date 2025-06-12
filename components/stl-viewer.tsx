"use client"

import { Suspense, useRef, useState, useEffect, useCallback } from "react"
import { Canvas, useThree } from "@react-three/fiber"
import { OrbitControls, Environment, Html, Text } from "@react-three/drei"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import * as THREE from "three"
import { Button } from "@/components/ui/button"
import { RotateCcw, ZoomIn, ZoomOut, Move3D, Maximize2, Menu, Grid3X3, Eye, EyeOff, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import type { MatchResult } from "@/lib/shape-matching"

interface STLViewerProps {
  file: File | null
  onPointSelect: (point: { id: string; position: [number, number, number] }) => void
  selectedPoints: Array<{ id: string; position: [number, number, number]; type: string; timestamp: number }>
  exportType: "hs-cap-small" | "hs-cap"
  isMobile: boolean
  onMobileMenuOpen: () => void
  settings: any
  onCameraReset?: () => void
  onZoomIn?: () => void
  onZoomOut?: () => void
  onToggleFullscreen?: () => void
  onToggleGrid?: () => void
  onToggleAxes?: () => void
  matchedShapes?: MatchResult[]
  showMatches?: boolean
  onToggleMatches?: () => void
}

function STLModel({
  url,
  onPointSelect,
  settings,
  isMobile,
}: {
  url: string
  onPointSelect: (point: { id: string; position: [number, number, number] }) => void
  settings: any
  isMobile: boolean
}) {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    let isMounted = true
    const loader = new STLLoader()

    const loadSTL = async () => {
      try {
        setLoading(true)
        setError(null)
        setLoadingProgress(0)

        const loadGeometry = new Promise<THREE.BufferGeometry>((resolve, reject) => {
          loader.load(
            url,
            (geometry) => {
              if (isMounted) {
                setLoadingProgress(100)
                resolve(geometry)
              }
            },
            (progress) => {
              if (isMounted && progress.total > 0) {
                const percent = Math.round((progress.loaded / progress.total) * 100)
                setLoadingProgress(percent)
              }
            },
            (error) => {
              console.error("STL loading error:", error)
              reject(error)
            },
          )
        })

        const loadedGeometry = await loadGeometry

        if (isMounted) {
          loadedGeometry.computeBoundingBox()
          loadedGeometry.center()
          loadedGeometry.computeVertexNormals()

          const box = new THREE.Box3().setFromBufferGeometry(loadedGeometry)
          const size = box.getSize(new THREE.Vector3())
          const maxDimension = Math.max(size.x, size.y, size.z)

          if (maxDimension > 10) {
            const scale = 10 / maxDimension
            loadedGeometry.scale(scale, scale, scale)
          }

          setGeometry(loadedGeometry)
          setLoading(false)

          toast({
            title: "3D Model Loaded",
            description: `STL file loaded successfully (${(size.x * size.y * size.z).toFixed(1)} cubic units)`,
          })
        }
      } catch (err) {
        console.error("Failed to load STL:", err)
        if (isMounted) {
          setError("Failed to load STL file. Please check the file format.")
          setLoading(false)

          toast({
            title: "Loading Error",
            description: "Failed to load STL file. Please try a different file.",
            variant: "destructive",
          })
        }
      }
    }

    loadSTL()

    return () => {
      isMounted = false
      if (geometry) {
        geometry.dispose()
      }
    }
  }, [url, toast])

  const handleClick = useCallback(
    (event: any) => {
      event.stopPropagation()
      if (event.point) {
        const point = event.point
        const id = Date.now().toString()
        onPointSelect({
          id,
          position: [point.x, point.y, point.z],
        })

        // Haptic feedback for mobile
        if (isMobile && navigator.vibrate) {
          navigator.vibrate(50)
        }
      }
    },
    [onPointSelect, isMobile],
  )

  if (loading) {
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
    return null
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

function CylinderMockups({
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
  return (
    <>
      {selectedPoints.map((point, index) => {
        const isSmallCap = point.type === "hs-cap-small"
        const scale = (isSmallCap ? 0.8 : 1.0) * (settings?.pointSize || 1.0)
        const color = isSmallCap ? "#fbbf24" : "#f97316"

        return (
          <group key={point.id} position={point.position} scale={scale}>
            <mesh castShadow>
              <cylinderGeometry args={[0.3, 0.3, 0.8, 8]} />
              <meshStandardMaterial color="#4a5568" roughness={0.3} metalness={0.7} />
            </mesh>
            <mesh position={[0, 0.5, 0]} castShadow>
              <cylinderGeometry args={[0.2, 0.2, 0.3, 8]} />
              <meshStandardMaterial color={color} roughness={0.2} metalness={0.8} />
            </mesh>
            <Html distanceFactor={isMobile ? 20 : 15} position={[0, 1.2, 0]}>
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
    toast({
      title: "Camera Reset",
      description: "Camera position has been reset to default view",
    })
  }, [camera, toast, onCameraReset])

  const zoomIn = useCallback(() => {
    camera.position.multiplyScalar(0.8)
    onZoomIn?.()
    toast({
      title: "Zoomed In",
      description: "Camera moved closer to the model",
    })
  }, [camera, toast, onZoomIn])

  const zoomOut = useCallback(() => {
    camera.position.multiplyScalar(1.2)
    onZoomOut?.()
    toast({
      title: "Zoomed Out",
      description: "Camera moved away from the model",
    })
  }, [camera, toast, onZoomOut])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      gl.domElement.parentElement?.requestFullscreen()
      setIsFullscreen(true)
      onToggleFullscreen?.()
      toast({
        title: "Fullscreen Mode",
        description: "Entered fullscreen viewing mode",
      })
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
      onToggleFullscreen?.()
      toast({
        title: "Windowed Mode",
        description: "Exited fullscreen mode",
      })
    }
  }, [gl, toast, onToggleFullscreen])

  const toggleGrid = useCallback(() => {
    onToggleGrid?.()
    toast({
      title: "Grid Toggled",
      description: `Reference grid ${settings?.showGrid ? "hidden" : "shown"}`,
    })
  }, [toast, onToggleGrid, settings])

  const toggleAxes = useCallback(() => {
    onToggleAxes?.()
    toast({
      title: "Axes Toggled",
      description: `Coordinate axes ${settings?.showAxes ? "hidden" : "shown"}`,
    })
  }, [toast, onToggleAxes, settings])

  const toggleMatches = useCallback(() => {
    onToggleMatches?.()
    toast({
      title: "Matches Toggled",
      description: `Matched shapes ${showMatches ? "hidden" : "shown"}`,
    })
  }, [toast, onToggleMatches, showMatches])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  return (
    <Html position={[0, 0, 0]} style={{ pointerEvents: "none" }}>
      <div className={`fixed z-10 ${isMobile ? "top-2 right-2" : "top-4 right-4"}`} style={{ pointerEvents: "auto" }}>
        <div
          className={`bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 ${
            isMobile ? "p-1" : "p-2"
          } transition-all duration-300 hover:shadow-xl`}
        >
          {isMobile ? (
            /* Mobile: Horizontal layout with essential controls */
            <div className="flex space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={onMobileMenuOpen}
                className="hover:bg-blue-50 h-10 w-10 p-0 rounded-lg"
                title="Open Menu"
              >
                <Menu className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetCamera}
                className="hover:bg-orange-50 h-10 w-10 p-0 rounded-lg"
                title="Reset Camera"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleGrid}
                className={`h-10 w-10 p-0 rounded-lg ${
                  settings?.showGrid ? "bg-green-50 hover:bg-green-100" : "hover:bg-gray-50"
                }`}
                title="Toggle Grid"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              {hasMatches && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleMatches}
                  className={`h-10 w-10 p-0 rounded-lg ${
                    showMatches ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-gray-50"
                  }`}
                  title="Toggle Matches"
                >
                  <Search className="w-4 h-4" />
                </Button>
              )}
            </div>
          ) : (
            /* Desktop: Vertical layout with full controls */
            <div className="flex flex-col space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetCamera}
                className="hover:bg-orange-50 transition-colors"
                title="Reset Camera"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={zoomIn}
                className="hover:bg-blue-50 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={zoomOut}
                className="hover:bg-blue-50 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
                className="hover:bg-green-50 transition-colors"
                title="Toggle Fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
              <div className="border-t border-gray-200 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleGrid}
                  className={`mb-1 transition-colors ${
                    settings?.showGrid ? "bg-green-50 hover:bg-green-100" : "hover:bg-gray-50"
                  }`}
                  title="Toggle Grid"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAxes}
                  className={`mb-1 transition-colors ${
                    settings?.showAxes ? "bg-purple-50 hover:bg-purple-100" : "hover:bg-gray-50"
                  }`}
                  title="Toggle Axes"
                >
                  {settings?.showAxes ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </Button>
                {hasMatches && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleMatches}
                    className={`transition-colors ${showMatches ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-gray-50"}`}
                    title="Toggle Matches"
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Html>
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
}: STLViewerProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (file) {
      try {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl)
        }

        const url = URL.createObjectURL(file)
        setObjectUrl(url)
        setError(null)

        return () => {
          URL.revokeObjectURL(url)
        }
      } catch (err) {
        console.error("Failed to create object URL:", err)
        setError("Failed to load STL file")
      }
    } else {
      setObjectUrl(null)
      setError(null)
    }
  }, [file])

  const backgroundColor = settings?.backgroundColor || "#f8fafc"
  const showGrid = settings?.showGrid !== false
  const showAxes = settings?.showAxes === true
  const renderQuality = settings?.renderQuality || (isMobile ? "medium" : "high")

  return (
    <div className="w-full h-full relative overflow-hidden">
      <Canvas
        camera={{ position: [8, 8, 8], fov: isMobile ? 65 : 50 }}
        style={{
          background: `linear-gradient(135deg, ${backgroundColor} 0%, #e2e8f0 100%)`,
          touchAction: "none", // Prevent default touch behaviors
        }}
        shadows
        gl={{
          antialias: renderQuality !== "low",
          alpha: true,
          powerPreference: "high-performance",
        }}
        dpr={isMobile ? 1 : Math.min(window.devicePixelRatio, renderQuality === "high" ? 2 : 1)}
      >
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={renderQuality === "high" ? 2048 : 1024}
          shadow-mapSize-height={renderQuality === "high" ? 2048 : 1024}
          shadow-camera-far={50}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        <pointLight position={[-10, -10, -5]} intensity={0.3} />
        <spotLight position={[0, 20, 0]} angle={0.3} penumbra={1} intensity={0.5} castShadow />

        <Suspense fallback={<LoadingFallback isMobile={isMobile} />}>
          <Environment preset="city" />

          {error ? (
            <Html center>
              <div className={`bg-red-50 border border-red-200 rounded-lg text-red-700 ${isMobile ? "p-3" : "p-4"}`}>
                <p className="font-semibold">Error loading file</p>
                <p className="text-sm">{error}</p>
              </div>
            </Html>
          ) : objectUrl ? (
            <STLModel url={objectUrl} onPointSelect={onPointSelect} settings={settings} isMobile={isMobile} />
          ) : (
            <DefaultScene isMobile={isMobile} settings={settings} />
          )}

          <CylinderMockups
            selectedPoints={selectedPoints}
            exportType={exportType}
            isMobile={isMobile}
            settings={settings}
          />

          <MatchedShapes matches={matchedShapes} showMatches={showMatches} isMobile={isMobile} />

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

          {/* Enhanced ground plane with grid */}
          {showGrid && (
            <>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
                <planeGeometry args={[50, 50]} />
                <meshStandardMaterial color="#f1f5f9" opacity={0.8} transparent />
              </mesh>
              <gridHelper args={[20, 20, "#e2e8f0", "#f1f5f9"]} position={[0, -1.99, 0]} />
            </>
          )}

          {/* Coordinate axes */}
          {showAxes && (
            <group>
              <arrowHelper args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 2, 0xff0000]} />
              <arrowHelper args={[new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 2, 0x00ff00]} />
              <arrowHelper args={[new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), 2, 0x0000ff]} />
            </group>
          )}
        </Suspense>

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          dampingFactor={0.05}
          enableDamping={true}
          maxPolarAngle={Math.PI / 2}
          minDistance={2}
          maxDistance={50}
          touchAction="pan-y"
          // Enhanced mobile controls
          rotateSpeed={isMobile ? 0.8 : 1.0}
          zoomSpeed={isMobile ? 0.8 : 1.0}
          panSpeed={isMobile ? 0.8 : 1.0}
        />
      </Canvas>

      {/* No File State */}
      {!file && !error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className={`text-center text-gray-600 bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 mx-4 ${
              isMobile ? "p-6 max-w-xs" : "p-8 max-w-md"
            }`}
          >
            <div className={`mb-4 ${isMobile ? "text-4xl" : "text-6xl"}`}>🦷</div>
            <h3 className={`font-bold mb-3 text-gray-800 ${isMobile ? "text-lg" : "text-xl"}`}>No STL File Loaded</h3>
            <p className={`mb-2 ${isMobile ? "text-xs" : "text-sm"}`}>
              {isMobile ? "Upload an STL file to begin" : "Upload an STL file to begin processing"}
            </p>
            <p
              className={`opacity-75 bg-orange-100 text-orange-800 px-3 py-1 rounded-full inline-block ${
                isMobile ? "text-xs" : "text-xs"
              }`}
            >
              {isMobile ? "Demo mode" : "Showing demo dental scan bodies"}
            </p>
            {isMobile && (
              <div className="mt-4 text-xs text-gray-500">
                <div>👆 Tap to add points</div>
                <div>🤏 Pinch to zoom</div>
                <div>👋 Drag to rotate</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Controls Guide - Desktop Only */}
      {!isMobile && (
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl p-4 text-xs text-gray-700 shadow-lg border border-gray-200 max-w-xs">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 mb-3">
              <Move3D className="w-4 h-4 text-orange-500" />
              <strong className="text-gray-800">3D Controls</strong>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Rotate:</span>
                <span className="text-gray-500">Left click + drag</span>
              </div>
              <div className="flex justify-between">
                <span>Pan:</span>
                <span className="text-gray-500">Right click + drag</span>
              </div>
              <div className="flex justify-between">
                <span>Zoom:</span>
                <span className="text-gray-500">Scroll wheel</span>
              </div>
              <div className="flex justify-between">
                <span>Add Point:</span>
                <span className="text-gray-500">Click on model</span>
              </div>
              {matchedShapes.length > 0 && (
                <div className="flex justify-between">
                  <span>Toggle Matches:</span>
                  <span className="text-gray-500">Search button</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced stats display */}
      <div
        className={`absolute z-10 bg-white/95 backdrop-blur-sm rounded-lg text-gray-700 shadow-lg border border-gray-200 ${
          isMobile ? "top-2 left-2 p-2 text-xs" : "top-4 left-4 p-3 text-xs"
        }`}
      >
        <div className="space-y-1">
          <div className="font-semibold text-gray-800 flex items-center space-x-2">
            <span>{isMobile ? "Stats" : "Session Stats"}</span>
            {selectedPoints.length > 0 && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>}
          </div>
          <div>
            Points: <span className="font-mono text-orange-600">{selectedPoints.length}</span>
          </div>
          <div>
            File: <span className="font-mono text-blue-600">{file ? "Loaded" : "Demo"}</span>
          </div>
          {matchedShapes.length > 0 && (
            <div>
              Matches: <span className="font-mono text-green-600">{matchedShapes.length}</span>
            </div>
          )}
          {!isMobile && (
            <>
              <div>
                Type: <span className="font-mono text-purple-600">{exportType}</span>
              </div>
              <div>
                Quality: <span className="font-mono text-green-600">{renderQuality}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile Touch Hint */}
      {isMobile && selectedPoints.length === 0 && !file && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-orange-500/90 text-white px-4 py-2 rounded-full text-xs font-medium shadow-lg animate-bounce">
          👆 Tap on 3D objects to add points
        </div>
      )}

      {/* Mobile Performance Indicator */}
      {isMobile && (
        <div className="absolute bottom-2 right-2">
          <Badge variant="outline" className="bg-white/90 text-xs">
            {renderQuality} quality
          </Badge>
        </div>
      )}

      {/* Matches Indicator */}
      {matchedShapes.length > 0 && (
        <div className="absolute top-2 right-2">
          <Badge
            variant="outline"
            className={`text-xs ${showMatches ? "bg-blue-50 text-blue-700 border-blue-300" : "bg-gray-50 text-gray-700"}`}
          >
            <Search className="w-3 h-3 mr-1" />
            {matchedShapes.length} matches
          </Badge>
        </div>
      )}
    </div>
  )
}
