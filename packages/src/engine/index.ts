// pacotes/engine/index.ts
import { FigmaRestDocument, OutputNode, PullTextOptions, LayoutTreeNode } from './types';
import { collectTexts, buildTypographicScale } from './typography/scale';
import { traverse } from './parser/traverse';
import { processSpatialLayout } from './geometry/layout';
import { simplifyJson } from './parser/simplify';

/**
 * Função principal que orquestra todo o fluxo de extração de dados espaciais e textuais.
 * Transforma o JSON bruto da API do Figma em uma estrutura semântica simplificada.
 *
 * @param figmaRestJson O retorno original da API REST do Figma.
 * @param options Configurações que alteram o comportamento da extração (Markdown, ocultos, limiares).
 * @returns Array contendo os nós processados e hierarquizados.
 */
export async function parseLayoutToData(
    figmaRestJson: FigmaRestDocument, 
    options: PullTextOptions = { enableMarkdown: true, ignoreHiddenNodes: true, columnThreshold: 0.15 }
): Promise<OutputNode[]> {
    
    // Normalização inicial para garantir que sempre trabalharemos com um array de raízes
    if (!figmaRestJson || !figmaRestJson.document) return [];
    const selection = Array.isArray(figmaRestJson.document) 
        ? figmaRestJson.document 
        : [figmaRestJson.document];
    if (selection.length === 0) return [];

    // Passo 1: Análise global para criação da escala de títulos com base na frequência visual
    const allTextNodesForScale = collectTexts(selection, options);
    const { headingMap } = buildTypographicScale(allTextNodesForScale);

    // Passo 2: Conversão da árvore de nós do Figma em uma árvore intermediária focada em geometria
    const layoutTrees = selection
        .map(node => traverse(node, undefined, 0, [], headingMap, options))
        .filter(Boolean) as LayoutTreeNode[];
    if (layoutTrees.length === 0) return [];

    // Passo 3: Inferência de hierarquia espacial (linhas e colunas) convertendo para árvore de renderização
    const renderedRoots = processSpatialLayout(layoutTrees, options);

    // Passo 4: Limpeza estrutural para devolver apenas os dados necessários ao usuário final
    return simplifyJson(renderedRoots) as OutputNode[];
}