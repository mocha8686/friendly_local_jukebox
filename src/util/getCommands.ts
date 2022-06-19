import { join } from 'path';
import { readdirSync } from 'fs';

import { Command } from '../types';

export async function getCommands(path: string): Promise<Command[]> {
	return (await Promise.all(
		readdirSync(path)
			.filter(file => file.endsWith('.js') || file.endsWith('.ts'))
			.map(filepath => import(join(path, filepath)))))
		.map(module => module.default);
}