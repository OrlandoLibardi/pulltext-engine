// packages/engine/parser/simplify.ts
import { type RenderNode } from '../types' 

/**
 * Reduz a árvore de renderização final, removendo propriedades intermediárias
 * e mantendo apenas os dados essenciais para a saída do JSON final.
 *
 * @param nodes Array de nós de renderização processados.
 * @returns Array contendo objetos simplificados e estruturados.
 */
export function simplifyJson(nodes: RenderNode[]): any[] {
    // Retorna um array vazio se a entrada for inválida
    if (!Array.isArray(nodes)) return []
    
    return nodes
        .map((node: RenderNode): any => {
            // Mantém apenas os campos úteis para extração de conteúdo
            if (node.type === 'TEXT') {
                return {
                    type: 'TEXT',
                    id: node.id,
                    name: node.name,
                    text: node.text,
                    markdown: node.markdown
                }
            }

            // Achata e processa os nós filhos recursivamente
            if (node.type === 'GROUP') {
                const children = simplifyJson(node.children)

                // Ignora grupos que ficaram vazios após a filtragem dos filhos
                if (children.length === 0) return null

                return {
                    type: 'GROUP',
                    children
                }
            }

            // Descarta qualquer outro tipo de nó
            return null
        })
        // Remove os valores nulos resultantes do mapeamento
        .filter(Boolean)
}