import { Interaction } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';

export interface Command {
	command: SlashCommandBuilder,
	execute(interaction: Interaction): Promise<void>,
}