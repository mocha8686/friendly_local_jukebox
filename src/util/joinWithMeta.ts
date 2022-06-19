import { join } from 'path';

export function joinWithMeta(importMetaUrl: string, to: string) {
	return join(new URL(importMetaUrl).pathname.split('/').slice(0, -1).join('/'), to);
}