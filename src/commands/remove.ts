import { AudioPlayerStatus } from '@discordjs/voice';
import { CommandInteraction } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { getSession } from '../store/sessions';

export default {
	command: new SlashCommandBuilder()
		.setName('remove')
		.setDescription('Remove a song from the queue.')
		.addIntegerOption(option => option
			.setName('number')
			.setDescription('Song number to remove')
			.setMinValue(1)
			.setRequired(true)
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

		const number = interaction.options.getInteger('number');
		if (number && number >= 1) {
			const track = session.queue.getTrackAtIndex(number - 1);
			session.queue.remove(number - 1);
			interaction.reply({ content: `Removed ${track.discordString}.` });
		} else {
			interaction.reply({ content: 'Invalid number.', ephemeral: true });
		}
	}
};
