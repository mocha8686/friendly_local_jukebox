import 'dotenv/config';
import { AudioResource, createAudioResource, demuxProbe } from '@discordjs/voice';
import { MessageEmbed, User } from 'discord.js';
import _ from 'lodash';
import { createBaseEmbed } from '../util/createBaseEmbed';
import { google } from 'googleapis';
import ytdl from 'ytdl-core';

export interface TrackData {
	url: URL;
	title: string;
	thumbnailUrl: URL;
	lengthSeconds: number;
	onStart: () => void;
	onFinish: () => void;
	onError: (err: Error) => void;
	suggestor: SuggestorData;
}

export interface SuggestorData {
	username: string;
	avatarURL?: URL;
}

export type TrackMethods = Pick<TrackData, 'onStart' | 'onFinish' | 'onError'>;

export class Track implements TrackData {
	public readonly url: URL;
	public readonly title: string;
	public readonly thumbnailUrl: URL;
	public readonly lengthSeconds: number;
	public readonly onStart: () => void;
	public readonly onFinish: () => void;
	public readonly onError: (err: Error) => void;
	public readonly suggestor: SuggestorData;

	private constructor({ url, title, thumbnailUrl, lengthSeconds, onStart, onFinish, onError, suggestor }: TrackData) {
		this.url = url;
		this.title = title;
		this.thumbnailUrl = thumbnailUrl;
		this.lengthSeconds = lengthSeconds;
		this.onStart = onStart;
		this.onFinish = onFinish;
		this.onError = onError;
		this.suggestor = suggestor;
	}

	get discordString(): string {
		return `*${this.title}*`;
	}

	get queueString(): string {
		return `[${this.title}](${this.url}) \`${this.formattedTime}\``;
	}

	get formattedTime(): string {
		const hours = Math.floor((this.lengthSeconds / 60) / 24);
		const minutes = Math.floor(this.lengthSeconds / 60) % 60;
		const seconds = (this.lengthSeconds % 60).toString().padStart(2, '0');
		
		return (hours > 0) ?
			`${hours}:${minutes.toString().padStart(2, '0')}:${seconds}` :
			`${minutes}:${seconds}`;
	}

	get embed(): MessageEmbed {
		return createBaseEmbed()
			.setTitle(this.title)
			.setURL(this.url.toString())
			.setThumbnail(this.thumbnailUrl.toString())
			.setFooter({ text: `Added by ${this.suggestor.username}`, iconURL: this.suggestor.avatarURL?.toString() });
	}

	public async intoAudioResource(): Promise<AudioResource<Track>> {
		const stream = ytdl(
			this.url.toString(),
			{
				quality: 'highestaudio',
				dlChunkSize: 100000,
				filter: 'audioonly',
			},
		);

		const probe = await demuxProbe(stream);
		return createAudioResource(probe.stream, { metadata: this, inputType: probe.type });
	}

	public static async fromURL(url: URL, methods: TrackMethods, user: User): Promise<Track> {
		const info = await ytdl.getBasicInfo(url.toString());
		const avatarUrlString = user.avatarURL({ dynamic: true, size: 32 });

		return new Track({
			url,
			title: info.videoDetails.title,
			thumbnailUrl: new URL(info.videoDetails.thumbnails[0].url),
			lengthSeconds: parseInt(info.videoDetails.lengthSeconds),
			onStart: _.once(methods.onStart),
			onFinish: _.once(methods.onFinish),
			onError: _.once(methods.onError),
			suggestor: {
				username: user.tag,
				avatarURL: avatarUrlString ? new URL(avatarUrlString) : undefined,
			},
		});
	}

	public static fromQuery(query: string, methods: TrackMethods, user: User): Promise<Track> {
		const apiKey = process.env.GOOGLE_API_KEY;
		if (!apiKey) {
			throw 'Google API key not defined.';
		}

		const service = google.youtube({ version: 'v3', auth: apiKey });

		return new Promise((resolve, reject) => {
			service.search.list({ 
				part: [ 'snippet' ],
				type: [ 'video' ],
				maxResults: 5,
				q: query,
			}, (err, res) => {
				if (err) {
					reject(err);
				}

				if (res?.data.items && res.data.items[0].id?.videoId) {
					resolve(Track.fromURL(new URL(`https://youtu.be/${res.data.items[0].id.videoId}`), methods, user));
				} else {
					reject('No video found.');
				}
			});
		});
	}
}