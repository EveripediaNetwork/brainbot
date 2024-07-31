import { ApplicationCommandType, MessageContextMenuCommandInteraction, UserContextMenuCommandInteraction } from "discord.js";
import { Discord, ContextMenu } from "discordx";

@Discord()
export abstract class contextTest {
  @ContextMenu({ name: 'MESSAGE', type: ApplicationCommandType.Message })
  async messageHandler(interaction: MessageContextMenuCommandInteraction) {
    interaction.reply('I am user context handler')
  }

  @ContextMenu({ name: 'USER', type: ApplicationCommandType.User })
  async userHandler(interaction: UserContextMenuCommandInteraction) {
    interaction.reply('I am user context handler')
  }
}
