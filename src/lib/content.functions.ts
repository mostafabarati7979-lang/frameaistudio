import { createServerFn } from "@tanstack/react-start";
import type { ContentKind } from "./content-types";

export const listPublicContent = createServerFn({ method: "GET" })
  .inputValidator((input: { kinds: ContentKind[] }) => input)
  .handler(async ({ data }) => {
    const { fetchPublicContent } = await import("./public-content-fetch");
    return fetchPublicContent(data.kinds);
  });
