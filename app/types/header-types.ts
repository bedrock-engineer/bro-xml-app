export interface HeaderItem {
  label: string;
  value: string | number | null | undefined;
  /** Longer explanation shown on hover, e.g. the official BRO code description */
  description?: string | null;
}

export interface HeaderSection {
  id: string;
  title: string;
  items: Array<HeaderItem>;
}
