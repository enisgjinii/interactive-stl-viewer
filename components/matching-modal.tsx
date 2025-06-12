"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search,
  Target,
  Settings,
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Cpu,
  BarChart3,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface MatchingModalProps {
  isOpen: boolean
  onClose: () => void
  selectedPoints: Array<{ id: string; position: [number, number, number]; type: string; timestamp: number }>
  uploadedFile: File | null
  onStartMatching: (config: MatchingConfig) => Promise<MatchResult[]>
  onExportMatched: (matches: MatchResult[], config: ExportConfig) => Promise<void>
  isMobile: boolean
  settings: any
}

export interface MatchingConfig {
  algorithm: "icp" | "feature" | "hybrid"
  tolerance: number
  maxIterations: number
  enableRefinement: boolean
  matchThreshold: number
  useNormals: boolean
  scaleTolerance: number
  rotationTolerance: number
}

export interface MatchResult {
  id: string
  sourcePoint: { id: string; position: [number, number, number] }
  targetGeometry: {
    vertices: Float32Array
    faces: Uint32Array
    transform: number[]
  }
  confidence: number
  matchType: "exact" | "approximate" | "scaled"
  transformMatrix: number[]
  boundingBox: {
    min: [number, number, number]
    max: [number, number, number]
  }
}

export interface ExportConfig {
  includeOriginal: boolean
  includeMatches: boolean
  includePoints: boolean
  mergeGeometry: boolean
  format: "stl" | "obj" | "ply"
  quality: "low" | "medium" | "high"
}

