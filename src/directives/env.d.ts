import "astro";
declare module "astro" {
  interface AstroClientDirectives { "client:paint"?: boolean | "eager" }
}
