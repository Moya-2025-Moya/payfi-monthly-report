'use client'

import { useEffect, useMemo } from 'react'
import {
  ReactFlow, Background, Controls,
  useNodesState, useEdgesState,
  type Node, type Edge, type NodeTypes, type EdgeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from 'dagre'
import { NarrativeNode } from './NarrativeNode'
import { NarrativeMergedNode } from './NarrativeMergedNode'
import { NarrativeEdge } from './NarrativeEdge'
import type { NarrativeBranch, NarrativeNodeData } from '@/app/narratives/NarrativesClient'

interface Props {
  nodes: Node[]
  edges: Edge[]
  branches: NarrativeBranch[]
  status: 'idle' | 'streaming' | 'done' | 'error'
  onNodeClick: (data: NarrativeNodeData) => void
}

const nodeTypes: NodeTypes = { narrative: NarrativeNode, merged: NarrativeMergedNode }
const edgeTypes: EdgeTypes = { cross: NarrativeEdge }

function layoutNodes(nodes: Node[], edges: Edge[], branches: NarrativeBranch[]) {
  if (nodes.length === 0) return { nodes: [], edges: [] }

  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 80, marginx: 40, marginy: 40 })

  const sideMap = new Map(branches.map(b => [b.id, b.side]))

  for (const node of nodes) {
    g.setNode(node.id, { width: node.type === 'merged' ? 320 : 240, height: node.type === 'merged' ? 120 : 80 })
  }
  for (const edge of edges) g.setEdge(edge.source, edge.target)

  dagre.layout(g)

  return {
    nodes: nodes.map(node => {
      const pos = g.node(node.id)
      const side = sideMap.get((node.data as unknown as NarrativeNodeData).branchId)
      const xOffset = side === 'left' ? -160 : side === 'right' ? 160 : 0
      return { ...node, position: { x: (pos?.x ?? 0) + xOffset, y: pos?.y ?? 0 } }
    }),
    edges,
  }
}

export function NarrativeFlow({ nodes: inputNodes, edges: inputEdges, branches, status, onNodeClick }: Props) {
  const { nodes: laid, edges: laidEdges } = useMemo(
    () => layoutNodes(inputNodes, inputEdges, branches), [inputNodes, inputEdges, branches]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(laid)
  const [edges, setEdges, onEdgesChange] = useEdgesState(laidEdges)

  useEffect(() => { setNodes(laid); setEdges(laidEdges) }, [laid, laidEdges, setNodes, setEdges])

  if (inputNodes.length === 0 && status !== 'streaming') {
    return (
      <div className="flex items-center justify-center h-full text-[13px]" style={{ color: 'var(--fg-muted)' }}>
        {status === 'idle' ? '输入主题开始生成时间线' : '未找到相关事实'}
      </div>
    )
  }

  return (
    <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
      onNodeClick={(_, node) => onNodeClick(node.data as unknown as NarrativeNodeData)}
      nodeTypes={nodeTypes} edgeTypes={edgeTypes}
      fitView fitViewOptions={{ padding: 0.3 }} minZoom={0.3} maxZoom={2}
      proOptions={{ hideAttribution: true }}>
      <Background gap={20} size={1} color="var(--border)" />
      <Controls showInteractive={false} />
    </ReactFlow>
  )
}
