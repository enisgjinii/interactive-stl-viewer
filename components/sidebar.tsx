"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Box, Square, Circle, Cone, Cylinder, Check, Package, Plus } from "lucide-react"

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  onModelSelect: (modelName: string) => void
  onTestModelSelect: (testModelName: string) => void
  isMobile: boolean
}

export function Sidebar({ isOpen, onClose, onModelSelect, onTestModelSelect, isMobile }: SidebarProps) {
  const [selectedTestModel, setSelectedTestModel] = useState<string>("")

  const testModels = [
    "Test-Scan-1.stl",
    "Test-Scan-2.stl", 
    "Test-Scan-3.stl",
    "Test-Scan-4.stl"
  ]

  const parts = [
    "end-cube",
    "end-flat", 
    "end-sphere",
    "long-cone",
    "long-iso"
  ]

  const handleTestModelChange = (modelName: string) => {
    setSelectedTestModel(modelName)
    onTestModelSelect(modelName)
  }

  return (
    <div
      className={`fixed inset-y-0 left-0 z-50 w-80 bg-white border-r border-gray-200 shadow-xl transform transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      } ${isMobile ? "w-full" : ""}`}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Model Selection</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close sidebar"
            title="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Main Test Models Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Box className="w-4 h-4" />
              Main Test Models
            </h3>
            <p className="text-xs text-gray-500">
              Select a main model to serve as the base for placing parts
            </p>
            
            <div className="space-y-2">
              {testModels.map((model) => (
                <button
                  key={model}
                  onClick={() => handleTestModelChange(model)}
                  className={`w-full p-3 text-left rounded-lg border transition-all ${
                    selectedTestModel === model
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{model.replace('.stl', '')}</span>
                    {selectedTestModel === model && (
                      <Check className="w-4 h-4 text-blue-500" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Parts Section */}
          <div className="space-y-3">
                         <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
               <Package className="w-4 h-4" />
               Parts to Place
             </h3>
            <p className="text-xs text-gray-500">
              Select parts to place on top of the main model
            </p>
            
            <div className="space-y-2">
              {parts.map((part) => (
                <button
                  key={part}
                  onClick={() => onModelSelect(part)}
                  className="w-full p-3 text-left rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">
                      {part.replace('-', ' ')}
                    </span>
                    <Plus className="w-4 h-4 text-gray-400" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="text-xs font-medium text-blue-800 mb-2">How to use:</h4>
            <ol className="text-xs text-blue-700 space-y-1">
              <li>1. Select a main test model from above</li>
              <li>2. Choose parts to place on the model</li>
              <li>3. Click on the 3D view to position parts</li>
              <li>4. Parts will appear as overlays on the main model</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
