"use client"

import { useState, useCallback, useEffect } from "react"
import { STLViewer } from "@/components/stl-viewer"
import { Header } from "@/components/header"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ArrowLeft, 
  Scan, 
  BarChart3, 
  Settings, 
  Download,
  RefreshCw,
  Zap,
  Target,
  Brain,
  Cpu
} from "lucide-react"
import Link from "next/link"
import { 
  performAdvancedShapeMatching, 
  performBatchMatching,
  analyzeMatchingAccuracy,
  generateMatchingReport,
  type AdvancedMatchingConfig,
  type BatchMatchingResult,
  type MatchingAnalysis
} from "@/lib/advanced-shape-matching"

export default function ScanMatchPage() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [referenceFile, setReferenceFile] = useState<File | null>(null)
  const [selectedPoints, setSelectedPoints] = useState<
    Array<{ id: string; position: [number, number, number]; type: string; timestamp: number }>
  >([])
  const [matchingResults, setMatchingResults] = useState<BatchMatchingResult[]>([])
  const [matchingAnalysis, setMatchingAnalysis] = useState<MatchingAnalysis | null>(null)
  const [isMatching, setIsMatching] = useState(false)
  const [matchingProgress, setMatchingProgress] = useState(0)
  const [activeTab, setActiveTab] = useState("upload")
  const { toast } = useToast()
  const isMobile = useMediaQuery("(max-width: 768px)")

  const [matchingConfig, setMatchingConfig] = useState<AdvancedMatchingConfig>({
    algorithm: "neural-icp",
    tolerance: 0.1,
    maxIterations: 1000,
    enableMachineLearning: true,
    useGPUAcceleration: true,
    confidenceThreshold: 0.85,
    adaptiveRefinement: true,
    multiScale: true,
    featureWeighting: true,
    temporalConsistency: false,
    batchSize: 32,
    learningRate: 0.001
  })

  const handleFileUpload = useCallback((file: File) => {
    setUploadedFile(file)
    toast({
      title: "Scan Uploaded",
      description: `${file.name} loaded for matching analysis`,
    })
  }, [toast])

  const handleReferenceUpload = useCallback((file: File) => {
    setReferenceFile(file)
    toast({
      title: "Reference Loaded",
      description: `${file.name} loaded as reference model`,
    })
  }, [toast])

  const handlePointSelect = useCallback(
    (point: { id: string; position: [number, number, number]; type: string; timestamp: number }) => {
      setSelectedPoints(prev => {
        const exists = prev.find(p => p.id === point.id)
        if (exists) {
          return prev.map(p => p.id === point.id ? point : p)
        }
        return [...prev, point]
      })
    },
    []
  )

  const handleAdvancedMatching = useCallback(async () => {
    if (!uploadedFile || !referenceFile || selectedPoints.length === 0) {
      toast({
        title: "Missing Data",
        description: "Please upload both scan and reference files, and select points",
        variant: "destructive",
      })
      return
    }

    setIsMatching(true)
    setMatchingProgress(0)

    try {
      const progressSteps = [
        { step: "Preprocessing geometries...", progress: 10 },
        { step: "Extracting neural features...", progress: 25 },
        { step: "Computing correspondence maps...", progress: 40 },
        { step: "Applying machine learning...", progress: 60 },
        { step: "Refining with ICP...", progress: 80 },
        { step: "Validating results...", progress: 95 },
        { step: "Generating report...", progress: 100 },
      ]

      for (const { step, progress } of progressSteps) {
        setMatchingProgress(progress)
        await new Promise(resolve => setTimeout(resolve, 1500))
      }

      // Perform advanced matching
      const scanBuffer = await uploadedFile.arrayBuffer()
      const referenceBuffer = await referenceFile.arrayBuffer()
      
      const results = await performBatchMatching(
        scanBuffer,
        referenceBuffer,
        selectedPoints,
        matchingConfig
      )

      setMatchingResults(results)

      // Analyze results
      const analysis = await analyzeMatchingAccuracy(results, matchingConfig)
      setMatchingAnalysis(analysis)

      setActiveTab("results")
      
      toast({
        title: "Advanced Matching Complete",
        description: `Processed ${results.length} matches with ${(analysis.averageAccuracy * 100).toFixed(1)}% accuracy`,
      })

    } catch (error) {
      console.error("Advanced matching error:", error)
      toast({
        title: "Matching Failed",
        description: "An error occurred during advanced shape matching",
        variant: "destructive",
      })
    } finally {
      setIsMatching(false)
      setMatchingProgress(0)
    }
  }, [uploadedFile, referenceFile, selectedPoints, matchingConfig, toast])

  const handleExportReport = useCallback(async () => {
    if (!matchingAnalysis || matchingResults.length === 0) return

    try {
      const report = await generateMatchingReport(matchingResults, matchingAnalysis, matchingConfig)
      
      const blob = new Blob([report], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const element = document.createElement('a')
      element.href = url
      element.download = `scan-match-report-${Date.now()}.json`
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
      URL.revokeObjectURL(url)

      toast({
        title: "Report Exported",
        description: "Matching analysis report has been downloaded",
      })
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to generate matching report",
        variant: "destructive",
      })
    }
  }, [matchingAnalysis, matchingResults, matchingConfig, toast])

  if (isMatching) {
    return (
      <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
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
          settings={{}}
        />
        
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="w-5 h-5 text-blue-500 animate-pulse" />
                <span>Advanced Shape Matching</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="relative w-20 h-20 mx-auto mb-4">
                  <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-blue-600">{matchingProgress}%</span>
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">Processing Neural Networks</h3>
                <p className="text-sm text-gray-600">Analyzing {selectedPoints.length} points with AI...</p>
              </div>

              <Progress value={matchingProgress} className="w-full" />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Cpu className="w-4 h-4 text-green-500" />
                  <span>GPU Acceleration</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span>Neural ICP</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Target className="w-4 h-4 text-purple-500" />
                  <span>Multi-Scale</span>
                </div>
                <div className="flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4 text-blue-500" />
                  <span>Adaptive</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <Toaster />
      </div>
    )
  }

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
        settings={{}}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Viewer
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Advanced Scan Matching</h1>
                <p className="text-sm text-gray-600">AI-powered shape analysis and matching</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              <Scan className="w-3 h-3 mr-1" />
              Neural ICP
            </Badge>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="upload">Upload</TabsTrigger>
              <TabsTrigger value="configure">Configure</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                {/* Scan Upload */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Scan className="w-4 h-4" />
                      <span>Target Scan</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {uploadedFile ? (
                      <div className="space-y-4">
                        <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                          <STLViewer
                            file={uploadedFile}
                            onPointSelect={handlePointSelect}
                            selectedPoints={selectedPoints}
                            exportType="hs-cap"
                            isMobile={isMobile}
                            onMobileMenuOpen={() => {}}
                            settings={{}}
                          />
                        </div>
                        <div className="text-sm text-gray-600">
                          <p>File: {uploadedFile.name}</p>
                          <p>Size: {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          <p>Points: {selectedPoints.length}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Scan className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-600">Upload target scan for matching</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Reference Upload */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Target className="w-4 h-4" />
                      <span>Reference Model</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {referenceFile ? (
                      <div className="space-y-4">
                        <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                          <STLViewer
                            file={referenceFile}
                            onPointSelect={() => {}}
                            selectedPoints={[]}
                            exportType="hs-cap"
                            isMobile={isMobile}
                            onMobileMenuOpen={() => {}}
                            settings={{}}
                          />
                        </div>
                        <div className="text-sm text-gray-600">
                          <p>File: {referenceFile.name}</p>
                          <p>Size: {(referenceFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Target className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-600">Upload reference model</p>
                        <label htmlFor="reference-upload" className="mt-2 cursor-pointer block">
                          <span className="sr-only">Upload reference STL file</span>
                          <input
                            id="reference-upload"
                            type="file"
                            accept=".stl"
                            title="Upload reference STL file"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleReferenceUpload(file)
                            }}
                            className="mt-2"
                          />
                        </label>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {uploadedFile && referenceFile && selectedPoints.length > 0 && (
                <div className="flex justify-center">
                  <Button
                    onClick={handleAdvancedMatching}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-2"
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    Start Advanced Matching
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="results" className="mt-4">
              {matchingResults.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Matching Results</h3>
                    <Button onClick={handleExportReport} variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export Report
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {matchingResults.map((result, index) => (
                      <Card key={result.id}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Match {index + 1}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Confidence:</span>
                              <Badge variant={result.confidence > 0.9 ? "default" : result.confidence > 0.7 ? "secondary" : "destructive"}>
                                {(result.confidence * 100).toFixed(1)}%
                              </Badge>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Type:</span>
                              <span className="capitalize">{result.matchType}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Error:</span>
                              <span>{result.error.toFixed(3)}mm</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">No results yet. Run matching first.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="analysis" className="mt-4">
              {matchingAnalysis ? (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">Matching Analysis</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Overall Accuracy</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          {(matchingAnalysis.averageAccuracy * 100).toFixed(1)}%
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Processing Time</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                          {matchingAnalysis.processingTime.toFixed(1)}s
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Success Rate</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-purple-600">
                          {(matchingAnalysis.successRate * 100).toFixed(1)}%
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Detailed Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Mean Error:</span>
                          <span className="ml-2">{matchingAnalysis.meanError.toFixed(3)}mm</span>
                        </div>
                        <div>
                          <span className="font-medium">Std Deviation:</span>
                          <span className="ml-2">{matchingAnalysis.stdError.toFixed(3)}mm</span>
                        </div>
                        <div>
                          <span className="font-medium">Max Error:</span>
                          <span className="ml-2">{matchingAnalysis.maxError.toFixed(3)}mm</span>
                        </div>
                        <div>
                          <span className="font-medium">Min Error:</span>
                          <span className="ml-2">{matchingAnalysis.minError.toFixed(3)}mm</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">No analysis available. Complete matching first.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      <Toaster />
    </div>
  )
} 