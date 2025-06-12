"use client"

import type React from "react"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Upload,
  Download,
  Settings,
  HelpCircle,
  Menu,
  X,
  FileText,
  AlertCircle,
  MoreVertical,
  Loader2,
  Smartphone,
  Monitor,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"

interface HeaderProps {
  onFileUpload: (file: File) => void
  sidebarOpen: boolean
  onToggleSidebar: () => void
  uploadedFile: File | null
  selectedPointsCount: number
  isMobile: boolean
  onSettingsOpen: () => void
  onInfoOpen: () => void
  onMobileNavOpen?: () => void
  settings: any
}

export function Header({
  onFileUpload,
  sidebarOpen,
  onToggleSidebar,
  uploadedFile,
  selectedPointsCount,
  isMobile,
  onSettingsOpen,
  onInfoOpen,
  onMobileNavOpen,
  settings,
}: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      await processFile(file)
    }
  }

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".stl")) {
      toast({
        title: "Invalid File Type",
        description: "Please upload an STL file (.stl extension required)",
        variant: "destructive",
      })
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 50MB",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const dataView = new DataView(arrayBuffer)

      if (arrayBuffer.byteLength < 80) {
        throw new Error("File too small to be a valid STL")
      }

      const header = new TextDecoder().decode(arrayBuffer.slice(0, 5))
      const isAscii = header.toLowerCase().startsWith("solid")

      if (!isAscii) {
        if (arrayBuffer.byteLength < 84) {
          throw new Error("Invalid binary STL file")
        }
        const triangleCount = dataView.getUint32(80, true)
        const expectedSize = 80 + 4 + triangleCount * 50
        if (arrayBuffer.byteLength !== expectedSize) {
          console.warn("STL file size doesn't match expected size, but proceeding...")
        }
      }

      onFileUpload(file)

      toast({
        title: "File Uploaded Successfully",
        description: `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB) loaded successfully`,
      })
    } catch (error) {
      console.error("File processing error:", error)
      toast({
        title: "File Processing Error",
        description: "Unable to process the STL file. Please check the file format.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      await processFile(file)
    }
  }

  const handleDownload = () => {
    if (!uploadedFile) {
      toast({
        title: "No File to Download",
        description: "Please upload an STL file first",
        variant: "destructive",
      })
      return
    }

    try {
      const url = URL.createObjectURL(uploadedFile)
      const element = document.createElement("a")
      element.href = url
      element.download = uploadedFile.name
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
      URL.revokeObjectURL(url)

      toast({
        title: "Download Started",
        description: `Downloading ${uploadedFile.name}`,
      })
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Unable to download the file",
        variant: "destructive",
      })
    }
  }

  const handleSettingsClick = () => {
    onSettingsOpen()
    toast({
      title: "Settings Opened",
      description: "Configure your application preferences",
    })
  }

  const handleInfoClick = () => {
    onInfoOpen()
    toast({
      title: "Information Panel",
      description: "View system and session information",
    })
  }

  const handleMobileNavClick = () => {
    if (onMobileNavOpen) {
      onMobileNavOpen()
      toast({
        title: "Navigation Opened",
        description: "Access all app features",
      })
    }
  }

  return (
    <>
      <header
        className={`bg-white shadow-lg border-b border-gray-200 relative z-50 transition-all duration-300 ${
          isMobile ? "px-3 py-3" : "px-4 md:px-6 py-3 md:py-4"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Mobile/Desktop Toggle */}
            {isMobile ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMobileNavClick}
                className="hover:bg-orange-50 transition-colors p-2"
              >
                <Menu className="w-5 h-5 text-orange-600" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleSidebar}
                className="lg:flex hidden hover:bg-gray-100 transition-colors"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            )}

            {/* Logo */}
            <div className="flex items-center space-x-2 md:space-x-3">
              <div className={`relative ${isMobile ? "w-20 h-5" : "w-32 h-8 md:w-40 md:h-10"}`}>
                <Image
                  src="/images/scan-ladder-black-logo.png"
                  alt="Scan Ladder"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              {isMobile && (
                <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                  <Smartphone className="w-3 h-3 mr-1" />
                  Mobile
                </Badge>
              )}
            </div>

            {/* Desktop patient info */}
            {!isMobile && (
              <div className="hidden lg:block text-sm text-gray-600 border-l border-gray-300 pl-4">
                <div className="flex flex-col md:flex-row md:items-center md:space-x-4">
                  <div>
                    <span className="font-semibold text-gray-800">Case ID:</span> 157729
                  </div>
                  <div>
                    <span className="font-semibold text-gray-800">Patient:</span> Test Patient
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-1 md:space-x-2">
            {/* Status Indicators */}
            <div className="flex items-center space-x-2 mr-2">
              {/* Mobile compact indicators */}
              {isMobile ? (
                <div className="flex items-center space-x-1">
                  {uploadedFile && (
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="File loaded" />
                  )}
                  {selectedPointsCount > 0 && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs px-1.5 py-0.5">
                      {selectedPointsCount}
                    </Badge>
                  )}
                  {settings?.renderQuality && (
                    <Badge
                      variant="outline"
                      className="bg-purple-50 text-purple-700 border-purple-200 text-xs px-1.5 py-0.5"
                    >
                      {settings.renderQuality.charAt(0).toUpperCase()}
                    </Badge>
                  )}
                </div>
              ) : (
                /* Desktop detailed indicators */
                <div className="hidden sm:flex items-center space-x-2">
                  {uploadedFile ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                      <FileText className="w-3 h-3 mr-1" />
                      {uploadedFile.name.substring(0, 12)}...
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      No file
                    </Badge>
                  )}

                  {selectedPointsCount > 0 && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                      {selectedPointsCount} pts
                    </Badge>
                  )}

                  <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 text-xs">
                    <Monitor className="w-3 h-3 mr-1" />
                    {settings?.renderQuality || "medium"}
                  </Badge>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".stl"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />

            {/* Upload Button */}
            <Button
              variant="outline"
              size={isMobile ? "sm" : "sm"}
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className={`flex items-center space-x-1 md:space-x-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 hover:from-orange-600 hover:to-orange-700 shadow-md hover:shadow-lg transition-all duration-200 ${
                dragOver ? "ring-2 ring-orange-300 scale-105" : ""
              } ${isMobile ? "px-3 py-2" : ""} ${isUploading ? "opacity-75" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {!isMobile && (
                <span className="hidden sm:inline font-medium">{isUploading ? "Uploading..." : "Upload STL"}</span>
              )}
            </Button>

            {/* Action Buttons */}
            {isMobile ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="hover:bg-gray-50 transition-colors px-3 py-2">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={handleDownload} disabled={!uploadedFile}>
                    <Download className="w-4 h-4 mr-3" />
                    <span>Download File</span>
                    {!uploadedFile && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        N/A
                      </Badge>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSettingsClick}>
                    <Settings className="w-4 h-4 mr-3" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleInfoClick}>
                    <HelpCircle className="w-4 h-4 mr-3" />
                    <span>Information</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="hover:bg-gray-50 transition-colors"
                  onClick={handleDownload}
                  disabled={!uploadedFile}
                  title="Download current file"
                >
                  <Download className="w-4 h-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="hover:bg-gray-50 transition-colors"
                  onClick={handleSettingsClick}
                  title="Open settings"
                >
                  <Settings className="w-4 h-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="hover:bg-gray-50 transition-colors"
                  onClick={handleInfoClick}
                  title="View information"
                >
                  <HelpCircle className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile patient info */}
        {isMobile && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex justify-between items-center text-xs text-gray-600">
              <div className="flex items-center space-x-3">
                <span>
                  <strong className="text-gray-800">Case:</strong> 157729
                </span>
                <span>
                  <strong className="text-gray-800">Patient:</strong> TP
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-600 font-medium">Active</span>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Enhanced Drag and Drop Overlay */}
      {dragOver && (
        <div className="fixed inset-0 bg-orange-500/20 backdrop-blur-sm z-50 flex items-center justify-center">
          <div
            className={`bg-white rounded-2xl shadow-2xl border-2 border-dashed border-orange-500 ${
              isMobile ? "p-8 mx-6 max-w-sm" : "p-10 max-w-md"
            } transform transition-all duration-300 scale-105`}
          >
            <div className="text-center">
              <div className="relative mb-6">
                <Upload className={`text-orange-500 mx-auto ${isMobile ? "w-12 h-12" : "w-16 h-16"}`} />
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">+</span>
                </div>
              </div>
              <h3 className={`font-bold mb-3 text-gray-800 ${isMobile ? "text-lg" : "text-xl"}`}>Drop STL File Here</h3>
              <p className={`text-gray-600 mb-2 ${isMobile ? "text-sm" : ""}`}>Release to upload your 3D model</p>
              <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                <span>Supports:</span>
                <Badge variant="outline" className="text-xs">
                  STL
                </Badge>
                <Badge variant="outline" className="text-xs">
                  ≤50MB
                </Badge>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
