import 'dotenv/config';
import { AudioResource, createAudioResource, demuxProbe } from '@discordjs/voice';
import _ from 'lodash';
import { google } from 'googleapis';
import ytdl from 'ytdl-core';

export interface TrackData {
	url: URL;
	title: string;
	onStart: () => void;
	onFinish: () => void;
	onError: (err: Error) => void;
}

export type TrackMethods = Pick<TrackData, 'onStart' | 'onFinish' | 'onError'>;

export class Track {
	public readonly url: URL;
	public readonly title: string;
	public readonly onStart: () => void;
	public readonly onFinish: () => void;
	public readonly onError: (err: Error) => void;

	private constructor({ url, title, onStart, onFinish, onError }: TrackData) {
		this.url = url;
		this.title = title;
		this.onStart = onStart;
		this.onFinish = onFinish;
		this.onError = onError;
	}

	get discordString() {
		return `*${this.title}*`;
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

	public static async fromURL(url: URL, methods: TrackMethods): Promise<Track> {
		const info = await ytdl.getBasicInfo(url.toString());
		return new Track({
			url,
			title: info.videoDetails.title,
			onStart: _.once(methods.onStart),
			onFinish: _.once(methods.onFinish),
			onError: _.once(methods.onError),
		});
	}

	public static fromQuery(query: string, methods: TrackMethods): Promise<Track> {
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
					resolve(Track.fromURL(new URL(`https://youtu.be/${res.data.items[0].id.videoId}`), methods));
				} else {
					reject('No video found.');
				}
			});
		});
	}
}