import getReadingTime from "reading-time";
import { toString } from "mdast-util-to-string";

type RemarkTree = Parameters<typeof toString>[0];
type AstroFrontmatter = Record<string, unknown> & {
	minutesRead?: string;
};
type AstroData = Record<string, unknown> & {
	astro?: {
		frontmatter?: AstroFrontmatter;
	};
};

export function remarkReadingTime() {
	return function (tree: RemarkTree, file: { data: AstroData }) {
		const textOnPage = toString(tree);
		const readingTime = getReadingTime(textOnPage);
		const astro = (file.data.astro ??= {});
		const frontmatter = (astro.frontmatter ??= {});
		frontmatter.minutesRead = readingTime.text;
	};
}
