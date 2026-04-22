// Fix recharts JSX compatibility with @types/react 18.3.x
// See: https://github.com/recharts/recharts/issues/3615
import "recharts";

declare module "recharts" {
  interface XAxisProps {
    children?: React.ReactNode;
  }
  interface YAxisProps {
    children?: React.ReactNode;
  }
}

// Global JSX element fix for recharts class components
declare namespace React {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface DOMAttributes<T> {
    // keep existing
  }
}