"use client"

import { useState, useCallback } from "react"
import { STLViewer } from "@/components/stl-viewer"
import { Header } from "@/components/header"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { 
  ArrowLeft, 
  Eye, 
  Ruler, 
  Palette,
  Grid3X3,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Camera,
  Lightbulb
} from "lucide-react"
import Link from "next/link"

export default function ViewerPage() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [selectedPoints, setSelectedPoints] = useState<
    Array<{ id: string; position: [number, number, number]; type: string; timestamp: number }>
  >([])
  const [measurements, setMeasurements] = useState<
    Array<{ id: string; points: [number, number, number][]; distance: number; label: string }>
  >([])
  const [measurementMode, setMeasurementMode] = useState(false)
  const [activeTab, setActiveTab] = useState("view")
  const { toast } = useToast()
  const isMobile = useMediaQuery("(max-width: 768px)")

  const [viewerSettings, setViewerSettings] = useState({
    showGrid: true,
    showAxes: true,
    backgroundColor: "#f8fafc",
    lightingIntensity: 1.0,
    materialRoughness: 0.2,
    materialMetalness: 0.1,
    opacity: 1.0,
    renderQuality: "high" as "low" | "medium" | "high"
  })

  const handleFileUpload = useCallback((file: File) => {
    setUploadedFile(file)
    toast({
      title: "Model Loaded",
      description: `${file.name} loaded in advanced viewer`,
    })
  }, [toast])

  const handlePointSelect = useCallback(
    (point: { id: string; position: [number, number, number]; type: string; timestamp: number }) => {
      if (measurementMode && selectedPoints.length === 1) {
        const startPoint = selectedPoints[0]
        const distance = Math.sqrt(
          Math.pow(point.position[0] - startPoint.position[0], 2) +
          Math.pow(point.position[1] - startPoint.position[1], 2) +
          Math.pow(point.position[2] - startPoint.position[2], 2)
        )
        
        const measurement = {
          id: `measurement-${Date.now()}`,
          points: [startPoint.position, point.position],
          distance,
          label: `${distance.toFixed(2)} mm`
        }
        
        setMeasurements(prev => [...prev, measurement])
        setSelectedPoints([])
        
        toast({
          title: "Measurement Added",
          description: `Distance: ${distance.toFixed(2)} mm`,
        })
      } else {
        setSelectedPoints(prev => {
          const exists = prev.find(p => p.id === point.id)
          if (exists) {
            return prev.map(p => p.id === point.id ? point : p)
          }
          return measurementMode ? [point] : [...prev, point]
        })
      }
    },
    [measurementMode, selectedPoints, toast]
  )

  const updateViewerSettings = useCallback((settings: Partial<typeof viewerSettings>) => {
    setViewerSettings(prev => ({ ...prev, ...settings }))
  }, [])

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-gray-100">
      <Header
        onFileUpload={handleFileUpload}
        sidebarOpen={false}
        onToggleSidebar={() => {}}
        uploadedFile={uploadedFile}
        selectedPointsCount={selectedPoints.length}
        isMobile={isMobile}
        onSettingsOpen={() => {}}
        onInfoOpen={() => {}}
        onMobileNavOpen={() => {}}
        settings={viewerSettings}
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col">
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href="/">
                  <Button variant="outline" size="sm">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Main
                  </Button>
                </Link>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Advanced Viewer</h1>
                  <p className="text-sm text-gray-600">Enhanced 3D visualization tools</p>
                </div>
              </div>
              <Button
                variant={measurementMode ? "default" : "outline"}
                size="sm"
                onClick={() => setMeasurementMode(!measurementMode)}
              >
                <Ruler className="w-4 h-4 mr-2" />
                Measure
              </Button>
            </div>
          </div>

          <div className="flex-1 relative">
            {uploadedFile ? (
              <STLViewer
                file={uploadedFile}
                onPointSelect={handlePointSelect}
                selectedPoints={selectedPoints}
                exportType="hs-cap"
                isMobile={isMobile}
                onMobileMenuOpen={() => {}}
                settings={viewerSettings}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Eye className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No Model Loaded</h3>
                  <p className="text-gray-500">Upload an STL file to start viewing</p>
                </div>
              </div>
            )}

            {measurements.length > 0 && (
              <div className="absolute top-4 left-4 space-y-2">
                {measurements.map((measurement) => (
                  <div key={measurement.id} className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
                    <div className="flex items-center space-x-2">
                      <Ruler className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-semibold">{measurement.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 m-2">
              <TabsTrigger value="view">View</TabsTrigger>
              <TabsTrigger value="material">Material</TabsTrigger>
            </TabsList>

            <TabsContent value="view" className="p-4 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Display Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Show Grid</Label>
                    <Switch
                      checked={viewerSettings.showGrid}
                      onCheckedChange={(checked) => updateViewerSettings({ showGrid: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Show Axes</Label>
                    <Switch
                      checked={viewerSettings.showAxes}
                      onCheckedChange={(checked) => updateViewerSettings({ showAxes: checked })}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Measurements</CardTitle>
                </CardHeader>  
                <CardContent>
                  <div className="text-sm text-gray-600">
                    Total: {measurements.length} measurements
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="material" className="p-4 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center space-x-2">
                    <Palette className="w-4 h-4" />
                    <span>Material Properties</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm">Roughness</Label>
                    <Slider
                      value={[viewerSettings.materialRoughness]}
                      onValueChange={([value]) => updateViewerSettings({ materialRoughness: value })}
                      max={1}
                      min={0}
                      step={0.05}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Metalness</Label>
                    <Slider
                      value={[viewerSettings.materialMetalness]}
                      onValueChange={([value]) => updateViewerSettings({ materialMetalness: value })}
                      max={1}
                      min={0}
                      step={0.05}
                      className="mt-2"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      <Toaster />
    </div>
  )
} 