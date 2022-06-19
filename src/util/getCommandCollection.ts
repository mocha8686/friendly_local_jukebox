import { Collection } from 'discord.js';
import { Command } from '../types';
import { getCommands } from './getCommands';

export async function getCommandCollection(path: string): Promise<Collection<string, Command>> {
	return (await getCommands(path)).reduce((collection, command) => {
		collection.set(command.command.name, command);
		return collection;
	}, new Collection<string, Command>());
}