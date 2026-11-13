/**
 * Ambient module declarations for the Cypress test tree.
 *
 * Lets TypeScript resolve the `.vue` single-file components and the CSS/SASS
 * imports used by component specs and the support files. Cypress's own bundler
 * handles these at runtime; this file is for editor/type-checking support.
 */

declare module '*.vue' {
  // Component specs mount `.vue` files through Vue Test Utils; a permissive
  // shim keeps the mount overloads happy across Vue/VTU versions.
  const component: any;
  export default component;
}

declare module '*.css';
declare module '*.scss';
declare module '*.sass';
