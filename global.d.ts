// global.d.ts
declare module 'class-variance-authority' {
    import { cva } from 'class-variance-authority';
    export { cva };
  }
  
  declare module 'clsx' {
    const clsx: (...classes: any[]) => string;
    export default clsx;
  }
  
  declare module 'lucide-react' {
    import { FC, SVGProps } from 'react';
    export const Check: FC<SVGProps<SVGSVGElement>>;
    export const ChevronDown: FC<SVGProps<SVGSVGElement>>;
    export const ChevronUp: FC<SVGProps<SVGSVGElement>>;
  }
  
  declare module 'tailwind-merge' {
    const twMerge: (...classes: string[]) => string;
    export default twMerge;
  }
  
  declare module 'date-fns' {
    export * from 'date-fns';
  }
  
  declare module 'date-fns-tz' {
    export * from 'date-fns-tz';
  }