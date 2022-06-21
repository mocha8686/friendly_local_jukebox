import { AudioPlayer, AudioPlayerStatus, AudioResource, VoiceConnection, VoiceConnectionDisconnectReason, VoiceConnectionDisconnectedState, VoiceConnectionStatus, createAudioPlayer, entersState } from '@discordjs/voice';
import { MessageActionRow, MessageButton, MessageEmbed } from 'discord.js';
import { Track } from './track';
import { createBaseEmbed } from '../util/createBaseEmbed';
import { deleteSession } from '../store/sessions';
import { setTimeout } from 'timers/promises';

const MAX_READY_TIMEOUT = 20000;
const MAX_4014_TIMEOUT = 5000;
const MAX_REJOIN_ATTEMPTS = 5;
const RECONNECT_TIMEOUT_BASE_TIME = 5000;
const PAGE_SIZE = 10;

function createBaseQueueActionRow(): MessageActionRow {
	// U+25C0 ◀
	// U+25B6 ▶
	return new MessageActionRow().addComponents(
		new MessageButton()
			.setCustomId('first')
			.setLabel('◀◀')
			.setStyle('PRIMARY'),
		new MessageButton()
			.setCustomId('previous')
			.setLabel('◀')
			.setStyle('PRIMARY'),
		new MessageButton()
			.setCustomId('next')
			.setLabel('▶')
			.setStyle('PRIMARY'),
		new MessageButton()
			.setCustomId('last')
			.setLabel('▶▶')
			.setStyle('PRIMARY'),
	);
}
export class Session {
	public readonly voiceConnection: VoiceConnection;
	public readonly audioPlayer = createAudioPlayer();
	private queue: Track[] = [];
	private queueLock = false;	
	private readyLock = false;

	constructor(voiceConnection: VoiceConnection) {
		this.voiceConnection = voiceConnection;

		this.setupVoiceConnection(voiceConnection);
		this.setupAudioPlayer(this.audioPlayer);

		voiceConnection.subscribe(this.audioPlayer);
	}

	get nowPlaying(): Track | undefined {
		if (this.audioPlayer.state.status === AudioPlayerStatus.Idle) {
			return undefined;
		} else {
			return (this.audioPlayer.state.resource as AudioResource<Track>).metadata;
		}
	}

	public enqueue(track: Track) {
		this.queue.push(track);
		this.processQueue();
	}

	public getQueueElements(page: number, disabled = false): [MessageEmbed, MessageActionRow, number] {
		const [embed, newPage] = this.createQueueEmbed(page);
		const actionRow = this.createActionRow(disabled ? 'disabled' : newPage);
		return [embed, actionRow, newPage];
	}

	private createQueueEmbed(page: number): [MessageEmbed, number] {
		const totalPages = Math.ceil(this.queue.length / PAGE_SIZE);
		if (page < 0) page = 0;
		if (page > totalPages - 1) page = totalPages - 1; // If page would have no entries, fall back to last page

		const entries = Object.entries(this.queue).slice(page * PAGE_SIZE, page * PAGE_SIZE + 10);
		const embed = createBaseEmbed()
			.setTitle('Queue');

		const nowPlaying = this.nowPlaying;
		if (nowPlaying) {
			embed.addField('*Now Playing*', nowPlaying.queueString);
		}
		
		if (entries.length > 0) {
			embed.addField(
				`*Page ${page + 1}*`,
				entries.reduce((str, [i, track]) => {
					str += `\`${parseInt(i) + 1}\` ${track.queueString}\n`;
					return str;
				}, ''),
			).setFooter({
				text: `${page + 1}/${totalPages}`,
			});
		}

		return [embed, page];
	}

