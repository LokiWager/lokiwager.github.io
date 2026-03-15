# Loki's Wager

The source for [lokiwager.app](https://lokiwager.app/), built with Astro.

This repository is the publishing site for the blog and long-form engineering series, including the GPU runtime tutorial work that lives alongside the code repos. It is not a generic theme repo anymore; it is the actual content and site implementation for Loki's Wager.

## Stack

- Astro 6
- Tailwind CSS
- Markdown content collections
- MDX support
- Shiki code highlighting
- Satori-generated OG images
- RSS and sitemap generation
- Pagefind static search
- optional webmentions integration

## Prerequisites

- Node.js `20.19.1+` or `22.12.0+`
- `pnpm` 8.x

Install dependencies:

```bash
pnpm install
```

## Development

Start the local dev server:

```bash
pnpm dev
```

Useful commands:

| Command             | Purpose                                                      |
| ------------------- | ------------------------------------------------------------ |
| `pnpm dev`          | Start the local Astro dev server                             |
| `pnpm build`        | Build the site into `dist/` and run Pagefind after the build |
| `pnpm preview`      | Preview the production build locally                         |
| `pnpm check`        | Run Astro type/content checks                                |
| `pnpm lint`         | Run ESLint                                                   |
| `pnpm format`       | Format the repo with Prettier                                |
| `pnpm format:check` | Check formatting without rewriting files                     |

## Content Model

Posts live in:

- `src/content/post/`

The content schema is defined in:

- `src/content.config.ts`

Each post is a Markdown file with frontmatter. The important fields are:

- `title`
- `description`
- `publishDate`
- `updatedDate`
- `tags`
- `coverImage`
- `ogImage`
- `draft`

Notes:

- `title` is limited to 60 characters
- `description` must stay between 50 and 160 characters
- tags are normalized to lowercase and deduplicated
- draft posts are excluded from the production build

## Writing Workflow

To add a new post:

1. Create a new file in `src/content/post/`.
2. Add frontmatter that satisfies the content schema.
3. Write the article in Markdown.
4. Run `pnpm build` before publishing so the content collection, generated pages, OG images, RSS, sitemap, and Pagefind index all stay in sync.

If a post needs a generated social image, the OG image route is here:

- `src/pages/og-image/[slug].png.ts`

If a post should use a custom social image instead, set `ogImage` in frontmatter.

## Site Configuration

The main site metadata lives in:

- `src/site.config.ts`

That file controls:

- site title
- author
- description
- locale
- date formatting
- webmention endpoint
- header and footer menu links

The Astro-level site configuration lives in:

- `astro.config.ts`

That file controls:

- canonical site URL
- Markdown plugins
- Tailwind integration
- sitemap generation
- image handling
- Vite behavior

## Important Paths

- `src/pages/` for route definitions
- `src/layouts/` for shared page layouts
- `src/components/` for reusable UI pieces
- `src/styles/global.css` for global styles
- `public/` for static assets
- `dist/` for build output

## Search, RSS, and Sitemap

This site uses build-time search indexing with Pagefind.

That means:

- `pnpm build` produces the Astro site
- the `postbuild` script then indexes searchable content from `dist/`

RSS and sitemap generation are handled automatically during the Astro build.

## Webmentions

The site includes webmention components, but the build can still succeed without a webmention token in local development.

If you want webmentions enabled in a deployed environment, make sure the endpoint in `src/site.config.ts` and any required environment configuration are set correctly.

## Deployment

The production domain is:

- `lokiwager.app`

Relevant deployment files:

- `netlify.toml`
- `public/CNAME`

The current Netlify build command is:

```bash
pnpm build
```
