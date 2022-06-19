import { CommandInteraction } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';

export default {
	command: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong!'),
	async execute(interaction: CommandInteraction) {
		interaction.reply('Pong!');
	}
};