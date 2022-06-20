import { CommandInteraction } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { getSubscription } from '../store/subscriptions';

export default {
	command: new SlashCommandBuilder()
		.setName('stop')
		.setDescription('Stop playing songs and leave.'),
	async execute(interaction: CommandInteraction) {
		if (!interaction.guildId || !interaction.guild) {
			interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
			return;
		}

		const subscription = getSubscription(interaction.guildId);
		if (!subscription) {
			interaction.reply({ content: 'I\'m not currently in a voice channel.', ephemeral: true });
			return;
		}

		subscription.voiceConnection.destroy();
		interaction.reply({ content: 'Left voice channel.' });
	}
};