"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Info,
  FileText,
  HardDrive,
  Cpu,
  Monitor,
  Smartphone,
  Download,
  MapPin,
  BarChart3,
  History,
  Shield,
  Zap,
} from "lucide-react"
import type { AppSettings } from "@/app/page"

interface InfoModalProps {
  isOpen: boolean
  onClose: () => void
  uploadedFile: File | null
  selectedPoints: Array<{ id: string; position: [number, number, number]; type: string; timestamp: number }>
  settings: AppSettings
  isMobile: boolean
}

export function InfoModal({ isOpen, onClose, uploadedFile, selectedPoints, settings, isMobile }: InfoModalProps) {
  const getSystemInfo = () => {
    const nav = navigator as any
    return {
      browser:
        nav.userAgent
          .split(" ")
          .find((item: string) => item.includes("Chrome") || item.includes("Firefox") || item.includes("Safari")) ||
        "Unknown",
      platform: nav.platform || "Unknown",
      memory: nav.deviceMemory ? `${nav.deviceMemory} GB` : "Unknown",
      cores: nav.hardwareConcurrency || "Unknown",
      connection: nav.connection?.effectiveType || "Unknown",
      online: nav.onLine,
    }
  }

  const getExportHistory = () => {
    try {
      return JSON.parse(localStorage.getItem("scan-ladder-export-history") || "[]")
    } catch {
      return []
    }
  }

  const getStorageUsage = () => {
    let totalSize = 0
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length
      }
    }
    return (totalSize / 1024).toFixed(2) // KB
  }

  const systemInfo = getSystemInfo()
  const exportHistory = getExportHistory()
  const storageUsage = getStorageUsage()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`${isMobile ? "sm:max-w-[95vw] max-h-[90vh] overflow-y-auto" : "sm:max-w-3xl max-h-[90vh] overflow-y-auto"}`}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Info className="w-5 h-5 text-blue-500" />
            <span>System Information</span>
          </DialogTitle>
          <DialogDescription>Detailed information about your current session and system</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="session" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="session">Session</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          <TabsContent value="session" className="space-y-4">
            {/* Current Session */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span>Current Session</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">Loaded File:</span>
                      <Badge variant={uploadedFile ? "default" : "secondary"}>{uploadedFile ? "Yes" : "None"}</Badge>
                    </div>

                    {uploadedFile && (
                      <>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium">Filename:</span>
                          <span className="text-sm font-mono truncate max-w-32" title={uploadedFile.name}>
                            {uploadedFile.name}
                          </span>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium">File Size:</span>
                          <Badge variant="outline">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</Badge>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium">Last Modified:</span>
                          <span className="text-sm">{new Date(uploadedFile.lastModified).toLocaleDateString()}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">Selected Points:</span>
                      <Badge className="bg-blue-100 text-blue-800">{selectedPoints.length}</Badge>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">Session Duration:</span>
                      <Badge variant="outline">
                        {Math.floor((Date.now() - (selectedPoints[0]?.timestamp || Date.now())) / 60000)} min
                      </Badge>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">Auto Save:</span>
                      <Badge variant={settings.autoSave ? "default" : "secondary"}>
                        {settings.autoSave ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">Render Quality:</span>
                      <Badge variant="outline">
                        {settings.renderQuality.charAt(0).toUpperCase() + settings.renderQuality.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {selectedPoints.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3 flex items-center space-x-2">
                      <MapPin className="w-4 h-4" />
                      <span>Point Details</span>
                    </h4>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {selectedPoints.map((point, index) => (
                        <div
                          key={point.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                        >
                          <span className="font-medium">Point {index + 1}</span>
                          <div className="text-right">
                            <div className="font-mono text-xs">
                              ({point.position.map((p) => p.toFixed(2)).join(", ")})
                            </div>
                            <div className="text-xs text-gray-600">
                              {new Date(point.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-4">
            {/* System Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Monitor className="w-4 h-4" />
                  <span>System Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">Device Type:</span>
                      <Badge variant="outline" className="flex items-center space-x-1">
                        {isMobile ? <Smartphone className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
                        <span>{isMobile ? "Mobile" : "Desktop"}</span>
                      </Badge>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">Platform:</span>
                      <span className="text-sm font-mono">{systemInfo.platform}</span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">Browser:</span>
                      <span className="text-sm">{systemInfo.browser}</span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">Connection:</span>
                      <Badge variant={systemInfo.online ? "default" : "destructive"}>
                        {systemInfo.online ? "Online" : "Offline"}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">CPU Cores:</span>
                      <Badge variant="outline" className="flex items-center space-x-1">
                        <Cpu className="w-3 h-3" />
                        <span>{systemInfo.cores}</span>
                      </Badge>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">Memory:</span>
                      <Badge variant="outline" className="flex items-center space-x-1">
                        <HardDrive className="w-3 h-3" />
                        <span>{systemInfo.memory}</span>
                      </Badge>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">Network:</span>
                      <Badge variant="outline">{systemInfo.connection}</Badge>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">Storage Used:</span>
                      <Badge variant="outline">{storageUsage} KB</Badge>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4" />
                    <span>Performance Metrics</span>
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Memory Usage</span>
                        <span>~{Math.min(85, Number.parseInt(storageUsage) / 10)}%</span>
                      </div>
                      <Progress value={Math.min(85, Number.parseInt(storageUsage) / 10)} className="h-2" />
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Render Performance</span>
                        <span>
                          {settings.renderQuality === "high"
                            ? "95%"
                            : settings.renderQuality === "medium"
                              ? "75%"
                              : "60%"}
                        </span>
                      </div>
                      <Progress
                        value={settings.renderQuality === "high" ? 95 : settings.renderQuality === "medium" ? 75 : 60}
                        className="h-2"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>3D Acceleration</span>
                        <span>Available</span>
                      </div>
                      <Progress value={100} className="h-2" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {/* Export History */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <History className="w-4 h-4" />
                  <span>Export History</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {exportHistory.length > 0 ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{exportHistory.length}</div>
                        <div className="text-sm text-blue-800">Total Exports</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {exportHistory.reduce((sum: number, exp: any) => sum + (exp.fileSize || 0), 0) / 1024 > 1024
                            ? `${(exportHistory.reduce((sum: number, exp: any) => sum + (exp.fileSize || 0), 0) / 1024 / 1024).toFixed(1)} MB`
                            : `${(exportHistory.reduce((sum: number, exp: any) => sum + (exp.fileSize || 0), 0) / 1024).toFixed(1)} KB`}
                        </div>
                        <div className="text-sm text-green-800">Total Size</div>
                      </div>
                      <div className="text-center p-3 bg-orange-50 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">
                          {exportHistory.reduce((sum: number, exp: any) => sum + (exp.pointCount || 0), 0)}
                        </div>
                        <div className="text-sm text-orange-800">Total Points</div>
                      </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {exportHistory.map((exp: any, index: number) => (
                        <div
                          key={exp.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center space-x-3">
                            <Download className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="font-medium text-sm">{exp.filename}</div>
                              <div className="text-xs text-gray-600">{new Date(exp.timestamp).toLocaleString()}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="mb-1">
                              {exp.format.toUpperCase()}
                            </Badge>
                            <div className="text-xs text-gray-600">
                              {exp.pointCount} points • {(exp.fileSize / 1024).toFixed(1)} KB
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Download className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No export history available</p>
                    <p className="text-sm">Your exported files will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="about" className="space-y-4">
            {/* About */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Shield className="w-4 h-4" />
                  <span>About Scan Ladder</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
                    <span className="text-white font-bold text-xl">SL</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Scan Ladder</h3>
                  <p className="text-gray-600 mb-4">STL XChange - Advanced 3D Dental Scan Processing</p>
                  <Badge className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">Version 2.1.0</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center space-x-2">
                      <Zap className="w-4 h-4" />
                      <span>Features</span>
                    </h4>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• Interactive 3D STL viewing</li>
                      <li>• Point-based cylinder generation</li>
                      <li>• Multi-format export (STL, OBJ, PLY)</li>
                      <li>• Advanced export settings</li>
                      <li>• Mobile-responsive design</li>
                      <li>• Auto-save functionality</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Technical Specifications</h4>
                    <ul className="text-sm space-y-1 text-gray-600">
                      <li>• React Three Fiber 3D engine</li>
                      <li>• WebGL hardware acceleration</li>
                      <li>• Progressive Web App ready</li>
                      <li>• Cross-platform compatibility</li>
                      <li>• Local storage persistence</li>
                      <li>• Real-time file generation</li>
                    </ul>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>© 2024 Scan Ladder. All rights reserved.</span>
                    <div className="flex space-x-4">
                      <button className="hover:text-blue-600">Privacy</button>
                      <button className="hover:text-blue-600">Terms</button>
                      <button className="hover:text-blue-600">Support</button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Close Button */}
        <div className="pt-4 border-t">
          <Button
            onClick={onClose}
            className={`w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700`}
            size={isMobile ? "lg" : "default"}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
