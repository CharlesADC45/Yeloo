// Temporary global declarations to reduce noisy TS errors in the editor environment.
// Recommended: install proper types with `npm i -D @types/react @types/react-dom` instead.

declare module 'sonner';
declare module 'next-themes';

declare namespace React {
  // Minimal props/events used across the codebase to help the TS server.
  interface Attributes {}
  interface CSSProperties { [key: string]: any }
  interface DOMAttributes<T> {
    onClick?: (e: any) => any;
    onChange?: (e: any) => any;
    onSubmit?: (e: any) => any;
    // allow arbitrary event props
    [key: string]: any;
  }
}

declare namespace JSX {
  interface IntrinsicElements {
    // allow any element name with any props
    [elemName: string]: any;
  }
}

declare global {
  interface Window {
    dispatchEvent: (ev: any) => boolean;
  }
}

export {};
