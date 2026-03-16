/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare module "@pagefind/default-ui" {
	declare class PagefindUI {
		constructor(arg: unknown);
	}
}

interface ImportMetaEnv {
	readonly WEBMENTION_API_KEY: string;
	readonly PUBLIC_GISCUS_REPO?: string;
	readonly PUBLIC_GISCUS_REPO_ID?: string;
	readonly PUBLIC_GISCUS_CATEGORY?: string;
	readonly PUBLIC_GISCUS_CATEGORY_ID?: string;
	readonly PUBLIC_GISCUS_MAPPING?:
		| "pathname"
		| "url"
		| "title"
		| "og:title"
		| "specific"
		| "number";
	readonly PUBLIC_GISCUS_STRICT?: "0" | "1";
	readonly PUBLIC_GISCUS_REACTIONS_ENABLED?: "0" | "1";
	readonly PUBLIC_GISCUS_EMIT_METADATA?: "0" | "1";
	readonly PUBLIC_GISCUS_INPUT_POSITION?: "top" | "bottom";
	readonly PUBLIC_GISCUS_LANG?: string;
	readonly PUBLIC_GISCUS_LOADING?: "lazy" | "eager";
	readonly PUBLIC_GISCUS_THEME_LIGHT?: string;
	readonly PUBLIC_GISCUS_THEME_DARK?: string;
	readonly PUBLIC_GISCUS_TERM?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
