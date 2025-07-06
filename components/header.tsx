"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Menu, X, FileText } from "lucide-react"

interface HeaderProps {
  sidebarOpen: boolean
  onToggleSidebar: () => void
  isMobile: boolean
}

export function Header({
  sidebarOpen,
  onToggleSidebar,
  isMobile,
}: HeaderProps) {
  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 ${
        isMobile ? "h-12" : "h-14"
      }`}
    >
      <div className="h-full px-3 flex items-center justify-between">
        {/* Left section */}
        <div className="flex items-center space-x-2">
          {!isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSidebar}
              className="h-8 w-8 p-0"
            >
              {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          )}
          <div className="flex items-center space-x-1">
            <FileText className="w-4 h-4 text-blue-500" />
            <span className={`font-semibold ${isMobile ? "text-xs" : "text-sm"}`}>Scan Ladder</span>
          </div>
        </div>

        {/* Center section - Empty for now */}
        <div className="flex-1"></div>

        {/* Right section - Empty for now */}
        <div className="flex items-center space-x-1">
          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSidebar}
              className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900"
            >
              <Menu className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
