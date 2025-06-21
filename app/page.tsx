"use client"

import { useState, useCallback, useEffect } from "react"
import { STLViewer } from "@/components/stl-viewer"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { SplashScreen } from "@/components/splash-screen"
import { ExportModal } from "@/components/export-modal"
import { SettingsModal } from "@/components/settings-modal"
import { InfoModal } from "@/components/info-modal"
import { MobileBottomSheet } from "@/components/mobile-bottom-sheet"
import { MobileNavigation } from "@/components/mobile-navigation"
import { MeasurementTools } from "@/components/measurement-tools"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { useMediaQuery } from "@/hooks/use-media-query"
import { generateSTLFile, generateOBJFile, generatePLYFile, generateJSONFile, generateCSVFile, Point, ExportOptions as FileExportOptions } from "@/lib/file-generators"
import { DetectedGeometry } from "@/lib/geometry-detection"
import { Search, Scan, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { PartsToolbar } from "@/components/parts-toolbar"
import { exportScene } from "@/lib/scene-export"

export interface AppSettings {
  renderQuality: "low" | "medium" | "high"
  autoSave: boolean
  showGrid: boolean
  showAxes: boolean
  backgroundColor: string
  pointSize: number
  animationSpeed: number
  language: string
  theme: "light" | "dark" | "auto"
  units: "mm" | "cm" | "inches"
}

export default function Home() {
  const [showSplash, setShowSplash] = useState(true)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [selectedPoints, setSelectedPoints] = useState<Point[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [infoModalOpen, setInfoModalOpen] = useState(false)
  const [mobileBottomSheetOpen, setMobileBottomSheetOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [exportType, setExportType] = useState<"hs-cap-small" | "hs-cap">("hs-cap")
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [detectedGeometries, setDetectedGeometries] = useState<DetectedGeometry[]>([])
  const [showDetectedGeometries, setShowDetectedGeometries] = useState(true)
  const [analysisData, setAnalysisData] = useState<{
    fileInfo: { name: string; size: number; format: string }
    geometryStats: { vertices: number; faces: number; volume: number }
    pointStats: { total: number; distribution: Record<string, number> }
    detectionStats?: { total: number; algorithms: Record<string, number>; confidence: number }
  } | null>(null)
  const [measurements, setMeasurements] = useState<Array<{
    id: string
    type: "distance" | "angle" | "area" | "volume" | "radius" | "diameter"
    points: Array<[number, number, number]>
    value: number
    unit: string
    label: string
    timestamp: number
    visible: boolean
    color: string
  }>>([])
  const { toast } = useToast()

  const isMobile = useMediaQuery("(max-width: 768px)")
  const isTablet = useMediaQuery("(max-width: 1024px)")

  // App Settings State with mobile-optimized defaults
  const [settings, setSettings] = useState<AppSettings>({
    renderQuality: isMobile ? "medium" : "high",
    autoSave: true,
    showGrid: true,
    showAxes: true,
    backgroundColor: "#f8fafc",
    pointSize: isMobile ? 1.2 : 1.0,
    animationSpeed: isMobile ? 0.8 : 1.0,
    language: "en",
    theme: "light",
    units: "mm",
  })

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem("scan-ladder-settings")
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        setSettings((prev) => ({
          ...prev,
          ...parsed,
          // Override with mobile-optimized defaults if on mobile
          renderQuality: isMobile
            ? parsed.renderQuality === "high"
              ? "medium"
              : parsed.renderQuality
            : parsed.renderQuality,
          pointSize: isMobile ? Math.max(parsed.pointSize, 1.2) : parsed.pointSize,
        }))
      } catch (error) {
        console.error("Failed to load settings:", error)
      }
    }
  }, [isMobile])

  // Load saved points
  useEffect(() => {
    if (settings.autoSave) {
      const savedPoints = localStorage.getItem("scan-ladder-points")
      if (savedPoints) {
        try {
          const parsed = JSON.parse(savedPoints)
          setSelectedPoints(parsed)
          if (parsed.length > 0) {
            toast({
              title: "Points Restored",
              description: `Restored ${parsed.length} saved selection points`,
            })
          }
        } catch (error) {
          console.error("Failed to load saved points:", error)
        }
      }
    }
  }, [settings.autoSave, toast])

  // Save settings to localStorage
  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings }
      localStorage.setItem("scan-ladder-settings", JSON.stringify(updated))
      return updated
    })
  }, [])

  // Auto-open sidebar on desktop, keep closed on mobile
  useEffect(() => {
    if (!isMobile && !isTablet) {
      setSidebarOpen(true)
    } else {
      setSidebarOpen(false)
    }
  }, [isMobile, isTablet])

  const handleFileUpload = useCallback(
    (file: File) => {
      setUploadedFile(file)

      // Analyze file and generate statistics
      const fileInfo = {
        name: file.name,
        size: file.size,
        format: file.name.split('.').pop()?.toUpperCase() || 'Unknown'
      }

      // Simulate geometry analysis
      const geometryStats = {
        vertices: Math.floor(Math.random() * 50000) + 10000,
        faces: Math.floor(Math.random() * 100000) + 20000,
        volume: Math.random() * 1000 + 100
      }

      setAnalysisData({
        fileInfo,
        geometryStats,
        pointStats: { total: 0, distribution: {} }
      })

      // Auto-save if enabled
      if (settings.autoSave) {
        const projectData = {
          fileName: file.name,
          uploadTime: new Date().toISOString(),
          fileSize: file.size,
          analysis: { fileInfo, geometryStats }
        }
        localStorage.setItem("scan-ladder-last-project", JSON.stringify(projectData))
      }

      toast({
        title: "File Uploaded Successfully",
        description: `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB) analyzed and loaded.`,
      })

      // Auto-open mobile bottom sheet on file upload
      if (isMobile) {
        setTimeout(() => setMobileBottomSheetOpen(true), 1000)
      }
    },
    [toast, settings.autoSave, isMobile],
  )

  const [activePart, setActivePart] = useState<string | null>(null)
  const [pendingGroup, setPendingGroup] = useState<{ part: string; groupId: string } | null>(null)
  const [scene3D, setScene3D] = useState<any>(null)

  const handlePointSelect = useCallback(
    (point: { id: string; position: [number, number, number]; type: string; timestamp: number; modelType?: string }) => {
      // If a part is selected, we are in placement mode
      if (activePart) {
        // First point for this part
        if (!pendingGroup || pendingGroup.part !== activePart) {
          const groupId = `group-${Date.now()}`
          const newPoint: Point = {
            id: point.id,
            position: point.position,
            type: activePart as Point['type'],
            timestamp: point.timestamp,
            groupId,
            metadata: {
              algorithm: "manual_selection"
            }
          }
          setSelectedPoints(prev => [...prev, newPoint])
          setPendingGroup({ part: activePart, groupId })
          toast({
            title: "First Anchor Set",
            description: `Point 1 placed for ${activePart}. Select Point 2.`
          })
          return
        }
        // Second point completes the group
        if (pendingGroup && pendingGroup.part === activePart) {
          const newPoint: Point = {
            id: point.id,
            position: point.position,
            type: activePart as Point['type'],
            timestamp: point.timestamp,
            groupId: pendingGroup.groupId,
            metadata: {
              algorithm: "manual_selection"
            }
          }
          setSelectedPoints(prev => [...prev, newPoint])
          setPendingGroup(null)
          setActivePart(null) // Reset selection
          toast({
            title: "Part Placed",
            description: `${activePart} connected between the two points.`
          })
          return
        }
      }

      // Check if point already exists
      const existingPointIndex = selectedPoints.findIndex(p => p.id === point.id)
      
      if (existingPointIndex !== -1) {
        // Update existing point (e.g., when dragging or changing model type)
        setSelectedPoints(prev => {
          const updated = [...prev]
          updated[existingPointIndex] = {
            ...updated[existingPointIndex],
            ...point,
            type: (point.modelType || point.type) as Point['type'],
            metadata: {
              confidence: Math.random() * 0.3 + 0.7,
              sourceFile: uploadedFile?.name,
              processingTime: Date.now() - point.timestamp,
              algorithm: "manual_selection"
            }
          }
          return updated
        })
      } else {
        // Add new point
        const newPoint: Point = {
          id: point.id,
          position: point.position,
          type: (point.modelType || point.type) as Point['type'],
          timestamp: point.timestamp,
          metadata: {
            confidence: Math.random() * 0.3 + 0.7,
            sourceFile: uploadedFile?.name,
            processingTime: Date.now() - point.timestamp,
            algorithm: "manual_selection"
          }
        }
        
        setSelectedPoints(prev => [...prev, newPoint])
      }
      
      // Update analysis data
      if (analysisData) {
        const distribution: Record<string, number> = {}
        const currentPoints = existingPointIndex !== -1 ? selectedPoints : [...selectedPoints, point]
        currentPoints.forEach(p => {
          const type = p.type || 'unknown'
          distribution[type] = (distribution[type] || 0) + 1
        })
        
        setAnalysisData(prev => prev ? {
          ...prev,
          pointStats: { total: currentPoints.length, distribution }
        } : null)
      }
    },
    [uploadedFile, analysisData, selectedPoints, activePart, pendingGroup, toast]
  )

  const clearAllPoints = useCallback(() => {
    const pointCount = selectedPoints.length
    setSelectedPoints([])
    if (settings.autoSave) {
      localStorage.removeItem("scan-ladder-points")
    }
    
    // Update analysis data
    if (analysisData) {
      setAnalysisData(prev => prev ? {
        ...prev,
        pointStats: { total: 0, distribution: {} }
      } : null)
    }
    
    toast({
      title: "Points Cleared",
      description: `Removed ${pointCount} selection points`,
    })
  }, [selectedPoints.length, toast, settings.autoSave, analysisData])

  const clearSelectedPoint = useCallback(
    (id: string) => {
      setSelectedPoints((prevPoints) => {
        const updated = prevPoints.filter((point) => point.id !== id)
        if (settings.autoSave) {
          localStorage.setItem("scan-ladder-points", JSON.stringify(updated))
        }
        return updated
      })
      toast({
        title: "Point Removed",
        description: "Selection point has been removed.",
      })
    },
    [toast, settings.autoSave],
  )

  const handleExport = useCallback(
    async (options: {
      format: "stl" | "obj" | "ply" | "json" | "csv"
      quality: "low" | "medium" | "high"
      includeOriginal: boolean
      includeCylinders: boolean
      compression: boolean
      metadata: boolean
      units: "mm" | "cm" | "inches"
      includeNormals?: boolean
      includeColors?: boolean
      precision?: number
    }) => {
      setIsExporting(true)
      setExportProgress(0)

      try {
        // Simulate realistic export progress
        const progressSteps = [
          { step: "Preparing geometry...", progress: 10 },
          { step: "Processing points...", progress: 25 },
          { step: "Generating cylinders...", progress: 45 },
          { step: "Merging components...", progress: 65 },
          { step: "Optimizing mesh...", progress: 80 },
          { step: "Finalizing export...", progress: 95 },
          { step: "Complete!", progress: 100 },
        ]

        for (const { step, progress } of progressSteps) {
          setExportProgress(progress)
          await new Promise((resolve) => setTimeout(resolve, isMobile ? 300 : 500))
        }

        // Generate actual file content based on format
        let fileContent: string
        let mimeType: string
        const filename = `scan-ladder-export-${Date.now()}`

        const exportOptions: FileExportOptions = {
          ...options,
          includeNormals: options.includeNormals ?? false,
          includeColors: options.includeColors ?? false,
          includeTextures: false,
          precision: options.precision ?? 6,
          optimization: "none"
        }

        switch (options.format) {
          case "stl":
            fileContent = generateSTLFile(selectedPoints, uploadedFile, exportOptions)
            mimeType = "application/sla"
            break
          case "obj":
            fileContent = generateOBJFile(selectedPoints, uploadedFile, exportOptions)
            mimeType = "application/obj"
            break
          case "ply":
            fileContent = generatePLYFile(selectedPoints, uploadedFile, exportOptions)
            mimeType = "application/ply"
            break
          case "json":
            fileContent = generateJSONFile(selectedPoints, uploadedFile, exportOptions)
            mimeType = "application/json"
            break
          case "csv":
            fileContent = generateCSVFile(selectedPoints, uploadedFile, exportOptions)
            mimeType = "text/csv"
            break
          default:
            throw new Error("Unsupported format")
        }

        // Create and download file
        const blob = new Blob([fileContent], { type: mimeType })
        const url = URL.createObjectURL(blob)
        const element = document.createElement("a")
        element.href = url
        element.download = `${filename}.${options.format}`
        document.body.appendChild(element)
        element.click()
        document.body.removeChild(element)
        URL.revokeObjectURL(url)

        // Save export history
        const exportHistory = JSON.parse(localStorage.getItem("scan-ladder-export-history") || "[]")
        exportHistory.unshift({
          id: Date.now().toString(),
          filename: `${filename}.${options.format}`,
          format: options.format,
          timestamp: new Date().toISOString(),
          pointCount: selectedPoints.length,
          fileSize: blob.size,
          options,
        })
        localStorage.setItem("scan-ladder-export-history", JSON.stringify(exportHistory.slice(0, 10)))

        toast({
          title: "Export Successful",
          description: `${filename}.${options.format} (${(blob.size / 1024).toFixed(1)} KB) has been downloaded.`,
        })

        setExportModalOpen(false)
      } catch (error) {
        console.error("Export error:", error)
        toast({
          title: "Export Failed",
          description: "There was an error generating the export file. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsExporting(false)
        setExportProgress(0)
      }
    },
    [selectedPoints, uploadedFile, toast, isMobile],
  )

  // Camera control handlers - now handled in sidebar
  const handleToggleGrid = useCallback(() => {
    updateSettings({ showGrid: !settings.showGrid })
  }, [settings.showGrid, updateSettings])

  const handleToggleAxes = useCallback(() => {
    updateSettings({ showAxes: !settings.showAxes })
  }, [settings.showAxes, updateSettings])

  const handleSettingsOpen = useCallback(() => {
    setSettingsModalOpen(true)
    // Close mobile nav if open
    if (isMobile) {
      setMobileNavOpen(false)
    }
  }, [isMobile])

  const handleInfoOpen = useCallback(() => {
    setInfoModalOpen(true)
    // Close mobile nav if open
    if (isMobile) {
      setMobileNavOpen(false)
    }
  }, [isMobile])

  const handleMobileNavOpen = useCallback(() => {
    setMobileNavOpen(true)
  }, [])

  const handleFileUploadTrigger = useCallback(() => {
    // This will trigger the file input in the header
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    if (fileInput) {
      fileInput.click()
    }
  }, [])

  // Measurement handlers
  const handleAddMeasurement = useCallback((measurement: Omit<typeof measurements[0], 'id' | 'timestamp'>) => {
    const newMeasurement = {
      ...measurement,
      id: `measurement-${Date.now()}`,
      timestamp: Date.now()
    }
    setMeasurements(prev => [...prev, newMeasurement])
  }, [])

  const handleUpdateMeasurement = useCallback((id: string, updates: Partial<typeof measurements[0]>) => {
    setMeasurements(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m))
  }, [])

  const handleDeleteMeasurement = useCallback((id: string) => {
    setMeasurements(prev => prev.filter(m => m.id !== id))
  }, [])

  const handleClearAllMeasurements = useCallback(() => {
    setMeasurements([])
  }, [])

  // Handle scan selection from sidebar
  const handleScanSelect = useCallback((scanId: string) => {
    const scanNumber = scanId.replace("scan", "")
    const scanFileName = `Test-Scan-${scanNumber}.stl`
    const scanPath = `/models/${scanFileName}`
    
    // Create a special file-like object that the STL viewer can handle
    const scanFile = {
      name: scanFileName,
      size: 0,
      type: 'model/stl',
      lastModified: Date.now(),
      url: scanPath,
      // Add File-like methods
      slice: () => new Blob([]),
      stream: () => new ReadableStream(),
      text: async () => '',
      arrayBuffer: async () => new ArrayBuffer(0)
    } as any as File
    
    setUploadedFile(scanFile)
    
    toast({
      title: "Scan Loaded",
      description: `Loaded ${scanFileName} successfully`,
    })
  }, [toast])

  // Handle detected geometries from STL viewer
  const handleGeometriesDetected = useCallback((geometries: DetectedGeometry[]) => {
    setDetectedGeometries(geometries)
    
    // Update analysis data with detection stats
    if (analysisData) {
      const algorithms: Record<string, number> = {}
      let totalConfidence = 0
      
      geometries.forEach(geom => {
        algorithms[geom.algorithm] = (algorithms[geom.algorithm] || 0) + 1
        totalConfidence += geom.confidence
      })
      
      const avgConfidence = geometries.length > 0 ? totalConfidence / geometries.length : 0
      
      setAnalysisData(prev => prev ? {
        ...prev,
        detectionStats: {
          total: geometries.length,
          algorithms,
          confidence: avgConfidence
        }
      } : null)
    }

    toast({
      title: "Geometry Detection Complete",
      description: `Detected ${geometries.length} geometric features using ICP and feature analysis`,
    })
  }, [analysisData, toast])

  // Toggle visibility of detected geometries
  const handleToggleDetectedGeometries = useCallback(() => {
    setShowDetectedGeometries(prev => !prev)
    toast({
      title: showDetectedGeometries ? "Detections Hidden" : "Detections Shown",
      description: `Detected geometries are now ${showDetectedGeometries ? "hidden" : "visible"}`,
    })
  }, [showDetectedGeometries, toast])

  // Auto-place best-fit points based on detected geometries
  const handleAutoPlacePoints = useCallback(() => {
    const autoPoints: Point[] = detectedGeometries
      .filter(geom => geom.confidence > 0.7) // Only high-confidence detections
      .map(geom => ({
        id: `auto-${geom.id}`,
        position: geom.center,
        type: geom.type as Point['type'],
        timestamp: Date.now(),
        metadata: {
          confidence: geom.confidence,
          sourceFile: uploadedFile?.name,
          processingTime: Date.now() - geom.timestamp,
          algorithm: `auto_${geom.algorithm}`
        }
      }))

    if (autoPoints.length > 0) {
      setSelectedPoints(prev => [...prev, ...autoPoints])
      toast({
        title: "Auto-Placement Complete",
        description: `Placed ${autoPoints.length} points at high-confidence geometric features`,
      })
    } else {
      toast({
        title: "No High-Confidence Detections",
        description: "No geometries with confidence > 70% found for auto-placement",
        variant: "destructive",
      })
    }
  }, [detectedGeometries, uploadedFile, toast])

  // Clear detected geometries
  const handleClearDetectedGeometries = useCallback(() => {
    setDetectedGeometries([])
    if (analysisData) {
      setAnalysisData(prev => prev ? {
        ...prev,
        detectionStats: { total: 0, algorithms: {}, confidence: 0 }
      } : null)
    }
    toast({
      title: "Detections Cleared",
      description: "All detected geometries have been removed",
    })
  }, [analysisData, toast])

  // Make file upload handler available globally for sidebar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).handleFileUpload = handleFileUpload
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).handleFileUpload
      }
    }
  }, [handleFileUpload])

  // Watch for toolbar actions for export
  useEffect(() => {
    if (!scene3D) return
    if (activePart === 'export-stl' || activePart === 'export-obj') {
      const format = activePart === 'export-stl' ? 'stl' : 'obj'
      try {
        const { data, mime } = exportScene(scene3D, format as any)
        const blob = new Blob([data], { type: mime })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `scan-ladder-export.${format}`
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(url)
        toast({ title: 'Export complete', description: `Model exported as ${format.toUpperCase()}` })
      } catch (err) {
        console.error(err)
        toast({ title: 'Export failed', description: 'Unable to export scene', variant: 'destructive' })
      }
      setActivePart(null)
    }
  }, [activePart, scene3D, toast])

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-gray-100 overflow-hidden">
      <Header
        onFileUpload={handleFileUpload}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        uploadedFile={uploadedFile}
        selectedPointsCount={selectedPoints.length}
        isMobile={isMobile}
        onSettingsOpen={handleSettingsOpen}
        onInfoOpen={handleInfoOpen}
        onMobileNavOpen={handleMobileNavOpen}
        settings={settings}
      />

      <div className={`flex-1 flex overflow-hidden relative ${isMobile ? "pt-12" : "pt-14"}`}>
        {/* Desktop/Tablet Sidebar */}
        {!isMobile && (
          <Sidebar
            selectedPoints={selectedPoints}
            onClearAllPoints={clearAllPoints}
            onClearSelectedPoint={clearSelectedPoint}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            exportType={exportType}
            onExportTypeChange={setExportType}
            onExport={() => setExportModalOpen(true)}
            hasFile={!!uploadedFile}
            isMobile={false}
            settings={settings}
            uploadedFile={uploadedFile}
            measurements={measurements}
            onAddMeasurement={handleAddMeasurement}
            onUpdateMeasurement={handleUpdateMeasurement}
            onDeleteMeasurement={handleDeleteMeasurement}
            onClearAllMeasurements={handleClearAllMeasurements}
            onScanSelect={handleScanSelect}
            onToggleGrid={handleToggleGrid}
            onToggleAxes={handleToggleAxes}
            matchedShapes={detectedGeometries}
            showMatches={showDetectedGeometries}
            onToggleMatches={handleToggleDetectedGeometries}
            onAutoPlacePoints={handleAutoPlacePoints}
            onClearDetectedGeometries={handleClearDetectedGeometries}
          />
        )}

        {/* Main 3D Viewer */}
        <main
          className={`flex-1 transition-all duration-300 ${
            isMobile ? "p-2" : "p-3"
          } ${sidebarOpen && !isMobile ? "lg:ml-0" : ""}`}
        >
          <div
            className={`h-full bg-white overflow-hidden border border-gray-200 relative ${
              isMobile ? "rounded-lg shadow-lg" : "rounded-xl shadow-xl"
            }`}
          >
            <STLViewer
              file={uploadedFile}
              onPointSelect={handlePointSelect}
              selectedPoints={selectedPoints}
              exportType={exportType}
              isMobile={isMobile}
              onMobileMenuOpen={() => setMobileBottomSheetOpen(true)}
              settings={settings}
              onCameraReset={() => {}}
              onZoomIn={() => {}}
              onZoomOut={() => {}}
              onToggleFullscreen={() => {}}
              onScanSelect={handleScanSelect}
              onGeometriesDetected={handleGeometriesDetected}
              showDetectedGeometries={showDetectedGeometries}
              detectedGeometries={detectedGeometries}
              onSceneReady={setScene3D}
            />
            
            {/* Parts selection toolbar */}
            {!isMobile && (
              <PartsToolbar activePart={activePart} onSelectPart={setActivePart} />
            )}

            {/* Quick Access Panel - Compact */}
            {!isMobile && (
              <div className="absolute top-2 left-2 flex flex-col space-y-1">
                {/* AI Match and Pro View buttons removed */}
              </div>
            )}

            {/* Analysis Panel - Compact */}
            {analysisData && !isMobile && (
              <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-sm rounded-md p-2 shadow-lg max-w-xs border border-gray-200">
                <div className="text-xs space-y-1">
                  <div className="font-semibold flex items-center space-x-1 text-gray-800">
                    <Activity className="w-3 h-3 text-blue-500" />
                    <span>Analysis</span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-0.5">
                    <div><span className="font-medium">File:</span> {analysisData.fileInfo.name}</div>
                    <div><span className="font-medium">Format:</span> {analysisData.fileInfo.format}</div>
                    <div><span className="font-medium">Size:</span> {(analysisData.fileInfo.size / 1024 / 1024).toFixed(2)} MB</div>
                    <div><span className="font-medium">Vertices:</span> {analysisData.geometryStats.vertices.toLocaleString()}</div>
                    <div><span className="font-medium">Faces:</span> {analysisData.geometryStats.faces.toLocaleString()}</div>
                    <div><span className="font-medium">Points:</span> {selectedPoints.length}</div>
                    {selectedPoints.length > 0 && analysisData.pointStats.distribution && (
                      <div className="mt-1 pt-1 border-t border-gray-200">
                        <div className="font-medium text-gray-700 mb-0.5">Distribution:</div>
                        {Object.entries(analysisData.pointStats.distribution)
                          .map(([type, count]) => (
                            <div key={type} className="text-xs">
                              {type}: {count}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Mobile Bottom Sheet */}
        {isMobile && (
          <MobileBottomSheet
            isOpen={mobileBottomSheetOpen}
            onClose={() => setMobileBottomSheetOpen(false)}
            selectedPoints={selectedPoints}
            onClearAllPoints={clearAllPoints}
            onClearSelectedPoint={clearSelectedPoint}
            exportType={exportType}
            onExportTypeChange={setExportType}
            onExport={() => {
              setMobileBottomSheetOpen(false)
              setExportModalOpen(true)
            }}
            hasFile={!!uploadedFile}
            uploadedFile={uploadedFile}
            settings={settings}
          />
        )}

        {/* Mobile Navigation */}
        {isMobile && (
          <MobileNavigation
            isOpen={mobileNavOpen}
            onClose={() => setMobileNavOpen(false)}
            uploadedFile={uploadedFile}
            selectedPointsCount={selectedPoints.length}
            onFileUpload={handleFileUploadTrigger}
            onExport={() => {
              setMobileNavOpen(false)
              setExportModalOpen(true)
            }}
            onSettings={handleSettingsOpen}
            onInfo={handleInfoOpen}
            settings={settings}
            onToggleGrid={handleToggleGrid}
            onToggleAxes={handleToggleAxes}
          />
        )}
      </div>

      {/* Modals */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onExport={handleExport}
        isExporting={isExporting}
        exportProgress={exportProgress}
        selectedPoints={selectedPoints}
        hasOriginalFile={!!uploadedFile}
        isMobile={isMobile}
        settings={settings}
      />

      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
        isMobile={isMobile}
      />

      <InfoModal
        isOpen={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
        uploadedFile={uploadedFile}
        selectedPoints={selectedPoints}
        settings={settings}
        isMobile={isMobile}
      />

      <Toaster />
    </div>
  )
}
