import { AudioPlayerStatus } from '@discordjs/voice';
import { CommandInteraction } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { getSession } from '../store/sessions';

export default {
	command: new SlashCommandBuilder()
		.setName('skip')
		.setDescription('Skip the current song.')
		.addIntegerOption(option => option
			.setName('number')
			.setDescription('Number of songs to skip')
			.setMinValue(1)
		)
		.addIntegerOption(option => option
			.setName('to')
			.setDescription('Song number to skip to')
			.setMinValue(1)
		),
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

		const to = interaction.options.getInteger('to');
		const number = interaction.options.getInteger('number');
		if (to) {
			const track = session.queue.getTrackAtIndex(to - 1);
			if (!track) {
				interaction.reply({ content: `Song #${to} doesn't exist.`, ephemeral: true });
				return;
			}
			session.queue.remove(0, to - 1);
			session.audioPlayer.stop();
			interaction.reply({ content: `Skipped to ${track.discordString}.` });
		} else if (number && number > 1) {
			if (number <= 0) {
				interaction.reply({ content: 'Invalid number.', ephemeral: true });
				return;
			}
			session.queue.remove(0, number - 1);
			session.audioPlayer.stop();
			interaction.reply({ content: `Skipped ${number} songs.` });
		} else {
			// Guaranteeed to exist due to checks above
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const track = session.nowPlaying!;
			session.audioPlayer.stop();
			interaction.reply({ content: `Skipped ${track.discordString}.` });
		}
	}
};