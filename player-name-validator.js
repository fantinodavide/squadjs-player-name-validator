import DiscordBasePlugin from './discord-base-plugin.js';

export default class PlayerNameValidator extends DiscordBasePlugin {
    static get description() {
        return "Player Name Validator plugin";
    }

    static get defaultEnabled() {
        return true;
    }

    static get optionsSpecification() {
        return {
            ...DiscordBasePlugin.optionsSpecification,
            channelID: {
                required: true,
                description: 'The ID of the channel to log admin broadcasts to.',
                default: '',
                example: '667741905228136459'
            },
            kickMessage: {
                required: false,
                description: "",
                default: "You have been kicked due to non-compliant username.\n\nForbidden: %FORBIDDEN%",
            },
            rules: {
                required: false,
                description: "",
                default: [
                    {
                        type: "regex",
                        logic: "match=allow",
                        rule: /a-z\d=\$\[\]\!\.\s\-/
                    }
                ],
                example: [
                    {
                        type: "regex",
                        logic: "match=kick",
                        logic: "match=allow",
                        rule: /[^a-z\d=\$\[\]\!\.\s\-]/
                    },
                    {
                        type: "equals",
                        rule: "D*CK"
                    },
                    {
                        type: "includes",
                        rule: "F*CK"
                    }
                ]
            }
        };
    }

    constructor(server, options, connectors) {
        super(server, options, connectors);

        this.onPlayerConnected = this.onPlayerConnected.bind(this)
        this.discordLog = this.discordLog.bind(this)

        this.broadcast = (msg) => { this.server.rcon.broadcast(msg); };
        this.warn = (steamid, msg) => { this.server.rcon.warn(steamid, msg); };
    }

    async mount() {
        this.server.on('PLAYER_CONNECTED', this.onPlayerConnected);
    }
    
    async unmount() {
		this.server.removeEventListener("PLAYER_CONNECTED", this.onPlayerConnected);
	}

    onPlayerConnected(info) {
        const { steamID, name: playerName } = info.player;
        let kick = false;
        let rule = null;
        for (let r of this.options.rules) {
            r.type = r.type.toLowerCase();
            r.logic = r.logic.toLowerCase();

            switch (r.type) {
                case 'regex':
                    r.rule = r.rule.replace(/^\//, '').replace(/\/$/, '')

                    const reg = new RegExp(r.rule, "gi");
                    kick = playerName.match(reg)?.join(', ')

                    // switch (r.logic) {
                    //     case 'match=allow':
                    //         if (!regRes) kick = playerName;
                    //         break;
                    //     case 'match=kick':
                    //     default:
                    //         if (regRes) kick = regRes.join(', ')
                    // }
                    // this.verbose(1, "Testing rule", info.squadName, reg, disband)
                    break;
                case 'equals':
                    kick = playerName.toLowerCase() === r.rule.toLowerCase() ? playerName : false;
                    break;
                case 'includes':
                    kick = playerName.toLowerCase().includes(r.rule.toLowerCase()) ? r.rule : false;
                    break;
                case 'startsWith':
                    kick = playerName.toLowerCase().startsWith(r.rule.toLowerCase()) ? r.rule : false;
                    break;
                case 'endsWith':
                    kick = playerName.toLowerCase().endsWith(r.rule.toLowerCase()) ? r.rule : false;
                    break;
                default:
            }

            switch (r.logic) {
                case 'match=allow':
                    if (!kick) kick = playerName;
                    break;
                case 'match=kick':
                default:
                    break;
            }

            rule = r;

            if (kick) break
        }
        this.verbose(1, "Player Connected:", playerName, kick)

        if (kick) {
            const kickMessage = rule.kickMessage || this.options.kickMessage;
            this.server.rcon.execute(`AdminKick ${steamID} ${kickMessage}`);
            this.warn(info.player.steamID, kickMessage.replace(/\%FORBIDDEN\%/ig, kick))
            this.discordLog(info, kick, rule)
        }
    }

    async discordLog(info, forbidden, rule = null) {
        let regex = rule ? new RegExp(rule.rule, "gi").toString() : null;
        await this.sendDiscordMessage({
            embed: {
                title: `Player Kicked: ${info.player.name}`,
                color: "ee1111",
                fields: [
                    {
                        name: 'Username',
                        value: info.player.name,
                        inline: true
                    },
                    {
                        name: 'SteamID',
                        value: `[${info.player.steamID}](https://steamcommunity.com/profiles/${info.player.steamID})`,
                        inline: true
                    },
                    {
                        name: 'Forbidden Chars/Word',
                        value: forbidden
                    },
                    (regex ? { name: 'Logic', value: rule.logic.toLowerCase(), inline: true } : null),
                    (regex ? { name: 'Regex', value: regex.toString(), inline: true } : null)
                ].filter(e => e),
                timestamp: info.time.toISOString()
            }
        });
    }
}
