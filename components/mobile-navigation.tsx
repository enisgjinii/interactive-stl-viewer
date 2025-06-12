"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  X,
  Upload,
  Download,
  Settings,
  Info,
  FileText,
  MapPin,
  Layers,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid3X3,
  Palette,
  Save,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface MobileNavigationProps {
  isOpen: boolean
  onClose: () => void
  uploadedFile: File | null
  selectedPointsCount: number
  onFileUpload: () => void
  onExport: () => void
  onSettings: () => void
  onInfo: () => void
  onCameraReset: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onToggleFullscreen: () => void
  settings: any
  onToggleGrid: () => void
  onToggleAxes: () => void
}

export function MobileNavigation({
  isOpen,
  onClose,
  uploadedFile,
  selectedPointsCount,
  onFileUpload,
  onExport,
  onSettings,
  onInfo,
  onCameraReset,
  onZoomIn,
  onZoomOut,
  onToggleFullscreen,
  settings,
  onToggleGrid,
  onToggleAxes,
}: MobileNavigationProps) {
  const { toast } = useToast()
  const [activeSection, setActiveSection] = useState<"main" | "camera" | "view">("main")

  const handleAction = (action: () => void, message: string) => {
    action()
    toast({
      title: "Action Completed",
      description: message,
    })
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-80 p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="p-4 border-b bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-white">Navigation Menu</SheetTitle>
              <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/20">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex space-x-2 mt-2">
              <Button
                variant={activeSection === "main" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActiveSection("main")}
                className="text-xs"
              >
                Main
              </Button>
              <Button
                variant={activeSection === "camera" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActiveSection("camera")}
                className="text-xs"
              >
                Camera
              </Button>
              <Button
                variant={activeSection === "view" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActiveSection("view")}
                className="text-xs"
              >
                View
              </Button>
            </div>
          </SheetHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeSection === "main" && (
              <div className="space-y-4">
                {/* File Status */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    File Status
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Current File:</span>
                      <Badge variant={uploadedFile ? "default" : "secondary"}>{uploadedFile ? "Loaded" : "None"}</Badge>
                    </div>
                    {uploadedFile && (
                      <>
                        <div className="text-xs text-gray-600 truncate">{uploadedFile.name}</div>
                        <div className="text-xs text-gray-600">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</div>
                      </>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Points:</span>
                      <Badge variant="outline">{selectedPointsCount}</Badge>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-3">
                  <h3 className="font-semibold">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="h-16 flex flex-col items-center justify-center space-y-1"
                      onClick={() => handleAction(onFileUpload, "Opening file picker...")}
                    >
                      <Upload className="w-5 h-5" />
                      <span className="text-xs">Upload</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-16 flex flex-col items-center justify-center space-y-1"
                      onClick={() => handleAction(onExport, "Opening export options...")}
                      disabled={!uploadedFile && selectedPointsCount === 0}
                    >
                      <Download className="w-5 h-5" />
                      <span className="text-xs">Export</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-16 flex flex-col items-center justify-center space-y-1"
                      onClick={() => handleAction(onSettings, "Opening settings...")}
                    >
                      <Settings className="w-5 h-5" />
                      <span className="text-xs">Settings</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-16 flex flex-col items-center justify-center space-y-1"
                      onClick={() => handleAction(onInfo, "Opening information...")}
                    >
                      <Info className="w-5 h-5" />
                      <span className="text-xs">Info</span>
                    </Button>
                  </div>
                </div>

                {/* Points Summary */}
                {selectedPointsCount > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-semibold mb-2 flex items-center text-blue-800">
                      <MapPin className="w-4 h-4 mr-2" />
                      Selection Points
                    </h3>
                    <div className="text-sm text-blue-700">
                      <div>Total Points: {selectedPointsCount}</div>
                      <div className="text-xs mt-1">Tap "Export" to generate 3D files</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeSection === "camera" && (
              <div className="space-y-4">
                <h3 className="font-semibold">Camera Controls</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="h-16 flex flex-col items-center justify-center space-y-1"
                    onClick={() => handleAction(onCameraReset, "Camera position reset")}
                  >
                    <RotateCcw className="w-5 h-5" />
                    <span className="text-xs">Reset</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-16 flex flex-col items-center justify-center space-y-1"
                    onClick={() => handleAction(onZoomIn, "Zoomed in")}
                  >
                    <ZoomIn className="w-5 h-5" />
                    <span className="text-xs">Zoom In</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-16 flex flex-col items-center justify-center space-y-1"
                    onClick={() => handleAction(onZoomOut, "Zoomed out")}
                  >
                    <ZoomOut className="w-5 h-5" />
                    <span className="text-xs">Zoom Out</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-16 flex flex-col items-center justify-center space-y-1"
                    onClick={() => handleAction(onToggleFullscreen, "Toggled fullscreen")}
                  >
                    <Maximize2 className="w-5 h-5" />
                    <span className="text-xs">Fullscreen</span>
                  </Button>
                </div>

                {/* Camera Tips */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Touch Controls</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Rotate:</span>
                      <span>Single finger drag</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pan:</span>
                      <span>Two finger drag</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Zoom:</span>
                      <span>Pinch gesture</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Add Point:</span>
                      <span>Tap on model</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "view" && (
              <div className="space-y-4">
                <h3 className="font-semibold">View Options</h3>

                {/* View Toggles */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Grid3X3 className="w-4 h-4" />
                      <span className="text-sm font-medium">Show Grid</span>
                    </div>
                    <Button
                      variant={settings?.showGrid ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleAction(onToggleGrid, `Grid ${settings?.showGrid ? "hidden" : "shown"}`)}
                    >
                      {settings?.showGrid ? "On" : "Off"}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Layers className="w-4 h-4" />
                      <span className="text-sm font-medium">Show Axes</span>
                    </div>
                    <Button
                      variant={settings?.showAxes ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleAction(onToggleAxes, `Axes ${settings?.showAxes ? "hidden" : "shown"}`)}
                    >
                      {settings?.showAxes ? "On" : "Off"}
                    </Button>
                  </div>
                </div>

                {/* Render Quality */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium mb-2 flex items-center">
                    <Palette className="w-4 h-4 mr-2" />
                    Render Quality
                  </h4>
                  <div className="text-sm text-gray-600">
                    Current: <Badge variant="outline">{settings?.renderQuality || "medium"}</Badge>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Change in Settings for better performance or quality</div>
                </div>

                {/* Performance Info */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium mb-2 text-blue-800">Mobile Performance</h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    <div>• Medium quality recommended</div>
                    <div>• Grid helps with orientation</div>
                    <div>• Reset camera if view gets lost</div>
                    <div>• Use pinch to zoom smoothly</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t p-4 bg-gray-50">
            <Button variant="outline" className="w-full" onClick={() => handleAction(onClose, "Navigation closed")}>
              <Save className="w-4 h-4 mr-2" />
              Close Menu
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