	private createActionRow(page: number | 'disabled'): MessageActionRow {
		const actionRow = createBaseQueueActionRow();
		if (page === 'disabled') {
			actionRow.components.forEach(component => component.setDisabled(true));
			return actionRow;
		} else {
			const totalPages = Math.ceil(this.queue.length / PAGE_SIZE);

			if (page <= 0)	{
				actionRow.components
					.filter(component => component.customId === 'first' || component.customId === 'previous')
					.forEach(component => component.setDisabled(true));
			}

			if (page >= totalPages - 1)	{
				actionRow.components
					.filter(component => component.customId === 'next' || component.customId === 'last')
					.forEach(component => component.setDisabled(true));
			}

			return actionRow;
		}
	}

	private stop() {
		this.queueLock = true;
		this.queue = [];
		this.audioPlayer.stop(true);
	}

	private async processQueue() {
		// If the queue is locked, is empty, or the audio player is playing something, don't do anything.
		if (this.queueLock || this.queue.length === 0 || this.audioPlayer.state.status !== AudioPlayerStatus.Idle) return;

		this.queueLock = true;

		// Guaranteed to be non-null due to check above.
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const nextTrack = this.queue.shift()!;
		try {
			const resource = await nextTrack.intoAudioResource();
			this.audioPlayer.play(resource);
		} catch (err) {
			// If playback fails, try next song.
			nextTrack.onError(err as Error);
			this.queueLock = false;
			await this.processQueue();
		} finally {
			this.queueLock = false;
		}
	}

	private setupVoiceConnection(voiceConnection: VoiceConnection) {
		voiceConnection.on<'stateChange'>('stateChange', async (_, newState) => {
			if (newState.status === VoiceConnectionStatus.Disconnected) {
				await this.handleDisconnect(newState);
			} else if (newState.status === VoiceConnectionStatus.Destroyed) {
				this.stop();
				deleteSession(this.voiceConnection.joinConfig.guildId);
			} else if (
				!this.readyLock &&
				(newState.status === VoiceConnectionStatus.Connecting || newState.status === VoiceConnectionStatus.Signalling)
			) {
				// If voice connection is connecting or signalling, wait to connect before destroying
				this.readyLock = true;
				try {
					await entersState(this.voiceConnection, VoiceConnectionStatus.Ready, MAX_READY_TIMEOUT);
				} catch {
					if (this.voiceConnection.state.status !== VoiceConnectionStatus.Destroyed) this.voiceConnection.destroy();
				} finally {
					this.readyLock = false;
				}
			}
		});
	}

	private setupAudioPlayer(audioPlayer: AudioPlayer) {
		audioPlayer.on<'stateChange'>('stateChange', (oldState, newState) => {
			if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
				// If transition was !Idle -> Idle, the audio resource finished playing.
				(oldState.resource as AudioResource<Track>).metadata.onFinish();
				this.processQueue();
			} else if (newState.status === AudioPlayerStatus.Playing && oldState.status !== AudioPlayerStatus.Playing) {
				// If transition was !Playing -> Playing, the audio resource started playback.
				(newState.resource as AudioResource<Track>).metadata.onStart();
			}
		});

		audioPlayer.on('error', (error) => (error.resource as AudioResource<Track>).metadata.onError(error));
	}

	private async handleDisconnect(newState: VoiceConnectionDisconnectedState) {
		if (newState.reason === VoiceConnectionDisconnectReason.WebSocketClose && newState.closeCode === 4014) {
			// If close code was 4014, don't manually reconnect; however, voice may reconnect automatically
			// Disconnect may be due to either being kicked, or being moved
			// https://discord.com/developers/docs/topics/opcodes-and-status-codes#gateway
			try {
				await entersState(this.voiceConnection, VoiceConnectionStatus.Connecting, MAX_4014_TIMEOUT);
			} catch {
				// Likely disconnected
				this.voiceConnection.destroy();
			}
		} else if (this.voiceConnection.rejoinAttempts < MAX_REJOIN_ATTEMPTS) {
			// Disconnect is recoverable, and we have remaining attempts
			await setTimeout((this.voiceConnection.rejoinAttempts + 1) * RECONNECT_TIMEOUT_BASE_TIME);
			this.voiceConnection.rejoin();
		} else {
			// Disconnect may be recoverable, but we don't have any more attempts
			this.voiceConnection.destroy();
		}
	}
}