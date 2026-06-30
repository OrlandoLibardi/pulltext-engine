// packages/engine/parser/traverse.ts
import { type FigmaRestNode, LayoutTreeNode, PullTextOptions } from '../types'
import { convertNodesToMarkdown } from '../typography/markdown'
import { getGeometry } from '../geometry/bounds'

/**
 * Verifica se um nó do Figma deve ser ignorado durante a varredura.
 * Considera as configurações do usuário e as marcações manuais no nome da camada.
 *
 * @param node O nó atual retornado pela API do Figma.
 * @param options As opções globais configuradas para a extração.
 * @returns Verdadeiro se o nó deve ser ignorado, falso caso contrário.
 */
export function shouldIgnoreNode(node: FigmaRestNode, options: PullTextOptions): boolean {
    // Proteção básica contra nós nulos ou indefinidos
    if (!node) return true
    
    // Verifica a configuração de ignorar nós ocultos. O comportamento padrão é verdadeiro caso não definido.
    const ignoreHidden = options.ignoreHiddenNodes ?? true;
    if (ignoreHidden && 'visible' in node && node.visible === false) return true
    
    // Permite que o usuário do Figma force a exclusão de uma camada nomeando-a com o termo específico
    if (node.name && String(node.name).toLowerCase().includes('ignore that')) return true

    return false
}

/**
 * Percorre recursivamente a árvore de nós do Figma e constrói uma árvore de layout intermediária.
 * Esta estrutura intermediária preserva a hierarquia e calcula a geometria relativa e absoluta.
 *
 * @param node O nó atual sendo processado.
 * @param parent O nó pai direto do nó atual.
 * @param depth A profundidade atual na árvore.
 * @param ancestorIds O histórico de IDs dos nós acima deste na hierarquia.
 * @param headingMap O mapeamento de tamanhos de fonte para níveis de título.
 * @param options As configurações globais de extração.
 * @returns Um nó de layout processado ou nulo se o nó for ignorado ou irrelevante.
 */
export function traverse(
    node: FigmaRestNode,
    parent: FigmaRestNode | undefined,
    depth: number,
    ancestorIds: string[],
    headingMap: Record<number, string>,
    options: PullTextOptions
): LayoutTreeNode | null {
    
    // Interrompe o processamento se o nó atender aos critérios de exclusão
    if (shouldIgnoreNode(node, options)) return null

    // Extrai as coordenadas e dimensões absolutas e as posições relativas ao pai
    const geometry = getGeometry(node, parent)

    // Prepara os dados base que são comuns a qualquer tipo de nó validado
    const baseNode: LayoutTreeNode = {
        id: node.id,
        name: node.name,
        type: node.type,
        depth,
        parentId: parent?.id,
        ancestorIds,
        layoutMode: node.layoutMode,
        ...geometry
    }

    // Tratamento específico para nós de texto
    if (node.type === 'TEXT') {
        return {
            ...baseNode,
            type: 'TEXT',
            text: node.characters || '',
            
            // Gera a formatação Markdown apenas se a configuração permitir, injetando o mapa de títulos
            markdown: options.enableMarkdown !== false 
                ? convertNodesToMarkdown([node as any], headingMap) 
                : '',
            fontSize: node.style?.fontSize || 16
        }
    }

    // Tratamento recursivo para nós que contêm filhos
    if (node.children && Array.isArray(node.children)) {
        const children = node.children
            .map((child: FigmaRestNode) => {
                // Desce um nível na árvore, incrementando a profundidade e registrando o pai atual no histórico
                return traverse(
                    child,
                    node,
                    depth + 1,
                    [...ancestorIds, node.id],
                    headingMap,
                    options 
                )
            })
            // Limpa o array removendo nós filhos que retornaram nulos durante a varredura
            .filter(Boolean) as LayoutTreeNode[]

        // Se após a filtragem não restar nenhum filho, o container atual torna-se vazio e é descartado
        if (children.length === 0) return null

        return {
            ...baseNode,
            children
        }
    }

    // Retorna nulo para nós sem tipo reconhecido que não possuem filhos processáveis
    return null
}