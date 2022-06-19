import 'dotenv/config';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import { Command } from './types';

const token = process.env.DISCORD_BOT_TOKEN ?? '';
const clientId = process.env.DISCORD_CLIENT_ID ?? '';
const guildId = process.env.DISCORD_DEV_GUILD_ID ?? '';

const commands: Command[] = [
	{ name: 'ping', description: 'Replies with Pong!' },
];

const rest = new REST({ version: '10' }).setToken(token);

console.log('Starting refresh of application commands.');

try {
	await rest.put(
		Routes.applicationGuildCommands(clientId, guildId),
		{ body: commands },
	);
	console.log('Successfully refreshed application commands.');
} catch (err) {
	console.error(err);
}