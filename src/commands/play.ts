import { CommandInteraction, GuildMember, User } from 'discord.js';
import { Track, TrackMethods } from '../music/track';
import { VoiceConnectionStatus, entersState, joinVoiceChannel } from '@discordjs/voice';
import { getSubscription, setSubscription } from '../store/subscriptions';
import { ChannelType } from 'discord-api-types/v10';
import { SlashCommandBuilder } from '@discordjs/builders';
import { Subscription } from '../music/subscription';
import ytdl from 'ytdl-core';

const MAX_READY_TIMEOUT = 20000;

function getChannelIdFromInteraction(interaction: CommandInteraction): string | undefined {
	const optionId = interaction.options.getChannel('voice_channel')?.id;
	if (optionId) {
		return optionId;
	} else if (interaction.member instanceof GuildMember) {
		const memberId = interaction.member.voice.channel?.id;
		return memberId;
	} else {
		return undefined;
	}
}

function getOrCreateSubscription(interaction: CommandInteraction): Subscription | undefined {
	if (!interaction.guildId || !interaction.guild) return undefined;

	let subscription = getSubscription(interaction.guildId);

	if (!subscription) {
		const channelId = getChannelIdFromInteraction(interaction);
		if (channelId) {
			const guildId = interaction.guildId;

			subscription = new Subscription(
				joinVoiceChannel({
					channelId,
					guildId,
					adapterCreator: interaction.guild.voiceAdapterCreator,
				}),
			);
			subscription.voiceConnection.on('error', console.error);
			setSubscription(guildId, subscription);
		} else {
			return undefined;
		}
	}

	return subscription;
}

async function createTrack(query: string, methods: TrackMethods, user: User): Promise<Track> {
	try {
		ytdl.getURLVideoID(query);
		return await Track.fromURL(new URL(query), methods, user);
	} catch {
		return await Track.fromQuery(query, methods, user);
	}
}

export default {
	command: new SlashCommandBuilder()
		.setName('play')
		.setDescription('Play a song in a voice channel.')
		.setDMPermission(false)
		.addStringOption(option =>
			option
				.setName('query')
				.setDescription('Song to play.')
				.setRequired(true)
		)
		.addChannelOption(channelOption =>
			channelOption
				.setName('voice_channel')
				.setDescription('Voice channel to join.')
				.addChannelTypes(ChannelType.GuildVoice)
		),
	async execute(interaction: CommandInteraction) {
		if (!interaction.guildId || !interaction.guild) {
			interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
			return;
		}

		await interaction.deferReply();
	
		const query = interaction.options.getString('query');
		if (!query) {
			interaction.followUp({ content: 'No query specified.', ephemeral: true });
			return;
		}
		
		const subscription = getOrCreateSubscription(interaction);
		if (!subscription) {
			interaction.followUp({ content: 'No voice channel was found. Either join one and try again, or specify a channel.', ephemeral: true });
			return;
		}

		try {
			await entersState(subscription.voiceConnection, VoiceConnectionStatus.Ready, MAX_READY_TIMEOUT);
		} catch (err) {
			console.error(err);
			interaction.followUp({ content: 'There was an error connecting to the voice channel. Try again later.', ephemeral: true });
			return;
		}

		try {
			const track: Track = await createTrack(
				query,
				{
					onStart: () => interaction.followUp({ content: `Now playing ${track.discordString}`, embeds: [ track.embed ] }),
					onFinish: () => { /* no-op */ },
					onError: err => {
						console.error(err);
						interaction.followUp({ content: `There was an error while playing ${track.discordString}.` });
					},
				},
				interaction.user,
			);
			subscription.enqueue(track);
			interaction.followUp({ content: `Added ${track.discordString} to the queue.`, embeds: [ track.embed ] });
		} catch (err) {
			console.error(err);
			interaction.followUp({ content: 'There was an error getting the song.', ephemeral: true });
			return;
		}
	}
};