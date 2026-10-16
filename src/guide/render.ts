import { Marked } from 'marked'

/** GitHub-style heading slug, so links written for the .md also work on the page. */
export function slug(text: string): string {
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
}

const marked = new Marked({
  renderer: {
    heading(text: string, depth: number, raw: string) {
      return `<h${depth} id="${slug(raw)}">${text}</h${depth}>\n`
    },
  },
})

export function renderGuide(markdown: string): string {
  return marked.parse(markdown, { async: false }) as string
}
