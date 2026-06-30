// packages/engine/geometry/layout.ts
import { type LayoutTreeNode, RenderNode, PullTextOptions, RenderGroupNode } from '../types';
import { getBoundsFromRenderNodes, getBoundsFromLayoutNodes } from '../geometry/bounds'
import { sortByYThenX, sortByXThenY, sortRenderByYThenX } from '../geometry/sorting'

/**
 * Ponto de entrada do sistema de organização espacial. Processa as árvores e
 * remove os grupos raízes se não forem estritamente necessários.
 */
export function processSpatialLayout(
    layoutTrees: LayoutTreeNode[],
    options: PullTextOptions
): RenderNode[] {
    const renderedRoots: RenderNode[] = [];

    for (const tree of layoutTrees) {
        const rendered = renderNode(tree, options);

        if (!rendered) continue;

        // Achata a estrutura caso o nó raiz seja apenas um contêiner
        if (rendered.type === 'GROUP') {
            renderedRoots.push(...rendered.children);
        } else {
            renderedRoots.push(rendered);
        }
    }

    return renderedRoots;
}

/**
 * Converte recursivamente um nó de layout (fase intermediária)
 * em um nó de renderização (fase final), inferindo a hierarquia visual.
 */
export function renderNode(node: LayoutTreeNode, options: PullTextOptions): RenderNode | null {
    if (node.type === 'TEXT') {
        return {
            type: 'TEXT',
            id: node.id,
            name: node.name,
            text: node.text || '',
            markdown: node.markdown || '',
            x: node.x,
            y: node.y,
            width: node.width,
            height: node.height,
            relativeX: node.relativeX,
            relativeY: node.relativeY
        }
    }

    // Grupos vazios são descartados antecipadamente
    if (!node.children || node.children.length === 0) return null

    const children = organizeChildren(node, options)

    if (children.length === 0) return null

    return {
        type: 'GROUP',
        id: node.id,
        name: node.name,
        direction: getGroupDirection(node),
        children,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        relativeX: node.relativeX,
        relativeY: node.relativeY
    }
}

/**
 * Mapeia o modo de layout nativo do Figma para uma direção legível.
 */
function getGroupDirection(node: LayoutTreeNode): 'HORIZONTAL' | 'VERTICAL' | 'AUTO' | string {
    if (node.layoutMode === 'HORIZONTAL') return 'HORIZONTAL'
    if (node.layoutMode === 'VERTICAL') return 'VERTICAL'

    return 'AUTO'
}

/**
 * Organiza os filhos de um contêiner. Respeita o auto-layout do Figma se existir,
 * ou delega para a inferência espacial caso não haja restrições explícitas.
 */
function organizeChildren(container: LayoutTreeNode, options: PullTextOptions): RenderNode[] {
    const children = container.children || [];

    if (children.length === 0) return [];

    // Odenação estrita seguindo a configuração nativa do Figma
    if (container.layoutMode === 'HORIZONTAL') {
        return children
            .slice()
            .sort(sortByXThenY)
            .map(child => renderNode(child, options))
            .filter(Boolean) as RenderNode[];
    }

    if (container.layoutMode === 'VERTICAL') {
        return children
            .slice()
            .sort(sortByYThenX)
            .map(child => renderNode(child, options))
            .filter(Boolean) as RenderNode[];
    }

    // Sem auto-layout nativo, aplica o algoritmo de inferência posicional
    return inferSpatialLayout(container, options);
}

/**
 * Analisa as coordenadas absolutas para deduzir colunas e agrupamentos
 * visuais em designs que não utilizam auto-layout.
 */
