// Stable anchors for search results that have no heading of their own (REVIEW-02 Note 3).
export const docRowId = (file: string) => "belge-" + file.toLowerCase().replace(/\.[a-z]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const termId = (id: string) => "terim-" + id;
