import { ChatInputCommandInteraction } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { getSession } from '../store/sessions';

export default {
	command: new SlashCommandBuilder()
		.setName('stop')
		.setDescription('Stop playing songs and leave.'),
	async execute(interaction: ChatInputCommandInteraction) {
		if (!interaction.guildId || !interaction.guild) {
			interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
			return;
		}

		const session = getSession(interaction.guildId);
		if (!session) {
			interaction.reply({ content: 'I\'m not currently in a voice channel.', ephemeral: true });
			return;
		}

		session.voiceConnection.destroy();
		interaction.reply({ content: 'Left voice channel.' });
	}
};