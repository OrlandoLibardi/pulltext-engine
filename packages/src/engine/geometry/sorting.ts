// packages/engine/geometry/sorting.ts
import { type RenderNode, LayoutTreeNode } from '../types' 

/**
 * Ordena priorizando a leitura vertical (de cima para baixo),
 * agrupando e decidindo a ordem pelo eixo horizontal apenas quando necessário.
 * O desvio máximo tolerado de alinhamento visual no eixo Y é de 4 pixels.
 */
export function sortByYThenX(a: LayoutTreeNode, b: LayoutTreeNode): number {
    const yDiff = a.relativeY - b.relativeY

    // Resolve imprecisões geométricas nativas da criação manual em ferramentas de design
    if (Math.abs(yDiff) > 4) return yDiff

    return a.relativeX - b.relativeX
}

/**
 * Ordena priorizando a leitura horizontal (da esquerda para a direita),
 * desempata pelo eixo vertical com uma tolerância de 4 pixels.
 */
export function sortByXThenY(a: LayoutTreeNode, b: LayoutTreeNode): number {
    const xDiff = a.relativeX - b.relativeX

    // Previne que pequenas flutuações manuais de pixels desorganizem colunas
    if (Math.abs(xDiff) > 4) return xDiff

    return a.relativeY - b.relativeY
}

/**
 * Segue a exata mesma lógica direcional vertical da sortByYThenX,
 * aplicada à tipagem correspondente da fase de Renderização (RenderNode).
 */
export function sortRenderByYThenX(a: RenderNode, b: RenderNode): number {
    const yDiff = a.relativeY - b.relativeY

    if (Math.abs(yDiff) > 4) return yDiff

    return a.relativeX - b.relativeX
}