export function mockInteraction(overrides: any = {}) {
  const calls: any = { editedReplies: [], replies: [], followUps: [] };

  const options = {
    getString: (k: string) =>
      overrides.options?.getString
        ? overrides.options.getString(k)
        : (overrides.options?.[k] ?? null),
    getNumber: (k: string) =>
      overrides.options?.getNumber
        ? overrides.options.getNumber(k)
        : (overrides.options?.[k] ?? null),
    getBoolean: (k: string) =>
      overrides.options?.getBoolean
        ? overrides.options.getBoolean(k)
        : (overrides.options?.[k] ?? null),
    getChannel: (k: string) =>
      overrides.options?.getChannel
        ? overrides.options.getChannel(k)
        : (overrides.options?.[k] ?? null),
    getUser: (k: string) =>
      overrides.options?.getUser
        ? overrides.options.getUser(k)
        : (overrides.options?.[k] ?? null),
    getMember: (k: string) =>
      overrides.options?.getMember
        ? overrides.options.getMember(k)
        : (overrides.options?.[k] ?? null),
  };

  const guild = overrides.guild ?? {
    id: overrides.guildId ?? "guild-1",
    channels: {
      fetch: async (id: string) => overrides.fetchChannel ?? null,
    },
    members: {
      fetch: async (id: string) =>
        overrides.fetchMember ?? { setNickname: () => {} },
    },
  };

  const client = overrides.client ?? { application: { id: "bot-id" } };

  const interaction: any = {
    deferReply: async () => {},
    editReply: async (payload: any) => calls.editedReplies.push(payload),
    followUp: async (payload: any) => calls.followUps.push(payload),
    reply: async (payload: any) => calls.replies.push(payload),
    options,
    user: overrides.user ?? { id: "user-1" },
    member: overrides.member ?? { id: "user-1" },
    guildId: overrides.guildId ?? "guild-1",
    channelId: overrides.channelId ?? "channel-1",
    channel: overrides.channel ?? null,
    targetMember: overrides.targetMember ?? null,
    targetUser: overrides.targetUser ?? null,
    guild,
    client,
    __calls: calls,
  };

  return interaction;
}
