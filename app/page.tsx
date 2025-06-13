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
import { MatchingModal } from "@/components/matching-modal"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { useMediaQuery } from "@/hooks/use-media-query"
import { generateSTLFile, generateOBJFile, generatePLYFile, Point } from "@/lib/file-generators"
import {
  performShapeMatching,
  generateMatchedSceneSTL,
  generateMatchedSceneOBJ,
  type MatchingConfig,
  type MatchResult,
  type ExportConfig as MatchExportConfig,
} from "@/lib/shape-matching"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"

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
  const [selectedPoints, setSelectedPoints] = useState<
    Array<{ id: string; position: [number, number, number]; type: string; timestamp: number }>
  >([])
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
  const { toast } = useToast()

  const isMobile = useMediaQuery("(max-width: 768px)")
  const isTablet = useMediaQuery("(max-width: 1024px)")

  // App Settings State with mobile-optimized defaults
  const [settings, setSettings] = useState<AppSettings>({
    renderQuality: isMobile ? "medium" : "high",
    autoSave: true,
    showGrid: true,
    showAxes: false,
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
        description: `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB) has been loaded.`,
      })

      // Auto-open mobile bottom sheet on file upload
      if (isMobile) {
        setTimeout(() => setMobileBottomSheetOpen(true), 1000)
      }
    },
    [toast, settings.autoSave, isMobile],
  )

  const handlePointSelect = useCallback(
    (point: { id: string; position: [number, number, number]; type: string; timestamp: number }) => {
      // Cycle through available model types
      const modelTypes = [
        'end cube',
        'end flat',
        'end sphere',
        'long cone',
        'long iso',
        'mid cube',
        'mid cylinder',
        'mid sphere'
      ] as const

      // Find current index and get next type
      const currentIndex = modelTypes.indexOf(point.type as any)
      const nextIndex = (currentIndex + 1) % modelTypes.length
      const nextType = modelTypes[nextIndex]

      // Create new point with updated type
      const updatedPoint: Point = {
        ...point,
        type: nextType
      }

      setSelectedPoints(prev => {
        const newPoints = prev.filter(p => p.id !== point.id)
        return [...newPoints, updatedPoint]
      })
    },
    []
  )

  const clearAllPoints = useCallback(() => {
    const pointCount = selectedPoints.length
    setSelectedPoints([])
    setMatchedShapes([]) // Clear matches when points are cleared
    if (settings.autoSave) {
      localStorage.removeItem("scan-ladder-points")
    }
    toast({
      title: "Points Cleared",
      description: `Removed ${pointCount} selection points and matches`,
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
      format: "stl" | "obj" | "ply"
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

        switch (options.format) {
          case "stl":
            fileContent = generateSTLFile(selectedPoints, uploadedFile, options)
            mimeType = "application/sla"
            break
          case "obj":
            fileContent = generateOBJFile(selectedPoints, uploadedFile, options)
            mimeType = "application/obj"
            break
          case "ply":
            fileContent = generatePLYFile(selectedPoints, uploadedFile, options)
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

      <div className="flex-1 flex overflow-hidden relative">
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
          />
        )}

        {/* Main 3D Viewer */}
        <main
          className={`flex-1 transition-all duration-300 ${
            isMobile ? "p-1" : "p-2 md:p-4"
          } ${sidebarOpen && !isMobile ? "lg:ml-0" : ""}`}
        >
          <div
            className={`h-full bg-white overflow-hidden border border-gray-200 ${
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
            />
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
