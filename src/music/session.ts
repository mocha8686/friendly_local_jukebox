import { AudioPlayer, AudioPlayerStatus, AudioResource, VoiceConnection, VoiceConnectionDisconnectReason, VoiceConnectionDisconnectedState, VoiceConnectionStatus, createAudioPlayer, entersState } from '@discordjs/voice';
import { Queue } from './queue';
import { Track } from './track';
import { deleteSession } from '../store/sessions';
import { setTimeout } from 'timers/promises';

const MAX_READY_TIMEOUT = 20000;
const MAX_4014_TIMEOUT = 5000;
const MAX_REJOIN_ATTEMPTS = 5;
const RECONNECT_TIMEOUT_BASE_TIME = 5000;

export class Session {
	public readonly voiceConnection: VoiceConnection;
	public readonly audioPlayer = createAudioPlayer();
	public readonly queue: Queue;
	private readyLock = false;

	constructor(voiceConnection: VoiceConnection) {
		this.voiceConnection = voiceConnection;

		this.setupVoiceConnection(voiceConnection);
		this.setupAudioPlayer(this.audioPlayer);

		voiceConnection.subscribe(this.audioPlayer);

		this.queue = new Queue(this);
	}

	get nowPlaying(): Track | undefined {
		if (this.audioPlayer.state.status === AudioPlayerStatus.Idle) {
			return undefined;
		} else {
			return (this.audioPlayer.state.resource as AudioResource<Track>).metadata;
		}
	}

	private stop() {
		this.queue.stop();
		this.audioPlayer.stop(true);
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
				this.queue.process();
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