export function MatchingModal({
  isOpen,
  onClose,
  selectedPoints,
  uploadedFile,
  onStartMatching,
  onExportMatched,
  isMobile,
  settings,
}: MatchingModalProps) {
  const [isMatching, setIsMatching] = useState(false)
  const [matchingProgress, setMatchingProgress] = useState(0)
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [selectedMatches, setSelectedMatches] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState("configure")
  const { toast } = useToast()

  // Matching Configuration
  const [matchingConfig, setMatchingConfig] = useState<MatchingConfig>({
    algorithm: "hybrid",
    tolerance: 0.5,
    maxIterations: 100,
    enableRefinement: true,
    matchThreshold: 0.8,
    useNormals: true,
    scaleTolerance: 0.1,
    rotationTolerance: 15,
  })

  // Export Configuration
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    includeOriginal: true,
    includeMatches: true,
    includePoints: false,
    mergeGeometry: true,
    format: "stl",
    quality: isMobile ? "medium" : "high",
  })

  const [matchingStats, setMatchingStats] = useState({
    totalProcessed: 0,
    successfulMatches: 0,
    averageConfidence: 0,
    processingTime: 0,
  })

  useEffect(() => {
    if (matches.length > 0) {
      setSelectedMatches(new Set(matches.map((m) => m.id)))
      setActiveTab("results")
    }
  }, [matches])

  const handleStartMatching = async () => {
    if (selectedPoints.length === 0) {
      toast({
        title: "No Points Selected",
        description: "Please select points on the 3D model to match shapes",
        variant: "destructive",
      })
      return
    }

    if (!uploadedFile) {
      toast({
        title: "No File Loaded",
        description: "Please upload an STL file to perform shape matching",
        variant: "destructive",
      })
      return
    }

    setIsMatching(true)
    setMatchingProgress(0)
    setMatches([])

    try {
      const startTime = Date.now()

      // Simulate matching progress
      const progressSteps = [
        { step: "Analyzing geometry...", progress: 10 },
        { step: "Extracting features...", progress: 25 },
        { step: "Computing correspondences...", progress: 45 },
        { step: "Refining matches...", progress: 65 },
        { step: "Validating results...", progress: 85 },
        { step: "Finalizing matches...", progress: 100 },
      ]

      for (const { step, progress } of progressSteps) {
        setMatchingProgress(progress)
        await new Promise((resolve) => setTimeout(resolve, isMobile ? 600 : 800))
      }

      const results = await onStartMatching(matchingConfig)
      setMatches(results)

      const processingTime = Date.now() - startTime
      const successfulMatches = results.filter((r) => r.confidence > matchingConfig.matchThreshold).length
      const averageConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length

      setMatchingStats({
        totalProcessed: selectedPoints.length,
        successfulMatches,
        averageConfidence,
        processingTime,
      })

      toast({
        title: "Matching Complete",
        description: `Found ${successfulMatches} high-confidence matches out of ${selectedPoints.length} points`,
      })
    } catch (error) {
      console.error("Matching error:", error)
      toast({
        title: "Matching Failed",
        description: "An error occurred during shape matching. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsMatching(false)
      setMatchingProgress(0)
    }
  }

  const handleExportMatched = async () => {
    const selectedMatchList = matches.filter((m) => selectedMatches.has(m.id))

    if (selectedMatchList.length === 0) {
      toast({
        title: "No Matches Selected",
        description: "Please select at least one match to export",
        variant: "destructive",
      })
      return
    }

    try {
      await onExportMatched(selectedMatchList, exportConfig)
      toast({
        title: "Export Successful",
        description: `Exported ${selectedMatchList.length} matched shapes`,
      })
      onClose()
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export matched shapes",
        variant: "destructive",
      })
    }
  }

  const toggleMatchSelection = (matchId: string) => {
    const newSelection = new Set(selectedMatches)
    if (newSelection.has(matchId)) {
      newSelection.delete(matchId)
    } else {
      newSelection.add(matchId)
    }
    setSelectedMatches(newSelection)
  }

  const selectAllMatches = () => {
    setSelectedMatches(new Set(matches.map((m) => m.id)))
  }

  const clearAllMatches = () => {
    setSelectedMatches(new Set())
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600 bg-green-50"
    if (confidence >= 0.6) return "text-yellow-600 bg-yellow-50"
    return "text-red-600 bg-red-50"
  }

  const getMatchTypeIcon = (type: string) => {
    switch (type) {
      case "exact":
        return <CheckCircle className="w-3 h-3 text-green-600" />
      case "approximate":
        return <Target className="w-3 h-3 text-yellow-600" />
      case "scaled":
        return <RefreshCw className="w-3 h-3 text-blue-600" />
      default:
        return <AlertCircle className="w-3 h-3 text-gray-600" />
    }
  }

  if (isMatching) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={`${isMobile ? "sm:max-w-[90vw]" : "sm:max-w-md"}`}>
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center space-x-2 text-lg">
              <Search className="w-4 h-4 text-blue-500 animate-pulse" />
              <span>Shape Matching</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="text-center">
              <div className="relative w-16 h-16 mx-auto mb-3">
                <div className="absolute inset-0 border-3 border-blue-200 rounded-full"></div>
                <div
                  className="absolute inset-0 border-3 border-blue-500 rounded-full border-t-transparent animate-spin"
                  style={{ animationDuration: "1s" }}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-600">{matchingProgress}%</span>
                </div>
              </div>
              <h3 className="text-base font-semibold mb-1">Analyzing Shapes</h3>
              <p className="text-xs text-gray-600 mb-3">Processing {selectedPoints.length} points...</p>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Progress</span>
                <span>{matchingProgress}%</span>
              </div>
              <Progress value={matchingProgress} className="w-full h-2" />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                <Cpu className="w-3 h-3 text-blue-600" />
                <span className="text-xs font-medium text-blue-800">Processing</span>
              </div>
              <div className="text-xs text-blue-700 space-y-0.5">
                <div>Algorithm: {matchingConfig.algorithm.toUpperCase()}</div>
                <div>Tolerance: {matchingConfig.tolerance}</div>
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
        className={`${isMobile ? "sm:max-w-[95vw] max-h-[85vh] overflow-y-auto" : "sm:max-w-3xl max-h-[85vh] overflow-y-auto"}`}
      >
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center space-x-2 text-lg">
            <Search className="w-4 h-4 text-blue-500" />
            <span>Shape Matching</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Match shapes and export scenes with matched geometries
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-8">
            <TabsTrigger value="configure" className="text-xs">
              Configure
            </TabsTrigger>
            <TabsTrigger value="results" className="text-xs">
              Results ({matches.length})
            </TabsTrigger>
            <TabsTrigger value="export" className="text-xs">
              Export
            </TabsTrigger>
          </TabsList>

          <TabsContent value="configure" className="space-y-3 mt-3">
            {/* Matching Configuration */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Settings className="w-3 h-3" />
                  <span>Algorithm</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Type</Label>
                  <Select
                    value={matchingConfig.algorithm}
                    onValueChange={(value) =>
                      setMatchingConfig((prev) => ({ ...prev, algorithm: value as "icp" | "feature" | "hybrid" }))
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="icp">ICP (Precise)</SelectItem>
                      <SelectItem value="feature">Feature (Fast)</SelectItem>
                      <SelectItem value="hybrid">Hybrid (Recommended)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Tolerance</Label>
                    <div className="px-1">
                      <Slider
                        value={[matchingConfig.tolerance]}
                        onValueChange={([value]) => setMatchingConfig((prev) => ({ ...prev, tolerance: value }))}
                        max={2.0}
                        min={0.1}
                        step={0.1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-0.5">
                        <span>Strict</span>
                        <span>{matchingConfig.tolerance.toFixed(1)}</span>
                        <span>Loose</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Threshold</Label>
                    <div className="px-1">
                      <Slider
                        value={[matchingConfig.matchThreshold]}
                        onValueChange={([value]) => setMatchingConfig((prev) => ({ ...prev, matchThreshold: value }))}
                        max={1.0}
                        min={0.1}
                        step={0.05}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-0.5">
                        <span>Low</span>
                        <span>{(matchingConfig.matchThreshold * 100).toFixed(0)}%</span>
                        <span>High</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Refinement</Label>
                    <Switch
                      checked={matchingConfig.enableRefinement}
                      onCheckedChange={(checked) =>
                        setMatchingConfig((prev) => ({ ...prev, enableRefinement: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Use Normals</Label>
                    <Switch
                      checked={matchingConfig.useNormals}
                      onCheckedChange={(checked) => setMatchingConfig((prev) => ({ ...prev, useNormals: checked }))}
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                  <div className="text-xs text-blue-700 space-y-0.5">
                    <div>Points: {selectedPoints.length}</div>
                    <div>Time: ~{Math.ceil(selectedPoints.length * 1.5)}s</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Start Matching */}
            <div className="flex justify-center pt-2">
              <Button
                onClick={handleStartMatching}
                disabled={selectedPoints.length === 0 || !uploadedFile}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-2"
                size="sm"
              >
                <Search className="w-4 h-4 mr-2" />
                Start Matching
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="results" className="space-y-3 mt-3">
            {matches.length === 0 ? (
              <div className="text-center py-6">
                <Search className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-600 mb-1">No Matches Yet</h3>
                <p className="text-xs text-gray-500">Configure and start matching</p>
              </div>
            ) : (
              <>
                {/* Statistics */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center space-x-2">
                      <BarChart3 className="w-3 h-3" />
                      <span>Statistics</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-4 gap-2">
                      <div className="text-center p-2 bg-blue-50 rounded">
                        <div className="text-sm font-bold text-blue-600">{matchingStats.totalProcessed}</div>
                        <div className="text-xs text-blue-800">Total</div>
                      </div>
                      <div className="text-center p-2 bg-green-50 rounded">
                        <div className="text-sm font-bold text-green-600">{matchingStats.successfulMatches}</div>
                        <div className="text-xs text-green-800">Success</div>
                      </div>
                      <div className="text-center p-2 bg-orange-50 rounded">
                        <div className="text-sm font-bold text-orange-600">
                          {(matchingStats.averageConfidence * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs text-orange-800">Avg</div>
                      </div>
                      <div className="text-center p-2 bg-purple-50 rounded">
                        <div className="text-sm font-bold text-purple-600">
                          {(matchingStats.processingTime / 1000).toFixed(1)}s
                        </div>
                        <div className="text-xs text-purple-800">Time</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Match Selection Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <Button variant="outline" size="sm" onClick={selectAllMatches} className="h-7 px-2 text-xs">
                      All
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearAllMatches} className="h-7 px-2 text-xs">
                      None
                    </Button>
                    <Badge variant="outline" className="text-xs">
                      {selectedMatches.size}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-600">
                    {matches.filter((m) => m.confidence >= matchingConfig.matchThreshold).length} high-confidence
                  </div>
                </div>

                {/* Matches List */}
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {matches.map((match, index) => (
                    <div
                      key={match.id}
                      className={`border rounded p-2 cursor-pointer transition-all text-xs ${
                        selectedMatches.has(match.id)
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => toggleMatchSelection(match.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1">
                            {getMatchTypeIcon(match.matchType)}
                            <span className="font-medium">Match {index + 1}</span>
                          </div>
                          <Badge variant="outline" className={`${getConfidenceColor(match.confidence)} text-xs px-1`}>
                            {(match.confidence * 100).toFixed(0)}%
                          </Badge>
                        </div>
                        <div className="flex items-center">
                          {selectedMatches.has(match.id) ? (
                            <Eye className="w-3 h-3 text-blue-600" />
                          ) : (
                            <EyeOff className="w-3 h-3 text-gray-400" />
                          )}
                        </div>
                      </div>

                      <div className="mt-1 text-xs text-gray-600">
                        <div>Pos: ({match.sourcePoint.position.map((p) => p.toFixed(1)).join(", ")})</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="export" className="space-y-3 mt-3">
            {/* Export Configuration */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Download className="w-3 h-3" />
                  <span>Export Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Original Geometry</Label>
                    <Switch
                      checked={exportConfig.includeOriginal}
                      onCheckedChange={(checked) => setExportConfig((prev) => ({ ...prev, includeOriginal: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Matched Shapes</Label>
                    <Switch
                      checked={exportConfig.includeMatches}
                      onCheckedChange={(checked) => setExportConfig((prev) => ({ ...prev, includeMatches: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Selection Points</Label>
                    <Switch
                      checked={exportConfig.includePoints}
                      onCheckedChange={(checked) => setExportConfig((prev) => ({ ...prev, includePoints: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Merge Geometry</Label>
                    <Switch
                      checked={exportConfig.mergeGeometry}
                      onCheckedChange={(checked) => setExportConfig((prev) => ({ ...prev, mergeGeometry: checked }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Format</Label>
                    <Select
                      value={exportConfig.format}
                      onValueChange={(value) =>
                        setExportConfig((prev) => ({ ...prev, format: value as "stl" | "obj" | "ply" }))
                      }
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stl">STL</SelectItem>
                        <SelectItem value="obj">OBJ</SelectItem>
                        <SelectItem value="ply">PLY</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Quality</Label>
                    <Select
                      value={exportConfig.quality}
                      onValueChange={(value) =>
                        setExportConfig((prev) => ({ ...prev, quality: value as "low" | "medium" | "high" }))
                      }
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Export Preview */}
                <div className="bg-gray-50 rounded p-2">
                  <h4 className="font-medium mb-2 text-xs">Preview</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Matches:</span>
                      <Badge variant="outline" className="text-xs">
                        {selectedMatches.size}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Format:</span>
                      <Badge variant="outline" className="text-xs">
                        {exportConfig.format.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Size:</span>
                      <Badge variant="secondary" className="text-xs">
                        ~{((selectedMatches.size * 2 + (exportConfig.includeOriginal ? 5 : 0)) * 1.2).toFixed(1)} MB
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Export Button */}
            <div className="flex justify-center pt-2">
              <Button
                onClick={handleExportMatched}
                disabled={selectedMatches.size === 0}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-2"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Scene ({selectedMatches.size})
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="flex justify-between pt-2 border-t">
          <Button variant="outline" onClick={onClose} size="sm">
            Close
          </Button>
          {matches.length > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                setMatches([])
                setSelectedMatches(new Set())
                setActiveTab("configure")
              }}
              size="sm"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
