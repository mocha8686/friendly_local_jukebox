import { EmbedBuilder } from 'discord.js';

export function createBaseEmbed(): EmbedBuilder {
	return new EmbedBuilder()
		.setColor('#875b41');
}