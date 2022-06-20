import { MessageEmbed } from 'discord.js';

export function createBaseEmbed(): MessageEmbed {
	return new MessageEmbed()
		.setColor('#875b41');
}