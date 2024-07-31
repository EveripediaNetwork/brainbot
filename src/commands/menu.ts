import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
  CommandInteraction,
  MessageActionRowComponentBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,

} from "discord.js";
import { Discord, Slash, SelectMenuComponent } from "discordx";

const roles = [
  { label: "Principal", value: "principal" },
  { label: "Teacher", value: "teacher" },
  { label: "Student", value: "student" },
];

@Discord()
export abstract class buttons {
  @SelectMenuComponent({ id: 'role-menu' })
  async handle(interaction: StringSelectMenuInteraction): Promise<unknown> {
    await interaction.deferReply()

    // extract selected value by member
    const roleValue = interaction.values?.[0]

    // if value not found
    if (!roleValue) {
      return await interaction.followUp('invalid role id, select again')
    }

    await interaction.followUp(
      `you have selected role: ${
        roles.find(r => r.value === roleValue)?.label
      }`,
    )
    return
  }

  @Slash({ description: 'roles menu', name: 'my-roles' })
  async myRoles(interaction: CommandInteraction): Promise<void> {
    const btn = new ButtonBuilder()
      .setLabel('Hello')
      .setStyle(ButtonStyle.Primary)
      .setCustomId('hello')

    const buttonRow =
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        btn,
      )

    interaction.reply({
      components: [buttonRow],
    })
  }
}
