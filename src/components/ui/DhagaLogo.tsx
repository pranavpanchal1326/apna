// src/components/ui/DhagaLogo.tsx
// The dhaga mark — Blueprint Part 7. A lowercase "a" drawn as thread:
// the bowl is a running stitch (7 dashes), the stem/tail are the thread
// pulled through, the dot at the top of the stem is the knot.
//
// THE SEW (§7.4) — the brand's animation signature, total 1150ms:
//   bowl 0–700ms (arc wipe) → thread pull 550–900ms (overlaps — thread
//   never waits) → knot 900–1020ms (the brand's ONLY bounce) → hold.
// Reduce Motion: static mark, 120ms fade.
//
// Geometry is canonical (§7.2) — do not eyeball. Bowl circumference 163.36
// = exactly 7 stitches (dash 13.79 + gap 9.55), offset 6.9 so the seam
// falls in a gap. Any resize must re-derive whole-stitch counts.

import { useEffect, useRef } from 'react'
import { Animated } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'
import { useTheme } from '@theme'
import { useReduceMotion } from '@hooks/useReduceMotion'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)
const AnimatedPath = Animated.createAnimatedComponent(Path)

// §7.2 canonical construction — 120×120 grid
const BOWL_CX = 54
const BOWL_CY = 66
const BOWL_R = 26
const BOWL_CIRC = 2 * Math.PI * BOWL_R          // 163.36
const DASH = 13.79
const GAP = 9.55
const SEAM_OFFSET = 6.9
const TAIL_PATH = 'M 84 40 L 84 76 Q 84 96 102 92'
const TAIL_LENGTH = 62                            // measured path length
const KNOT_R = 6.5
const KNOT_X = 84
const KNOT_Y = 40

interface DhagaLogoProps {
  /** Render size in px. ≤48 uses thicker stroke; ≤24 is a dedicated asset — don't auto-scale (§7.2). */
  size?: number
  /** Play THE SEW on mount. */
  sew?: boolean
  /** Thread color. Defaults to accentPrimary (the logo's thread is ALWAYS madder — §7.3). */
  color?: string
  /** Knot fill. Defaults to chalk on ink / ink on kora. */
  knotColor?: string
  onSewComplete?: () => void
}

export function DhagaLogo({
  size = 96,
  sew = false,
  color,
  knotColor,
  onSewComplete,
}: DhagaLogoProps) {
  const { colors, isDark } = useTheme()
  const reduceMotion = useReduceMotion()
  const bowlOffset = useRef(new Animated.Value(sew ? BOWL_CIRC : 0)).current
  const tailOffset = useRef(new Animated.Value(sew ? TAIL_LENGTH : 0)).current
  const knotScale = useRef(new Animated.Value(sew ? 0 : 1)).current
  const fade = useRef(new Animated.Value(sew ? 0 : 1)).current

  const thread = color ?? colors.accentPrimary
  const knot = knotColor ?? (isDark ? '#EFEAE0' : '#1C1A15')
  // Small-size stroke compensation (§7.2)
  const stroke = size <= 48 ? 8.5 : 7

  useEffect(() => {
    if (!sew) return
    if (reduceMotion) {
      // §7.4 — static mark, 120ms fade
      bowlOffset.setValue(0)
      tailOffset.setValue(0)
      knotScale.setValue(1)
      Animated.timing(fade, { toValue: 1, duration: 120, useNativeDriver: false })
        .start(() => onSewComplete?.())
      return
    }
    fade.setValue(1)
    Animated.parallel([
      // Bowl: 7 stitches revealed by arc wipe, 0–700ms
      Animated.timing(bowlOffset, {
        toValue: 0, duration: 700, useNativeDriver: false,
      }),
      // Thread pull: 550–900ms — overlaps bowl finish, thread never waits
      Animated.timing(tailOffset, {
        toValue: 0, duration: 350, delay: 550, useNativeDriver: false,
      }),
      // Knot: 900–1020ms — scale 0 → overshoot → 6.5. The brand's ONLY bounce.
      Animated.sequence([
        Animated.delay(900),
        Animated.spring(knotScale, {
          toValue: 1, tension: 300, friction: 12, useNativeDriver: false,
        }),
      ]),
    ]).start(({ finished }) => finished && onSewComplete?.())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sew, reduceMotion])

  return (
    <Animated.View style={{ width: size, height: size, opacity: fade }}>
      <Svg width={size} height={size} viewBox="0 0 120 120">
        {/* Bowl — running stitch, 7 dashes, seam in a gap */}
        <AnimatedCircle
          cx={BOWL_CX}
          cy={BOWL_CY}
          r={BOWL_R}
          stroke={thread}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={
            sew
              ? `${Array(7).fill(`${DASH} ${GAP}`).join(' ')} 0 ${BOWL_CIRC}`
              : `${DASH} ${GAP}`
          }
          strokeDashoffset={sew ? Animated.add(bowlOffset, new Animated.Value(SEAM_OFFSET)) : SEAM_OFFSET}
        />
        {/* Stem + tail — thread pulled through, draw-on */}
        <AnimatedPath
          d={TAIL_PATH}
          stroke={thread}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={sew ? `${TAIL_LENGTH} ${TAIL_LENGTH}` : undefined}
          strokeDashoffset={sew ? tailOffset : 0}
        />
        {/* Knot — every trip starts with a knot */}
        <AnimatedCircle
          cx={KNOT_X}
          cy={KNOT_Y}
          r={sew ? Animated.multiply(knotScale, KNOT_R) : KNOT_R}
          fill={knot}
        />
      </Svg>
    </Animated.View>
  )
}
