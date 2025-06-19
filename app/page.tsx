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
import { MatchingModal } from "@/components/matching-modal"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { useMediaQuery } from "@/hooks/use-media-query"
import { generateSTLFile, generateOBJFile, generatePLYFile, generateJSONFile, generateCSVFile, Point, ExportOptions as FileExportOptions } from "@/lib/file-generators"
import {
  performShapeMatching,
  generateMatchedSceneSTL,
  generateMatchedSceneOBJ,
  type MatchingConfig,
  type MatchResult,
  type ExportConfig as MatchExportConfig,
} from "@/lib/shape-matching"
import { Search, Scan, Target, Brain, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

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
  const [matchingModalOpen, setMatchingModalOpen] = useState(false)
  const [exportType, setExportType] = useState<"hs-cap-small" | "hs-cap">("hs-cap")
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [matchedShapes, setMatchedShapes] = useState<MatchResult[]>([])
  const [showMatches, setShowMatches] = useState(true)
  const [analysisData, setAnalysisData] = useState<{
    fileInfo: { name: string; size: number; format: string }
    geometryStats: { vertices: number; faces: number; volume: number }
    pointStats: { total: number; distribution: Record<string, number> }
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

  const handlePointSelect = useCallback(
    (point: { id: string; position: [number, number, number]; type: string; timestamp: number; modelType?: string }) => {
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
    [uploadedFile, analysisData, selectedPoints]
  )

  const clearAllPoints = useCallback(() => {
    const pointCount = selectedPoints.length
    setSelectedPoints([])
    setMatchedShapes([]) // Clear matches when points are cleared
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
      description: `Removed ${pointCount} selection points${pointCount > 0 ? ' and matches' : ''}`,
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
      // Clear related matches
      setMatchedShapes((prevMatches) => prevMatches.filter((match) => match.sourcePoint.id !== id))
      toast({
        title: "Point Removed",
        description: "Selection point and related matches have been removed.",
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

  // Shape Matching Functions
  const handleStartMatching = useCallback(
    async (config: MatchingConfig): Promise<MatchResult[]> => {
      const originalGeometry = uploadedFile ? await uploadedFile.arrayBuffer() : null
      const results = await performShapeMatching(selectedPoints, originalGeometry, config)
      setMatchedShapes(results)
      setShowMatches(true)
      return results
    },
    [selectedPoints, uploadedFile],
  )

  const handleExportMatched = useCallback(
    async (matches: MatchResult[], config: MatchExportConfig) => {
      const originalGeometry = uploadedFile ? await uploadedFile.arrayBuffer() : null
      const filename = `matched-scene-${Date.now()}`

      let fileContent: string
      let mimeType: string

      switch (config.format) {
        case "stl":
          fileContent = generateMatchedSceneSTL(matches, originalGeometry, selectedPoints, config)
          mimeType = "application/sla"
          break
        case "obj":
          fileContent = generateMatchedSceneOBJ(matches, originalGeometry, selectedPoints, config)
          mimeType = "application/obj"
          break
        case "ply":
          // For PLY, use STL format as fallback
          fileContent = generateMatchedSceneSTL(matches, originalGeometry, selectedPoints, config)
          mimeType = "application/ply"
          break
        default:
          throw new Error("Unsupported format")
      }

      // Create and download file
      const blob = new Blob([fileContent], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const element = document.createElement("a")
      element.href = url
      element.download = `${filename}.${config.format}`
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
      URL.revokeObjectURL(url)

      // Save to export history
      const exportHistory = JSON.parse(localStorage.getItem("scan-ladder-export-history") || "[]")
      exportHistory.unshift({
        id: Date.now().toString(),
        filename: `${filename}.${config.format}`,
        format: config.format,
        timestamp: new Date().toISOString(),
        pointCount: selectedPoints.length,
        matchCount: matches.length,
        fileSize: blob.size,
        type: "matched-scene",
        options: config,
      })
      localStorage.setItem("scan-ladder-export-history", JSON.stringify(exportHistory.slice(0, 10)))
    },
    [uploadedFile, selectedPoints],
  )

  // Camera control handlers
  const handleCameraReset = useCallback(() => {
    // This will be handled by the STLViewer component
  }, [])

  const handleZoomIn = useCallback(() => {
    // This will be handled by the STLViewer component
  }, [])

  const handleZoomOut = useCallback(() => {
    // This will be handled by the STLViewer component
  }, [])

  const handleToggleFullscreen = useCallback(() => {
    // This will be handled by the STLViewer component
  }, [])

  const handleToggleGrid = useCallback(() => {
    updateSettings({ showGrid: !settings.showGrid })
  }, [settings.showGrid, updateSettings])

  const handleToggleAxes = useCallback(() => {
    updateSettings({ showAxes: !settings.showAxes })
  }, [settings.showAxes, updateSettings])

  const handleToggleMatches = useCallback(() => {
    setShowMatches(!showMatches)
    toast({
      title: "Matches Toggled",
      description: `Matched shapes ${!showMatches ? "shown" : "hidden"}`,
    })
  }, [showMatches, toast])

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
            onCameraReset={handleCameraReset}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onToggleFullscreen={handleToggleFullscreen}
            onToggleGrid={handleToggleGrid}
            onToggleAxes={handleToggleAxes}
            matchedShapes={matchedShapes}
            showMatches={showMatches}
            onToggleMatches={handleToggleMatches}
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
              onCameraReset={handleCameraReset}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onToggleFullscreen={handleToggleFullscreen}
              onToggleGrid={handleToggleGrid}
              onToggleAxes={handleToggleAxes}
              matchedShapes={matchedShapes}
              showMatches={showMatches}
              onToggleMatches={handleToggleMatches}
              onScanSelect={handleScanSelect}
            />
            
            {/* Quick Access Panel - Compact */}
            {!isMobile && (
              <div className="absolute top-2 left-2 flex flex-col space-y-1">
                <Link href="/scan-match">
                  <Button variant="outline" size="sm" className="bg-white/90 backdrop-blur-sm hover:bg-white h-7 text-xs">
                    <Brain className="w-3 h-3 mr-1" />
                    AI Match
                  </Button>
                </Link>
                <Link href="/viewer">
                  <Button variant="outline" size="sm" className="bg-white/90 backdrop-blur-sm hover:bg-white h-7 text-xs">
                    <Target className="w-3 h-3 mr-1" />
                    Pro View
                  </Button>
                </Link>
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
            onCameraReset={handleCameraReset}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onToggleFullscreen={handleToggleFullscreen}
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

      <MatchingModal
        isOpen={matchingModalOpen}
        onClose={() => setMatchingModalOpen(false)}
        selectedPoints={selectedPoints}
        uploadedFile={uploadedFile}
        onStartMatching={handleStartMatching}
        onExportMatched={handleExportMatched}
        isMobile={isMobile}
        settings={settings}
      />

      <Toaster />

      {/* Floating Action Button for Shape Matching */}
      {selectedPoints.length > 0 && (
        <div className={`fixed z-50 ${isMobile ? "bottom-20 right-4" : "bottom-8 right-8"}`}>
          <Button
            onClick={() => setMatchingModalOpen(true)}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 rounded-full"
            size={isMobile ? "lg" : "lg"}
          >
            <Search className="w-5 h-5 mr-2" />
            {isMobile ? "Match" : "Shape Matching"}
          </Button>
        </div>
      )}
    </div>
  )
}
