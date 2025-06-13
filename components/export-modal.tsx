"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Download, FileText, Settings, Layers, Smartphone, Info, Zap, Archive, Globe } from "lucide-react"
import type { AppSettings } from "@/app/page"
import { CheckedState } from "@radix-ui/react-checkbox"

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  onExport: (options: {
    format: "stl" | "obj" | "ply"
    quality: "low" | "medium" | "high"
    includeOriginal: boolean
    includeCylinders: boolean
    compression: boolean
    metadata: boolean
    units: "mm" | "cm" | "inches"
  }) => Promise<void>
  isExporting: boolean
  exportProgress: number
  selectedPoints: Array<{ id: string; position: [number, number, number]; type: string; timestamp: number }>
  hasOriginalFile: boolean
  isMobile: boolean
  settings: AppSettings
}

export function ExportModal({
  isOpen,
  onClose,
  onExport,
  isExporting,
  exportProgress,
  selectedPoints,
  hasOriginalFile,
  isMobile,
  settings,
}: ExportModalProps) {
  const [format, setFormat] = useState<"stl" | "obj" | "ply">("stl")
  const [quality, setQuality] = useState<"low" | "medium" | "high">(isMobile ? "medium" : "high")
  const [includeOriginal, setIncludeOriginal] = useState(false)
  const [includeCylinders, setIncludeCylinders] = useState(true)
  const [compression, setCompression] = useState(false)
  const [metadata, setMetadata] = useState(true)
  const [units, setUnits] = useState<"mm" | "cm" | "inches">(settings.units)
  const [meshResolution, setMeshResolution] = useState([50])
  const [smoothing, setSmoothing] = useState([0])

  const handleExport = async () => {
    await onExport({
      format,
      quality,
      includeOriginal,
      includeCylinders,
      compression,
      metadata,
      units,
    })
  }

  const getEstimatedFileSize = () => {
    let baseSize = hasOriginalFile ? 2.5 : 1.0 // MB
    if (includeCylinders) baseSize += selectedPoints.length * 0.1
    if (quality === "high") baseSize *= 1.5
    else if (quality === "low") baseSize *= 0.7
    if (compression) baseSize *= 0.6
    return baseSize.toFixed(1)
  }

  const getFormatInfo = (fmt: string) => {
    switch (fmt) {
      case "stl":
        return { desc: "Standard for 3D printing", size: "Medium", compat: "Excellent" }
      case "obj":
        return { desc: "Universal 3D format", size: "Large", compat: "Good" }
      case "ply":
        return { desc: "Research & analysis", size: "Small", compat: "Limited" }
      default:
        return { desc: "", size: "", compat: "" }
    }
  }

  const handleCheckboxChange = (setter: React.Dispatch<React.SetStateAction<boolean>>) => (checked: CheckedState) => {
    if (checked === true) {
      setter(true)
    } else {
      setter(false)
    }
  }

  if (isExporting) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={`${isMobile ? "sm:max-w-[95vw]" : "sm:max-w-md"}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Download className="w-5 h-5 text-orange-500 animate-bounce" />
              <span>Exporting File</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-4">
                <div className="absolute inset-0 border-4 border-orange-200 rounded-full"></div>
                <div
                  className="absolute inset-0 border-4 border-orange-500 rounded-full border-t-transparent animate-spin"
                  style={{ animationDuration: "1s" }}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-orange-600">{exportProgress}%</span>
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Generating {format.toUpperCase()} File</h3>
              <p className="text-sm text-gray-600 mb-4">
                Processing {selectedPoints.length} points with {quality} quality...
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Export Progress</span>
                <span>{exportProgress}%</span>
              </div>
              <Progress value={exportProgress} className="w-full h-3" />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Info className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Export Details</span>
              </div>
              <div className="text-xs text-blue-700 space-y-1">
                <div>Format: {format.toUpperCase()}</div>
                <div>Quality: {quality.charAt(0).toUpperCase() + quality.slice(1)}</div>
                <div>
                  Components:{" "}
                  {[includeOriginal && "Original", includeCylinders && "Cylinders"].filter(Boolean).join(", ")}
                </div>
                <div>Estimated Size: ~{getEstimatedFileSize()} MB</div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`${isMobile ? "sm:max-w-[95vw] max-h-[90vh] overflow-y-auto" : "sm:max-w-2xl max-h-[90vh] overflow-y-auto"}`}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Download className="w-5 h-5 text-orange-500" />
            <span>Advanced Export</span>
          </DialogTitle>
          <DialogDescription>Configure detailed export settings for your 3D model</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            {/* File Format */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span>File Format</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <RadioGroup value={format} onValueChange={(value) => setFormat(value as "stl" | "obj" | "ply")}>
                  {["stl", "obj", "ply"].map((fmt) => {
                    const info = getFormatInfo(fmt)
                    return (
                      <div key={fmt} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                        <RadioGroupItem value={fmt} id={fmt} className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor={fmt} className="cursor-pointer font-medium">
                            {fmt.toUpperCase()}
                            {fmt === "stl" && <Badge className="ml-2 text-xs">Recommended</Badge>}
                          </Label>
                          <p className="text-xs text-gray-600 mt-1">{info.desc}</p>
                          <div className="flex space-x-4 mt-2 text-xs">
                            <span>
                              Size: <strong>{info.size}</strong>
                            </span>
                            <span>
                              Compatibility: <strong>{info.compat}</strong>
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Quality Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Settings className="w-4 h-4" />
                  <span>Quality Settings</span>
                  {isMobile && <Smartphone className="w-3 h-3 text-blue-500" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Export Quality</Label>
                  <RadioGroup value={quality} onValueChange={(value) => setQuality(value as "low" | "medium" | "high")}>
                    {[
                      { value: "low", label: "Low", desc: "Fast export, smaller file", time: "~30s" },
                      { value: "medium", label: "Medium", desc: "Balanced quality and speed", time: "~60s" },
                      { value: "high", label: "High", desc: "Best quality, larger file", time: "~120s" },
                    ].map((q) => (
                      <div key={q.value} className="flex items-center space-x-3 p-2 border rounded hover:bg-gray-50">
                        <RadioGroupItem value={q.value} id={q.value} />
                        <div className="flex-1">
                          <Label htmlFor={q.value} className="cursor-pointer font-medium">
                            {q.label}
                          </Label>
                          <div className="flex justify-between text-xs text-gray-600 mt-1">
                            <span>{q.desc}</span>
                            <span>{q.time}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {isMobile && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <Smartphone className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Mobile Optimization</span>
                    </div>
                    <p className="text-xs text-blue-700">
                      Medium quality is recommended for mobile devices to balance performance and file size.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Components */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Layers className="w-4 h-4" />
                  <span>Include Components</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="original"
                        checked={includeOriginal}
                        onCheckedChange={handleCheckboxChange(setIncludeOriginal)}
                        disabled={!hasOriginalFile}
                      />
                      <div>
                        <Label htmlFor="original" className="cursor-pointer font-medium">
                          Original Scan Data
                        </Label>
                        <p className="text-xs text-gray-600">
                          {hasOriginalFile ? "Include uploaded STL file" : "No file uploaded"}
                        </p>
                      </div>
                    </div>
                    <Badge variant={hasOriginalFile ? "default" : "secondary"}>
                      {hasOriginalFile ? "Available" : "N/A"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="cylinders"
                        checked={includeCylinders}
                        onCheckedChange={handleCheckboxChange(setIncludeCylinders)}
                        disabled={selectedPoints.length === 0}
                      />
                      <div>
                        <Label htmlFor="cylinders" className="cursor-pointer font-medium">
                          Cylinder Components
                        </Label>
                        <p className="text-xs text-gray-600">Generated from selection points</p>
                      </div>
                    </div>
                    <Badge variant={selectedPoints.length > 0 ? "default" : "secondary"}>
                      {selectedPoints.length} points
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            {/* Advanced Options */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Zap className="w-4 h-4" />
                  <span>Advanced Options</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Units</Label>
                    <Select value={units} onValueChange={(value) => setUnits(value as "mm" | "cm" | "inches")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mm">Millimeters (mm)</SelectItem>
                        <SelectItem value="cm">Centimeters (cm)</SelectItem>
                        <SelectItem value="inches">Inches (in)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Mesh Resolution</Label>
                    <div className="px-2">
                      <Slider
                        value={meshResolution}
                        onValueChange={setMeshResolution}
                        max={100}
                        min={10}
                        step={10}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Low</span>
                        <span>{meshResolution[0]}%</span>
                        <span>High</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="compression"
                        checked={compression}
                        onCheckedChange={handleCheckboxChange(setCompression)}
                      />
                      <div>
                        <Label htmlFor="compression" className="cursor-pointer font-medium">
                          Enable Compression
                        </Label>
                        <p className="text-xs text-gray-600">Reduce file size by ~40%</p>
                      </div>
                    </div>
                    <Archive className="w-4 h-4 text-gray-400" />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="metadata"
                        checked={metadata}
                        onCheckedChange={handleCheckboxChange(setMetadata)}
                      />
                      <div>
                        <Label htmlFor="metadata" className="cursor-pointer font-medium">
                          Include Metadata
                        </Label>
                        <p className="text-xs text-gray-600">Export info, timestamps, settings</p>
                      </div>
                    </div>
                    <Info className="w-4 h-4 text-gray-400" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Surface Smoothing</Label>
                  <div className="px-2">
                    <Slider
                      value={smoothing}
                      onValueChange={setSmoothing}
                      max={100}
                      min={0}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>None</span>
                      <span>{smoothing[0]}%</span>
                      <span>Maximum</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            {/* Export Preview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Globe className="w-4 h-4" />
                  <span>Export Preview</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">File Format:</span>
                    <Badge>{format.toUpperCase()}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Quality:</span>
                    <Badge variant="outline">{quality.charAt(0).toUpperCase() + quality.slice(1)}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Estimated Size:</span>
                    <Badge variant="secondary">~{getEstimatedFileSize()} MB</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Components:</span>
                    <div className="text-right">
                      {[
                        includeOriginal && hasOriginalFile && "Original scan",
                        includeCylinders && selectedPoints.length > 0 && `${selectedPoints.length} cylinders`,
                      ]
                        .filter(Boolean)
                        .map((component, index) => (
                          <Badge key={index} variant="outline" className="ml-1">
                            {component}
                          </Badge>
                        )) || <Badge variant="secondary">None selected</Badge>}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Units:</span>
                    <Badge variant="outline">{units}</Badge>
                  </div>
                  {compression && (
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Compression:</span>
                      <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                    </div>
                  )}
                  {metadata && (
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Metadata:</span>
                      <Badge className="bg-blue-100 text-blue-800">Included</Badge>
                    </div>
                  )}
                </div>

                <div className="border-t pt-3">
                  <h4 className="font-medium mb-2">Export Contents:</h4>
                  <div className="space-y-2 text-sm">
                    {includeOriginal && hasOriginalFile && (
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>Original STL geometry</span>
                      </div>
                    )}
                    {includeCylinders &&
                      selectedPoints.map((point, index) => (
                        <div key={point.id} className="flex items-center space-x-2">
                          <div
                            className={`w-2 h-2 rounded-full ${point.type === "hs-cap-small" ? "bg-yellow-500" : "bg-orange-500"}`}
                          ></div>
                          <span>
                            Cylinder {index + 1} ({point.type}) at ({point.position.map((p) => p.toFixed(1)).join(", ")}
                            )
                          </span>
                        </div>
                      ))}
                    {metadata && (
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                        <span>Export metadata and timestamps</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className={`flex ${isMobile ? "flex-col space-y-2" : "flex-row space-x-3"} pt-4 border-t`}>
          <Button
            variant="outline"
            onClick={onClose}
            className={isMobile ? "w-full" : "flex-1"}
            size={isMobile ? "lg" : "default"}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            className={`bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 ${
              isMobile ? "w-full" : "flex-1"
            }`}
            disabled={!includeOriginal && !includeCylinders}
            size={isMobile ? "lg" : "default"}
          >
            <Download className="w-4 h-4 mr-2" />
            Export {format.toUpperCase()} File
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
