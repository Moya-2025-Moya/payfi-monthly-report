'use client'

import { memo } from 'react'
import { getSmoothStepPath, type EdgeProps } from '@xyflow/react'

function CrossEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, data,
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition, borderRadius: 16,
  })

  const label = (data as Record<string, unknown>)?.label as string | undefined

  return (
    <g>
      <path id={id} d={edgePath} fill="none" stroke="var(--accent-muted)" strokeWidth={1.5}
        strokeDasharray="6 4" style={{ opacity: 0.6 }} />
      {label && (
        <foreignObject x={(sourceX + targetX) / 2 - 40} y={(sourceY + targetY) / 2 - 10} width={80} height={20}>
          <div style={{ fontSize: 9, textAlign: 'center', color: 'var(--fg-muted)', background: 'var(--bg-card)',
            borderRadius: 4, padding: '1px 4px', border: '1px solid var(--border)' }}>
            {label}
          </div>
        </foreignObject>
      )}
    </g>
  )
}

export const NarrativeEdge = memo(CrossEdge)
