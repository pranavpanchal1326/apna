// src/components/ui/Stitch.tsx
// The Stitch — Apna's signature element. Blueprint §2.6 / §3.0.1.
//
// A running-stitch line: 6pt dash / 4pt gap, 2pt thickness, rounded caps.
// Tones: 'live' (madder) for current/active connections, 'dim' (neutral)
// for past/settled. A stitch never fades in — it SEWS in (§2.6.3): dashes
// appear sequentially from origin at Duration.sew (18ms) per dash.
//
// Replaces: semantic dividers, progress bars, thread lines, route polylines,
// tab indicators. Never hand-roll a dashed line — use this component.
//
// NOT a decoration: if two elements aren't semantically connected, they
// don't get a stitch (§2.6.4). Structural separation = whitespace, then hairline.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, View, type LayoutChangeEvent } from 'react-native'
import Svg, { Line, Path } from 'react-native-svg'
import { useTheme } from '@theme'
import { useReduceMotion } from '@hooks/useReduceMotion'
import {
  computeSew,
  RESTING_DASH_ARRAY,
  STITCH_DASH,
  STITCH_GAP,
  STITCH_PERIOD,
  STITCH_WIDTH,
} from '@lib/utils/stitch'

const AnimatedLine = Animated.createAnimatedComponent(Line)
const AnimatedPath = Animated.createAnimatedComponent(Path)

export { STITCH_DASH, STITCH_GAP, STITCH_PERIOD, STITCH_WIDTH }

export interface StitchProps {
  direction?: 'horizontal' | 'vertical'
  /** SVG path for map routes / custom curves. Overrides direction. */
  path?: string
  /** Required with `path` — total path length for the sew animation. */
  pathLength?: number
  /** Line length in pt, or '100%' to fill the cross-axis. Default '100%'. */
  length?: number | '100%'
  /** 'live' = madder stitch, 'dim' = neutral (settled/past). Default 'live'. */
  tone?: 'live' | 'dim'
  /** Animate sewing on mount (§2.6.3). */
  sew?: boolean
  sewDelay?: number
  /** Called when the final dash lands (pair with haptics.medium on money moments). */
  onSewComplete?: () => void
  /** 0–1: dashes render solid up to progress — budget bars (§2.6.2). */
  progress?: number
  /** Override stroke color (rare — logo/ceremony use only). */
  color?: string
  thickness?: number
}

export function Stitch({
  direction = 'horizontal',
  path,
  pathLength,
  length = '100%',
  tone = 'live',
  sew = false,
  sewDelay = 0,
  onSewComplete,
  progress,
  color,
  thickness = STITCH_WIDTH,
}: StitchProps) {
  const { colors, duration } = useTheme()
  const [measured, setMeasured] = useState<number>(typeof length === 'number' ? length : 0)
  const reduceMotion = useReduceMotion()
  const dashOffset = useRef(new Animated.Value(0)).current

  const totalLength = path ? (pathLength ?? 0) : measured
  const stroke = color ?? (tone === 'live' ? colors.stitch : colors.stitchDim)

  // Sewing = animated strokeDashoffset from full length → 0.
  // One SVG per line, not per dash (§2.7.3 performance budget).
  useEffect(() => {
    if (!sew || totalLength <= 0) return
    if (reduceMotion) {
      // §2.7.2 rule 6 — crossfade fallback: no sew, land immediately
      dashOffset.setValue(0)
      onSewComplete?.()
      return
    }
    // See computeSew for the reveal derivation: initial offset = dashesRegion
    // (not totalLength) so the trailing full-length gap masks exactly [0, L].
    const { dashCount, dashesRegion } = computeSew(totalLength)
    dashOffset.setValue(dashesRegion)
    const anim = Animated.timing(dashOffset, {
      toValue: 0,
      duration: dashCount * duration.sew,
      delay: sewDelay,
      useNativeDriver: false, // SVG props are not native-driver animatable
    })
    anim.start(({ finished }) => finished && onSewComplete?.())
    return () => anim.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sew, totalLength, reduceMotion])

  const onLayout = (e: LayoutChangeEvent) => {
    if (typeof length !== 'number') {
      const { width, height } = e.nativeEvent.layout
      setMeasured(direction === 'horizontal' ? width : height)
    }
  }

  // strokeDasharray: sewing needs one giant dash masked by the running
  // stitch pattern. We emulate by combining pattern + offset: pattern stays
  // 6/4; the offset reveal reads as dashes arriving sequentially.
  const dashArray = useMemo(() => {
    if (!sew || totalLength <= 0) return RESTING_DASH_ARRAY
    return computeSew(totalLength).dashArray
  }, [sew, totalLength])

  const isH = direction === 'horizontal'
  const box = {
    width: isH ? (typeof length === 'number' ? length : '100%' as const) : thickness,
    height: isH ? thickness : (typeof length === 'number' ? length : '100%' as const),
  }

  if (path) {
    return (
      <Svg style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
        <AnimatedPath
          d={path}
          stroke={stroke}
          strokeWidth={thickness}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={dashArray}
          strokeDashoffset={sew ? dashOffset : 0}
        />
      </Svg>
    )
  }

  const clamped = progress == null ? null : Math.max(0, Math.min(1, progress))

  return (
    <View style={box} onLayout={onLayout} pointerEvents="none">
      {measured > 0 && (
        <Svg width={isH ? measured : thickness} height={isH ? thickness : measured}>
          {/* Base running stitch */}
          <AnimatedLine
            x1={isH ? 0 : thickness / 2}
            y1={isH ? thickness / 2 : 0}
            x2={isH ? measured : thickness / 2}
            y2={isH ? thickness / 2 : measured}
            stroke={clamped != null ? colors.stitchDim : stroke}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={dashArray}
            strokeDashoffset={sew ? dashOffset : 0}
          />
          {/* Progress fill: dashes go solid up to `progress` (§2.6.2) */}
          {clamped != null && clamped > 0 && (
            <Line
              x1={isH ? 0 : thickness / 2}
              y1={isH ? thickness / 2 : 0}
              x2={isH ? measured * clamped : thickness / 2}
              y2={isH ? thickness / 2 : measured * clamped}
              stroke={stroke}
              strokeWidth={thickness}
              strokeLinecap="round"
            />
          )}
        </Svg>
      )}
    </View>
  )
}
