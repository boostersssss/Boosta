import { GambaUi, useSound, useWagerInput } from 'gamba-react-ui-v2'
import { useGamba } from 'gamba-react-v2'
import React from 'react'
import { PEG_RADIUS, PLINKO_RAIUS, Plinko as PlinkoGame, PlinkoProps, barrierHeight, barrierWidth, bucketHeight } from './game'

import BUMP from './bump.mp3'
import FALL from './fall.mp3'
import WIN from './win.mp3'

function usePlinko(props: PlinkoProps, deps: React.DependencyList) {
  const [plinko, set] = React.useState<PlinkoGame>(null!)

  React.useEffect(() => {
    const p = new PlinkoGame(props)
    set(p)
    return () => p.cleanup()
  }, deps)

  return plinko
}

const BET = [15] // Simplified bet to always have multiplier 15

export default function Plinko() {
  const game = GambaUi.useGame()
  const gamba = useGamba()
  const [wager, setWager] = useWagerInput()
  const [debug, setDebug] = React.useState(false)
  const sounds = useSound({
    bump: BUMP,
    win: WIN,
    fall: FALL,
  })

  const pegAnimations = React.useRef<Record<number, number>>({})
  const bucketAnimations = React.useRef<Record<number, number>>({})

  const multipliers = React.useMemo(() => [15], []) // Only multiplier 15
  const rows = 14

  const plinko = usePlinko(
    {
      rows,
      multipliers,
      onContact(contact) {
        if (contact.peg && contact.plinko) {
          pegAnimations.current[contact.peg.plugin.pegIndex] = 1
          sounds.play('bump', { playbackRate: 1 + Math.random() * 0.05 })
        }
        if (contact.barrier && contact.plinko) {
          sounds.play('bump', { playbackRate: 0.5 + Math.random() * 0.05 })
        }
        if (contact.bucket && contact.plinko) {
          // Force multiplier to always be 15
          contact.bucket.plugin.bucketMultiplier = 15
          bucketAnimations.current[contact.bucket.plugin.bucketIndex] = 1
          sounds.play('win')
        }
      },
    },
    [rows, multipliers]
  )

  const play = async () => {
    await game.play({ wager, bet: BET }) // Use simplified bet
    const result = { multiplier: 15 } // Force the result to always be 15
    plinko.reset()
    plinko.run(result.multiplier)
  }

  return (
    <>
      <GambaUi.Portal target="screen">
        <GambaUi.Canvas
          render={({ ctx, size }) => {
            if (!plinko) return

            const bodies = plinko.getBodies()

            const xx = size.width / plinko.width
            const yy = size.height / plinko.height
            const s = Math.min(xx, yy)

            ctx.clearRect(0, 0, size.width, size.height)
            ctx.fillStyle = '#0b0b13'
            ctx.fillRect(0, 0, size.width, size.height)
            ctx.save()
            ctx.translate(size.width / 2 - (plinko.width / 2) * s, size.height / 2 - (plinko.height / 2) * s)
            ctx.scale(s, s)
            if (debug) {
              ctx.beginPath()
              bodies.forEach(({ vertices }) => {
                ctx.moveTo(vertices[0].x, vertices[0].y)
                for (let j = 1; j < vertices.length; j += 1) {
                  ctx.lineTo(vertices[j].x, vertices[j].y)
                }
                ctx.lineTo(vertices[0].x, vertices[0].y)
              })
              ctx.lineWidth = 1
              ctx.strokeStyle = '#fff'
              ctx.stroke()
            } else {
              bodies.forEach((body) => {
                const { label, position } = body
                if (label === 'Peg') {
                  ctx.save()
                  ctx.translate(position.x, position.y)

                  const animation = pegAnimations.current[body.plugin.pegIndex] ?? 0

                  if (pegAnimations.current[body.plugin.pegIndex]) {
                    pegAnimations.current[body.plugin.pegIndex] *= 0.9
                  }
                  ctx.scale(1 + animation * 0.4, 1 + animation * 0.4)
                  const pegHue = (position.y + position.x + Date.now() * 0.05) % 360
                  ctx.fillStyle = `hsla(${pegHue}, 75%, 60%, ${(1 + animation * 2) * 0.2})`
                  ctx.beginPath()
                  ctx.arc(0, 0, PEG_RADIUS + 4, 0, Math.PI * 2)
                  ctx.fill()

                  const light = 75 + animation * 25
                  ctx.fillStyle = `hsla(${pegHue}, 85%, ${light}%, 1)`
                  ctx.beginPath()
                  ctx.arc(0, 0, PEG_RADIUS, 0, Math.PI * 2)
                  ctx.fill()

                  ctx.restore()
                }
                if (label === 'Plinko') {
                  ctx.save()
                  ctx.translate(position.x, position.y)

                  ctx.fillStyle = `hsla(${(Date.now() % 360) + 60}, 75%, 75%, 1)`
                  ctx.beginPath()
                  ctx.arc(0, 0, PLINKO_RAIUS, 0, Math.PI * 2)
                  ctx.fill()

                  ctx.restore()
                }
                if (label === 'Bucket') {
                  const animation = bucketAnimations.current[body.plugin.bucketIndex] ?? 0

                  if (bucketAnimations.current[body.plugin.bucketIndex]) {
                    bucketAnimations.current[body.plugin.bucketIndex] *= 0.9
                  }

                  ctx.save()
                  ctx.translate(position.x, position.y)
                  const bucketHue = 25
                  const bucketAlpha = 0.05 + animation

                  ctx.save()
                  ctx.translate(0, bucketHeight / 2)
                  ctx.scale(1, 1 + animation * 2)
                  ctx.fillStyle = `hsla(${bucketHue}, 75%, 75%, ${bucketAlpha})`
                  ctx.fillRect(-25, -bucketHeight, 50, bucketHeight)
                  ctx.restore()

                  ctx.font = '20px Arial'
                  ctx.textAlign = 'center'
                  ctx.fillStyle = `hsla(${bucketHue}, 75%, 75%, 1)`
                  ctx.fillText('x15', 0, 0)
                  ctx.restore()
                }
              })
            }
            ctx.restore()
          }}
        />
      </GambaUi.Portal>
      <GambaUi.Portal target="controls">
        <GambaUi.WagerInput value={wager} onChange={setWager} />
        {window.location.origin.includes('localhost') && (
          <>
            <GambaUi.Switch checked={debug} onChange={setDebug} />
          </>
        )}
        <GambaUi.PlayButton onClick={() => play()}>Play</GambaUi.PlayButton>
      </GambaUi.Portal>
    </>
  )
}
