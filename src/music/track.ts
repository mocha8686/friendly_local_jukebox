import { AudioResource } from '@discordjs/voice';
import { once } from 'lodash';

export interface TrackData {
	url: URL;
	title: string;
	onStart: () => void;
	onFinish: () => void;
	onError: (err: Error) => void;
}

export class Track {
	private readonly url: URL;
	private readonly title: string;
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

	public intoAudioResource(): Promise<AudioResource<Track>> {
		return new Promise((resolve, reject) => {
			// TODO: implement
			reject('Unimplemented.');
		});
	}

	public static fromURL(url: URL, methods: Pick<TrackData, 'onStart' | 'onFinish' | 'onError'>) {
		// TODO: implement URL validation and getting info with ytdl-core
		return new Track({
			url: new URL('https://example.com'),
			title: 'Example',
			onStart: once(methods.onStart),
			onFinish: once(methods.onFinish),
			onError: once(methods.onError),
		});
	}
}