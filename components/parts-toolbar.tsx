"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Box, Square, Circle, Cone, Cylinder } from "lucide-react"

interface PartsToolbarProps {
  activePart: string | null
  onSelectPart: (part: string | null) => void
}

export function PartsToolbar({ activePart, onSelectPart }: PartsToolbarProps) {
  const parts = [
    { id: "end-cube", name: "End Cube", icon: Box, color: "text-blue-500" },
    { id: "end-flat", name: "End Flat", icon: Square, color: "text-green-500" },
    { id: "end-sphere", name: "End Sphere", icon: Circle, color: "text-purple-500" },
    { id: "long-cone", name: "Long Cone", icon: Cone, color: "text-orange-500" },
    { id: "long-iso", name: "Long Iso", icon: Cylinder, color: "text-red-500" },
  ]

  return (
    <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg p-2 shadow-lg border border-gray-200">
      <div className="flex flex-col space-y-2">
        <div className="text-xs font-medium text-gray-700 mb-2">Place Parts</div>
        {parts.map((part) => {
          const Icon = part.icon
          return (
            <Button
              key={part.id}
              variant={activePart === part.id ? "default" : "outline"}
              size="sm"
              onClick={() => onSelectPart(activePart === part.id ? null : part.id)}
              className={`w-full h-8 text-xs justify-start ${
                activePart === part.id ? "bg-blue-500 text-white" : ""
              }`}
              title={`Select ${part.name} to place`}
            >
              <Icon className={`w-3 h-3 mr-2 ${part.color}`} />
              {part.name}
            </Button>
          )
        })}
        {activePart && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectPart(null)}
            className="w-full h-8 text-xs justify-start text-red-600 border-red-200 hover:bg-red-50"
            title="Cancel part selection"
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  )
} 