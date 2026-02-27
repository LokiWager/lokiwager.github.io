import type { MarkdownHeading } from "astro";

export interface TocItem extends MarkdownHeading {
	subheadings: Array<TocItem>;
}

export function generateToc(headings: ReadonlyArray<MarkdownHeading>) {
	// this ignores/filters out h1 element(s)
	const bodyHeadings = headings.filter(({ depth }) => depth > 1);
	const toc: Array<TocItem> = [];
	const stack: Array<TocItem> = [];

	for (const h of bodyHeadings) {
		const heading: TocItem = { ...h, subheadings: [] };

		// Pop until we find the nearest parent with smaller depth.
		while (stack.length > 0 && stack[stack.length - 1]!.depth >= heading.depth) {
			stack.pop();
		}

		if (stack.length === 0) {
			// Top-level heading in TOC. This also handles pages whose first heading is h3/h4.
			toc.push(heading);
		} else {
			stack[stack.length - 1]!.subheadings.push(heading);
		}

		stack.push(heading);
	}

	return toc;
}
