"use client"

import React from "react"
import { Button } from "@/components/ui/button"

const PARTS = [
  { id: "end-cube", name: "End Cube" },
  { id: "end-flat", name: "End Flat" },
  { id: "end-sphere", name: "End Sphere" },
  { id: "long-cone", name: "Long Cone" },
  { id: "long-iso", name: "Long ISO" },
  { id: "mid-cube", name: "Mid Cube" },
  { id: "mid-cylinder", name: "Mid Cylinder" },
  { id: "mid-sphere", name: "Mid Sphere" }
]

interface PartsToolbarProps {
  activePart: string | null
  onSelectPart: (partId: string | null) => void
}

export function PartsToolbar({ activePart, onSelectPart }: PartsToolbarProps) {
  return (
    <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-lg rounded-lg shadow-lg p-2 flex flex-col space-y-1 z-50">
      <div className="font-semibold text-xs text-gray-700 text-center mb-1">Parts</div>
      {PARTS.map(part => (
        <Button
          key={part.id}
          variant={activePart === part.id ? "default" : "outline"}
          size="sm"
          className="text-xs"
          onClick={() => onSelectPart(activePart === part.id ? null : part.id)}
          title={`Place ${part.name}`}
        >
          {part.name}
        </Button>
      ))}
      <div className="h-px bg-gray-300 my-1" />
      <Button variant="default" size="sm" className="text-xs" onClick={() => onSelectPart('export-stl')} title="Export STL">Export STL</Button>
      <Button variant="default" size="sm" className="text-xs" onClick={() => onSelectPart('export-obj')} title="Export OBJ">Export OBJ</Button>
    </div>
  )
} 