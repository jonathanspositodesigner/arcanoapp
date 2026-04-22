// Fix recharts + @types/react 18.3.x JSX element compatibility
// https://github.com/recharts/recharts/issues/3615
import type { Component } from "react";

declare module "recharts" {
  // Patch class components so TS treats them as valid JSX elements
  export class XAxis extends Component<any, any> {}
  export class YAxis extends Component<any, any> {}
  export class ZAxis extends Component<any, any> {}
  export class Bar extends Component<any, any> {}
  export class Line extends Component<any, any> {}
  export class Area extends Component<any, any> {}
  export class Pie extends Component<any, any> {}
  export class Cell extends Component<any, any> {}
  export class Scatter extends Component<any, any> {}
  export class Tooltip extends Component<any, any> {}
  export class Legend extends Component<any, any> {}
  export class CartesianGrid extends Component<any, any> {}
  export class ReferenceLine extends Component<any, any> {}
  export class Brush extends Component<any, any> {}
  export class RadialBar extends Component<any, any> {}
  export class Radar extends Component<any, any> {}
  export class PolarGrid extends Component<any, any> {}
  export class PolarAngleAxis extends Component<any, any> {}
  export class PolarRadiusAxis extends Component<any, any> {}
}