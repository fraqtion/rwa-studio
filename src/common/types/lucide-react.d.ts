declare module 'lucide-react' {
  import { ComponentType, SVGAttributes } from 'react';

  export interface IconProps extends SVGAttributes<SVGElement> {
    color?: string;
    size?: string | number;
    strokeWidth?: string | number;
  }

  export type Icon = ComponentType<IconProps>;

  export const X: Icon;
  export const Download: Icon;
  export const Cpu: Icon;
  export const FileJson: Icon;
  export const Code: Icon;
  export const Package: Icon;
  export const FileArchive: Icon;
  export const CheckCircle2: Icon;
  export const Github: Icon;
  export const Server: Icon;
}
