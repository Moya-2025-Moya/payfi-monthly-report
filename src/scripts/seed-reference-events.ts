// One-time script: Seed reference_events table from config/reference-events.ts
// Run with: npx tsx src/scripts/seed-reference-events.ts
//
// This migrates the static .ts knowledge base into the DB
// and generates embeddings for vector search.

import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local manually (no dotenv dependency needed)
const envPath = resolve(process.cwd(), '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eqIdx = trimmed.indexOf('=')
  if (eqIdx === -1) continue
  const key = trimmed.slice(0, eqIdx)
  const value = trimmed.slice(eqIdx + 1)
  if (!process.env[key]) process.env[key] = value
}

import { REFERENCE_EVENTS } from '../config/reference-events'
import { generateEmbeddings } from '../lib/embedding'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  console.log(`Seeding ${REFERENCE_EVENTS.length} reference events...`)

  // Build text representations for embedding
  const texts = REFERENCE_EVENTS.map(ref => {
    const milestonesText = ref.milestones.map(m => `${m.date}: ${m.event}`).join('; ')
    const metricsText = Object.entries(ref.metrics).map(([k, v]) => `${k}=${v}`).join(', ')
    return `${ref.entity} ${ref.type}: ${milestonesText}. Metrics: ${metricsText}. Tags: ${ref.tags.join(', ')}`
  })

  // Generate embeddings
  console.log('Generating embeddings via Voyage AI...')
  const embeddings = await generateEmbeddings(texts)

  if (!embeddings) {
    console.log('No VOYAGE_API_KEY — seeding without embeddings (you can backfill later)')
  }

  // Upsert into DB
  for (let i = 0; i < REFERENCE_EVENTS.length; i++) {
    const ref = REFERENCE_EVENTS[i]
    const row: Record<string, unknown> = {
      id: ref.id,
      entity: ref.entity,
      type: ref.type,
      milestones: ref.milestones,
      metrics: ref.metrics,
      tags: ref.tags,
      auto_generated: false,
    }

    if (embeddings && embeddings[i]) {
      // pgvector expects a string like "[0.1,0.2,...]"
      row.embedding = JSON.stringify(embeddings[i])
    }

    const { error } = await supabase
      .from('reference_events')
      .upsert(row, { onConflict: 'id' })

    if (error) {
      console.error(`Failed to upsert ${ref.id}: ${error.message}`)
    } else {
      console.log(`  ✓ ${ref.id} (${ref.entity})`)
    }
  }

  console.log('Done!')
}

main().catch(console.error)
