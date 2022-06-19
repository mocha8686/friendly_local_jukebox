import { readdirSync } from 'fs';
import { join } from 'path';
import { Command } from '../types';

export async function getCommands(path: string): Promise<Command[]> {
	console.log(path);
	return (await Promise.all(
		readdirSync(path)
			.filter(file => file.endsWith('.js') || file.endsWith('.ts'))
			.map(filepath => import(join(path, filepath)))))
		.map(module => module.default);
}