"use client"

import React, { useCallback, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, X, Download, Eye, EyeOff, AlertTriangle, FileText, Clock, RotateCcw, ZoomIn, ZoomOut, Maximize2, Grid3X3, Move3D } from "lucide-react"
import { Zap, Target, Search, Cpu } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { MeasurementTools } from "@/components/measurement-tools"
import { DetectedGeometry } from "@/lib/geometry-detection"

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
  matchedShapes?: DetectedGeometry[]
  showMatches?: boolean
  onToggleMatches?: () => void
  onAutoPlacePoints?: () => void
  onClearDetectedGeometries?: () => void
  measurements?: Array<{
    id: string
    type: "distance" | "angle" | "area" | "volume" | "radius" | "diameter"
    points: Array<[number, number, number]>
    value: number
    unit: string
    label: string
    timestamp: number
    visible: boolean
    color: string
  }>
  onAddMeasurement?: (measurement: any) => void
  onUpdateMeasurement?: (id: string, updates: any) => void
  onDeleteMeasurement?: (id: string) => void
  onClearAllMeasurements?: () => void
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
  onAutoPlacePoints,
  onClearDetectedGeometries,
  measurements = [],
  onAddMeasurement,
  onUpdateMeasurement,
  onDeleteMeasurement,
  onClearAllMeasurements,
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
      toast({
        title: "Loading Scan",
        description: `Loading Test Scan ${scanId.replace("scan", "")}...`,
      })
    }
  }

  const handleToggleGrid = useCallback(() => {
    onToggleGrid?.()
    toast({
      title: "Grid Toggled",
      description: `Grid ${settings?.showGrid ? "hidden" : "shown"}`,
    })
  }, [onToggleGrid, settings?.showGrid, toast])

  const handleToggleAxes = useCallback(() => {
    onToggleAxes?.()
    toast({
      title: "Axes Toggled",
      description: `Axes ${settings?.showAxes ? "hidden" : "shown"}`,
    })
  }, [onToggleAxes, settings?.showAxes, toast])

  // Camera control handlers using global functions
  const handleCameraReset = useCallback(() => {
    if ((window as any).handleCameraReset) {
      (window as any).handleCameraReset()
    }
  }, [])

  const handleZoomIn = useCallback(() => {
    if ((window as any).handleZoomIn) {
      (window as any).handleZoomIn()
    }
  }, [])

  const handleZoomOut = useCallback(() => {
    if ((window as any).handleZoomOut) {
      (window as any).handleZoomOut()
    }
  }, [])

  const handleToggleFullscreen = useCallback(() => {
    if ((window as any).handleToggleFullscreen) {
      (window as any).handleToggleFullscreen()
    }
  }, [])

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}

      {/* Sidebar */}
      <div
        className={`
        fixed lg:relative top-0 left-0 h-full w-64 lg:w-72 bg-white shadow-xl lg:shadow-md 
        transform transition-transform duration-300 ease-in-out z-50 lg:z-auto
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        ${!isOpen ? "lg:w-0 lg:overflow-hidden" : ""}
        border-r border-gray-200
      `}
      >
        <div className="h-full overflow-y-auto p-3 space-y-3">
          {/* Close button for mobile */}
          <div className="lg:hidden flex justify-end mb-1">
            <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0 hover:bg-gray-100">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Scan Selection - Compact */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-1 px-3 pt-2">
              <CardTitle className="text-xs font-medium text-gray-700 flex items-center space-x-1">
                <FileText className="w-3 h-3 text-blue-500" />
                <span>Scan Selection</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-2">
              <Select onValueChange={handleScanSelect} aria-label="Select Test Scan">
                <SelectTrigger className="w-full h-7 text-xs">
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

          {/* Geometry Detection - New */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-1 px-3 pt-2">
              <CardTitle className="text-xs font-medium text-gray-700 flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <Cpu className="w-3 h-3 text-purple-500" />
                  <span>AI Detection</span>
                  {matchedShapes.length > 0 && (
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs px-1 py-0 h-4">
                      {matchedShapes.length}
                    </Badge>
                  )}
                </div>
                {matchedShapes.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggleMatches}
                    className={`h-5 w-5 p-0 ${
                      showMatches 
                        ? "text-purple-600 hover:text-purple-700" 
                        : "text-gray-400 hover:text-gray-600"
                    }`}
                    title={showMatches ? "Hide detections" : "Show detections"}
                  >
                    {showMatches ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-2 space-y-2">
              {matchedShapes.length === 0 ? (
                <div className="text-center text-gray-500 text-xs py-2">
                  Load STL file for auto-detection
                </div>
              ) : (
                <>
                  <div className="max-h-24 overflow-y-auto space-y-1">
                    {matchedShapes.map((shape, index) => (
                      <div
                        key={shape.id}
                        className="flex items-center justify-between bg-purple-50 p-1.5 rounded border text-xs"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-purple-800">{shape.type}</div>
                          <div className="text-purple-600 text-xs">
                            {Math.round(shape.confidence * 100)}% • {shape.algorithm}
                          </div>
                        </div>
                        <div className="text-xs text-purple-600 font-mono">
                          {shape.center.map(coord => coord.toFixed(1)).join(",")}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onAutoPlacePoints}
                      className="h-7 text-xs px-2 border-purple-300 text-purple-700 hover:bg-purple-50"
                      title="Auto-place points on high-confidence detections"
                    >
                      <Target className="w-3 h-3 mr-1" />
                      Place
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onClearDetectedGeometries}
                      className="h-7 text-xs px-2 border-red-300 text-red-700 hover:bg-red-50"
                      title="Clear all detections"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Clear
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 3D Controls - Compact */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-1 px-3 pt-2">
              <CardTitle className="text-xs font-medium text-gray-700 flex items-center space-x-1">
                <Move3D className="w-3 h-3 text-orange-500" />
                <span>3D Controls</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-2">
              <div className="grid grid-cols-3 gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCameraReset}
                  className="h-7 text-xs px-1"
                  title="Reset Camera"
                >
                  <RotateCcw className="w-3 h-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomIn}
                  className="h-7 text-xs px-1"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3 h-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomOut}
                  className="h-7 text-xs px-1"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3 h-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleFullscreen}
                  className="h-7 text-xs px-1"
                  title="Fullscreen"
                >
                  <Maximize2 className="w-3 h-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleGrid}
                  className={`h-7 text-xs px-1 ${
                    settings?.showGrid 
                      ? "bg-blue-50 text-blue-600 border-blue-300" 
                      : ""
                  }`}
                  title="Toggle Grid"
                >
                  <Grid3X3 className="w-3 h-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleAxes}
                  className={`h-7 text-xs px-1 ${
                    settings?.showAxes 
                      ? "bg-purple-50 text-purple-600 border-purple-300" 
                      : ""
                  }`}
                  title="Toggle Axes"
                >
                  {settings?.showAxes ? (
                    <Eye className="w-3 h-3" />
                  ) : (
                    <EyeOff className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Session Stats - Enhanced */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-1 px-3 pt-2">
              <CardTitle className="text-xs font-medium text-gray-700 flex items-center space-x-1">
                <Clock className="w-3 h-3 text-green-500" />
                <span>Stats</span>
                {(selectedPoints.length > 0 || matchedShapes.length > 0) && (
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-2 space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600">Points:</span>
                <Badge variant="outline" className="text-xs px-1 py-0 h-5 text-orange-600">
                  {selectedPoints.length}
                </Badge>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600">File:</span>
                <Badge variant="outline" className="text-xs px-1 py-0 h-5 text-blue-600">
                  {uploadedFile ? "Loaded" : "Demo"}
                </Badge>
              </div>
              {matchedShapes.length > 0 && (
                <>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600">Detected:</span>
                    <Badge variant="outline" className="text-xs px-1 py-0 h-5 text-purple-600">
                      {matchedShapes.length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600">Avg Conf:</span>
                    <Badge variant="outline" className="text-xs px-1 py-0 h-5 text-green-600">
                      {Math.round((matchedShapes.reduce((sum, shape) => sum + shape.confidence, 0) / matchedShapes.length) * 100)}%
                    </Badge>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600">Type:</span>
                <Badge variant="outline" className="text-xs px-1 py-0 h-5 text-purple-600">
                  {exportType}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Selected Points - Compact */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-1 px-3 pt-2">
              <CardTitle className="text-xs font-medium text-gray-700 flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <span>Points</span>
                  {selectedPoints.length > 0 && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs px-1 py-0 h-4">
                      {selectedPoints.length}
                    </Badge>
                  )}
                </div>
                {selectedPoints.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="h-5 w-5 p-0 text-red-500 hover:text-red-700"
                    title="Clear all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-2">
              <div className="max-h-32 overflow-y-auto space-y-1">
                {selectedPoints.length === 0 ? (
                  <div className="text-center text-gray-500 text-xs py-2">
                    Click on model to add points
                  </div>
                ) : (
                  selectedPoints.map((point, index) => (
                    <div
                      key={point.id}
                      className={`flex items-center justify-between p-1.5 rounded border text-xs ${
                        point.id.startsWith('auto-') 
                          ? 'bg-purple-50 border-purple-200' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-1">
                          <div className="font-medium text-gray-800">P{index + 1}</div>
                          {point.id.startsWith('auto-') && (
                            <Zap className="w-3 h-3 text-purple-500" title="Auto-detected" />
                          )}
                        </div>
                        <div className="text-gray-600 font-mono text-xs truncate">
                          {point.position.map((coord) => coord.toFixed(1)).join(",")}
                        </div>
                        <div className="text-xs text-blue-600">{point.type}</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleClearPoint(point.id, index)}
                        className="h-5 w-5 p-0 hover:bg-red-100 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Measurement Tools */}
          {onAddMeasurement && onUpdateMeasurement && onDeleteMeasurement && onClearAllMeasurements && (
            <MeasurementTools
              measurements={measurements}
              onAddMeasurement={onAddMeasurement}
              onUpdateMeasurement={onUpdateMeasurement}
              onDeleteMeasurement={onDeleteMeasurement}
              onClearAll={onClearAllMeasurements}
              selectedPoints={selectedPoints}
              units={settings?.units as "mm" || "mm"}
              isMobile={isMobile}
            />
          )}

          {/* Export Options - Compact */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-1 px-3 pt-2">
              <CardTitle className="text-xs font-medium text-gray-700 flex items-center space-x-1">
                <Download className="w-3 h-3 text-orange-500" />
                <span>Export</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-2 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col items-center space-y-1 cursor-pointer">
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded"></div>
                  <div className="flex items-center space-x-1">
                    <input
                      type="radio"
                      name="export"
                      className="w-2 h-2 text-orange-500"
                      checked={exportType === "hs-cap-small"}
                      onChange={() => onExportTypeChange("hs-cap-small")}
                    />
                    <span className="text-xs">Small</span>
                  </div>
                </label>
                <label className="flex flex-col items-center space-y-1 cursor-pointer">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded"></div>
                  <div className="flex items-center space-x-1">
                    <input
                      type="radio"
                      name="export"
                      className="w-2 h-2 text-orange-500"
                      checked={exportType === "hs-cap"}
                      onChange={() => onExportTypeChange("hs-cap")}
                    />
                    <span className="text-xs">Regular</span>
                  </div>
                </label>
              </div>

              {!canExport && (
                <div className="flex items-center space-x-1 p-1 bg-yellow-50 rounded text-yellow-800">
                  <AlertTriangle className="w-3 h-3 text-yellow-600" />
                  <span className="text-xs">Upload file or add points</span>
                </div>
              )}

              <Button
                className="w-full h-7 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-xs disabled:opacity-50"
                onClick={handleExportClick}
                disabled={!canExport}
              >
                <Download className="w-3 h-3 mr-1" />
                {canExport ? "Export STL" : "Export Disabled"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
