import * as React from "react";

declare global {
  interface Window {
    google: any;
  }
  namespace JSX {
    interface IntrinsicElements {
      'gmp-map-3d': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        center?: string;
        range?: string;
        tilt?: string;
        heading?: string;
        'default-labels-disabled'?: boolean;
        ref?: any;
      }, HTMLElement>;
      'gmp-polygon-3d': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        'altitude-mode'?: string;
        'fill-color'?: string;
        'stroke-color'?: string;
        'stroke-width'?: string;
        'draws-occluded-segments'?: boolean;
      }, HTMLElement>;
    }
  }
}
