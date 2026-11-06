import { pathToFileURL } from 'node:url';
import type { RouteModule } from './types.js';

/** Import literal filesystem paths without treating '?' or '#' as URL components. */
export async function loadRouteModule(fullPath: string): Promise<RouteModule> {
  return (await import(pathToFileURL(fullPath).href)) as RouteModule;
}
