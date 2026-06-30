# Figma Layout Extractor

Um motor de extração de layout e texto para a API REST do Figma. 

Ele transforma o JSON bruto e complexo retornado pelo Figma em uma estrutura semântica e simplificada, inferindo automaticamente layouts espaciais (colunas e linhas) e convertendo a formatação de texto nativa para Markdown.

---

## 🚀 Funcionalidades

* **Inferência Espacial:** Agrupa elementos em linhas e colunas visualmente, mesmo que o design não utilize o *Auto Layout* nativo do Figma.
* **Conversão para Markdown:** Converte textos complexos (negrito, itálico, links, listas) em uma string Markdown limpa e pronta para uso.
* **Escala Tipográfica Automática:** Analisa os tamanhos de fonte do documento inteiro e aplica tags de título (`# H1`, `## H2`) automaticamente.
* **Limpeza de JSON:** Remove a "sujeira" da API do Figma, retornando apenas nós de Texto e Grupos essenciais.

---

## 📦 Instalação

Instale o pacote utilizando o seu gerenciador de pacotes favorito:

```bash
npm install @pulltext/engine
```

---

## 💻 Como usar

O pacote exporta a função principal `parseLayoutToData`, que recebe o JSON do Figma e um objeto de opções opcional.

```ts
import { parseLayoutToData } from '@pulltext/engine';

// Exemplo de uso em uma função assíncrona
async function processarFigma() {
  // 1. Obtenha o JSON da API REST do Figma
  const node = await figma.getNodeByIdAsync(frame) as FrameNode;
  const jsonTemp = await node.exportAsync({ format: 'JSON_REST_V1' }) as any;

  // 2. Processe os dados com o extrator
  const dadosExtraidos = await parseLayoutToData(jsonBruto, {
    enableMarkdown: true,
    ignoreHiddenNodes: true,
    columnThreshold: 0.15
  });

  console.log(dadosExtraidos);
}
```
---

## ⚙️ Configurações (PullTextOptions)

Você pode customizar o comportamento do extrator passando um objeto de opções como segundo argumento da função:

| Propriedade | Tipo | Padrão | Descrição |
| --- | --- | --- | --- |
| `enableMarkdown` | `boolean` | `true` | Habilita a conversão de estilos de texto e escalas tipográficas para Markdown. |
| `ignoreHiddenNodes` | `boolean` | `true` | Ignora camadas que estão marcadas como invisíveis (`visible: false`) no Figma. |
| `columnThreshold` | `number` | `0.15` | Define a porcentagem mínima de intersecção horizontal (0 a 1) para que dois elementos sejam considerados parte da mesma coluna. |

---

## 📄 Estrutura de Saída

O extrator retorna um array de nós simplificados (`OutputNode`). A estrutura final é enxuta e focada no conteúdo:

```json
[
  {
    "type": "GROUP",
    "children": [
      {
        "type": "TEXT",
        "id": "1:2",
        "name": "Título Principal",
        "text": "Bem-vindo ao Extrator",
        "markdown": "# Bem-vindo ao Extrator"
      },
      {
        "type": "TEXT",
        "id": "1:3",
        "name": "Descrição",
        "text": "Este é um texto em negrito.",
        "markdown": "Este é um texto em **negrito**."
      }
    ]
  }
]

```

---

## 📜 Licença

Distribuído sob a licença MIT.
