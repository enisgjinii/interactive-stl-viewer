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
      toast({
        title: "Scan Selected",
        description: `Loaded Test Scan ${scanId.replace("scan", "")}`,
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
      `}
      >
        <div className="h-full overflow-y-auto p-4 space-y-4">
          {/* Close button for mobile */}
          <div className="lg:hidden flex justify-end mb-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Scan Selection */}
          <Card className="border-2 border-gray-100 hover:border-blue-200 transition-colors">
            <CardHeader className="pb-3 bg-gradient-to-r from-gray-50 to-blue-50">
              <CardTitle className="text-sm font-semibold text-gray-800">Scan Selection</CardTitle>
            </CardHeader>
            <CardContent>
              <Select onValueChange={handleScanSelect} aria-label="Select Test Scan">
                <SelectTrigger className="w-full">
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
          <Card className="border-2 border-gray-100 hover:border-orange-200 transition-colors">
            <CardHeader className="pb-3 bg-gradient-to-r from-gray-50 to-orange-50">
              <CardTitle className="text-sm font-semibold text-gray-800 flex items-center space-x-2">
                <Move3D className="w-4 h-4 text-orange-500" />
                <span>3D Controls</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCameraReset}
                  className="hover:bg-orange-50 hover:text-orange-600 transition-colors"
                  title="Reset Camera"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  <span>Reset</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onZoomIn}
                  className="hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4 mr-2" />
                  <span>Zoom In</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onZoomOut}
                  className="hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4 mr-2" />
                  <span>Zoom Out</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onToggleFullscreen}
                  className="hover:bg-green-50 hover:text-green-600 transition-colors"
                  title="Toggle Fullscreen"
                >
                  <Maximize2 className="w-4 h-4 mr-2" />
                  <span>Fullscreen</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onToggleGrid}
                  className={`transition-colors ${
                    settings?.showGrid ? "bg-blue-50 text-blue-600 hover:bg-blue-100" : "hover:bg-gray-50"
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
                  className={`transition-colors ${
                    settings?.showAxes ? "bg-purple-50 text-purple-600 hover:bg-purple-100" : "hover:bg-gray-50"
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
          <Card className="border-2 border-gray-100 hover:border-green-200 transition-colors">
            <CardHeader className="pb-3 bg-gradient-to-r from-gray-50 to-green-50">
              <CardTitle className="text-sm font-semibold text-gray-800 flex items-center space-x-2">
                <span>Session Stats</span>
                {selectedPoints.length > 0 && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                Points: <span className="font-mono text-orange-600">{selectedPoints.length}</span>
              </div>
              <div>
                File: <span className="font-mono text-blue-600">{uploadedFile ? "Loaded" : "Demo"}</span>
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
                    Quality: <span className="font-mono text-green-600">{settings?.renderQuality || "medium"}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* File Information */}
          {uploadedFile && (
            <Card className="border-2 border-gray-100 hover:border-blue-200 transition-colors">
              <CardHeader className="pb-3 bg-gradient-to-r from-gray-50 to-blue-50">
                <CardTitle className="text-sm font-semibold text-gray-800 flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span>Current File</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-gray-600 font-medium">Filename:</span>
                  <span className="font-mono text-xs truncate max-w-32" title={uploadedFile.name}>
                    {uploadedFile.name}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-gray-600 font-medium">Size:</span>
                  <Badge variant="outline">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</Badge>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-gray-600 font-medium">Type:</span>
                  <Badge variant="outline">STL</Badge>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-gray-600 font-medium">Status:</span>
                  <Badge className="bg-green-100 text-green-800">Loaded</Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Patient Info */}
          <Card className="border-2 border-gray-100 hover:border-orange-200 transition-colors">
            <CardHeader className="pb-3 bg-gradient-to-r from-gray-50 to-orange-50">
              <CardTitle className="text-sm font-semibold text-gray-800">Patient Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-gray-600 font-medium">Case ID:</span>
                <Badge variant="outline" className="font-mono">
                  157729
                </Badge>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-gray-600 font-medium">Patient Initial:</span>
                <Badge variant="outline">TP</Badge>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-gray-600 font-medium">Patient Number:</span>
                <Badge variant="outline">test</Badge>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-gray-600 font-medium">Session:</span>
                <Badge variant="outline" className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>Active</span>
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Measurements */}
          <Card className="border-2 border-gray-100 hover:border-blue-200 transition-colors">
            <CardHeader className="pb-3 bg-gradient-to-r from-gray-50 to-blue-50">
              <CardTitle className="text-sm font-semibold text-gray-800">Measurements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3, 4].map((num) => (
                <div
                  key={num}
                  className="flex items-center space-x-2 text-sm p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                >
                  <span className="w-6 font-semibold text-gray-700">#{num}</span>
                  <Badge variant="outline" className="text-xs bg-blue-50">
                    OS
                  </Badge>
                  <span className="text-gray-600">x:</span>
                  <span className="w-8 text-center font-mono">M</span>
                  <span className="text-gray-600">OL</span>
                  <select className="text-xs border rounded px-2 py-1 ml-2 bg-white hover:border-orange-300 focus:border-orange-500 focus:outline-none">
                    <option>UNS</option>
                    <option>MM</option>
                    <option>IN</option>
                  </select>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Selected Points */}
          <Card className="border-2 border-gray-100 hover:border-green-200 transition-colors">
            <CardHeader className="pb-3 bg-gradient-to-r from-gray-50 to-green-50">
              <CardTitle className="text-sm flex items-center justify-between font-semibold text-gray-800">
                Selected Points
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {selectedPoints.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="w-full text-xs hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors"
                disabled={selectedPoints.length === 0}
              >
                <Trash2 className="w-3 h-3 mr-2" />
                Clear all points ({selectedPoints.length})
              </Button>

              <div className="max-h-40 overflow-y-auto space-y-2">
                {selectedPoints.length === 0 ? (
                  <div className="text-center text-gray-500 text-xs py-4">
                    Click on the 3D model to add selection points
                  </div>
                ) : (
                  selectedPoints.map((point, index) => (
                    <div
                      key={point.id}
                      className="flex items-center justify-between bg-gradient-to-r from-green-50 to-blue-50 p-3 rounded-lg border border-green-200 text-xs"
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
                        className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
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
          <Card className="border-2 border-gray-100 hover:border-orange-200 transition-colors">
            <CardHeader className="pb-3 bg-gradient-to-r from-gray-50 to-orange-50">
              <CardTitle className="text-sm font-semibold text-gray-800">Export Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg mx-auto mb-2 shadow-md"></div>
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
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg mx-auto mb-2 shadow-md"></div>
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
                <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span className="text-xs text-yellow-800">
                    Upload a file or add selection points to enable export
                  </span>
                </div>
              )}

              <Button
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                onClick={handleExportClick}
                disabled={!canExport}
              >
                <Download className="w-4 h-4 mr-2" />
                {canExport ? "Export STL" : "Export Disabled"}
              </Button>
            </CardContent>
          </Card>

          {/* Visibility Controls */}
          <Card className="border-2 border-gray-100 hover:border-purple-200 transition-colors">
            <CardHeader className="pb-3 bg-gradient-to-r from-gray-50 to-purple-50">
              <CardTitle className="text-sm font-semibold text-gray-800">Visibility Controls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((num) => (
                  <div key={num} className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-yellow-200 to-orange-300 rounded border-2 border-orange-400 shadow-sm"></div>
                    <Button variant="ghost" size="sm" className="p-1 hover:bg-purple-50">
                      <Eye className="w-4 h-4 text-gray-600" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Settings Summary */}
          {settings && (
            <Card className="border-2 border-gray-100 hover:border-indigo-200 transition-colors">
              <CardHeader className="pb-3 bg-gradient-to-r from-gray-50 to-indigo-50">
                <CardTitle className="text-sm font-semibold text-gray-800">Current Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span>Render Quality:</span>
                  <Badge variant="outline">{settings.renderQuality}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Auto Save:</span>
                  <Badge variant={settings.autoSave ? "default" : "secondary"}>
                    {settings.autoSave ? "On" : "Off"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Units:</span>
                  <Badge variant="outline">{settings.units}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Grid:</span>
                  <Badge variant={settings.showGrid ? "default" : "secondary"}>
                    {settings.showGrid ? "Visible" : "Hidden"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
