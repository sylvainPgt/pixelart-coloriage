declare module "streamlit-component-lib" {
    export const Streamlit: any;
    export function withStreamlitConnection(component: any): any;
    export interface ComponentProps {
      args: any;
    }
  }