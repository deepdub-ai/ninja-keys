export interface INinjaAction {
  id: string;
  title: string;
  type?: string;
  hotkey?: string;
  handler?: Function;
  mdIcon?: string;
  icon?: string;
  parent?: string;
  keywords?: string;
  children?: (INinjaAction | (() => Promise<INinjaAction[]>) | 'loading')[];
  section?: string;
}
