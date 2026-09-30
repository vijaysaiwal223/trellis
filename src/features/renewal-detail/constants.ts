export const detailTabs = ["Overview", "Users", "Report"] as const;

export type DetailTab = (typeof detailTabs)[number];
