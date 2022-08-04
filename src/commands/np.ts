import { ChatInputCommandInteraction } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { getSession } from '../store/sessions';

export default {
	command: new SlashCommandBuilder()
		.setName('np')
		.setDescription('Show the song currently playing.'),
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

		const track = session.nowPlaying;
		if (!track) {
			interaction.reply({ content: 'I\'m not currently playing a song.', ephemeral: true });
		} else {
			interaction.reply({ content: `Currently playing ${track.discordString}.`, embeds: [ track.embed ] });
		}
	}
};