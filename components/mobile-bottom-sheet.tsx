"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Trash2, X, Download, AlertTriangle, FileText, MapPin, Settings, Info, Plus, Minus } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"

interface MobileBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  selectedPoints: Array<{ id: string; position: [number, number, number]; type: string; timestamp: number }>
  onClearAllPoints: () => void
  onClearSelectedPoint: (id: string) => void
  exportType: "hs-cap-small" | "hs-cap"
  onExportTypeChange: (type: "hs-cap-small" | "hs-cap") => void
  onExport: () => void
  hasFile: boolean
  uploadedFile: File | null
  settings: any
}

export function MobileBottomSheet({
  isOpen,
  onClose,
  selectedPoints,
  onClearAllPoints,
  onClearSelectedPoint,
  exportType,
  onExportTypeChange,
  onExport,
  hasFile,
  uploadedFile,
  settings,
}: MobileBottomSheetProps) {
  const canExport = hasFile || selectedPoints.length > 0
  const { toast } = useToast()
  const [expandedPoint, setExpandedPoint] = useState<string | null>(null)

  const handleExportClick = () => {
    if (!canExport) {
      toast({
        title: "Cannot Export",
        description: "Upload a file or add points first",
        variant: "destructive",
      })
      return
    }
    onExport()
    onClose()
  }

  const handleClearAll = () => {
    if (selectedPoints.length === 0) return
    onClearAllPoints()
    toast({
      title: "Points Cleared",
      description: `Removed ${selectedPoints.length} points`,
    })
  }

  const getSessionDuration = () => {
    if (selectedPoints.length === 0) return "0 min"
    const firstPoint = Math.min(...selectedPoints.map((p) => p.timestamp))
    const duration = Math.floor((Date.now() - firstPoint) / 60000)
    return `${duration} min`
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl border-t-4 border-orange-500">
        <SheetHeader className="pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-bold bg-gradient-to-r from-orange-600 to-orange-800 bg-clip-text text-transparent">
              Scan Controls
            </SheetTitle>
            <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="text-center p-3 bg-blue-50 rounded-xl">
              <div className="text-lg font-bold text-blue-600">{selectedPoints.length}</div>
              <div className="text-xs text-blue-800">Points</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-xl">
              <div className="text-lg font-bold text-green-600">{hasFile ? "1" : "0"}</div>
              <div className="text-xs text-green-800">Files</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-xl">
              <div className="text-lg font-bold text-orange-600">{getSessionDuration()}</div>
              <div className="text-xs text-orange-800">Session</div>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <Tabs defaultValue="points" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6 h-12">
              <TabsTrigger value="points" className="text-xs font-medium">
                <MapPin className="w-4 h-4 mr-1" />
                Points
              </TabsTrigger>
              <TabsTrigger value="export" className="text-xs font-medium">
                <Download className="w-4 h-4 mr-1" />
                Export
              </TabsTrigger>
              <TabsTrigger value="file" className="text-xs font-medium">
                <FileText className="w-4 h-4 mr-1" />
                File
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-xs font-medium">
                <Settings className="w-4 h-4 mr-1" />
                Quick
              </TabsTrigger>
            </TabsList>

            <TabsContent value="points" className="space-y-4">
              {/* Points Management */}
              <Card className="border-2 border-green-100 shadow-lg">
                <CardHeader className="pb-3 bg-gradient-to-r from-green-50 to-emerald-50">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center">
                      <MapPin className="w-5 h-5 mr-2 text-green-600" />
                      Selection Points
                    </span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800 text-sm px-3 py-1">
                      {selectedPoints.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={handleClearAll}
                      className="h-12 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-all"
                      disabled={selectedPoints.length === 0}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear All ({selectedPoints.length})
                    </Button>
                    <Button
                      variant="outline"
                      className="h-12 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all"
                      disabled
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Point
                    </Button>
                  </div>

                  {/* Points List */}
                  <div className="max-h-64 overflow-y-auto space-y-3">
                    {selectedPoints.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <div className="text-4xl mb-3">👆</div>
                        <p className="font-medium">No Points Selected</p>
                        <p className="text-sm mt-1">Tap on the 3D model to add selection points</p>
                      </div>
                    ) : (
                      selectedPoints.map((point, index) => (
                        <div
                          key={point.id}
                          className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border-2 border-green-200 overflow-hidden"
                        >
                          <div className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                  <span className="font-bold text-gray-800">Point {index + 1}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {point.type}
                                  </Badge>
                                </div>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setExpandedPoint(expandedPoint === point.id ? null : point.id)}
                                  className="text-xs p-1 h-auto"
                                >
                                  {expandedPoint === point.id ? (
                                    <Minus className="w-3 h-3" />
                                  ) : (
                                    <Plus className="w-3 h-3" />
                                  )}
                                  <span className="ml-1">Details</span>
                                </Button>
                              </div>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onClearSelectedPoint(point.id)}
                                className="h-10 w-10 p-0 hover:bg-red-100 hover:text-red-600 rounded-full"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>

                            {expandedPoint === point.id && (
                              <div className="mt-3 pt-3 border-t border-green-200 space-y-2">
                                <div className="text-xs">
                                  <span className="font-medium text-gray-600">Position:</span>
                                  <div className="font-mono text-gray-800 mt-1">
                                    X: {point.position[0].toFixed(3)}
                                    <br />
                                    Y: {point.position[1].toFixed(3)}
                                    <br />
                                    Z: {point.position[2].toFixed(3)}
                                  </div>
                                </div>
                                <div className="text-xs">
                                  <span className="font-medium text-gray-600">Created:</span>
                                  <div className="text-gray-800 mt-1">{new Date(point.timestamp).toLocaleString()}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="export" className="space-y-4">
              {/* Export Configuration */}
              <Card className="border-2 border-orange-100 shadow-lg">
                <CardHeader className="pb-3 bg-gradient-to-r from-orange-50 to-red-50">
                  <CardTitle className="text-lg flex items-center">
                    <Download className="w-5 h-5 mr-2 text-orange-600" />
                    Export Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                  {/* Export Type Selection */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-800">Component Type</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div
                        className={`text-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          exportType === "hs-cap-small"
                            ? "border-orange-500 bg-orange-50"
                            : "border-gray-200 hover:border-orange-300"
                        }`}
                        onClick={() => onExportTypeChange("hs-cap-small")}
                      >
                        <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl mx-auto mb-3 shadow-lg"></div>
                        <div className="font-medium text-sm">HS Cap Small</div>
                        <div className="text-xs text-gray-600 mt-1">Compact design</div>
                      </div>
                      <div
                        className={`text-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          exportType === "hs-cap"
                            ? "border-orange-500 bg-orange-50"
                            : "border-gray-200 hover:border-orange-300"
                        }`}
                        onClick={() => onExportTypeChange("hs-cap")}
                      >
                        <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl mx-auto mb-3 shadow-lg"></div>
                        <div className="font-medium text-sm">HS Cap</div>
                        <div className="text-xs text-gray-600 mt-1">Standard size</div>
                      </div>
                    </div>
                  </div>

                  {/* Export Status */}
                  {!canExport && (
                    <div className="flex items-start space-x-3 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-yellow-800">Export Not Available</div>
                        <div className="text-sm text-yellow-700 mt-1">
                          Upload an STL file or add selection points to enable export functionality
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Export Progress Preview */}
                  {canExport && (
                    <div className="bg-blue-50 rounded-xl p-4">
                      <h4 className="font-medium text-blue-800 mb-3">Ready to Export</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Components:</span>
                          <span className="font-medium">{selectedPoints.length} cylinders</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Type:</span>
                          <span className="font-medium">{exportType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Estimated size:</span>
                          <span className="font-medium">~{(selectedPoints.length * 0.1 + 1).toFixed(1)} MB</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Export Button */}
                  <Button
                    onClick={handleExportClick}
                    disabled={!canExport}
                    className="w-full h-14 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-5 h-5 mr-3" />
                    {canExport ? "Export STL File" : "Export Disabled"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="file" className="space-y-4">
              {/* File Information */}
              <Card className="border-2 border-blue-100 shadow-lg">
                <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <CardTitle className="text-lg flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-blue-600" />
                    File Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {uploadedFile ? (
                    <div className="space-y-4">
                      <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="font-medium text-green-800">File Loaded Successfully</span>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <div className="text-sm font-medium text-gray-600">Filename</div>
                            <div className="text-sm text-gray-800 font-mono break-all">{uploadedFile.name}</div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-sm font-medium text-gray-600">Size</div>
                              <div className="text-sm text-gray-800">
                                {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-600">Type</div>
                              <div className="text-sm text-gray-800">STL</div>
                            </div>
                          </div>

                          <div>
                            <div className="text-sm font-medium text-gray-600">Last Modified</div>
                            <div className="text-sm text-gray-800">
                              {new Date(uploadedFile.lastModified).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* File Actions */}
                      <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" className="h-12">
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                        <Button variant="outline" className="h-12">
                          <Info className="w-4 h-4 mr-2" />
                          Details
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-3">📁</div>
                      <p className="font-medium text-gray-600">No File Loaded</p>
                      <p className="text-sm text-gray-500 mt-1">Upload an STL file to begin processing</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              {/* Quick Settings */}
              <Card className="border-2 border-purple-100 shadow-lg">
                <CardHeader className="pb-3 bg-gradient-to-r from-purple-50 to-pink-50">
                  <CardTitle className="text-lg flex items-center">
                    <Settings className="w-5 h-5 mr-2 text-purple-600" />
                    Quick Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <div className="font-medium text-sm">Render Quality</div>
                        <div className="text-xs text-gray-600">Current: {settings?.renderQuality || "medium"}</div>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {settings?.renderQuality || "medium"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <div className="font-medium text-sm">Auto Save</div>
                        <div className="text-xs text-gray-600">Automatic project saving</div>
                      </div>
                      <Badge variant={settings?.autoSave ? "default" : "secondary"}>
                        {settings?.autoSave ? "On" : "Off"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <div className="font-medium text-sm">Show Grid</div>
                        <div className="text-xs text-gray-600">Reference grid display</div>
                      </div>
                      <Badge variant={settings?.showGrid ? "default" : "secondary"}>
                        {settings?.showGrid ? "Visible" : "Hidden"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <div className="font-medium text-sm">Units</div>
                        <div className="text-xs text-gray-600">Measurement units</div>
                      </div>
                      <Badge variant="outline">{settings?.units || "mm"}</Badge>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full h-12">
                    <Settings className="w-4 h-4 mr-2" />
                    Open Full Settings
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sticky Footer */}
        <div className="border-t bg-white p-4">
          <Button variant="outline" onClick={onClose} className="w-full h-12 text-lg font-medium">
            Close Panel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
