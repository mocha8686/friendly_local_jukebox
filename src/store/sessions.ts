import { Collection, Snowflake } from 'discord.js';
import { Session } from '../music/session';

const sessions = new Collection<Snowflake, Session>();

export function setSession(guildId: Snowflake, session: Session) {
	sessions.set(guildId, session);
}

export function getSession(guildId?: Snowflake | undefined | null): Session | undefined {
	if (guildId) {
		return sessions.get(guildId);
	} else {
		return undefined;
	}
}

export function deleteSession(guildId: Snowflake | undefined | null): boolean {
	if (guildId) {
		return sessions.delete(guildId);
	} else {
		return false;
	}
}