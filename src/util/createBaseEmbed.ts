import { MessageEmbed } from 'discord.js';

export function createBaseEmbed() {
	return new MessageEmbed()
		.setColor('#875b41');
}