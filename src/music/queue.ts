import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { AudioPlayerStatus } from '@discordjs/voice';
import { Session } from './session';
import { Track } from './track';
import { createBaseEmbed } from '../util/createBaseEmbed';

const PAGE_SIZE = 10;

function createBaseQueueActionRow(): ActionRowBuilder<ButtonBuilder> {
	// U+25C0 ◀
	// U+25B6 ▶
	return new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setCustomId('first')
			.setLabel('◀◀')
			.setStyle(ButtonStyle.Primary),
		new ButtonBuilder()
			.setCustomId('previous')
			.setLabel('◀')
			.setStyle(ButtonStyle.Primary),
		new ButtonBuilder()
			.setCustomId('next')
			.setLabel('▶')
			.setStyle(ButtonStyle.Primary),
		new ButtonBuilder()
			.setCustomId('last')
			.setLabel('▶▶')
			.setStyle(ButtonStyle.Primary),
	);
}

export class Queue {
	private queue: Track[] = [];
	private queueLock = false;
	private readonly session: Session;

	constructor(session: Session) {
		this.session = session;
	}

	public enqueue(track: Track) {
		this.queue.push(track);
		this.process();
	}

	public getTrackAtIndex(index: number): Track {
		return this.queue[index];
	}

	public remove(start: number, num?: number) {
		this.queue.splice(start, num ?? 1);
	}

	public getElements(page: number, disabled = false): [EmbedBuilder | undefined, ActionRowBuilder<ButtonBuilder> | undefined, number] {
		if (!this.session.nowPlaying && this.queue.length === 0) {
			return [undefined, undefined, 0];
		}

		const [embed, newPage] = this.createEmbed(page);
		const actionRow = this.createActionRow(disabled ? 'disabled' : newPage);
		return [embed, actionRow, newPage];
	}

	public stop() {
		this.queueLock = true;
		this.queue = [];
	}

	public async process() {
		// If the queue is locked, is empty, or the audio player is playing something, don't do anything.
		if (this.queueLock || this.queue.length === 0 || this.session.audioPlayer.state.status !== AudioPlayerStatus.Idle) return;

		this.queueLock = true;

		// Guaranteed to be non-null due to check above.
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const nextTrack = this.queue.shift()!;
		try {
			const resource = await nextTrack.intoAudioResource();
			this.session.audioPlayer.play(resource);
		} catch (err) {
			// If playback fails, try next song.
			nextTrack.onError(err as Error);
			this.queueLock = false;
			await this.process();
		} finally {
			this.queueLock = false;
		}
	}

	private createEmbed(page: number): [EmbedBuilder, number] {
		const totalPages = Math.ceil(this.queue.length / PAGE_SIZE);
		if (page < 0) page = 0;
		if (page > totalPages - 1) page = totalPages - 1; // If page would have no entries, fall back to last page

		const entries = Object.entries(this.queue).slice(page * PAGE_SIZE, page * PAGE_SIZE + 10);
		const embed = createBaseEmbed()
			.setTitle('Queue');

		const nowPlaying = this.session.nowPlaying;
		if (nowPlaying) {
			embed.addFields(
				{ name: '*Now Playing*', value: nowPlaying.queueString },
			);
		}

		if (entries.length > 0) {
			embed.addFields({
				name: `*Page ${page + 1}*`,
				value: entries.reduce((str, [i, track]) => {
					str += `\`${parseInt(i) + 1}\` ${track.queueString}\n`;
					return str;
				}, ''),
			}).setFooter({
				text: `${page + 1}/${totalPages}`,
			});
		}

		return [embed, page];
	}

	private createActionRow(page: number | 'disabled'): ActionRowBuilder<ButtonBuilder> {
		const actionRow = createBaseQueueActionRow();
		if (page === 'disabled') {
			actionRow.components.forEach(component => component.setDisabled(true));
			return actionRow;
		} else {
			const totalPages = Math.ceil(this.queue.length / PAGE_SIZE);

			if (page <= 0)	{
				actionRow.components[0].setDisabled(true);
				actionRow.components[1].setDisabled(true);
			}

			if (page >= totalPages - 1)	{
				actionRow.components[2].setDisabled(true);
				actionRow.components[3].setDisabled(true);
			}

			return actionRow;
		}
	}
}