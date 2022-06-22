import 'dotenv/config';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';

import { getCommands } from './util/getCommands';
import { joinPathWithMeta } from './util/joinPathWithMeta';

const token = process.env.DISCORD_BOT_TOKEN ?? '';
const clientId = process.env.DISCORD_CLIENT_ID ?? '';
const guildId = process.env.GUILD_ID ?? process.env.DISCORD_DEV_GUILD_ID ?? '';

const commands = (await getCommands(joinPathWithMeta(import.meta.url, './commands'))).map(command => command.command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

console.log('Starting refresh of application commands.');

try {
	if (process.env.REFRESH_TYPE === 'GLOBAL') {
		console.log('Performing global refresh.');
		await rest.put(
			Routes.applicationCommands(clientId),
			{ body: commands },
		);
	} else {
		console.log('Performing guild refresh.');
		await rest.put(
			Routes.applicationGuildCommands(clientId, guildId),
			{ body: commands },
		);
	}
	console.log('Successfully refreshed application commands.');
} catch (err) {
	console.error(err);
}