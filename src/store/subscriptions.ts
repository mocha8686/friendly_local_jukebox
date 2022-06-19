import { Collection, Snowflake } from 'discord.js';
import { Subscription } from '../music/subscription';

const subscriptions = new Collection<Snowflake, Subscription>();

export function setSubscription(guildId: Snowflake, subscription: Subscription) {
	subscriptions.set(guildId, subscription);
}

export function getSubscription(guildId?: Snowflake | undefined | null) {
	if (guildId) {
		return subscriptions.get(guildId);
	} else {
		return undefined;
	}
}

export function deleteSubscription(guildId: Snowflake | undefined | null) {
	if (guildId) {
		return subscriptions.delete(guildId);
	} else {
		return false;
	}
}