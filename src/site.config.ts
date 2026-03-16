import type { GiscusConfig, SiteConfig } from "@/types";

const giscusTerm = import.meta.env.PUBLIC_GISCUS_TERM;

const giscusConfig = {
	repo: import.meta.env.PUBLIC_GISCUS_REPO ?? "LokiWager/lokiwager.github.io",
	repoId: import.meta.env.PUBLIC_GISCUS_REPO_ID ?? "R_kgDOK5t_Dg",
	category: import.meta.env.PUBLIC_GISCUS_CATEGORY ?? "Announcements",
	categoryId: import.meta.env.PUBLIC_GISCUS_CATEGORY_ID ?? "DIC_kwDOK5t_Ds4C4eyH",
	mapping: import.meta.env.PUBLIC_GISCUS_MAPPING ?? "pathname",
	strict: import.meta.env.PUBLIC_GISCUS_STRICT ?? "0",
	reactionsEnabled: import.meta.env.PUBLIC_GISCUS_REACTIONS_ENABLED ?? "1",
	emitMetadata: import.meta.env.PUBLIC_GISCUS_EMIT_METADATA ?? "0",
	inputPosition: import.meta.env.PUBLIC_GISCUS_INPUT_POSITION ?? "top",
	lang: import.meta.env.PUBLIC_GISCUS_LANG ?? "en",
	loading: import.meta.env.PUBLIC_GISCUS_LOADING ?? "lazy",
	theme: {
		light: import.meta.env.PUBLIC_GISCUS_THEME_LIGHT ?? "light",
		dark: import.meta.env.PUBLIC_GISCUS_THEME_DARK ?? "dark_dimmed",
	},
	...(giscusTerm ? { term: giscusTerm } : {}),
} satisfies GiscusConfig;

const hasRequiredGiscusConfig =
	!!giscusConfig.repo &&
	!!giscusConfig.repoId &&
	!!giscusConfig.category &&
	!!giscusConfig.categoryId &&
	!(
		(giscusConfig.mapping === "specific" || giscusConfig.mapping === "number") &&
		!giscusConfig.term
	);

export const siteConfig: SiteConfig = {
	// Used as both a meta property (src/components/BaseHead.astro L:31 + L:49) & the generated satori png (src/pages/og-image/[slug].png.ts)
	author: "Loki's Wager",
	// Meta property used to construct the meta title property, found in src/components/BaseHead.astro L:11
	title: "Loki's Wager",
	// Meta property used as the default description meta property
	description: "The blog of Loki'Wager",
	// HTML lang property, found in src/layouts/Base.astro L:18
	lang: "en-GB",
	// Meta property, found in src/components/BaseHead.astro L:42
	ogLocale: "en_GB",
	// Date.prototype.toLocaleDateString() parameters, found in src/utils/date.ts.
	date: {
		locale: "en-GB",
		options: {
			day: "numeric",
			month: "short",
			year: "numeric",
		},
	},
	webmentions: {
		link: "https://webmention.io/lokiwager.github.io/webmention",
	},
	...(hasRequiredGiscusConfig ? { giscus: giscusConfig } : {}),
};

// Used to generate links in both the Header & Footer.
export const menuLinks: Array<{ title: string; path: string }> = [
	{
		title: "Home",
		path: "/",
	},
	{
		title: "About",
		path: "/about/",
	},
	{
		title: "Blog",
		path: "/posts/",
	},
];
