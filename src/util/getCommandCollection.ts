import { Collection } from 'discord.js';
import { Command } from '../types';
import getCommands from './getCommands';

export default async (path: URL): Promise<Collection<string, Command>> => {
	return (await getCommands(path)).reduce((collection, command) => {
		collection.set(command.command.name, command);
		return collection;
	}, new Collection<string, Command>());
};