import * as THREE from 'three'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js'

export type ExportFormat = 'stl' | 'obj'

export function exportScene(scene: THREE.Scene, format: ExportFormat): { data: string; mime: string } {
  if (format === 'stl') {
    const exporter = new STLExporter()
    const data = exporter.parse(scene as any, { binary: false }) as string
    return { data, mime: 'application/sla' }
  }
  if (format === 'obj') {
    const exporter = new OBJExporter()
    const data = exporter.parse(scene as any) as string
    return { data, mime: 'application/obj' }
  }
  throw new Error('Unsupported format')
} 