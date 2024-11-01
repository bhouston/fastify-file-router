import type { LogLevel } from 'fastify';

export type FileRouteConvention = 'remix' | 'next';

export type FastifyFileRouterOptions = {
  /**
   * Where the routes should be mounted on the server.
   * @default "/"
   */
  mount?: string;
  /**
   * The local directory where the routes are located relative to the build root folder.
   * @default ["./routes", "./src/routes"]
   */
  routesDirs?: string[];
  /**
   * The root folder of the source code that should be loaded. If you are transpiling your source code,
   * you should set this to the build output directory, e.g. 'dist' or 'build'.
   * @default '.' (current working directory)
   */
  buildRoot?: string;
  /**
   * The file extension for the route files.
   * @default [".js", ".ts", ".jsx", ".tsx"]
   */
  extensions?: string[];
  /**
   * File convention for the route files, can be either "remix" or "next".
   * @default "remix"
   */
  convention?: FileRouteConvention;
  /**
   * Verbosity level for the plugin.
   * @default "info"
   */
  logLevel?: LogLevel;
  /**
   * Exclusion patterns for files to ignore.
   */
  exclude?: RegExp[];
};
