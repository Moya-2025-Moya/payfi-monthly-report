// Admin API: backfill title_embedding for events created before the
// pgvector migration. Idempotent — only touches rows where title_embedding
// IS NULL. Safe to call repeatedly; each invocation processes up to
// `?limit=N` (default 200) rows.
//
// Existing rows without embeddings are still searchable via the lexical
// fallback path, so backfill is non-blocking — but until it runs, vector
// retrieval can't return them as candidates.

import { NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/db/client'
import {
  embedDocuments,
  eventEmbeddingText,
  isEmbeddingsConfigured,
} from '@/lib/embeddings'

export const maxDuration = 300

export async function POST(request: Request) {
  const authError = verifyAdminToken(request)
  if (authError) return authError

  if (!isEmbeddingsConfigured()) {
    return NextResponse.json(
      { status: 'error', message: 'VOYAGE_API_KEY not configured' },
      { status: 400 },
    )
  }

  const url = new URL(request.url)
  const limit = Math.max(1, Math.min(1000, Number(url.searchParams.get('limit') ?? 200)))

  const { data: rows, error: loadErr } = await supabaseAdmin
    .from('events')
    .select('id, title_zh, title_en, entity_names')
    .is('title_embedding', null)
    .order('published_at', { ascending: false })
    .limit(limit)

  if (loadErr) {
    return NextResponse.json({ status: 'error', message: loadErr.message }, { status: 500 })
  }
  if (!rows || rows.length === 0) {
    return NextResponse.json({ status: 'done', backfilled: 0, remaining: 0 })
  }

  const texts = rows.map(r => eventEmbeddingText({
    title_zh: r.title_zh,
    title_en: r.title_en,
    entity_names: r.entity_names,
  }))
  const embeddings = await embedDocuments(texts)

  let updated = 0
  let failed = 0
  for (let i = 0; i < rows.length; i++) {
    const emb = embeddings[i]
    if (!emb) { failed++; continue }
    const { error: upErr } = await supabaseAdmin
      .from('events')
      .update({ title_embedding: emb })
      .eq('id', rows[i].id)
    if (upErr) {
      console.warn('[backfill-embeddings] update failed for', rows[i].id, upErr.message)
      failed++
    } else {
      updated++
    }
  }

  // Surface remaining count so the caller knows whether to call again.
  const { count: remaining } = await supabaseAdmin
    .from('events')
    .select('id', { count: 'exact', head: true })
    .is('title_embedding', null)

  return NextResponse.json({
    status: 'done',
    backfilled: updated,
    failed,
    remaining: remaining ?? null,
  })
}
