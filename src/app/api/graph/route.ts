import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/db/client'

export async function GET(req: NextRequest) {
  const entityId = req.nextUrl.searchParams.get('entity')
  const depth = Number(req.nextUrl.searchParams.get('depth') ?? 2)

  let relQuery = supabaseAdmin.from('entity_relationships').select('*')
  if (entityId) relQuery = relQuery.or(`entity_a_id.eq.${entityId},entity_b_id.eq.${entityId}`)

  const { data: rels, error: relErr } = await relQuery.limit(200)
  if (relErr) return NextResponse.json({ error: relErr.message }, { status: 500 })

  const entityIds = new Set<string>()
  for (const r of rels ?? []) {
    entityIds.add(r.entity_a_id)
    entityIds.add(r.entity_b_id)
  }

  // Depth 2: get relationships of connected entities
  if (depth >= 2 && entityIds.size > 0) {
    const { data: rels2 } = await supabaseAdmin.from('entity_relationships').select('*')
      .or([...entityIds].map(id => `entity_a_id.eq.${id},entity_b_id.eq.${id}`).join(','))
      .limit(500)
    for (const r of rels2 ?? []) {
      entityIds.add(r.entity_a_id)
      entityIds.add(r.entity_b_id)
    }
  }

  const { data: entities } = await supabaseAdmin.from('entities').select('id, name, category').in('id', [...entityIds])
  return NextResponse.json({ nodes: entities ?? [], edges: rels ?? [] })
}
