// packages/engine/typography/scale.ts
import { type FigmaRestNode, TextNode, PullTextOptions } from '../types';
import { shouldIgnoreNode } from '../parser/traverse';

/**
 * Varre a árvore do Figma para coletar todos os nós de texto válidos.
 * Esta coleção será usada para inferir a escala tipográfica do documento inteiro.
 */
export function collectTexts(nodes: FigmaRestNode[], options: PullTextOptions): TextNode[] {
    const allTextNodesForScale: TextNode[] = [];

    function traverse(node: FigmaRestNode) {
        if (shouldIgnoreNode(node, options)) return;

        if (node.type === 'TEXT') {
            allTextNodesForScale.push(node as unknown as TextNode); 
        }

        if (node.children && Array.isArray(node.children)) {
            node.children.forEach(traverse);
        }
    }

    nodes.forEach(traverse);
    
    return allTextNodesForScale;
}

/**
 * Constrói um mapeamento relativo de tamanhos de fonte para níveis de título (H1, H2, etc.).
 * O algoritmo assume que o tamanho de fonte mais frequente é o corpo do texto (body),
 * e atribui níveis de título aos tamanhos maiores de forma decrescente.
 */
export function buildTypographicScale(nodes: TextNode[]) {
    const sizeFrequencies: Record<number, number> = {}

    // Conta a ocorrência de cada tamanho de fonte no design
    nodes.forEach(node => {
        if (node.style?.fontSize && typeof node.style.fontSize === 'number') {
            const size = node.style.fontSize
            sizeFrequencies[size] = (sizeFrequencies[size] || 0) + 1
        }
    })

    let bodySize = 0
    let maxCount = 0

    // Encontra o tamanho mais utilizado para definir a base da hierarquia
    for (const [sizeStr, count] of Object.entries(sizeFrequencies)) {
        if (count > maxCount) {
            maxCount = count
            bodySize = Number(sizeStr)
        }
    }

    // Isola e ordena decrescentemente os tamanhos maiores que o texto base
    const largerSizes = Object.keys(sizeFrequencies)
        .map(Number)
        .filter(size => size > bodySize)
        .sort((a, b) => b - a)

    const headingMap: Record<number, string> = {}
    const headingLevels = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6']

    // Mapeia os seis maiores tamanhos para as tags equivalentes em HTML/Markdown
    largerSizes.slice(0, 6).forEach((size, index) => {
        headingMap[size] = headingLevels[index]
    })

    return {
        headingMap,
        bodySize
    }
}