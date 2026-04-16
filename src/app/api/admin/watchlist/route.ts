// Admin API: Watchlist CRUD
// GET    → list all entities
// POST   → add entity
// PUT    → update entity
// DELETE → delete entity

import { NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/admin-auth'
import { getAllEntities, addEntity, updateEntity, deleteEntity } from '@/lib/watchlist'
import type { EntityCategory } from '@/lib/types'

export async function GET(request: Request) {
  const authError = verifyAdminToken(request)
  if (authError) return authError

  try {
    const entities = await getAllEntities()
    return NextResponse.json({ entities })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const authError = verifyAdminToken(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { name, aliases, category, metadata } = body as {
      name: string
      aliases?: string[]
      category: EntityCategory
      metadata?: Record<string, unknown>
    }

    if (!name || !category) {
      return NextResponse.json({ error: 'name and category required' }, { status: 400 })
    }

    const entity = await addEntity(name, aliases ?? [], category, metadata ?? {})
    return NextResponse.json({ entity }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const authError = verifyAdminToken(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { id, ...updates } = body as { id: string; [key: string]: unknown }

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const entity = await updateEntity(id, updates)
    return NextResponse.json({ entity })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const authError = verifyAdminToken(request)
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const success = await deleteEntity(id)
    return NextResponse.json({ success })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
