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
    <header
      className={`fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 ${
        isMobile ? "h-14" : "h-16"
      }`}
    >
      <div className="h-full px-4 flex items-center justify-between">
        {/* Left section */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size={isMobile ? "sm" : "default"}
            onClick={onToggleSidebar}
            className="lg:hidden"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-500" />
            <span className={`font-semibold ${isMobile ? "text-sm" : "text-base"}`}>Scan Ladder</span>
          </div>
        </div>

        {/* Center section - File upload */}
        <div
          className={`flex-1 max-w-2xl mx-4 ${
            dragOver ? "bg-blue-50" : "bg-gray-50"
          } rounded-lg transition-colors duration-200`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="relative flex items-center justify-center h-10">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".stl"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              title="Upload STL file"
            />
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span>{uploadedFile ? uploadedFile.name : "Drop STL file here or click to upload"}</span>
            </div>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center space-x-2">
          {!isMobile && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onSettingsOpen}
                className="text-gray-600 hover:text-gray-900"
              >
                <Settings className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onInfoOpen}
                className="text-gray-600 hover:text-gray-900"
              >
                <HelpCircle className="w-5 h-5" />
              </Button>
            </>
          )}
          {isMobile && onMobileNavOpen && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMobileNavOpen}
              className="text-gray-600 hover:text-gray-900"
            >
              <MoreVertical className="w-5 h-5" />
            </Button>
          )}
          {selectedPointsCount > 0 && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              {selectedPointsCount} points
            </Badge>
          )}
        </div>
      </div>
    </header>
  )
}
