// packages/engine/typography/markdown.ts
import { type FigmaNode, TextNode } from '../types' 

/**
 * Converte um array de nós do Figma em uma única string formatada em Markdown,
 * inserindo quebras de linha duplas entre blocos distintos.
 */
export function convertNodesToMarkdown(
    nodes: FigmaNode[],
    contextScale: Record<number, string>
): string {
    return nodes
        .map(node => processNode(node, contextScale))
        .filter(text => text.trim() !== '')
        .join('\n\n')
}

/**
 * Roteia o nó para o processador correto com base no seu tipo.
 * Se for um agrupamento, processa os filhos recursivamente.
 */
function processNode(node: FigmaNode, contextScale: Record<number, string>): string {
    if (node.type === 'TEXT') {
        return processTextNode(node as TextNode, contextScale)
    }

    if (node.children && Array.isArray(node.children)) {
        return node.children
            .map((child: FigmaNode) => processNode(child, contextScale))
            .filter((text: string) => text.trim() !== '')
            .join('\n')
    }

    return ''
}

/**
 * Analisa um nó de texto caractere por caractere para extrair estilos mistos
 * (negrito, itálico, links) e converte as configurações nativas de lista e título para Markdown.
 */
function processTextNode(node: TextNode, contextScale: Record<number, string>): string {
    if (!node.characters) return ''

    const chars = node.characters
    const overrides = node.characterStyleOverrides || []
    const overrideTable = node.styleOverrideTable || {}
    const globalStyle = node.style || {}

    // Funções auxiliares para inferir negrito e itálico a partir de várias propriedades da fonte
    const isStyleBold = (styleObj: any): boolean => {
        if (!styleObj) return false
        const weight = styleObj.fontWeight || 400
        if (weight >= 700) return true

        if (typeof styleObj.fontStyle === 'string' && styleObj.fontStyle.toLowerCase().includes('bold')) return true
        if (styleObj.fontName && typeof styleObj.fontName.style === 'string' && styleObj.fontName.style.toLowerCase().includes('bold')) return true
        if (typeof styleObj.fontPostScriptName === 'string' && styleObj.fontPostScriptName.toLowerCase().includes('bold')) return true

        return false
    }

    const isStyleItalic = (styleObj: any): boolean => {
        if (!styleObj) return false
        if (styleObj.italic === true) return true

        if (typeof styleObj.fontStyle === 'string' && styleObj.fontStyle.toLowerCase().includes('italic')) return true
        if (styleObj.fontName && typeof styleObj.fontName.style === 'string' && styleObj.fontName.style.toLowerCase().includes('italic')) return true
        if (typeof styleObj.fontPostScriptName === 'string' && styleObj.fontPostScriptName.toLowerCase().includes('italic')) return true

        return false
    }

    interface Segment {
        text: string
        bold: boolean
        italic: boolean
        hyperlinkUrl?: string
    }

    const getStyleHyperlinkUrl = (styleObj: any): string | undefined => {
        if (!styleObj?.hyperlink) return undefined
        if (styleObj.hyperlink.type === 'URL' && typeof styleObj.hyperlink.url === 'string' && styleObj.hyperlink.url.trim() !== '') {
            return styleObj.hyperlink.url
        }
        return undefined
    }

    const segments: Segment[] = []
    let currentSegment: Segment | null = null

    // Varredura de caracteres para agrupar trechos que possuem a mesma formatação exata
    for (let i = 0; i < chars.length; i++) {
        const char = chars[i]

        // Trata quebras de linha como divisores de segmento para evitar tags Markdown englobando múltiplas linhas
        if (char === '\n') {
            if (currentSegment) {
                segments.push(currentSegment)
                currentSegment = null
            }
            segments.push({ text: '\n', bold: false, italic: false, hyperlinkUrl: undefined })
            continue
        }

        const overrideId = overrides[i]
        const activeStyle = overrideId && overrideId !== 0 && overrideTable[overrideId]
            ? { ...globalStyle, ...overrideTable[overrideId] }
            : globalStyle

        const bold = isStyleBold(activeStyle)
        const italic = isStyleItalic(activeStyle)
        const hyperlinkUrl = getStyleHyperlinkUrl(activeStyle)

        // Agrupa os caracteres adjacentes que compartilham as mesmas propriedades visuais
        if (!currentSegment) {
            currentSegment = { text: char, bold, italic, hyperlinkUrl }
        } else if (
            currentSegment.bold === bold &&
            currentSegment.italic === italic &&
            currentSegment.hyperlinkUrl === hyperlinkUrl
        ) {
            currentSegment.text += char
        } else {
            segments.push(currentSegment)
            currentSegment = { text: char, bold, italic, hyperlinkUrl }
        }
    }

    if (currentSegment) segments.push(currentSegment)

    let markdownText = ''

    // Aplica a sintaxe Markdown aos segmentos, preservando espaços em branco no início e fim
    const formatInlineSegment = (segment: Segment): string => {
        if (segment.text === '\n') return '\n'

        const leadingSpaces = segment.text.match(/^[ \t]+/)?.[0] || ''
        const trailingSpaces = segment.text.match(/[ \t]+$/)?.[0] || ''
        const coreText = segment.text.substring(leadingSpaces.length, segment.text.length - trailingSpaces.length)

        if (!coreText) return segment.text

        let formattedCore = coreText

        if (segment.bold && segment.italic) formattedCore = `***${formattedCore}***`
        else if (segment.bold) formattedCore = `**${formattedCore}**`
        else if (segment.italic) formattedCore = `*${formattedCore}*`

        if (segment.hyperlinkUrl) formattedCore = `[${formattedCore}](${segment.hyperlinkUrl})`

        return `${leadingSpaces}${formattedCore}${trailingSpaces}`
    }

    for (const segment of segments) {
        markdownText += formatInlineSegment(segment)
    }

    // Processamento de listas nativas do Figma (marcadores e números)
    if (node.lineTypes && node.lineTypes.length > 0) {
        const lines = markdownText.split('\n')
        let orderedCounter = 1

        markdownText = lines
            .map((line, index) => {
                const lineType = node.lineTypes![index] || 'NONE'
                const indentLevel = node.lineIndentations ? node.lineIndentations[index] || 0 : 0
                const spaces = Math.max(0, indentLevel - 1) * 4
                const indentStr = ' '.repeat(spaces)

                if (lineType === 'UNORDERED') {
                    orderedCounter = 1
                    return `${indentStr}- ${line}`
                }

                if (lineType === 'ORDERED') {
                    const prefix = `${indentStr}${orderedCounter}. `
                    orderedCounter++
                    return `${prefix}${line}`
                }

                orderedCounter = 1
                return line
            })
            .join('\n')
    }

    // Processamento de níveis de título baseado na escala tipográfica relativa
    if (globalStyle.fontSize && typeof globalStyle.fontSize === 'number') {
        const size = globalStyle.fontSize
        const headingLevel = contextScale[size]
        const cleanText = normalizeHeadingContent(markdownText.replace(/\n+/g, ' ').trim())

        if (headingLevel === 'H1') markdownText = `# ${cleanText}`
        else if (headingLevel === 'H2') markdownText = `## ${cleanText}`
        else if (headingLevel === 'H3') markdownText = `### ${cleanText}`
    }

    return markdownText
}

/**
 * Remove formatações conflitantes que envolvem o texto inteiro de um título.
 */
function normalizeHeadingContent(text: string): string {
    let normalized = text.trim()
    normalized = unwrapFullMarkdownEmphasis(normalized)
    return normalized.trim()
}

/**
 * Remove os asteriscos de negrito e itálico que cobrem a string completa.
 * Exemplo: **Título** passa a ser apenas Título, pois a tag de Heading (#) já indica destaque.
 */
function unwrapFullMarkdownEmphasis(text: string): string {
    let normalized = text.trim()
    let changed = true

    while (changed) {
        changed = false

        const triple = normalized.match(/^\*\*\*([\s\S]+)\*\*\*$/)
        if (triple) {
            normalized = triple[1].trim()
            changed = true
            continue
        }

        const bold = normalized.match(/^\*\*([\s\S]+)\*\*$/)
        if (bold) {
            normalized = bold[1].trim()
            changed = true
            continue
        }

        const italic = normalized.match(/^\*([\s\S]+)\*$/)
        if (italic) {
            normalized = italic[1].trim()
            changed = true
            continue
        }
    }

    return normalized
}