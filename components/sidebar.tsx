"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, X, Download, Eye, EyeOff, AlertTriangle, FileText, Clock, RotateCcw, ZoomIn, ZoomOut, Maximize2, Grid3X3, Move3D } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Point {
  id: string
  position: [number, number, number]
  type: string
  timestamp: number
}

interface SidebarProps {
  selectedPoints: Point[]
  onClearAllPoints: () => void
  onClearSelectedPoint: (id: string) => void
  isOpen: boolean
  onClose: () => void
  exportType: "hs-cap-small" | "hs-cap"
  onExportTypeChange: (type: "hs-cap-small" | "hs-cap") => void
  onExport: () => void
  hasFile: boolean
  isMobile: boolean
  settings: {
    renderQuality?: string
    showGrid?: boolean
    showAxes?: boolean
    autoSave?: boolean
    units?: string
  }
  uploadedFile: File | null
  onCameraReset?: () => void
  onZoomIn?: () => void
  onZoomOut?: () => void
  onToggleFullscreen?: () => void
  onToggleGrid?: () => void
  onToggleAxes?: () => void
  onScanSelect?: (scanId: string) => void
  matchedShapes?: any[]
  showMatches?: boolean
  onToggleMatches?: () => void
}

export function Sidebar({
  selectedPoints,
  onClearAllPoints,
  onClearSelectedPoint,
  isOpen,
  onClose,
  exportType,
  onExportTypeChange,
  onExport,
  hasFile,
  isMobile,
  settings,
  uploadedFile,
  onCameraReset,
  onZoomIn,
  onZoomOut,
  onToggleFullscreen,
  onToggleGrid,
  onToggleAxes,
  onScanSelect,
  matchedShapes = [],
  showMatches = false,
  onToggleMatches,
}: SidebarProps) {
  const canExport = hasFile || selectedPoints.length > 0
  const { toast } = useToast()

  const handleExportClick = () => {
    if (!canExport) {
      toast({
        title: "Cannot Export",
        description: "Please upload a file or add selection points first",
        variant: "destructive",
      })
      return
    }

    onExport()
    toast({
      title: "Export Started",
      description: "Opening export configuration...",
    })
  }

  const handleClearAll = () => {
    onClearAllPoints()
    toast({
      title: "Points Cleared",
      description: `Removed ${selectedPoints.length} selection points`,
    })
  }

  const handleClearPoint = (id: string, index: number) => {
    onClearSelectedPoint(id)
    toast({
      title: "Point Removed",
      description: `Removed point ${index + 1}`,
    })
  }

  const handleScanSelect = (scanId: string) => {
    if (onScanSelect) {
      onScanSelect(scanId)
      // Load the corresponding STL file for the selected scan
      const scanNumber = scanId.replace("scan", "")
      const scanFileName = `Test Scan ${scanNumber}.stl`
      const scanPath = `/models/${scanFileName}`
      
      // Create a fetch request to get the file
      fetch(scanPath)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to load scan file: ${response.statusText}`)
          }
          return response.blob()
        })
        .then(blob => {
          const scanFile = new File([blob], scanFileName, { type: 'application/octet-stream' })
          // Update the file to trigger model reload
          const event = { target: { files: [scanFile] } } as unknown as React.ChangeEvent<HTMLInputElement>
          // @ts-ignore - we know this exists
          window.handleFileChange?.(event)
        })
        .catch(error => {
          console.error('Error loading scan file:', error)
          toast({
            title: "Error",
            description: "Failed to load scan file",
            variant: "destructive",
          })
        })

      toast({
        title: "Scan Selected",
        description: `Loading Test Scan ${scanNumber}...`,
      })
    }
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}

      {/* Sidebar */}
      <div
        className={`
        fixed lg:relative top-0 left-0 h-full w-80 md:w-96 bg-white shadow-2xl lg:shadow-lg 
        transform transition-transform duration-300 ease-in-out z-50 lg:z-auto
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        ${!isOpen ? "lg:w-0 lg:overflow-hidden" : ""}
        border-r border-gray-100
      `}
      >
        <div className="h-full overflow-y-auto p-4 space-y-6">
          {/* Close button for mobile */}
          <div className="lg:hidden flex justify-end mb-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-gray-100">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Scan Selection */}
          <Card className="border border-gray-100 hover:border-blue-200 transition-all duration-200 hover:shadow-md">
            <CardHeader className="pb-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-t-lg">
              <CardTitle className="text-sm font-semibold text-gray-800 flex items-center space-x-2">
                <FileText className="w-4 h-4 text-blue-500" />
                <span>Scan Selection</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <Select onValueChange={handleScanSelect} aria-label="Select Test Scan">
                <SelectTrigger className="w-full hover:border-blue-300 transition-colors">
                  <SelectValue placeholder="Select Test Scan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scan1">Test Scan 1</SelectItem>
                  <SelectItem value="scan2">Test Scan 2</SelectItem>
                  <SelectItem value="scan3">Test Scan 3</SelectItem>
                  <SelectItem value="scan4">Test Scan 4</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* 3D Controls */}
          <Card className="border border-gray-100 hover:border-orange-200 transition-all duration-200 hover:shadow-md">
            <CardHeader className="pb-3 bg-gradient-to-r from-gray-50 to-orange-50 rounded-t-lg">
              <CardTitle className="text-sm font-semibold text-gray-800 flex items-center space-x-2">
                <Move3D className="w-4 h-4 text-orange-500" />
                <span>3D Controls</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCameraReset}
                  className="hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 transition-all duration-200"
                  title="Reset Camera"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  <span>Reset</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onZoomIn}
                  className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all duration-200"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4 mr-2" />
                  <span>Zoom In</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onZoomOut}
                  className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all duration-200"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4 mr-2" />
                  <span>Zoom Out</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onToggleFullscreen}
                  className="hover:bg-green-50 hover:text-green-600 hover:border-green-300 transition-all duration-200"
                  title="Toggle Fullscreen"
                >
                  <Maximize2 className="w-4 h-4 mr-2" />
                  <span>Fullscreen</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onToggleGrid}
                  className={`transition-all duration-200 ${
                    settings?.showGrid 
                      ? "bg-blue-50 text-blue-600 border-blue-300 hover:bg-blue-100" 
                      : "hover:bg-gray-50 hover:border-gray-300"
                  }`}
                  title="Toggle Grid"
                >
                  <Grid3X3 className="w-4 h-4 mr-2" />
                  <span>Grid</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onToggleAxes}
                  className={`transition-all duration-200 ${
                    settings?.showAxes 
                      ? "bg-purple-50 text-purple-600 border-purple-300 hover:bg-purple-100" 
                      : "hover:bg-gray-50 hover:border-gray-300"
                  }`}
                  title="Toggle Axes"
                >
                  {settings?.showAxes ? (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      <span>Hide Axes</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-4 h-4 mr-2" />
                      <span>Show Axes</span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Session Stats */}
          <Card className="border border-gray-100 hover:border-green-200 transition-all duration-200 hover:shadow-md">
            <CardHeader className="pb-3 bg-gradient-to-r from-gray-50 to-green-50 rounded-t-lg">
              <CardTitle className="text-sm font-semibold text-gray-800 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-green-500" />
                <span>Session Stats</span>
                {selectedPoints.length > 0 && (
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <span className="text-gray-600">Points:</span>
                <Badge variant="outline" className="font-mono text-orange-600">
                  {selectedPoints.length}
                </Badge>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <span className="text-gray-600">File:</span>
                <Badge variant="outline" className="font-mono text-blue-600">
                  {uploadedFile ? "Loaded" : "Demo"}
                </Badge>
              </div>
              {matchedShapes.length > 0 && (
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <span className="text-gray-600">Matches:</span>
                  <Badge variant="outline" className="font-mono text-green-600">
                    {matchedShapes.length}
                  </Badge>
                </div>
              )}
              {!isMobile && (
                <>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <span className="text-gray-600">Type:</span>
                    <Badge variant="outline" className="font-mono text-purple-600">
                      {exportType}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <span className="text-gray-600">Quality:</span>
                    <Badge variant="outline" className="font-mono text-green-600">
                      {settings?.renderQuality || "medium"}
                    </Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Selected Points */}
          <Card className="border border-gray-100 hover:border-green-200 transition-all duration-200 hover:shadow-md">
            <CardHeader className="pb-3 bg-gradient-to-r from-gray-50 to-green-50 rounded-t-lg">
              <CardTitle className="text-sm flex items-center justify-between font-semibold text-gray-800">
                <div className="flex items-center space-x-2">
                  <span>Selected Points</span>
                  {selectedPoints.length > 0 && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {selectedPoints.length}
                    </Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="w-full text-xs hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-all duration-200"
                disabled={selectedPoints.length === 0}
              >
                <Trash2 className="w-3 h-3 mr-2" />
                Clear all points ({selectedPoints.length})
              </Button>

              <div className="max-h-40 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {selectedPoints.length === 0 ? (
                  <div className="text-center text-gray-500 text-xs py-4">
                    Click on the 3D model to add selection points
                  </div>
                ) : (
                  selectedPoints.map((point, index) => (
                    <div
                      key={point.id}
                      className="flex items-center justify-between bg-gradient-to-r from-green-50 to-blue-50 p-3 rounded-lg border border-green-200 text-xs hover:shadow-sm transition-all duration-200"
                    >
                      <div>
                        <div className="font-semibold text-gray-800">Point {index + 1}</div>
                        <div className="text-gray-600 font-mono text-xs">
                          {point.position.map((coord) => coord.toFixed(2)).join(", ")}
                        </div>
                        <div className="text-xs text-blue-600 mt-1">Type: {point.type}</div>
                        <div className="text-xs text-gray-500">{new Date(point.timestamp).toLocaleTimeString()}</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleClearPoint(point.id, index)}
                        className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Export Options */}
          <Card className="border border-gray-100 hover:border-orange-200 transition-all duration-200 hover:shadow-md">
            <CardHeader className="pb-3 bg-gradient-to-r from-gray-50 to-orange-50 rounded-t-lg">
              <CardTitle className="text-sm font-semibold text-gray-800 flex items-center space-x-2">
                <Download className="w-4 h-4 text-orange-500" />
                <span>Export Configuration</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center group">
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg mx-auto mb-2 shadow-md group-hover:shadow-lg transition-all duration-200"></div>
                  <label className="flex items-center justify-center space-x-1 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="export"
                      className="w-3 h-3 text-orange-500"
                      checked={exportType === "hs-cap-small"}
                      onChange={() => onExportTypeChange("hs-cap-small")}
                    />
                    <span className="font-medium">HS Cap Small</span>
                  </label>
                </div>
                <div className="text-center group">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg mx-auto mb-2 shadow-md group-hover:shadow-lg transition-all duration-200"></div>
                  <label className="flex items-center justify-center space-x-1 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="export"
                      className="w-3 h-3 text-orange-500"
                      checked={exportType === "hs-cap"}
                      onChange={() => onExportTypeChange("hs-cap")}
                    />
                    <span className="font-medium">HS Cap</span>
                  </label>
                </div>
              </div>

              {!canExport && (
                <div className="flex items-center space-x-2 p-2 bg-yellow-50 rounded-lg text-yellow-800">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span className="text-xs">
                    Upload a file or add selection points to enable export
                  </span>
                </div>
              )}

              <Button
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                onClick={handleExportClick}
                disabled={!canExport}
              >
                <Download className="w-4 h-4 mr-2" />
                {canExport ? "Export STL" : "Export Disabled"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
