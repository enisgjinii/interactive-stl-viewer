"use client"

import React, { useState, useCallback, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Ruler, 
  Square, 
  Triangle, 
  Circle, 
  Volume2, 
  RotateCcw,
  Trash2,
  Download,
  Eye,
  EyeOff,
  Plus,
  Minus,
  Calculator
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export interface Measurement {
  id: string
  type: "distance" | "angle" | "area" | "volume" | "radius" | "diameter"
  points: Array<[number, number, number]>
  value: number
  unit: string
  label: string
  timestamp: number
  visible: boolean
  color: string
  metadata?: {
    precision: number
    method: string
    confidence: number
  }
}

interface MeasurementToolsProps {
  measurements: Measurement[]
  onAddMeasurement: (measurement: Omit<Measurement, 'id' | 'timestamp'>) => void
  onUpdateMeasurement: (id: string, updates: Partial<Measurement>) => void
  onDeleteMeasurement: (id: string) => void
  onClearAll: () => void
  selectedPoints: Array<{ id: string; position: [number, number, number] }>
  units: "mm" | "cm" | "inches"
  isMobile: boolean
}

export function MeasurementTools({
  measurements,
  onAddMeasurement,
  onUpdateMeasurement,
  onDeleteMeasurement,
  onClearAll,
  selectedPoints,
  units,
  isMobile
}: MeasurementToolsProps) {
  const [activeMode, setActiveMode] = useState<Measurement['type'] | null>(null)
  const [precision, setPrecision] = useState(2)
  const [autoCalculate, setAutoCalculate] = useState(true)
  const [showAnnotations, setShowAnnotations] = useState(true)
  const [measurementColor, setMeasurementColor] = useState("#ff0000")
  const { toast } = useToast()

  // Calculate measurement based on selected points and mode
  const calculateMeasurement = useCallback((
    points: Array<[number, number, number]>, 
    type: Measurement['type']
  ): number => {
    switch (type) {
      case "distance":
        if (points.length !== 2) return 0
        const [p1, p2] = points
        return Math.sqrt(
          Math.pow(p2[0] - p1[0], 2) +
          Math.pow(p2[1] - p1[1], 2) +
          Math.pow(p2[2] - p1[2], 2)
        )

      case "angle":
        if (points.length !== 3) return 0
        const [a, vertex, b] = points
        const v1 = [a[0] - vertex[0], a[1] - vertex[1], a[2] - vertex[2]]
        const v2 = [b[0] - vertex[0], b[1] - vertex[1], b[2] - vertex[2]]
        
        const dot = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]
        const mag1 = Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1] + v1[2] * v1[2])
        const mag2 = Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1] + v2[2] * v2[2])
        
        const angle = Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2))))
        return (angle * 180) / Math.PI

      case "radius":
        if (points.length < 3) return 0
        return calculateCircumradius(points.slice(0, 3))

      case "diameter":
        return calculateMeasurement(points, "radius") * 2

      case "area":
        if (points.length < 3) return 0
        return calculatePolygonArea(points)

      case "volume":
        if (points.length < 4) return 0
        return calculateConvexHullVolume(points)

      default:
        return 0
    }
  }, [])

  // Helper functions for complex calculations
  const calculateCircumradius = (points: Array<[number, number, number]>): number => {
    if (points.length !== 3) return 0
    const [a, b, c] = points
    
    const ab = Math.sqrt(Math.pow(b[0] - a[0], 2) + Math.pow(b[1] - a[1], 2) + Math.pow(b[2] - a[2], 2))
    const bc = Math.sqrt(Math.pow(c[0] - b[0], 2) + Math.pow(c[1] - b[1], 2) + Math.pow(c[2] - b[2], 2))
    const ca = Math.sqrt(Math.pow(a[0] - c[0], 2) + Math.pow(a[1] - c[1], 2) + Math.pow(a[2] - c[2], 2))
    
    const area = calculateTriangleArea([a, b, c])
    return (ab * bc * ca) / (4 * area)
  }

  const calculateTriangleArea = (points: Array<[number, number, number]>): number => {
    if (points.length !== 3) return 0
    const [a, b, c] = points
    
    const v1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
    const v2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
    
    const cross = [
      v1[1] * v2[2] - v1[2] * v2[1],
      v1[2] * v2[0] - v1[0] * v2[2],
      v1[0] * v2[1] - v1[1] * v2[0]
    ]
    
    const magnitude = Math.sqrt(cross[0] * cross[0] + cross[1] * cross[1] + cross[2] * cross[2])
    return magnitude / 2
  }

  const calculatePolygonArea = (points: Array<[number, number, number]>): number => {
    if (points.length < 3) return 0
    
    // Project to 2D and calculate area (simplified approach)
    let area = 0
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length
      area += points[i][0] * points[j][1] - points[j][0] * points[i][1]
    }
    return Math.abs(area) / 2
  }

  const calculateConvexHullVolume = (points: Array<[number, number, number]>): number => {
    // Simplified tetrahedron volume calculation
    if (points.length < 4) return 0
    
    const [a, b, c, d] = points.slice(0, 4)
    const v1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
    const v2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
    const v3 = [d[0] - a[0], d[1] - a[1], d[2] - a[2]]
    
    // Calculate scalar triple product
    const cross = [
      v1[1] * v2[2] - v1[2] * v2[1],
      v1[2] * v2[0] - v1[0] * v2[2],
      v1[0] * v2[1] - v1[1] * v2[0]
    ]
    
    const scalarTriple = Math.abs(cross[0] * v3[0] + cross[1] * v3[1] + cross[2] * v3[2])
    return scalarTriple / 6
  }

  // Handle measurement creation
  const handleCreateMeasurement = useCallback(() => {
    if (!activeMode || selectedPoints.length === 0) return

    const requiredPoints = {
      distance: 2,
      angle: 3,
      radius: 3,
      diameter: 3,
      area: 3,
      volume: 4
    }

    if (selectedPoints.length < requiredPoints[activeMode]) {
      toast({
        title: "Insufficient Points",
        description: `${activeMode} measurement requires ${requiredPoints[activeMode]} points`,
        variant: "destructive"
      })
      return
    }

    const points = selectedPoints.slice(0, requiredPoints[activeMode]).map(p => p.position)
    const value = calculateMeasurement(points, activeMode)
    
    const unitSuffix = activeMode === "angle" ? "°" : 
                      activeMode === "area" ? `${units}²` :
                      activeMode === "volume" ? `${units}³` : units

    const newMeasurement = {
      type: activeMode,
      points,
      value,
      unit: unitSuffix,
      label: `${activeMode.charAt(0).toUpperCase() + activeMode.slice(1)}: ${value.toFixed(precision)} ${unitSuffix}`,
      visible: true,
      color: measurementColor,
      metadata: {
        precision,
        method: "direct",
        confidence: 0.95
      }
    }

    onAddMeasurement(newMeasurement)
    
    toast({
      title: "Measurement Added",
      description: newMeasurement.label
    })

    setActiveMode(null)
  }, [activeMode, selectedPoints, precision, measurementColor, units, calculateMeasurement, onAddMeasurement, toast])

  // Auto-calculate when points change
  useEffect(() => {
    if (autoCalculate && activeMode) {
      handleCreateMeasurement()
    }
  }, [selectedPoints, autoCalculate, activeMode, handleCreateMeasurement])

  const exportMeasurements = useCallback(() => {
    const data = {
      metadata: {
        timestamp: new Date().toISOString(),
        units,
        precision,
        count: measurements.length
      },
      measurements: measurements.map(m => ({
        type: m.type,
        value: m.value,
        unit: m.unit,
        label: m.label,
        points: m.points,
        metadata: m.metadata
      }))
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const element = document.createElement('a')
    element.href = url
    element.download = `measurements-${Date.now()}.json`
    element.click()
    URL.revokeObjectURL(url)

    toast({
      title: "Measurements Exported",
      description: `${measurements.length} measurements exported to JSON`
    })
  }, [measurements, units, precision, toast])

  const measurementIcons = {
    distance: Ruler,
    angle: Triangle,
    area: Square,
    volume: Volume2,
    radius: Circle,
    diameter: Circle
  }

  return (
    <Card className="w-full border-gray-200">
      <CardHeader className="pb-1 px-3 pt-2">
        <CardTitle className="text-xs font-medium text-gray-700 flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <Calculator className="w-3 h-3" />
            <span>Measurements</span>
          </div>
          <Badge variant="secondary" className="text-xs px-1 py-0 h-4">{measurements.length}</Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="px-3 pb-2 space-y-2">
        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-6">
            <TabsTrigger value="create" className="text-xs">Create</TabsTrigger>
            <TabsTrigger value="manage" className="text-xs">Manage</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-2 mt-2">
            {/* Measurement Tools */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Type</Label>
              <div className="grid grid-cols-3 gap-1">
                {Object.entries(measurementIcons).map(([type, Icon]) => (
                  <Button
                    key={type}
                    variant={activeMode === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveMode(activeMode === type ? null : type as Measurement['type'])}
                    className="h-6 text-xs px-1"
                    title={type}
                  >
                    <Icon className="w-3 h-3" />
                  </Button>
                ))}
              </div>
            </div>

            {/* Settings */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Auto Calculate</Label>
                <Switch
                  checked={autoCalculate}
                  onCheckedChange={setAutoCalculate}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Precision</Label>
                <Slider
                  value={[precision]}
                  onValueChange={([value]) => setPrecision(value)}
                  max={6}
                  min={0}
                  step={1}
                  className="w-full"
                />
                <div className="text-xs text-gray-500">{precision} decimal places</div>
              </div>
            </div>

            {/* Create Button */}
            {activeMode && !autoCalculate && (
              <Button
                onClick={handleCreateMeasurement}
                className="w-full h-6 text-xs"
                disabled={selectedPoints.length === 0}
              >
                <Plus className="w-3 h-3 mr-1" />
                Create {activeMode}
              </Button>
            )}

            {/* Instructions */}
            {activeMode && (
              <div className="text-xs text-gray-600 bg-gray-50 p-1 rounded">
                <strong>{activeMode.charAt(0).toUpperCase() + activeMode.slice(1)}:</strong>
                {activeMode === "distance" && " Select 2 points"}
                {activeMode === "angle" && " Select 3 points (vertex in middle)"}
                {activeMode === "radius" && " Select 3 points on circle"}
                {activeMode === "diameter" && " Select 3 points on circle"}
                {activeMode === "area" && " Select 3+ points to form polygon"}
                {activeMode === "volume" && " Select 4+ points for volume"}
              </div>
            )}
          </TabsContent>

          <TabsContent value="manage" className="space-y-2 mt-2">
            {/* Global Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <Switch
                  checked={showAnnotations}
                  onCheckedChange={setShowAnnotations}
                />
                <Label className="text-xs">Labels</Label>
              </div>
              <div className="flex space-x-1">
                <Button variant="outline" size="sm" onClick={exportMeasurements} className="h-6 w-6 p-0">
                  <Download className="w-3 h-3" />
                </Button>
                <Button variant="outline" size="sm" onClick={onClearAll} className="h-6 w-6 p-0">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Measurement List */}
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {measurements.length === 0 ? (
                <div className="text-center py-2 text-xs text-gray-500">
                  No measurements yet
                </div>
              ) : (
                measurements.map((measurement) => {
                  const Icon = measurementIcons[measurement.type]
                  return (
                    <div
                      key={measurement.id}
                      className="flex items-center justify-between p-1 bg-gray-50 rounded text-xs"
                    >
                      <div className="flex items-center space-x-1 flex-1 min-w-0">
                        <Icon className="w-3 h-3" style={{ color: measurement.color }} />
                        <div className="truncate">
                          <div className="font-medium">{measurement.label}</div>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onUpdateMeasurement(measurement.id, {
                            visible: !measurement.visible
                          })}
                          className="h-4 w-4 p-0"
                        >
                          {measurement.visible ? <Eye className="w-2 h-2" /> : <EyeOff className="w-2 h-2" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteMeasurement(measurement.id)}
                          className="h-4 w-4 p-0"
                        >
                          <Trash2 className="w-2 h-2" />
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Statistics */}
            {measurements.length > 0 && (
              <div className="text-xs text-gray-600 space-y-0.5">
                <div>Total: {measurements.length} measurements</div>
                <div>
                  Types: {Object.entries(
                    measurements.reduce((acc, m) => {
                      acc[m.type] = (acc[m.type] || 0) + 1
                      return acc
                    }, {} as Record<string, number>)
                  ).map(([type, count]) => `${type}: ${count}`).join(", ")}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
} 