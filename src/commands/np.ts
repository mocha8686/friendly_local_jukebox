import { AudioPlayerStatus, AudioResource } from '@discordjs/voice';
import { CommandInteraction } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { Track } from '../music/track';
import { getSubscription } from '../store/subscriptions';

export default {
	command: new SlashCommandBuilder()
		.setName('np')
		.setDescription('Show the song currently playing.'),
	async execute(interaction: CommandInteraction) {
		if (!interaction.guildId || !interaction.guild) {
			interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
			return;
		}

		const subscription = getSubscription(interaction.guildId);
		if (!subscription) {
			interaction.reply({ content: 'I\'m not currently in a voice channel.', ephemeral: true });
			return;
		}

		if (subscription.audioPlayer.state.status === AudioPlayerStatus.Idle) {
			interaction.reply({ content: 'I\'m not currently playing a song.', ephemeral: true });
			return;
		}

		const track = (subscription.audioPlayer.state.resource as AudioResource<Track>).metadata;
		interaction.reply({ embeds: [ track.nowPlayingEmbed ] });
	}
};