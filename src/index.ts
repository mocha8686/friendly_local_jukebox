import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { getCommandCollection } from './util/getCommandCollection';
import { joinPathWithMeta } from './util/joinPathWithMeta';

const token = process.env.DISCORD_BOT_TOKEN ?? '';
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

const commands = await getCommandCollection(joinPathWithMeta(import.meta.url, './commands'));

client.on('ready', () => {
	console.log(`Logged in as ${client?.user?.tag}.`);
});

client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;

	const command = commands.get(interaction.commandName);
	if (!command) return;

	try {
		console.log(`User ${interaction.user.tag} executed ${command.command.name}.`);
		await command.execute(interaction);
	} catch (err) {
		console.error(err);
		interaction.reply({ content: 'There was an error executing this command.', ephemeral: true });
	}
});

client.login(token);