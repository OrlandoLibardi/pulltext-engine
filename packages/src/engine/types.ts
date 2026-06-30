// packages/engine/types.ts

/**
 * Estrutura base esperada do JSON original retornado pela API REST do Figma.
 */
export interface FigmaRestNode {
    id: string;
    type: string;
    name: string;
    visible?: boolean;
    layoutMode?: 'HORIZONTAL' | 'VERTICAL' | 'NONE' | string;
    characters?: string;
    style?: any;
    characterStyleOverrides?: number[];
    styleOverrideTable?: Record<number, any>;
    lineTypes?: string[];
    lineIndentations?: number[];
    absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
    absoluteRenderBounds?: { x: number; y: number; width: number; height: number };
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    children?: FigmaRestNode[];
}

export interface FigmaRestDocument {
    document: FigmaRestNode | FigmaRestNode[];
}

/**
 * Configurações injetáveis para modificar o comportamento do motor de extração.
 */
export interface PullTextOptions {
    enableMarkdown?: boolean;
    columnThreshold?: number; 
    ignoreHiddenNodes?: boolean;
}

/**
 * Interfaces relacionadas à saída (Output) desejada após o processamento.
 */
export interface SimpleNode {
    id: string;
    type: string;
    name: string;
    content?: string;
    contentMarkdown?: string;
    fontSize?: number;
    role?: string;
    parentLevelOne?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
}

export type OutputNode = SimpleNode | { type: string; name?: string; children: SimpleNode[] };

/**
 * Interfaces para tipagem dos estilos e nós nativos do processo interno.
 */
export interface Style {
    fontStyle?: string;
    fontSize?: number;
    fontWeight?: number;
    hyperlink?: {
        type: string;
        url: string;
    };
}

export interface TextNode {
    type: 'TEXT';
    characters: string;
    style: Style;
    characterStyleOverrides?: number[];
    styleOverrideTable?: Record<number, Style>;
    lineTypes?: string[];
    lineIndentations?: number[];
}

export interface FrameNode {
    type: 'FRAME' | 'GROUP' | 'COMPONENT';
    children: FigmaNode[];
}

export type FigmaNode = TextNode | FrameNode | any;

/**
 * Tipagens auxiliares genéricas para manipulação dos dados extraídos.
 */
export type Item = {
  type: 'TEXT';
  id: string;
  name: string;
  text: string;
  markdown: string;
};

export type GroupItem = {
  type: 'GROUP';
  children: Item[];
};

export type DataItem = Item | GroupItem;
export type Data = DataItem[];

export type DataKey = 'text' | 'markdown';

/**
 * Estrutura base de geometria compartilhada pelas fases intermediárias.
 */
export type Geometry = {
    x: number
    y: number
    width: number
    height: number
    relativeX: number
    relativeY: number
}

/**
 * Nó pertencente à Árvore de Layout Intermediária (Fase de mapeamento geométrico).
 */
export type LayoutTreeNode = Geometry & {
    id: string
    name: string
    type: string
    depth: number
    parentId?: string
    ancestorIds: string[]
    layoutMode?: 'HORIZONTAL' | 'VERTICAL' | 'NONE' | string
    text?: string
    markdown?: string
    fontSize?: number
    children?: LayoutTreeNode[]
}

/**
 * Nós pertencentes à Árvore de Renderização (Fase final de inferência de hierarquia espacial).
 */
export type RenderTextNode = Geometry & {
    type: 'TEXT'
    id: string
    name: string
    text: string
    markdown: string
}

export type RenderGroupNode = Geometry & {
    type: 'GROUP'
    id?: string
    name?: string
    direction?: 'HORIZONTAL' | 'VERTICAL' | 'AUTO' | string
    children: RenderNode[]
}

export type RenderNode = RenderTextNode | RenderGroupNode