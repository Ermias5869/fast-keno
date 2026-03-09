'use client'

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import useGameStore from "@/app/store/gameStore"
import { useMemo } from "react"



const KenoBall = ({
  number,
  size = "sm",
  variant = "default"
}: {
  number: number
  size?: "sm" | "md" | "lg"
  variant?: "default" | "active"
}) => {
  const sizes = {
    sm: "w-8 h-8 text-[12px]",
    md: "w-10 h-10 text-sm",
    lg: "w-24 h-24 text-4xl"
  }

  const bgGradient =
    variant === "active"
      ? "radial-gradient(circle at 35% 35%, #5a6b7d 0%, #2c3e50 50%, #000000 100%)"
      : "radial-gradient(circle at 35% 35%, #ffffff 0%, #e2e8f0 40%, #94a3b8 100%)"

  return (
    <motion.div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-bold relative shadow-2xl`}
      style={{
        background: bgGradient,
        color: variant === "active" ? "#fff" : "#1e293b",
        boxShadow:
          variant === "active"
            ? "0 0 30px rgba(0,243,255,0.3), inset -2px -2px 5px rgba(0,0,0,0.5)"
            : "inset -2px -2px 5px rgba(0,0,0,0.3), 0 5px 15px rgba(0,0,0,0.4)"
      }}
    >
      <div className="absolute top-1 left-2 w-1/3 h-1/3 bg-white/30 rounded-full blur-[1px]" />
      <span className="relative z-10">{number}</span>
    </motion.div>
  )
}

export default function BallDrawArea() {
  const ring1 = useMemo(() =>
  [...Array(24)].map(() => ({
    offset: (Math.random() - 0.5) * 100,
    width: 5 + Math.random() * 6,
    opacity: 0.5 + Math.random() * 0.5
  })), []
)

const ring2 = useMemo(() =>
  [...Array(22)].map(() => ({
    offset: (Math.random() - 0.5) * 100,
    width: 6 + Math.random() * 6,
    opacity: 0.5 + Math.random() * 0.5
  })), []
)

const ring3 = useMemo(() =>
  [...Array(40)].map(() => ({
    offset: (Math.random() - 0.5) * 100,
    width: 8 + Math.random() * 5,
    opacity: 0.4 + Math.random() * 0.6
  })), []
)


  const { drawnNumbers, currentBall } = useGameStore()

  const [landedNumbers, setLandedNumbers] = useState<number[]>([])

  // Add ball after it lands
  useEffect(() => {
    if (currentBall !== null) {
      const timer = setTimeout(() => {
        setLandedNumbers(prev => [...prev, currentBall])
      }, 900) // must match animation time

      return () => clearTimeout(timer)
    }
  }, [currentBall])
  useEffect(() => {
  if (drawnNumbers.length === 0) {
    setLandedNumbers([])
  }
}, [drawnNumbers])

  const landingIndex = landedNumbers.length

  return (
    <div className="relative w-full max-w-2xl mx-auto bg-[#080c10] p-2  overflow-hidden  shadow-2xl">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 px-4 text-[11px] font-bold">
        <div>
        </div>

        <div >
         
        </div>

        <div className="text-white px-3 py-1 rounded-lg  font-mono">
          <span className="font-['Orbitron'] text-white tracking-[0.1em] drop-shadow-[0_0_12px_rgba(255,255,255,0.7)]">
           {landedNumbers.length} / 20
          </span>
       
        </div>
      </div>

      {/* DRAW AREA */}
      <div className="relative h-64 w-full flex items-center justify-center mb-6">

        {/* background rings */}
  {/* background rings with spinning dashes */}
<div className="absolute inset-0 flex items-center justify-center pointer-events-none">

  {/* Pulse ring */}
  <div className="w-48 h-48 rounded-full border-2 border-green-300/20 animate-pulse shadow-[0_0_30px_rgba(134,239,172,0.25)]" />

  {/* Large spinning dashed ring */}
  <div className="absolute w-80 h-80 rounded-full animate-spin [animation-duration:40s]">
    {ring1.map((seg, i) => {

      const angle = ((i * 15) + seg.offset) * (Math.PI / 180)
      const radius = 140

      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      const rotation = angle * (180 / Math.PI) + 90

      return (
        <div
          key={i}
          className="absolute"
          style={{
            left: `calc(50% + ${x}px)`,
            top: `calc(50% + ${y}px)`,
            transform: `translate(-50%, -50%) rotate(${rotation}deg)`
          }}
        >
          <div
            className="h-[2px] bg-gradient-to-r from-green-300/80 to-green-300/80 rounded-full shadow-[0_0_12px_rgba(134,239,172,0.9)]"
            style={{ width: seg.width * 2, opacity: seg.opacity }}
          />
        </div>
      )
    })}
  </div>

  {/* Second ring */}
  <div className="absolute w-96 h-96 rounded-full animate-spin [animation-duration:45s] [animation-direction:reverse]">
    {ring2.map((seg, i) => {

      const angle = ((i * 11.25) + seg.offset) * (Math.PI / 180)
      const radius = 170

      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      const rotation = angle * (180 / Math.PI) + 90

      return (
        <div
          key={i}
          className="absolute"
          style={{
            left: `calc(50% + ${x}px)`,
            top: `calc(50% + ${y}px)`,
            transform: `translate(-50%, -50%) rotate(${rotation}deg)`
          }}
        >
          <div
            className="h-[3px] bg-gradient-to-r from-green-300/70 via-green-300/90 to-green-300/70 rounded-full shadow-[0_0_15px_rgba(134,239,172,0.8)]"
            style={{ width: seg.width *3, opacity: seg.opacity }}
          />
        </div>
      )
    })}
  </div>

  {/* Third outer ring */}
  <div className="absolute w-[28rem] h-[28rem] rounded-full animate-spin [animation-duration:40s]">
    {ring3.map((seg, i) => {

      const angle = ((i * 9) + seg.offset) * (Math.PI / 180)
      const radius = 210

      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      const rotation = angle * (180 / Math.PI) + 90

      return (
        <div
          key={i}
          className="absolute"
          style={{
            left: `calc(50% + ${x}px)`,
            top: `calc(50% + ${y}px)`,
            transform: `translate(-50%, -50%) rotate(${rotation}deg)`
          }}
        >
          <div
            className="h-[2px] bg-gradient-to-r from-transparent via-green-300/90 to-transparent rounded-full shadow-[0_0_20px_rgba(134,239,172,0.7)]"
            style={{ width: seg.width*3, opacity: seg.opacity }}
          />
        </div>
      )
    })}
  </div>

  {/* Center glow */}
  <div className="absolute w-32 h-32 rounded-full bg-green-300/20 blur-3xl" />

</div>
        {/* ACTIVE BALL */}
        <AnimatePresence mode="wait">
          {currentBall !== null && (
            <motion.div
              key={currentBall}
              initial={{ scale: 0, x: 0, y: 30, opacity: 0 }}
              animate={{
                scale: [0, 1.1, 1],
                x: (landingIndex % 10) * 40 - 180,
                y: [30, -60, 220 + Math.floor(landingIndex / 10) * 40],
                opacity: [0, 1, 1]
              }}
              transition={{
                duration: 0.9,
                ease: "easeOut"
              }}
              className="absolute z-20"
            >
              <KenoBall number={currentBall} size="lg" variant="active" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* RESULT TRAY */}
      <div className="relative z-10   rounded-3xl p-4">

        <div className="grid grid-cols-10 gap-2 gap-y-4 justify-items-center">

          {Array.from({ length: 20 }).map((_, i) => (

            <div
              key={i}
              className="w-9 h-9 rounded-full flex items-center justify-center"
            >

              {landedNumbers[i] && (

                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                >
                  <KenoBall number={landedNumbers[i]} size="sm" />
                </motion.div>

              )}

            </div>

          ))}

        </div>

      </div>

      {/* glow */}
      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-full h-32 bg-green-500/10 blur-[100px]" />

    </div>
  )
}