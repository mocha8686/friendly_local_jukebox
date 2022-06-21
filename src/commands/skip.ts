import { AudioPlayerStatus, AudioResource } from '@discordjs/voice';
import { CommandInteraction } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { Track } from '../music/track';
import { getSession } from '../store/sessions';

export default {
	command: new SlashCommandBuilder()
		.setName('skip')
		.setDescription('Skip the current song.'),
	async execute(interaction: CommandInteraction) {
		if (!interaction.guildId || !interaction.guild) {
			interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
			return;
		}

		const session = getSession(interaction.guildId);
		if (!session) {
			interaction.reply({ content: 'I\'m not currently in a voice channel.', ephemeral: true });
			return;
		}

		if (session.audioPlayer.state.status === AudioPlayerStatus.Idle) {
			interaction.reply({ content: 'I\'m not currently playing a song.', ephemeral: true });
			return;
		}

		const track = (session.audioPlayer.state.resource as AudioResource<Track>).metadata;
		session.audioPlayer.stop();
		interaction.reply({ content: `Skipped ${track.discordString}.` });
	}
};