"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { STLViewer } from "@/components/stl-viewer"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { SplashScreen } from "@/components/splash-screen"
import { ExportModal } from "@/components/export-modal"
import { SettingsModal } from "@/components/settings-modal"
import { InfoModal } from "@/components/info-modal"
import { MobileBottomSheet } from "@/components/mobile-bottom-sheet"
import { MobileNavigation } from "@/components/mobile-navigation"
import { PartsToolbar } from "@/components/parts-toolbar"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { useMediaQuery } from "@/hooks/use-media-query"
import { generateSTLFile, generateOBJFile, generatePLYFile, generateJSONFile, generateCSVFile, Point, ExportOptions as FileExportOptions } from "@/lib/file-generators"
import { DetectedGeometry } from "@/lib/geometry-detection"
import { Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
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
  const [mainModel, setMainModel] = useState<File | null>(null) // Main test model
  const [selectedParts, setSelectedParts] = useState<Array<{
    id: string
    type: string
    position: [number, number, number]
    rotation: [number, number, number]
    scale: [number, number, number]
    timestamp: number
  }>>([]) // Parts placed on main model
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

      // Simplified file info without heavy analysis
      const fileInfo = {
        name: file.name,
        size: file.size,
        format: file.name.split('.').pop()?.toUpperCase() || 'Unknown'
      }

      // Auto-save if enabled
      if (settings.autoSave) {
        const projectData = {
          fileName: file.name,
          uploadTime: new Date().toISOString(),
          fileSize: file.size,
        }
        localStorage.setItem("scan-ladder-last-project", JSON.stringify(projectData))
      }

      toast({
        title: "File Uploaded Successfully",
        description: `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB) loaded.`,
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
        // Add the part at the clicked position
        const newPart = {
          id: `part-${Date.now()}-${Math.random()}`,
          type: activePart,
          position: point.position,
          rotation: [0, 0, 0] as [number, number, number],
          scale: [1, 1, 1] as [number, number, number],
          timestamp: Date.now()
        }
        
        setSelectedParts(prev => [...prev, newPart])
        setActivePart(null) // Reset selection
        
        toast({
          title: "Part Placed",
          description: `${activePart} part placed at the selected position.`,
        })
        return
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
    },
    [uploadedFile, selectedPoints, activePart, toast]
  )

  const clearAllPoints = useCallback(() => {
    const pointCount = selectedPoints.length
    setSelectedPoints([])
    if (settings.autoSave) {
      localStorage.removeItem("scan-ladder-points")
    }
    
    toast({
      title: "Points Cleared",
      description: `Removed ${pointCount} selection points`,
    })
  }, [selectedPoints.length, toast, settings.autoSave])

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
    }) => {
      setIsExporting(true)
      setExportProgress(0)

      try {
        const exportOptions: FileExportOptions = {
          format: options.format,
          quality: options.quality,
          includeOriginal: options.includeOriginal,
          includeCylinders: true,
          compression: false,
          metadata: true,
          units: settings.units,
          includeNormals: false,
          includeColors: false,
          includeTextures: false,
          precision: 6,
          optimization: "none"
        }

        let data: string | ArrayBuffer
        let mimeType: string
        let extension: string

        switch (options.format) {
          case "stl":
            data = generateSTLFile(selectedPoints, uploadedFile, exportOptions)
            mimeType = "application/octet-stream"
            extension = "stl"
            break
          case "obj":
            data = generateOBJFile(selectedPoints, uploadedFile, exportOptions)
            mimeType = "text/plain"
            extension = "obj"
            break
          case "ply":
            data = generatePLYFile(selectedPoints, uploadedFile, exportOptions)
            mimeType = "text/plain"
            extension = "ply"
            break
          case "json":
            data = generateJSONFile(selectedPoints, uploadedFile, exportOptions)
            mimeType = "application/json"
            extension = "json"
            break
          case "csv":
            data = generateCSVFile(selectedPoints, uploadedFile, exportOptions)
            mimeType = "text/csv"
            extension = "csv"
            break
          default:
            throw new Error("Unsupported format")
        }

        setExportProgress(50)

        // Create and download file
        const blob = new Blob([data], { type: mimeType })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `scan-ladder-export.${extension}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        setExportProgress(100)
        setIsExporting(false)
        setExportModalOpen(false)

        toast({
          title: "Export Complete",
          description: `File exported as ${options.format.toUpperCase()}`,
        })
      } catch (error) {
        console.error("Export error:", error)
        setIsExporting(false)
        toast({
          title: "Export Failed",
          description: "Failed to export file. Please try again.",
          variant: "destructive",
        })
      }
    },
    [selectedPoints, settings.units, toast]
  )

  // Optimized handlers
  const handleSettingsOpen = useCallback(() => setSettingsModalOpen(true), [])
  const handleInfoOpen = useCallback(() => setInfoModalOpen(true), [])
  const handleMobileNavOpen = useCallback(() => setMobileNavOpen(true), [])
  const handleFileUploadTrigger = useCallback(() => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".stl"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) handleFileUpload(file)
    }
    input.click()
  }, [handleFileUpload])

  // Handle main test model selection from sidebar
  const handleTestModelSelect = useCallback((testModelName: string) => {
    const modelPath = `/models/${testModelName}`
    
    // Fetch the actual file to preserve size and properties
    fetch(modelPath)
      .then(response => response.blob())
      .then(blob => {
        const modelFile = new File([blob], testModelName, { 
          type: 'model/stl',
          lastModified: Date.now()
        })
        setMainModel(modelFile) // Set as main model instead of uploaded file
        setUploadedFile(null) // Clear any uploaded file
        
        toast({
          title: "Main Model Loaded",
          description: `Loaded ${testModelName} as main model`,
        })
      })
      .catch(error => {
        console.error("Error loading test model:", error)
        toast({
          title: "Error Loading Test Model",
          description: "Failed to load the selected test model",
          variant: "destructive",
        })
      })
  }, [toast])

  // Handle part selection from sidebar - now places parts on main model
  const handleModelSelect = useCallback((modelName: string) => {
    const modelPath = `/models/${modelName}.stl`
    
    // Fetch the actual file to preserve size and properties
    fetch(modelPath)
      .then(response => response.blob())
      .then(blob => {
        const partFile = new File([blob], `${modelName}.stl`, { 
          type: 'model/stl',
          lastModified: Date.now()
        })
        
        // Add part to selected parts array
        const newPart = {
          id: `part-${Date.now()}-${Math.random()}`,
          type: modelName,
          position: [0, 0, 0] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
          scale: [1, 1, 1] as [number, number, number],
          timestamp: Date.now()
        }
        
        setSelectedParts(prev => [...prev, newPart])
        
        toast({
          title: "Part Added",
          description: `${modelName} part added to scene. Click to place it on the main model.`,
        })
      })
      .catch(error => {
        console.error("Error loading model:", error)
        toast({
          title: "Error Loading Model",
          description: "Failed to load the selected model",
          variant: "destructive",
        })
      })
  }, [toast])

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
    
    toast({
      title: "Geometry Detection Complete",
      description: `Detected ${geometries.length} geometric features`,
    })
  }, [toast])

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
    toast({
      title: "Detections Cleared",
      description: "All detected geometries have been removed",
    })
  }, [toast])

  // Optimized measurement handlers
  const handleAddMeasurement = useCallback((measurement: any) => {
    setMeasurements(prev => [...prev, measurement])
  }, [])

  const handleUpdateMeasurement = useCallback((id: string, updates: any) => {
    setMeasurements(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m))
  }, [])

  const handleDeleteMeasurement = useCallback((id: string) => {
    setMeasurements(prev => prev.filter(m => m.id !== id))
  }, [])

  const handleClearAllMeasurements = useCallback(() => {
    setMeasurements([])
  }, [])

  // Optimized grid and axes handlers
  const handleToggleGrid = useCallback(() => {
    setSettings(prev => ({ ...prev, showGrid: !prev.showGrid }))
  }, [])

  const handleToggleAxes = useCallback(() => {
    setSettings(prev => ({ ...prev, showAxes: !prev.showAxes }))
  }, [])

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

  // Memoized file info for performance
  const fileInfo = useMemo(() => {
    if (!mainModel) return null
    return {
      name: mainModel.name,
      size: mainModel.size,
      format: mainModel.name.split('.').pop()?.toUpperCase() || 'Unknown'
    }
  }, [mainModel])

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-gray-100 overflow-hidden">
      <Header
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        isMobile={isMobile}
      />

      <div className={`flex-1 flex overflow-hidden relative ${isMobile ? "pt-12" : "pt-14"}`}>
        {/* Desktop/Tablet Sidebar */}
        {!isMobile && (
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            onModelSelect={handleModelSelect}
            onTestModelSelect={handleTestModelSelect}
            isMobile={false}
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
              file={mainModel || uploadedFile} // Use main model if available, otherwise uploaded file
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
              selectedParts={selectedParts} // Pass selected parts to viewer
            />
            
            {/* Parts selection toolbar */}
            {!isMobile && (
              <PartsToolbar 
                activePart={activePart} 
                onSelectPart={setActivePart} 
              />
            )}

            {/* Simplified File Info Panel */}
            {fileInfo && !isMobile && (
              <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-sm rounded-md p-2 shadow-lg max-w-xs border border-gray-200">
                <div className="text-xs space-y-1">
                  <div className="font-semibold flex items-center space-x-1 text-gray-800">
                    <Activity className="w-3 h-3 text-blue-500" />
                    <span>Main Model</span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-0.5">
                    <div><span className="font-medium">File:</span> {fileInfo.name}</div>
                    <div><span className="font-medium">Format:</span> {fileInfo.format}</div>
                    <div><span className="font-medium">Size:</span> {(fileInfo.size / 1024 / 1024).toFixed(2)} MB</div>
                    <div><span className="font-medium">Parts:</span> {selectedParts.length}</div>
                    <div><span className="font-medium">Points:</span> {selectedPoints.length}</div>
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
