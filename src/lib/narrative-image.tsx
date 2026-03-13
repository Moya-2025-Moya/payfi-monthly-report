// StablePulse — Narrative Timeline → PNG image renderer
// Uses satori (JSX → SVG) + resvg (SVG → PNG) for email-safe image generation
// Design: dark background, clean timeline with colored dots and date labels

import satori from 'satori'
import { readFile } from 'fs/promises'
import { join } from 'path'
import React from 'react'

export interface NarrativeImageInput {
  topic: string
  last_week: string
  this_week: string
  next_week_watch: string
  facts: { content: string; date: string }[]
}

const IMAGE_WIDTH = 600
const BG_COLOR = '#1a1a2e'
const TEXT_COLOR = '#e5e5e5'
const MUTED_COLOR = '#888888'
const ACCENT_GREEN = '#10b981'
const ACCENT_BLUE = '#3b82f6'
const ACCENT_AMBER = '#f59e0b'

// Cache the font buffer to avoid repeated reads
let fontCache: ArrayBuffer | null = null

async function loadFont(): Promise<ArrayBuffer> {
  if (fontCache) return fontCache
  // Use the Noto Sans font bundled with Next.js's @vercel/og
  const fontPath = join(
    process.cwd(),
    'node_modules/next/dist/compiled/@vercel/og/noto-sans-v27-latin-regular.ttf'
  )
  const buf = await readFile(fontPath)
  fontCache = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  return fontCache
}

function NarrativeLayout({ input }: { input: NarrativeImageInput }) {
  const { topic, last_week, this_week, next_week_watch, facts } = input

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: IMAGE_WIDTH,
        backgroundColor: BG_COLOR,
        padding: '28px 32px',
        fontFamily: 'Noto Sans',
      }}
    >
      {/* Topic title */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
        <div
          style={{
            width: '4px',
            height: '20px',
            backgroundColor: ACCENT_BLUE,
            borderRadius: '2px',
            marginRight: '10px',
          }}
        />
        <span style={{ fontSize: '18px', fontWeight: 700, color: TEXT_COLOR }}>
          {topic}
        </span>
      </div>

      {/* This week summary */}
      <div
        style={{
          fontSize: '13px',
          color: MUTED_COLOR,
          lineHeight: '1.6',
          marginBottom: '18px',
          paddingLeft: '14px',
        }}
      >
        {this_week}
      </div>

      {/* Timeline facts */}
      {facts.map((fact, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            marginBottom: i < facts.length - 1 ? '6px' : '0px',
            paddingLeft: '8px',
          }}
        >
          {/* Timeline column: dot + line */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '20px',
              marginRight: '12px',
              paddingTop: '6px',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: ACCENT_GREEN,
                flexShrink: 0,
              }}
            />
            {i < facts.length - 1 && (
              <div
                style={{
                  width: '2px',
                  flexGrow: 1,
                  backgroundColor: '#333',
                  marginTop: '4px',
                }}
              />
            )}
          </div>
          {/* Content column */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              paddingBottom: '12px',
            }}
          >
            <span style={{ fontSize: '11px', color: '#666', marginBottom: '3px' }}>
              {fact.date}
            </span>
            <span style={{ fontSize: '12px', color: '#ccc', lineHeight: '1.5' }}>
              {fact.content}
            </span>
          </div>
        </div>
      ))}

      {/* Last week context */}
      {last_week !== '首次追踪' && (
        <div
          style={{
            marginTop: '14px',
            paddingLeft: '14px',
            borderLeft: '2px solid #333',
            fontSize: '11px',
            color: '#666',
            lineHeight: '1.5',
          }}
        >
          {`上周: ${last_week}`}
        </div>
      )}

      {/* Next week watch footer */}
      <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: ACCENT_AMBER, marginRight: '6px' }}>
          →
        </span>
        <span style={{ fontSize: '11px', color: ACCENT_AMBER }}>
          {`下周关注: ${next_week_watch}`}
        </span>
      </div>
    </div>
  )
}

export async function renderNarrativeImage(
  input: NarrativeImageInput
): Promise<Uint8Array> {
  const fontData = await loadFont()
  const { facts, last_week } = input

  const factsHeight = facts.length * 56
  const estimatedHeight =
    160 + factsHeight + (last_week !== '首次追踪' ? 40 : 0) + 50

  const element = React.createElement(NarrativeLayout, { input })

  const svg = await satori(element, {
    width: IMAGE_WIDTH,
    height: estimatedHeight,
    fonts: [
      {
        name: 'Noto Sans',
        data: fontData,
        weight: 400,
        style: 'normal' as const,
      },
    ],
  })

  // Dynamic import to avoid Turbopack static analysis issues with native bindings
  const { Resvg } = await import('@resvg/resvg-js')
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width' as const, value: IMAGE_WIDTH },
  })
  const pngData = resvg.render()
  return pngData.asPng()
}
