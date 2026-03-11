// ============================================================
// StablePulse — C3 Relationship Graph
// Knowledge module: entity graph construction and full graph view
// ============================================================

import { supabaseAdmin } from '@/db/client'

// ─── Helper Types ───

export interface GraphNode {
  id: string
  name: string
  category: string
}

export interface GraphEdge {
  source: string
  target: string
  type: string
  description: string | null
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

// ─── Internal Helpers ───

async function fetchEntityDetails(ids: string[]): Promise<GraphNode[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabaseAdmin
    .from('entities')
    .select('id, name, category')
    .in('id', ids)
  if (error) {
    console.log('[fetchEntityDetails] error:', error.message)
    return []
  }
  return (data ?? []) as GraphNode[]
}

type RelationshipRow = {
  entity_a_id: string
  entity_b_id: string
  relationship_type: string
  description: string | null
}

async function fetchRelationshipsForEntities(entityIds: string[]): Promise<RelationshipRow[]> {
  if (entityIds.length === 0) return []

  // Fetch rows where either side is in the provided set
  const [{ data: rowsA }, { data: rowsB }] = await Promise.all([
    supabaseAdmin
      .from('entity_relationships')
      .select('entity_a_id, entity_b_id, relationship_type, description')
      .in('entity_a_id', entityIds),
    supabaseAdmin
      .from('entity_relationships')
      .select('entity_a_id, entity_b_id, relationship_type, description')
      .in('entity_b_id', entityIds),
  ])

  // Deduplicate by (entity_a_id, entity_b_id)
  const seen = new Set<string>()
  const combined: RelationshipRow[] = []

  for (const row of [...(rowsA ?? []), ...(rowsB ?? [])]) {
    const key = `${row.entity_a_id}:${row.entity_b_id}`
    if (!seen.has(key)) {
      seen.add(key)
      combined.push(row as RelationshipRow)
    }
  }

  return combined
}

// ─── Exported Functions ───

/**
 * Build a graph centered on a single entity, expanding outward up to `depth` hops.
 * Maximum depth is capped at 3 to prevent runaway queries.
 */
export async function getEntityGraph(entityId: string, depth: number = 1): Promise<GraphData> {
  const maxDepth = Math.min(depth, 3)

  const visitedEntityIds = new Set<string>([entityId])
  let frontier: string[] = [entityId]
  const allRelationships: RelationshipRow[] = []

  for (let d = 0; d < maxDepth; d++) {
    if (frontier.length === 0) break

    const relationships = await fetchRelationshipsForEntities(frontier)

    // Collect newly discovered entity IDs to expand in next iteration
    const nextFrontier: string[] = []

    for (const rel of relationships) {
      allRelationships.push(rel)

      for (const neighborId of [rel.entity_a_id, rel.entity_b_id]) {
        if (!visitedEntityIds.has(neighborId)) {
          visitedEntityIds.add(neighborId)
          nextFrontier.push(neighborId)
        }
      }
    }

    frontier = nextFrontier
  }

  const nodes = await fetchEntityDetails([...visitedEntityIds])

  const edges: GraphEdge[] = allRelationships.map((rel) => ({
    source: rel.entity_a_id,
    target: rel.entity_b_id,
    type: rel.relationship_type,
    description: rel.description ?? null,
  }))

  return { nodes, edges }
}

/**
 * Build a graph containing every entity and relationship in the system.
 * Use for global graph visualization.
 */
export async function getFullGraph(): Promise<GraphData> {
  const { data: relationships, error: relError } = await supabaseAdmin
    .from('entity_relationships')
    .select('entity_a_id, entity_b_id, relationship_type, description')

  if (relError) {
    console.log('[getFullGraph] relationships query error:', relError.message)
    return { nodes: [], edges: [] }
  }

  if (!relationships || relationships.length === 0) {
    return { nodes: [], edges: [] }
  }

  // Collect all unique entity IDs referenced in any relationship
  const entityIdSet = new Set<string>()
  for (const rel of relationships) {
    entityIdSet.add(rel.entity_a_id)
    entityIdSet.add(rel.entity_b_id)
  }

  const nodes = await fetchEntityDetails([...entityIdSet])

  const edges: GraphEdge[] = (relationships as RelationshipRow[]).map((rel) => ({
    source: rel.entity_a_id,
    target: rel.entity_b_id,
    type: rel.relationship_type,
    description: rel.description ?? null,
  }))

  return { nodes, edges }
}
