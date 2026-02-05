export interface HeaderItem {
  label: string;
  value: string | number | null | undefined;
}

export interface HeaderSection {
  id: string;
  title: string;
  items: Array<HeaderItem>;
}
