// packages/engine/geometry/bounds.ts
import { type FigmaRestNode, Geometry, RenderNode, LayoutTreeNode } from '../types' 

/**
 * Tenta extrair a caixa delimitadora absoluta de um nó do Figma,
 * verificando propriedades de renderização em diferentes versões da API.
 */
function getBox(node: FigmaRestNode) {
    return node?.absoluteBoundingBox || node?.absoluteRenderBounds || null
}

/**
 * Calcula as propriedades geométricas de um nó, incluindo dimensões,
 * posição absoluta e posição relativa ao nó pai.
 *
 * @param node Nó atual do Figma.
 * @param parent Nó pai opcional para cálculo de posições relativas.
 * @returns Objeto com as coordenadas arredondadas.
 */
export function getGeometry(node: FigmaRestNode, parent?: any): Geometry {
    const box = getBox(node)
    const parentBox = parent ? getBox(parent) : null

    // Fallbacks sequenciais caso as propriedades estejam ausentes
    const x = Math.round(box?.x ?? node?.x ?? 0)
    const y = Math.round(box?.y ?? node?.y ?? 0)
    const width = Math.round(box?.width ?? node?.width ?? 0)
    const height = Math.round(box?.height ?? node?.height ?? 0)

    const parentX = Math.round(parentBox?.x ?? parent?.x ?? 0)
    const parentY = Math.round(parentBox?.y ?? parent?.y ?? 0)

    return {
        x,
        y,
        width,
        height,
        relativeX: x - parentX,
        relativeY: y - parentY
    }
}

/**
 * Calcula a caixa delimitadora (bounding box) envolvente para um grupo de nós de renderização.
 * Encontra os pontos extremos nas dimensões horizontais e verticais.
 */
export function getBoundsFromRenderNodes(nodes: RenderNode[]): Geometry {
    if (nodes.length === 0) {
        return { x: 0, y: 0, width: 0, height: 0, relativeX: 0, relativeY: 0 }
    }

    const minX = Math.min(...nodes.map(node => node.x))
    const minY = Math.min(...nodes.map(node => node.y))
    const maxX = Math.max(...nodes.map(node => node.x + node.width))
    const maxY = Math.max(...nodes.map(node => node.y + node.height))

    const minRelativeX = Math.min(...nodes.map(node => node.relativeX))
    const minRelativeY = Math.min(...nodes.map(node => node.relativeY))

    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        relativeX: minRelativeX,
        relativeY: minRelativeY
    }
}

/**
 * Calcula a caixa delimitadora para um grupo de nós de layout.
 * Possui a mesma lógica matemática de agrupamento aplicável às árvores intermediárias.
 */
export function getBoundsFromLayoutNodes(nodes: LayoutTreeNode[]): Geometry {
    if (nodes.length === 0) {
        return { x: 0, y: 0, width: 0, height: 0, relativeX: 0, relativeY: 0 }
    }

    const minX = Math.min(...nodes.map(node => node.x))
    const minY = Math.min(...nodes.map(node => node.y))
    const maxX = Math.max(...nodes.map(node => node.x + node.width))
    const maxY = Math.max(...nodes.map(node => node.y + node.height))

    const minRelativeX = Math.min(...nodes.map(node => node.relativeX))
    const minRelativeY = Math.min(...nodes.map(node => node.relativeY))

    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        relativeX: minRelativeX,
        relativeY: minRelativeY
    }
}