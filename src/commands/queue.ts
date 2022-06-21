import { CommandInteraction, Message } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { getSession } from '../store/sessions';

const COLLECTOR_IDLE = 15000;
const COLLECTOR_MAX = 1000;
const COLLECTOR_TIME = 15000000;

export default {
	command: new SlashCommandBuilder()
		.setName('queue')
		.setDescription('Show the queue.')
		.addIntegerOption(option => option
			.setName('page')
			.setDescription('Page number to show')
			.setMinValue(1)
		),
	async execute(interaction: CommandInteraction) {
		if (!interaction.guildId || !interaction.guild) {
			interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
			return;
		}

		const session = getSession(interaction.guildId);
		if (!session) {
			interaction.reply({ content: 'I\'m not currently in a voice channel.', ephemeral: true });
			return;
		}

		const page = interaction.options.getInteger('page') ?? 1;
		const [queueEmbed, queueActionRow, newPage] = session.queue.getElements(page - 1);

		if (!queueEmbed || !queueActionRow) {
			interaction.reply({ content: 'I\'m not currently playing any songs.', ephemeral: true });
		} else {
			const msg = (await interaction.reply({ embeds: [ queueEmbed ], components: [ queueActionRow ], fetchReply: true })) as Message;
			let page = newPage;

			const collector = msg.createMessageComponentCollector({
				componentType: 'BUTTON',
				idle: COLLECTOR_IDLE,
				max: COLLECTOR_MAX,
				time: COLLECTOR_TIME,
				dispose: true,
				filter: (i) => {
					i.deferUpdate();
					return i.user.id === interaction.user.id;
				},
			});

			collector.on('collect', i => {
				let elements;
				switch (i.customId) {
					case 'first':
						elements = session.queue.getElements(0);
						break;
					case 'previous':
						elements = session.queue.getElements(page - 1);
						break;
					case 'next':
						elements = session.queue.getElements(page + 1);
						break;
					case 'last':
						elements = session.queue.getElements(Infinity);
						break;
					default:
						elements = session.queue.getElements(page);
						break;
				}

				if (!elements[0] || !elements[1]) return;

				page = elements[2];
				interaction.editReply({ embeds: [ elements[0] ], components: [ elements[1] ] });
			});

			collector.on('end', () => {
				const [queueEmbed, queueActionRow] = session.queue.getElements(page, true);
				if (!queueEmbed || !queueActionRow) return;

				interaction.editReply({ embeds: [ queueEmbed ], components: [ queueActionRow ] });
			});
		}
	}
};