function inferSpatialLayout(container: LayoutTreeNode, options: PullTextOptions): RenderNode[] {
    const children = container.children || [];
    if (children.length === 0) return [];

    // Bypass rápido para nós únicos
    if (children.length === 1) {
        const onlyChild = renderNode(children[0], options);
        return onlyChild ? [onlyChild] : [];
    }

    const parentWidth = container.width || getBoundsFromLayoutNodes(children).width || 480;
    
    // Define elementos amplos como possíveis separadores ou títulos
    const MAX_GRID_ITEM_WIDTH = parentWidth * 0.6;
    const wideElements: LayoutTreeNode[] = [];
    const narrowElements: LayoutTreeNode[] = [];

    // Separa elementos de largura total dos elementos estreitos (potenciais colunas)
    for (const child of children) {
        if ((child.width || 0) > MAX_GRID_ITEM_WIDTH) wideElements.push(child);
        else narrowElements.push(child);
    }

    // Trata como bloco contínuo de leitura vertical se não houver itens estreitos
    if (narrowElements.length === 0) {
        return wideElements
            .slice()
            .sort(sortByYThenX)
            .map(child => renderNode(child, options))
            .filter(Boolean) as RenderNode[];
    }

    const columns = clusterColumns(narrowElements, options);

    // Reverte para lista linear vertical se o algoritmo não formar múltiplas colunas
    if (columns.length <= 1) {
        return [...wideElements, ...narrowElements]
            .sort(sortByYThenX)
            .map(child => renderNode(child, options))
            .filter(Boolean) as RenderNode[];
    }

    // Cria wrappers virtuais ao redor das colunas detectadas
    const columnGroups: RenderGroupNode[] = columns
        .map((column, index): RenderGroupNode => {
            const renderedColumnChildren = column.elements
                .slice()
                .sort(sortByYThenX)
                .map(child => renderNode(child, options))
                .filter(Boolean) as RenderNode[];

            const bounds = getBoundsFromRenderNodes(renderedColumnChildren);

            return {
                type: 'GROUP',
                id: `${container.id}-column-${index + 1}`,
                name: `${container.name || container.id} / Column ${index + 1}`,
                direction: 'VERTICAL',
                children: renderedColumnChildren,
                ...bounds
            };
        })
        .filter(group => group.children.length > 0);

    const horizontalBounds = getBoundsFromRenderNodes(columnGroups);
    const horizontalGroup: RenderGroupNode = {
        type: 'GROUP',
        id: `${container.id}-columns`,
        name: `${container.name || container.id} / Columns`,
        direction: 'HORIZONTAL',
        children: columnGroups,
        ...horizontalBounds
    };

    // Junta elementos largos no topo/fundo com o bloco de colunas criado
    const renderedWideElements = wideElements
        .slice()
        .sort(sortByYThenX)
        .map(child => renderNode(child, options))
        .filter(Boolean) as RenderNode[];

    return [...renderedWideElements, horizontalGroup].sort(sortRenderByYThenX);
}

/**
 * Agrupa nós estreitos em colunas avaliando a intersecção horizontal entre eles.
 */
function clusterColumns(nodes: LayoutTreeNode[], options: PullTextOptions): Array<{
    minX: number;
    maxX: number;
    elements: LayoutTreeNode[];
}> {

    const columns: Array<{ minX: number; maxX: number; elements: LayoutTreeNode[] }> = [];
    
    // Organiza espacialmente da esquerda para a direita antes de agrupar
    const sorted = nodes.slice().sort(sortByXThenY);

    const threshold = options.columnThreshold ?? 0.15;

    for (const node of sorted) {
        const nodeX = node.relativeX || 0;
        const nodeWidth = node.width || 0;
        const nodeMaxX = nodeX + nodeWidth;
        const nodeCenterX = nodeX + nodeWidth / 2;

        let addedToColumn = false;

        for (const column of columns) {
            // Calcula quanta sobreposição existe no eixo X
            const overlap = Math.max(0, Math.min(column.maxX, nodeMaxX) - Math.max(column.minX, nodeX));
            const columnWidth = column.maxX - column.minX;
            const minRelevantWidth = Math.min(columnWidth, nodeWidth);

            // Determina se a sobreposição é suficiente, barrando aproximações acidentais
            const hasMeaningfulOverlap = minRelevantWidth > 0
                ? overlap / minRelevantWidth > threshold
                : overlap > 0;

            const centerInsideColumn = nodeCenterX >= column.minX && nodeCenterX <= column.maxX;

            if (hasMeaningfulOverlap || centerInsideColumn) {
                column.elements.push(node);
                
                // Expande os limites da coluna caso o novo elemento seja um pouco mais largo
                column.minX = Math.min(column.minX, nodeX);
                column.maxX = Math.max(column.maxX, nodeMaxX);
                addedToColumn = true;
                break;
            }
        }

        // Inicia uma nova coluna se o elemento não couber nas anteriores
        if (!addedToColumn) {
            columns.push({ minX: nodeX, maxX: nodeMaxX, elements: [node] });
        }
    }

    return columns.sort((a, b) => a.minX - b.minX);
}