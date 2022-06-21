import { CommandInteraction, GuildMember, User } from 'discord.js';
import { Track, TrackMethods } from '../music/track';
import { VoiceConnectionStatus, entersState, joinVoiceChannel } from '@discordjs/voice';
import { getSession, setSession } from '../store/sessions';
import { ChannelType } from 'discord-api-types/v10';
import { Session } from '../music/session';
import { SlashCommandBuilder } from '@discordjs/builders';
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

function getOrCreatesession(interaction: CommandInteraction): Session | undefined {
	if (!interaction.guildId || !interaction.guild) return undefined;

	let session = getSession(interaction.guildId);

	if (!session) {
		const channelId = getChannelIdFromInteraction(interaction);
		if (channelId) {
			const guildId = interaction.guildId;

			session = new Session(
				joinVoiceChannel({
					channelId,
					guildId,
					adapterCreator: interaction.guild.voiceAdapterCreator,
				}),
			);
			session.voiceConnection.on('error', console.error);
			setSession(guildId, session);
		} else {
			return undefined;
		}
	}

	return session;
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
	
		const query = interaction.options.getString('query');
		if (!query) {
			interaction.reply({ content: 'No query specified.', ephemeral: true });
			return;
		}
		
		const session = getOrCreatesession(interaction);
		if (!session) {
			interaction.reply({ content: 'No voice channel was found. Either join one and try again, or specify a channel.', ephemeral: true });
			return;
		}

		await interaction.deferReply();

		try {
			await entersState(session.voiceConnection, VoiceConnectionStatus.Ready, MAX_READY_TIMEOUT);
		} catch (err) {
			console.error(err);
			interaction.followUp({ content: 'There was an error connecting to the voice channel. Try again later.' });
			return;
		}

		try {
			const track: Track = await createTrack(
				query,
				{
					onStart: () => interaction.followUp({ content: `Now playing ${track.discordString}.`, embeds: [ track.embed ] }),
					onFinish: () => { /* no-op */ },
					onError: err => {
						console.error(err);
						interaction.followUp({ content: `There was an error while playing ${track.discordString}.` });
					},
				},
				interaction.user,
			);
			session.queue.enqueue(track);
			interaction.followUp({ content: `Added ${track.discordString} to the queue.`, embeds: [ track.embed ] });
		} catch (err) {
			console.error(err);
			interaction.followUp({ content: 'There was an error getting the song.' });
			return;
		}
	}
};