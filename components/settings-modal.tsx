"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Settings, Monitor, Palette, Globe, Zap, Save, RotateCcw } from "lucide-react"
import type { AppSettings } from "@/app/page"

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  settings: AppSettings
  onUpdateSettings: (settings: Partial<AppSettings>) => void
  isMobile: boolean
}

export function SettingsModal({ isOpen, onClose, settings, onUpdateSettings, isMobile }: SettingsModalProps) {
  const [tempSettings, setTempSettings] = useState<AppSettings>(settings)

  const handleSave = () => {
    onUpdateSettings(tempSettings)
    onClose()
  }

  const handleReset = () => {
    const defaultSettings: AppSettings = {
      renderQuality: "high",
      autoSave: true,
      showGrid: true,
      showAxes: false,
      backgroundColor: "#f8fafc",
      pointSize: 1.0,
      animationSpeed: 1.0,
      language: "en",
      theme: "light",
      units: "mm",
    }
    setTempSettings(defaultSettings)
  }

  const updateTempSetting = (key: keyof AppSettings, value: any) => {
    setTempSettings((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`${isMobile ? "sm:max-w-[95vw] max-h-[90vh] overflow-y-auto" : "sm:max-w-2xl max-h-[90vh] overflow-y-auto"}`}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-blue-500" />
            <span>Application Settings</span>
          </DialogTitle>
          <DialogDescription>Customize your Scan Ladder experience</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="display" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="display">Display</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="display" className="space-y-4">
            {/* Display Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Monitor className="w-4 h-4" />
                  <span>Display Options</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Show Grid</Label>
                    <p className="text-xs text-gray-600">Display reference grid in 3D viewer</p>
                  </div>
                  <Switch
                    checked={tempSettings.showGrid}
                    onCheckedChange={(checked) => updateTempSetting("showGrid", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Show Axes</Label>
                    <p className="text-xs text-gray-600">Display coordinate axes</p>
                  </div>
                  <Switch
                    checked={tempSettings.showAxes}
                    onCheckedChange={(checked) => updateTempSetting("showAxes", checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-medium">Theme</Label>
                  <Select value={tempSettings.theme} onValueChange={(value) => updateTempSetting("theme", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="auto">Auto (System)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="font-medium">Background Color</Label>
                  <div className="flex space-x-2">
                    {["#f8fafc", "#1e293b", "#0f172a", "#fef3c7", "#ecfdf5"].map((color) => (
                      <button
                        key={color}
                        className={`w-8 h-8 rounded-full border-2 ${
                          tempSettings.backgroundColor === color ? "border-blue-500" : "border-gray-300"
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => updateTempSetting("backgroundColor", color)}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-medium">Point Size</Label>
                  <div className="px-2">
                    <Slider
                      value={[tempSettings.pointSize]}
                      onValueChange={([value]) => updateTempSetting("pointSize", value)}
                      max={3}
                      min={0.5}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Small</span>
                      <span>{tempSettings.pointSize.toFixed(1)}x</span>
                      <span>Large</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            {/* Performance Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Zap className="w-4 h-4" />
                  <span>Performance Options</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-medium">Render Quality</Label>
                  <Select
                    value={tempSettings.renderQuality}
                    onValueChange={(value) => updateTempSetting("renderQuality", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">
                        <div className="flex items-center justify-between w-full">
                          <span>Low</span>
                          <Badge variant="outline" className="ml-2">
                            Fast
                          </Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="medium">
                        <div className="flex items-center justify-between w-full">
                          <span>Medium</span>
                          <Badge variant="outline" className="ml-2">
                            Balanced
                          </Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="high">
                        <div className="flex items-center justify-between w-full">
                          <span>High</span>
                          <Badge variant="outline" className="ml-2">
                            Quality
                          </Badge>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-600">
                    {tempSettings.renderQuality === "low" && "Optimized for older devices and better performance"}
                    {tempSettings.renderQuality === "medium" && "Good balance of quality and performance"}
                    {tempSettings.renderQuality === "high" && "Best visual quality, may impact performance"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="font-medium">Animation Speed</Label>
                  <div className="px-2">
                    <Slider
                      value={[tempSettings.animationSpeed]}
                      onValueChange={([value]) => updateTempSetting("animationSpeed", value)}
                      max={2}
                      min={0.1}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Slow</span>
                      <span>{tempSettings.animationSpeed.toFixed(1)}x</span>
                      <span>Fast</span>
                    </div>
                  </div>
                </div>

                {isMobile && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <h4 className="font-medium text-blue-800 mb-1">Mobile Optimization</h4>
                    <p className="text-xs text-blue-700">
                      Lower render quality and reduced animation speed are recommended for better performance on mobile
                      devices.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="general" className="space-y-4">
            {/* General Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Globe className="w-4 h-4" />
                  <span>General Options</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Auto Save</Label>
                    <p className="text-xs text-gray-600">Automatically save projects and points</p>
                  </div>
                  <Switch
                    checked={tempSettings.autoSave}
                    onCheckedChange={(checked) => updateTempSetting("autoSave", checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-medium">Language</Label>
                  <Select value={tempSettings.language} onValueChange={(value) => updateTempSetting("language", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                      <SelectItem value="zh">中文</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="font-medium">Default Units</Label>
                  <Select value={tempSettings.units} onValueChange={(value) => updateTempSetting("units", value)}>
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            {/* Advanced Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Palette className="w-4 h-4" />
                  <span>Advanced Options</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <h4 className="font-medium text-yellow-800 mb-1">⚠️ Advanced Settings</h4>
                  <p className="text-xs text-yellow-700">
                    These settings may affect application performance and stability. Change only if you know what you're
                    doing.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label className="font-medium">Debug Mode</Label>
                      <p className="text-xs text-gray-600">Show debug information and logs</p>
                    </div>
                    <Switch />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label className="font-medium">Hardware Acceleration</Label>
                      <p className="text-xs text-gray-600">Use GPU for 3D rendering</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label className="font-medium">Experimental Features</Label>
                      <p className="text-xs text-gray-600">Enable beta features</p>
                    </div>
                    <Switch />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-medium">Memory Usage Limit</Label>
                  <Select defaultValue="auto">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="512mb">512 MB</SelectItem>
                      <SelectItem value="1gb">1 GB</SelectItem>
                      <SelectItem value="2gb">2 GB</SelectItem>
                      <SelectItem value="unlimited">Unlimited</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      localStorage.clear()
                      window.location.reload()
                    }}
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Clear All Data & Reset
                  </Button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    This will remove all saved projects, points, and settings
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className={`flex ${isMobile ? "flex-col space-y-2" : "flex-row space-x-3"} pt-4 border-t`}>
          <Button
            variant="outline"
            onClick={handleReset}
            className={isMobile ? "w-full" : "flex-1"}
            size={isMobile ? "lg" : "default"}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className={isMobile ? "w-full" : "flex-1"}
            size={isMobile ? "lg" : "default"}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className={`bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 ${
              isMobile ? "w-full" : "flex-1"
            }`}
            size={isMobile ? "lg" : "default"}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
