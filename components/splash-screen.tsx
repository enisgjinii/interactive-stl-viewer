"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Scan, Layers } from "lucide-react"
import Image from "next/image"

interface SplashScreenProps {
  onComplete: () => void
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressTimer)
          setLoading(false)
          return 100
        }
        return prev + 2
      })
    }, 50)

    return () => clearInterval(progressTimer)
  }, [])

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-orange-500 rounded-full animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-blue-500 rounded-full animate-bounce"></div>
        <div className="absolute top-1/2 right-1/3 w-16 h-16 bg-orange-400 rounded-full animate-ping"></div>
      </div>

      <div className="text-center text-white z-10 max-w-md mx-auto px-6">
        <div className="mb-8 animate-fade-in">
          <div className="w-48 h-24 mx-auto mb-6 relative">
            <Image
              src="/images/scan-ladder-white-logo.png"
              alt="Scan Ladder"
              fill
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl md:text-3xl font-light mb-3 tracking-wide">STL XChange</h1>
          <p className="text-lg opacity-90 font-light">Advanced 3D Dental Scan Processing</p>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="flex items-center justify-center space-x-3">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-lg">Initializing...</span>
            </div>

            <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>

            <div className="text-sm opacity-75">{progress}% Complete</div>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-center space-x-4 mb-6">
              <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-4 py-2">
                <Scan className="w-5 h-5 text-orange-400" />
                <span className="text-sm">3D Scanning</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-4 py-2">
                <Layers className="w-5 h-5 text-blue-400" />
                <span className="text-sm">STL Processing</span>
              </div>
            </div>

            <Button
              onClick={onComplete}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-0 px-8 py-3 text-lg font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              size="lg"
            >
              Launch Application
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
